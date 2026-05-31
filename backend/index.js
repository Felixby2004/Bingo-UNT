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
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { google } = require('googleapis');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// Enable trust proxy for Render/Cloudflare
app.set('trust proxy', 1);

// 1. CORS - Debe ir antes que cualquier otro middleware que maneje rutas
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (como apps móviles o curl)
    if (!origin) return callback(null, true);
    
    // Permitir localhost en desarrollo
    if (origin.includes('localhost')) return callback(null, true);
    
    // Permitir todos los subdominios de onrender.com (Frontend y Backend)
    if (origin.includes('.onrender.com')) return callback(null, true);
    
    // Permitir FRONTEND_URL explícito
    if (allowedOrigins.some(o => origin.startsWith(o))) return callback(null, true);
    
    // En desarrollo, permitir todo
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    
    callback(null, true); // Por ahora, permitimos para depurar
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// 2. Otros Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));
app.use(cookieParser());
app.use(express.json());
app.use(morgan('dev'));

// Rate Limiting for Login - Aumentado para evitar bloqueos por pruebas
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // 20 intentos
  message: { success: false, message: 'Demasiados intentos. Intente en 5 minutos.' },
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

// SendGrid Config for Email 2FA
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY.trim());
  logger.info('✅ SendGrid API Key configurada');
} else {
  logger.warn('⚠️ SENDGRID_API_KEY no encontrada en las variables de entorno');
}

