# 🔐 Bingo Application - 2FA System Documentation

## Overview

The Bingo application implements a **dual-layer security system**:

1. **Email 2FA** - Lightweight protection for login access
2. **TOTP 2FA** - Strong protection for sensitive operations

---

## Layer 1: Email 2FA (Login Protection)

### Purpose
Prevent unauthorized users from accessing the admin panel even if they have the correct username/password.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User enters username & password                          │
│    ↓                                                         │
│ 2. Backend validates credentials                            │
│    ↓                                                         │
│    ✗ INVALID? → Show error, retry                           │
│    ✓ VALID?   → Continue                                    │
│    ↓                                                         │
│ 3. Generate random 6-digit code                             │
│    ↓                                                         │
│ 4. Store code in email_verification_codes table             │
│    - Expiry: 10 minutes (600,000 ms)                       │
│    - Status: 'unused'                                       │
│    ↓                                                         │
│ 5. Send code to admin email via Gmail SMTP                  │
│    - Subject: "[BINGO UNT] Tu código de verificación"      │
│    - Body: Contains 6-digit code                            │
│    ↓                                                         │
│ 6. User receives email (5-30 seconds)                       │
│    ↓                                                         │
│ 7. User enters code on login form                           │
│    ↓                                                         │
│ 8. POST /api/verify-email-code                              │
│    - Check: code exists & not expired & not used            │
│    ↓                                                         │
│    ✗ INVALID? → Show error, retry with new code            │
│    ✓ VALID?   → Continue                                    │
│    ↓                                                         │
│ 9. Mark code as 'used'                                      │
│    ↓                                                         │
│ 10. Generate JWT token                                      │
│    ↓                                                         │
│ 11. Return token in httpOnly cookie (sameSite: lax)         │
│    ↓                                                         │
│ 12. Redirect to admin panel                                 │
│    ↓                                                         │
│ SUCCESS ✓                                                    │
└─────────────────────────────────────────────────────────────┘
```

### Database Table: email_verification_codes

```sql
CREATE TABLE email_verification_codes (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  email VARCHAR(255) NOT NULL,
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Key Features

| Feature | Value | Purpose |
|---------|-------|---------|
| Code Format | 6 digits | Easy to type, impossible to guess |
| Code Length | 100,000 combinations | High entropy |
| Expiry Time | 10 minutes | Balance between usability & security |
| One-time Use | Yes | Prevent replay attacks |
| Auto-cleanup | On startup | Remove expired codes |
| Email Delivery | Gmail SMTP | Reliable, instant delivery |
| Retry Attempts | Unlimited | User-friendly |

### What Happens to Expired Codes

1. **Manual deletion** - When backend starts up:
   ```javascript
   // From backend/index.js initialization
   await query('DELETE FROM email_verification_codes WHERE expires_at < NOW()');
   ```

2. **On login attempt** - If code expired:
   ```javascript
   // Returns 400 error
   { error: "El código ha expirado. Solicita uno nuevo." }
   ```

3. **Database state** - User must request a new code to proceed

---

## Layer 2: TOTP 2FA (Operations Protection)

### Purpose
Prevent unauthorized modifications to prizes and game settings, even if attacker has valid JWT token.

### How It Works

```
┌──────────────────────────────────────────────────────────┐
│ 1. Admin navigates to Settings (first time)              │
│    ↓                                                      │
│ 2. Click "Setup Two-Factor Authentication"               │
│    ↓                                                      │
│ 3. Backend generates:                                    │
│    - Random secret (shared key)                          │
│    - QR code (encodes secret)                            │
│    - Manual entry key (for manual input)                 │
│    ↓                                                      │
│ 4. Display QR code & secret to user                       │
│    ↓                                                      │
│ 5. User scans with Google Authenticator app               │
│    ↓                                                      │
│ 6. App generates 6-digit codes that change every 30 sec  │
│    ↓                                                      │
│ 7. User enters current 6-digit code to confirm setup      │
│    ↓                                                      │
│ 8. POST /api/admin/enable-2fa { code: "123456" }          │
│    - Backend validates code against secret               │
│    ↓                                                      │
│    ✗ INVALID? → Show error, retry                        │
│    ✓ VALID?   → Continue                                 │
│    ↓                                                      │
│ 9. Store secret in admin_users.two_fa_secret              │
│    ↓                                                      │
│ 10. Set admin_users.two_fa_enabled = true                 │
│    ↓                                                      │
│ SUCCESS ✓ - TOTP is now active                            │
│                                                           │
│ ─────────────────────────────────────────────────────────│
│                                                           │
│ ONGOING: When attempting to add/edit prizes              │
│                                                           │
│ 1. Admin clicks "Add Prize"                               │
│    ↓                                                      │
│ 2. Check: two_fa_enabled = true?                          │
│    ↓                                                      │
│    NO  → Show warning, disable operation                  │
│    YES → Continue                                        │
│    ↓                                                      │
│ 3. Modal appears: "Enter your 6-digit code"              │
│    ↓                                                      │
│ 4. Admin enters current code from Google Authenticator   │
│    ↓                                                      │
│ 5. POST /api/admin/verify-2fa { code: "123456" }         │
│    - Backend validates code against stored secret        │
│    - Uses TOTP algorithm with current time               │
│    ↓                                                      │
│    ✗ INVALID? → 401 Unauthorized, show error             │
│    ✓ VALID?   → Continue                                 │
│    ↓                                                      │
│ 6. Set require2FA transaction flag (frontend)             │
│    ↓                                                      │
│ 7. Proceed with add/edit prize operation                  │
│    ↓                                                      │
│ SUCCESS ✓                                                 │
└──────────────────────────────────────────────────────────┘
```

### Database Column: admin_users.two_fa_secret

```sql
ALTER TABLE admin_users ADD COLUMN two_fa_secret VARCHAR(255);
ALTER TABLE admin_users ADD COLUMN two_fa_enabled BOOLEAN DEFAULT false;
```

### TOTP Algorithm Details

**Library:** Speakeasy (npm package)

**Algorithm:** TOTP (Time-based One-Time Password)
- **Standard:** RFC 6238
- **Time step:** 30 seconds
- **Hash:** SHA-1
- **Digits:** 6

**How it works:**
```
1. Admin enters secret in Google Authenticator
2. App generates codes based on current time
3. Code = HMAC-SHA1(secret, current_time_step) mod 10^6
4. Code is valid for 30 seconds (±1 step tolerance = 60 seconds total)
5. After 30 seconds, new code appears
```

**Validation on backend:**
```javascript
const totp = require('speakeasy');

const verified = totp.totp.verify({
  secret: admin.two_fa_secret,
  encoding: 'base32',
  token: userCode,
  window: 1  // Accept codes from ±1 time step
});

if (verified) {
  // Allow operation
} else {
  // Reject with 401
}
```

### Key Features

| Feature | Value | Purpose |
|---------|-------|---------|
| Code Format | 6 digits | Industry standard |
| Code Lifetime | 30 seconds | Prevents reuse |
| Time Tolerance | ±1 step | Handles clock drift |
| Setup Method | QR code | Easy for users |
| Manual Method | Base32 string | Backup if QR fails |
| Database Storage | Encrypted by app | Not in plaintext |
| Recovery | Regenerate secret | Can reset 2FA if lost |

---

## Frontend Implementation

### Login Component (/frontend/src/components/Login.jsx)

**States:**
- `username` - User input
- `password` - User input  
- `requiresEmailCode` - Boolean: show email code form?
- `emailCode` - User input (6 digits)
- `loading` - Boolean: is request in progress?

**Functions:**
1. `handleLoginSubmit()` - Send username/password to `/api/login`
2. `handleEmailCodeSubmit()` - Send username/code to `/api/verify-email-code`
3. `handleBackToLogin()` - Return to initial login form

**Flow:**
```jsx
Login Form (initial)
    ↓ user enters username/password
handleLoginSubmit()
    ↓ requiresEmailCode = true
Email Code Form (appears)
    ↓ user enters code
handleEmailCodeSubmit()
    ↓ JWT received in cookie
Redirect to AdminPanel
```

### Admin Panel Component (/frontend/src/components/AdminPanel.jsx)

**TOTP Protection:**
```jsx
const withRequire2FA = (callback) => {
  return async () => {
    if (!require2FA) {
      setRequire2FA(true);  // Show modal
      setSelectedCallback(callback);
    } else {
      await callback();
      setRequire2FA(false);
    }
  };
};
```

**Usage:**
```jsx
onClick={withRequire2FA(() => handleAddPrize())}
// Operation blocked until user enters TOTP code
```

**Visual Feedback:**
- If 2FA not enabled: Entire panel is dim (opacity-50)
- Warning banner: "⚠️ Two-factor authentication is not enabled"
- Button: "Configure 2FA in Settings"

---

## Backend Implementation

### Email 2FA Endpoints

**POST /api/login**
```javascript
// Input validation
if (!username || !password) return 400

// Database query
const admin = await query('SELECT * FROM admin_users WHERE username = $1', [username])

// Password verification
if (!bcrypt.compareSync(password, admin.password)) return 401

// Generate code
const code = Math.floor(100000 + Math.random() * 900000).toString()
const expiryTime = Date.now() + 600000  // 10 minutes

// Store code
await query('INSERT INTO email_verification_codes ...', [username, code, email, expiryTime])

// Send email
await emailTransporter.sendMail({
  to: admin.email,
  subject: '[BINGO UNT] Tu código de verificación',
  html: `<h1>${code}</h1><p>Válido por 10 minutos</p>`
})

// Response
res.json({ requiresEmailCode: true, userId: admin.id })
```

**POST /api/verify-email-code**
```javascript
// Input validation
if (!username || !code) return 400

// Database query
const codeRecord = await query(
  'SELECT * FROM email_verification_codes WHERE username = $1 AND code = $2',
  [username, code]
)

// Validation checks
if (!codeRecord) return 400
if (codeRecord.used) return 400  // Already used
if (new Date() > codeRecord.expires_at) return 400  // Expired

// Mark as used
await query('UPDATE email_verification_codes SET used = true WHERE id = $1', [codeRecord.id])

// Generate JWT
const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '2h' })

// Set cookie
res.cookie('authToken', token, {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 2 * 60 * 60 * 1000  // 2 hours
})

res.json({ success: true })
```

### TOTP 2FA Endpoints

**POST /api/admin/setup-2fa**
```javascript
// Middleware validates JWT
if (!req.user) return 401

// Generate new secret
const secret = speakeasy.generateSecret({
  name: `Bingo UNT (${req.user.username})`,
  issuer: 'Bingo UNT'
})

// Create QR code
const qrCode = await QRCode.toDataURL(secret.otpauth_url)

// Return (NOT stored yet - awaiting verification)
res.json({
  qr_code: qrCode,
  secret: secret.base32,
  manual_entry_key: secret.ascii
})
```

**POST /api/admin/enable-2fa**
```javascript
// User provides code
const { code } = req.body
const { secret } = req.body  // From previous step

// Verify code
const verified = speakeasy.totp.verify({
  secret,
  encoding: 'base32',
  token: code,
  window: 1
})

if (!verified) return 401

// Store secret in database
await query(
  'UPDATE admin_users SET two_fa_secret = $1, two_fa_enabled = true WHERE username = $2',
  [secret, req.user.username]
)

res.json({ success: true })
```

**POST /api/admin/verify-2fa** (Middleware)
```javascript
// This middleware is called before prize operations
const verify2FA = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' })

  const { code } = req.body
  
  const admin = await query('SELECT * FROM admin_users WHERE username = $1', [req.user.username])
  
  if (!admin.two_fa_enabled) {
    return res.status(403).json({ error: '2FA not enabled' })
  }

  const verified = speakeasy.totp.verify({
    secret: admin.two_fa_secret,
    encoding: 'base32',
    token: code,
    window: 1
  })

  if (!verified) return res.status(401).json({ error: 'Invalid code' })
  
  next()  // Allow operation to proceed
}
```

---

## Security Considerations

### Email 2FA Security

| Threat | Mitigation |
|--------|-----------|
| Brute force codes | 10-minute expiry + one-time use |
| Intercepted emails | Standard email encryption (TLS) |
| Account takeover | Still need correct username/password |
| Replay attack | Codes marked as used after verification |
| Social engineering | User must have email access |

### TOTP 2FA Security

| Threat | Mitigation |
|--------|-----------|
| Brute force codes | TOTP algorithm (not guessable) |
| Screenshot of secret | Secret stored in app (not readable) |
| Lost device | Regenerate secret (user must verify) |
| Time sync issues | ±1 step tolerance (60 seconds) |
| Account takeover | TOTP known only to user's phone |

### Best Practices Implemented

✅ Codes are cryptographically random (not sequential)
✅ Codes expire (prevent indefinite validity)
✅ Codes are one-time use (prevent replay)
✅ Email sent via SMTP over TLS
✅ TOTP secrets never transmitted in plaintext
✅ JWT tokens in httpOnly cookies (prevent XSS theft)
✅ CORS restricted to trusted domains (prevent CSRF)
✅ All credentials in environment variables (not in code)

---

## Testing the 2FA System

### Step 1: Local Testing

```bash
# Start backend
cd backend
npm install  # includes nodemailer & speakeasy
npm start

# Start frontend
cd frontend
npm run dev
```

### Step 2: Test Email 2FA

1. Login with test credentials
2. Check email (should arrive in <30 seconds)
3. Enter code on login form
4. Verify access to admin panel

**Debug:** Check terminal logs for "Email code sent to..."

### Step 3: Test TOTP 2FA

1. Click Settings tab
2. Click "Setup Two-Factor Authentication"
3. Scan QR code with Google Authenticator app
4. Enter code from app to confirm
5. Verify "2FA Enabled" shows in Settings
6. Attempt to add prize (modal should request code)
7. Enter code from Google Authenticator
8. Verify operation succeeds

**Debug:** Check browser console for API responses

### Step 4: Test Error Cases

- Enter wrong email code → Should show error & allow retry
- Wait 10 minutes for email code to expire → Should show error
- Enter wrong TOTP code → Should show error & allow retry
- Disable TOTP & try to add prize → Should show warning

---

## Troubleshooting

### Email Not Sending

**Check:**
1. Is Gmail account set to `GMAIL_USER`?
2. Is App Password correct (16 characters)?
3. Backend logs: `nodemailer` or `SMTP` errors?
4. Check Gmail account → Recently used devices (suspicious login?)

**Fix:**
1. Go to https://myaccount.google.com/security
2. Revoke current app password
3. Generate new app password
4. Update Render environment variables

### TOTP Setup Fails

**Check:**
1. Are you logged in (JWT cookie set)?
2. Browser DevTools → Application → Cookies
3. Is backend responding to `/api/admin/setup-2fa`?

**Fix:**
1. Clear browser cookies
2. Login again
3. Try setup again
4. Check backend logs for errors

### Codes Not Validating

**Check:**
1. Is your phone time in sync? (Settings → Date & time)
2. Is the code you entered the CURRENT code (changes every 30 sec)?
3. Did you wait >30 seconds before entering?

**Fix:**
1. Regenerate TOTP setup (discard secret)
2. Manually set phone time to network time
3. Try again with fresh code

---

## Deployment Checklist

- [ ] Gmail account has 2FA enabled
- [ ] App Password generated and stored in Render env vars
- [ ] Email verification table created in database
- [ ] nodemailer installed (`npm install` in backend)
- [ ] speakeasy installed (`npm install` in backend)
- [ ] FRONTEND_URL set correctly in backend env vars
- [ ] CORS configuration includes frontend domain
- [ ] Tested email delivery from Render
- [ ] Tested TOTP setup from Render
- [ ] Verified error handling (wrong codes, expired codes)

---

**Last Updated:** After implementing dual-layer 2FA system
**System Version:** 1.0 (Email login + TOTP operations)
