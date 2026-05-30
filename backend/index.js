const express = require('express');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const moment = require('moment-timezone');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { initDb, query } = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { google } = require('googleapis');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// Security Middlewares
app.use(helmet());
app.use(cookieParser());

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost in development
    if (origin.includes('localhost')) return callback(null, true);
    
    // Allow all onrender.com domains
    if (origin.includes('.onrender.com')) return callback(null, true);
    
    // Allow explicit FRONTEND_URL if set
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    
    // Allow all in development
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Rate Limiting for Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Demasiados intentos. Intente en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const JWT_SECRET = process.env.JWT_SECRET || 'bingo-secret-key-2026';
const PORT = process.env.PORT || 3001;
const TIMEZONE = 'America/Lima';

// Cloudinary Config
if (process.env.CLOUDINARY_API_KEY) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
    api_key: process.env.CLOUDINARY_API_KEY.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET.trim()
  });
}

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'bingo_prizes',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const upload = multer({ storage: storage });

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Simple In-memory Cache
const cache = {
  prizes: null,
  currentGame: null,
  lastUpdate: 0,
  TTL: 5000 // 5 seconds
};

const getCachedPrizes = async () => {
  if (cache.prizes && (Date.now() - cache.lastUpdate < cache.TTL)) {
    return cache.prizes;
  }
  const result = await query('SELECT * FROM prizes ORDER BY created_at ASC');
  cache.prizes = result.rows;
  cache.lastUpdate = Date.now();
  return cache.prizes;
};

// Initialize DB
initDb().catch(err => {
  logger.error('Failed to initialize database:', err);
});

// Helper to get letter for a number
const getLetter = (num) => {
  if (num >= 1 && num <= 15) return 'B';
  if (num >= 16 && num <= 30) return 'I';
  if (num >= 31 && num <= 45) return 'N';
  if (num >= 46 && num <= 60) return 'G';
  if (num >= 61 && num <= 75) return 'O';
  return '';
};

// --- MIDDLEWARES ---