// Function to generate and send email code
const sendEmailCode = async (email, username) => {
  if (!email) {
    logger.error(`Tentativa de envío de código fallida: No hay email configurado para el usuario ${username}`);
    throw new Error('El usuario no tiene un correo electrónico configurado.');
  }

  if (!process.env.SENDGRID_API_KEY) {
    logger.warn('SENDGRID_API_KEY missing. Skipping email send (check logs for code).');
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = Date.now() + 600000;
    
    await query(
      'INSERT INTO email_verification_codes (username, code, email, expires_at) VALUES ($1, $2, $3, $4)',
      [username, code, email, new Date(expiryTime)]
    );
    
    logger.info(`[DEV MODE] Código para ${username}: ${code}`);
    return code;
  }

  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
    const expiryTime = Date.now() + (parseInt(process.env.EMAIL_VERIFICATION_CODE_EXPIRY) || 600000); // Default 10 min
    
    logger.info(`Guardando código de verificación en BD para ${username}...`);
    // Save code in DB
    await query(
      'INSERT INTO email_verification_codes (username, code, email, expires_at) VALUES ($1, $2, $3, $4)',
      [username, code, email, new Date(expiryTime)]
    );
    logger.info(`🔐 CÓDIGO GENERADO PARA ${username}: ${code}`);
    logger.info(`Preparando envío de email via SendGrid a ${email}...`);

    // Send email via SendGrid HTTP API
    try {
      const msg = {
        to: email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL,
          name: 'Bingo UNT Admin'
        },
        replyTo: process.env.SENDGRID_FROM_EMAIL
      };

      // Si hay un Template ID, lo usamos. Si no, usamos el HTML por defecto.
      if (process.env.SENDGRID_TEMPLATE_ID) {
        msg.templateId = process.env.SENDGRID_TEMPLATE_ID;
        msg.dynamicTemplateData = {
          username: username,
          code: code
        };
      } else {
        msg.subject = '🔐 Tu Código de Acceso - Bingo UNT';
        msg.html = `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #1F3A93; text-align: center;">🎲 BINGO UNT - ACCESO ADMINISTRADOR</h2>
            <p style="font-size: 16px; color: #333;">¡Hola <strong>${username}</strong>!</p>
            <p style="font-size: 14px; color: #666;">Usa el siguiente código para verificar tu identidad:</p>
            <div style="background-color: #f0f0f0; border-left: 4px solid #FFD700; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="font-size: 32px; font-weight: bold; color: #1F3A93; letter-spacing: 5px; margin: 0;">${code}</p>
            </div>
          </div>
        `;
      }
      
      await sgMail.send(msg);
      logger.info(`✅ Email enviado exitosamente via SendGrid a ${email}`);
    } catch (mailErr) {
      logger.error(`❌ Error REAL al enviar el correo via SendGrid:`, mailErr.response ? mailErr.response.body : mailErr);
      logger.warn(`👉 Usa el código que aparece arriba en los logs para entrar.`);
    }

    return code;
  } catch (err) {
    logger.error('Error en sendEmailCode:', err);
    throw new Error('Error interno al generar código de acceso');
  }
};

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
logger.info('Iniciando conexión con la base de datos...');
initDb()
  .then(() => {
    logger.info('✅ Base de datos inicializada correctamente');
  })
  .catch(err => {
    logger.error('❌ Error crítico al inicializar la base de datos:', err);
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
  if (!token) {
    logger.warn(`Intento de acceso sin token a ${req.path}`);
    return res.status(401).json({ message: 'No autorizado' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.error(`Error de verificación de token en ${req.path}:`, err.message);
      return res.status(403).json({ message: 'Token inválido o expirado' });
    }
    req.user = user;
    next();
  });
};

// Middleware to verify 2FA for sensitive operations
const verify2FA = async (req, res, next) => {
  try {
    // Get user info
    const result = await query('SELECT two_fa_enabled, two_fa_secret FROM admin_users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    // If 2FA is not enabled, skip verification
    if (!user.two_fa_enabled) {
      return next();
    }

    // Get 2FA token from body or query
    const token2fa = req.body.token2fa || req.query.token2fa;
    if (!token2fa) {
      return res.status(401).json({ message: 'Token 2FA requerido', requires2FA: true });
    }

    // Verify 2FA token
    const verified = speakeasy.totp.verify({
      secret: user.two_fa_secret,
      encoding: 'base32',
      token: token2fa,
      window: 2 // Allow ±2 time windows for clock skew
    });

    if (!verified) {
      return res.status(401).json({ message: 'Código 2FA inválido' });
    }

    next();
  } catch (err) {
    logger.error('2FA verification error:', err);
    res.status(500).json({ error: 'Error al verificar 2FA' });
  }
};

// --- AUTH ---

app.post('/api/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip;
  const ua = req.headers['user-agent'];

  logger.info(`Intento de login para usuario: ${username} desde IP: ${ip}`);

  try {
    // Search case-insensitive for username
    const result = await query('SELECT * FROM admin_users WHERE LOWER(username) = LOWER($1)', [username]);
    const user = result.rows[0];

    if (!user) {
      logger.warn(`Usuario no encontrado: ${username}`);
      await query('INSERT INTO login_attempts (username, ip_address, user_agent, success) VALUES ($1, $2, $3, $4)', [username, ip, ua, false]);
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    // Check password
    let isMatch = false;
    if (user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = (password === user.password);
      // Auto-update to hashed if it was plaintext
      if (isMatch) {
        logger.info(`Actualizando contraseña de texto plano a hash para usuario: ${username}`);
        const hashedPassword = await bcrypt.hash(password, 10);
        await query('UPDATE admin_users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
      }
    }

    if (!isMatch) {
      logger.warn(`Contraseña incorrecta para usuario: ${username}`);
      await query('INSERT INTO login_attempts (username, ip_address, user_agent, success) VALUES ($1, $2, $3, $4)', [username, ip, ua, false]);
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    logger.info(`Credenciales correctas para ${username}. Enviando código...`);

    // NEW: Send email code instead of traditional 2FA
    try {
      await sendEmailCode(user.email || process.env.ADMIN_EMAIL, user.username);
      logger.info(`Login attempt - Email code sent to ${user.email || process.env.ADMIN_EMAIL}`);
      
      return res.json({ 
        success: true, 
        message: 'Código enviado a tu correo. Verifica tu email.',
        requiresEmailCode: true,
        userId: user.id
      });
    } catch (emailErr) {
      logger.error('Failed to send email code:', emailErr);
      return res.status(500).json({ success: false, message: emailErr.message || 'No se pudo enviar el código por email. Intenta de nuevo.' });
    }
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// NEW: Verify Email Code
app.post('/api/verify-email-code', loginLimiter, async (req, res) => {
  const { username, code } = req.body;

  logger.info(`Verificando código para usuario: ${username}, código: ${code}`);

  try {
    if (!code || !username) {
      logger.warn('Falta código o usuario en la petición de verificación');
      return res.status(400).json({ success: false, message: 'Código y usuario requeridos' });
    }

    // Find valid code
    const result = await query(
      'SELECT * FROM email_verification_codes WHERE LOWER(username) = LOWER($1) AND code = $2 AND used = FALSE ORDER BY created_at DESC LIMIT 1',
      [username, code]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Código inválido o expirado' });
    }

    // Get user info
    const userResult = await query('SELECT id, username, email, two_fa_enabled FROM admin_users WHERE LOWER(username) = LOWER($1)', [username]);
    const user = userResult.rows[0];

    if (!user) {
      logger.warn(`Usuario no encontrado durante la verificación: ${username}`);
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
    }

    logger.info(`Código verificado con éxito para ${username}. Marcando como usado...`);

    // Mark code as used
    await query('UPDATE email_verification_codes SET used = TRUE WHERE id = $1', [result.rows[0].id]);

    // Create JWT token
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '2h' });
    
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'strict' to 'lax' for cross-origin
      maxAge: 2 * 60 * 60 * 1000 // 2 hours
    });

    // Log successful login
    await query('INSERT INTO login_attempts (username, ip_address, user_agent, success) VALUES ($1, $2, $3, $4)', 
      [username, req.ip, req.headers['user-agent'], true]
    );

    res.json({ 
      success: true, 
      user: { id: user.id, username: user.username, two_fa_enabled: user.two_fa_enabled },
      message: '✅ Acceso concedido'
    });
  } catch (err) {
    logger.error('Email code verification error:', err);
    res.status(500).json({ success: false, message: 'Error al verificar el código' });
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
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.json({ success: true });
});

app.get('/api/admin/me', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT id, username, email, two_fa_enabled FROM admin_users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

app.post('/api/prizes', authenticateToken, verify2FA, upload.single('image'), async (req, res) => {
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

app.put('/api/prizes/:id', authenticateToken, verify2FA, upload.single('image'), async (req, res) => {
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

app.delete('/api/prizes/:id', authenticateToken, verify2FA, async (req, res) => {
  try {
    await query('DELETE FROM prizes WHERE id = $1', [req.params.id]);
    cache.prizes = null; // Clear cache
    io.emit('prize_removed', req.params.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/prizes/start', authenticateToken, verify2FA, async (req, res) => {
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

app.post('/api/prizes/draw', authenticateToken, verify2FA, async (req, res) => {
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

app.post('/api/prizes/finish', authenticateToken, verify2FA, async (req, res) => {
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

app.get('/api/winner-verification/:ticketNumber', async (req, res) => {
  const { ticketNumber } = req.params;
  
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
    return res.status(500).json({ error: 'Google API credentials not configured' });
  }

  try {
    // Process the private key - handle both escaped (\n) and literal newlines
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    if (typeof privateKey === 'string') {
      privateKey = privateKey.trim();
      // Handle escaped newlines: \\n -> actual newline
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    const auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.trim(),
      key: privateKey,
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