const authenticateToken = (req, res, next) => {
  const token = req.cookies.admin_token;
  if (!token) return res.status(401).json({ message: 'No autorizado' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
};

// --- AUTH ---

app.post('/api/login', loginLimiter, async (req, res) => {
  const { username, password, token2fa } = req.body;
  const ip = req.ip;
  const ua = req.headers['user-agent'];

  try {
    // Search case-insensitive for username
    const result = await query('SELECT * FROM admin_users WHERE LOWER(username) = LOWER($1)', [username]);
    const user = result.rows[0];

    console.log('DEBUG: Query result count:', result.rows.length);

    if (!user) {
      await query('INSERT INTO login_attempts (username, ip_address, user_agent, success) VALUES ($1, $2, $3, $4)', [username, ip, ua, false]);
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    // Check password (supports plaintext for transition, but we'll update it)
    let isMatch = false;
    console.log('DEBUG: Login attempt for:', username);
    console.log('DEBUG: User from DB:', user.username);
    console.log('DEBUG: Password from DB starts with $2b$:', user.password.startsWith('$2b$'));

    if (user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.password);
      console.log('DEBUG: Bcrypt compare result:', isMatch, 'for password:', password);
    } else {
      isMatch = (password === user.password);
      console.log('DEBUG: Plaintext compare result:', isMatch, 'expected:', user.password, 'got:', password);
      // Auto-update to hashed if it was plaintext
      if (isMatch) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await query('UPDATE admin_users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
        console.log('DEBUG: Password auto-migrated to hash');
      }
    }

    if (!isMatch) {
      await query('INSERT INTO login_attempts (username, ip_address, user_agent, success) VALUES ($1, $2, $3, $4)', [username, ip, ua, false]);
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    // Check 2FA if enabled
    if (user.two_fa_enabled) {
      if (!token2fa) {
        return res.json({ success: true, requires2FA: true });
      }
      const verified = speakeasy.totp.verify({
        secret: user.two_fa_secret,
        encoding: 'base32',
        token: token2fa
      });
      if (!verified) {
        return res.status(401).json({ success: false, message: 'Código 2FA inválido' });
      }
    }

    // Success
    await query('INSERT INTO login_attempts (username, ip_address, user_agent, success) VALUES ($1, $2, $3, $4)', [username, ip, ua, true]);
    
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '2h' });
    
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 2 * 60 * 60 * 1000 // 2 hours
    });

    res.json({ success: true, user: { id: user.id, username: user.username, two_fa_enabled: user.two_fa_enabled } });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Setup 2FA
app.post('/api/admin/setup-2fa', authenticateToken, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: `BingoAdmin:${req.user.username}` });
    const dataUrl = await qrcode.toDataURL(secret.otpauth_url);
    
    await query('UPDATE admin_users SET two_fa_secret = $1 WHERE id = $2', [secret.base32, req.user.id]);
    
    res.json({ secret: secret.base32, qrCode: dataUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm 2FA
app.post('/api/admin/confirm-2fa', authenticateToken, async (req, res) => {
  const { token } = req.body;
  try {
    const result = await query('SELECT two_fa_secret FROM admin_users WHERE id = $1', [req.user.id]);
    const secret = result.rows[0].two_fa_secret;
    
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token
    });

    if (verified) {
      await query('UPDATE admin_users SET two_fa_enabled = TRUE WHERE id = $1', [req.user.id]);
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, message: 'Código inválido' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true });
});

// --- PRIZES (Main Game Flow) ---

app.get('/api/prizes', async (req, res) => {
  try {
    const prizes = await getCachedPrizes();
    res.json(prizes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/prizes', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, description, winning_pattern } = req.body;
    const image_url = req.file ? req.file.path : null;
    
    let parsedPattern = null;
    if (winning_pattern) {
      try {
        parsedPattern = typeof winning_pattern === 'string' ? JSON.parse(winning_pattern) : winning_pattern;
      } catch (e) {
        parsedPattern = winning_pattern; 
      }
    }

    const result = await query(
      'INSERT INTO prizes (name, description, image_url, winning_pattern) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, image_url, JSON.stringify(parsedPattern)]
    );
    
    cache.prizes = null; // Clear cache
    io.emit('prize_added', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error in POST /api/prizes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.put('/api/prizes/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, winning_pattern } = req.body;
    let image_url = req.body.image_url;
    
    let parsedPattern = null;
    if (winning_pattern) {
      try {
        parsedPattern = typeof winning_pattern === 'string' ? JSON.parse(winning_pattern) : winning_pattern;
      } catch (e) {
        parsedPattern = winning_pattern;
      }
    }
    
    if (req.file) {
      image_url = req.file.path;
    }

    const result = await query(
      'UPDATE prizes SET name = $1, description = $2, image_url = $3, winning_pattern = $4 WHERE id = $5 RETURNING *',
      [name, description, image_url, JSON.stringify(parsedPattern), id]
    );
    cache.prizes = null; // Clear cache
    io.emit('prize_updated', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error in PUT /api/prizes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.delete('/api/prizes/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM prizes WHERE id = $1', [req.params.id]);
    cache.prizes = null; // Clear cache
    io.emit('prize_removed', req.params.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/prizes/start', authenticateToken, async (req, res) => {
  const { prize_id } = req.body;
  try {
    await query("UPDATE prizes SET status = 'pending' WHERE status = 'active'");
    const result = await query("UPDATE prizes SET status = 'active' WHERE id = $1 RETURNING *", [prize_id]);
    const activePrize = result.rows[0];
    cache.currentGame = null; // Clear cache
    io.emit('game_started', { prize: activePrize, drawnNumbers: [] });
    res.json(activePrize);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/prizes/draw', authenticateToken, async (req, res) => {
  const { prize_id, number } = req.body;
  const letter = getLetter(number);

  try {
    const result = await query(
      'INSERT INTO drawn_numbers (prize_id, number, letter) VALUES ($1, $2, $3) RETURNING *',
      [prize_id, number, letter]
    );
    const drawnNumber = result.rows[0];
    drawnNumber.formatted_time = moment(drawnNumber.drawn_at).tz(TIMEZONE).format('HH:mm:ss');
    cache.currentGame = null; // Clear cache
    io.emit('number_drawn', drawnNumber);
    res.json(drawnNumber);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/prizes/finish', authenticateToken, async (req, res) => {
  const { prize_id, winner_name } = req.body;
  try {
    const result = await query(
      "UPDATE prizes SET status = 'finished', winner_name = $1, finished_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
      [winner_name || 'Desconocido', prize_id]
    );
    cache.currentGame = null; // Clear cache
    cache.prizes = null; // Clear prizes cache too
    io.emit('game_finished', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/game/current', async (req, res) => {
  try {
    if (cache.currentGame && (Date.now() - cache.lastUpdate < cache.TTL)) {
      return res.json(cache.currentGame);
    }

    const prizeResult = await query("SELECT * FROM prizes WHERE status = 'active' LIMIT 1");
    const prize = prizeResult.rows[0];
    if (!prize) {
      cache.currentGame = { prize: null, drawnNumbers: [] };
      return res.json(cache.currentGame);
    }
    const numbersResult = await query('SELECT * FROM drawn_numbers WHERE prize_id = $1 ORDER BY drawn_at DESC', [prize.id]);
    
    cache.currentGame = { prize, drawnNumbers: numbersResult.rows };
    res.json(cache.currentGame);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/prizes/:id/history', async (req, res) => {
  try {
    const prizeResult = await query('SELECT * FROM prizes WHERE id = $1', [req.params.id]);
    const numbersResult = await query('SELECT * FROM drawn_numbers WHERE prize_id = $1 ORDER BY drawn_at ASC', [req.params.id]);
    res.json({ prize: prizeResult.rows[0], drawnNumbers: numbersResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GOOGLE INTEGRATION ---

app.get('/api/winner-verification/:ticketNumber', authenticateToken, async (req, res) => {
  const { ticketNumber } = req.params;
  
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
    return res.status(500).json({ error: 'Google API credentials not configured' });
  }

  try {
    const auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    });

    // 1. Search in Google Sheets
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
    await doc.loadInfo();
    
    logger.log(`Iniciando búsqueda de ticket ${ticketNumber} en todas las pestañas...`);

    let seller = 'No encontrado';
    let buyer = 'No encontrado';
    let winnerRow = null;
    let foundSheetTitle = '';

    const normalizedTicket = String(ticketNumber).trim();

    // Iterate through all sheets to find the ticket
    for (let i = 0; i < doc.sheetCount; i++) {
      const sheet = doc.sheetsByIndex[i];
      // Skip sheets that are clearly not for bingo data (like "BASE DE DATOS" if it's locked/internal)
      if (sheet.title.includes('BASE DE DATOS')) continue;

      const rows = await sheet.getRows();
      logger.log(`Buscando en pestaña: "${sheet.title}" (${rows.length} filas)`);

      for (const row of rows) {
        // Different sheets might have different column structures
        let possibleIndices = [4, 3, 5]; // Default: E, D, F
        
        // Specific mapping for "EXTRA" sheet based on image
        if (sheet.title.toUpperCase().includes('EXTRA')) {
          possibleIndices = [3, 2, 4]; // In EXTRA, Código seems to be in D (index 3)
        }

        const foundMatch = possibleIndices.some(idx => {
          const val = row._rawData[idx];
          return val && String(val).trim() === normalizedTicket;
        });

        if (foundMatch) {
          winnerRow = row;
          foundSheetTitle = sheet.title;
          const rowIndex = rows.indexOf(row);
          
          // Apply specific mapping based on which sheet we found it in
          if (foundSheetTitle.toUpperCase().includes('BINGOS')) {
            // Seller: B, C, D (1, 2, 3) | Buyer: F, G, H (5, 6, 7)
            
            // Helper to get seller with upward search for merged cells
            const getSellerUpward = (idx) => {
              for (let r = rowIndex; r >= 0; r--) {
                const val = rows[r]._rawData[idx];
                if (val && String(val).trim() !== '') return val;
              }
              return '';
            };

            const sellerParts = [getSellerUpward(1), getSellerUpward(2), getSellerUpward(3)]
              .filter(p => p && String(p).trim() !== '');
            seller = sellerParts.join(' ') || 'Sin nombre del vendedor';
            
            const buyerParts = [row._rawData[5], row._rawData[6], row._rawData[7]].filter(p => p && String(p).trim() !== '');
            buyer = buyerParts.join(' ') || 'Sin nombre del comprador';
          } 
          else if (foundSheetTitle.toUpperCase().includes('EXTRA')) {
            // Based on image: Vendedor: B, C (1, 2) | Código: D (3) | Comprador: E, F, G (4, 5, 6)
            
            const getSellerUpward = (idx) => {
              for (let r = rowIndex; r >= 0; r--) {
                const val = rows[r]._rawData[idx];
                if (val && String(val).trim() !== '') return val;
              }
              return '';
            };

            const sellerParts = [getSellerUpward(1), getSellerUpward(2)].filter(p => p && String(p).trim() !== '');
            seller = sellerParts.join(' ') || 'Sin nombre del vendedor';
            
            const buyerParts = [row._rawData[4], row._rawData[5], row._rawData[6]].filter(p => p && String(p).trim() !== '');
            buyer = buyerParts.join(' ') || 'Sin nombre del comprador';
          }
          else {
            // Generic fallback for other sheets
            seller = row._rawData[1] || 'Encontrado (formato genérico)';
            buyer = row._rawData[5] || 'Encontrado (formato genérico)';
          }
          break;
        }
      }
      if (winnerRow) break; // Stop searching other sheets if found
    }
    
    if (winnerRow) {
      logger.log(`¡Ganador encontrado en "${foundSheetTitle}"! Vendedor: ${seller}, Comprador: ${buyer}`);
    } else {
      logger.warn(`No se encontró el ticket ${ticketNumber} en ninguna pestaña.`);
      return res.json({
        success: false,
        message: `El cartón Nro ${ticketNumber} no se encontró en BINGOS ni en EXTRA. Verifique el número.`,
        ticketNumber,
        seller: 'Nro NO REGISTRADO',
        buyer: 'Nro NO REGISTRADO',
        file: null
      });
    }

    // 2. Search in Google Drive for the image
    const drive = google.drive({ version: 'v3', auth });
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    let fileInfo = null;
    if (folderId) {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and (name contains '${ticketNumber}')`,
        fields: 'files(id, name, webContentLink, webViewLink, thumbnailLink, mimeType)',
      });

      // Filter exactly by name without extension or with allowed extensions
      const file = response.data.files.find(f => {
        const nameWithoutExt = f.name.split('.')[0];
        return nameWithoutExt === ticketNumber;
      });

      if (file) {
        fileInfo = {
          id: file.id,
          name: file.name,
          viewLink: file.webViewLink,
          downloadLink: file.webContentLink,
          thumbnail: file.thumbnailLink,
          mimeType: file.mimeType
        };
      }
    }

    res.json({
      success: true,
      ticketNumber,
      seller,
      buyer,
      file: fileInfo
    });

  } catch (err) {
    logger.error('Error in winner verification:', err);
    res.status(500).json({ error: 'Error al verificar el ganador con Google APIs: ' + err.message });
  }
});

// Socket logic
io.on('connection', (socket) => {
  logger.log('User connected:', socket.id);
  socket.on('disconnect', () => {
    logger.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled Error:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});


