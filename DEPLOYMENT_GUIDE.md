# � Bingo Application - Deployment & Configuration Guide

## ✅ Implemented Features

### Dual-Layer Security System
1. **Email 2FA on Login** - 6-digit code sent to admin email (10-minute expiry)
2. **TOTP 2FA on Operations** - Google Authenticator for prize management (sensitive operations)

---

## 🔧 Configuration Steps for Render Deployment

### Step 1: Generate Gmail App Password

The application needs to send verification emails. Gmail requires an **App Password** (not your regular password).

**Follow these steps:**

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled
3. Click **App passwords** (only visible after 2FA is on)
4. Select `Mail` and `Windows Computer` (or your platform)
5. Google will generate a **16-character password**
6. Copy this password - you'll need it for Render

**Example:** `abcd efgh ijkl mnop` (with spaces, total 16 chars)

---

### Step 2: Configure Render Backend - Environment Variables

Go to your **Render Backend Service Dashboard** → **Environment**

Add/Update these variables:

```
# Email 2FA Configuration
ADMIN_EMAIL=andree.felix2004@gmail.com
GMAIL_USER=andree.felix2004@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
EMAIL_VERIFICATION_CODE_EXPIRY=600000

# Existing variables (keep them)
CLOUDINARY_CLOUD_NAME=your_value
CLOUDINARY_API_KEY=your_value
CLOUDINARY_API_SECRET=your_value
NODE_ENV=production

# Google Sheets (if using winner verification)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service@...
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
GOOGLE_SHEET_ID=your_id
GOOGLE_DRIVE_FOLDER_ID=your_id

# Other
JWT_SECRET=your_secret_key
FRONTEND_URL=https://your-frontend.onrender.com
TZ=America/Lima
```

---

### Step 3: Verify Database Schema

The backend automatically creates/updates the schema on startup. To verify:

1. Use the **PostgreSQL database connection** in Render
2. Run this query to verify tables exist:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('admin_users', 'email_verification_codes');
```

Expected result:
```
admin_users
email_verification_codes
```

---

## 🔐 Authentication Flow

### Login Process (Email 2FA)
```
1. User enters username & password → Click "ENVIAR CÓDIGO"
   ↓
2. Backend validates credentials against admin_users table
   ↓
3. If valid → Generates random 6-digit code
   ↓
4. Code stored in email_verification_codes with 10-minute expiry
   ↓
5. Code sent to admin email via Gmail SMTP
   ↓
6. User receives email in ~5-30 seconds
   ↓
7. User enters code → Backend validates and marks as 'used'
   ↓
8. JWT token returned in httpOnly cookie (sameSite: lax)
   ↓
9. Admin can now access admin panel
```

### Prize Management (TOTP 2FA)
```
1. Admin clicks "Add Prize" or "Edit Prize"
   ↓
2. Check: Is two_fa_enabled=true in admin_users?
   ↓
   NO  → Show Settings button, disable operations (opacity-50)
   YES → Show TOTP code modal
   ↓
3. Admin enters current 6-digit code from Google Authenticator
   ↓
4. Backend validates TOTP against two_fa_secret
   ↓
5. If valid → Operation proceeds
   If invalid → Show error, allow retry
```

---

## 🧪 Testing Checklist

### Before Production

- [ ] **Email Delivery**
  - [ ] Login with test admin account
  - [ ] Email arrives within 30 seconds
  - [ ] Code is exactly 6 digits
  - [ ] Different logins generate different codes

- [ ] **Email Verification**
  - [ ] Correct code = Login succeeds
  - [ ] Wrong code = "Invalid or expired code" error
  - [ ] Code after 10 minutes = "Expired" error
  - [ ] Can retry with new code

- [ ] **TOTP Setup**
  - [ ] Settings button visible
  - [ ] QR code displays correctly
  - [ ] Google Authenticator can scan it
  - [ ] Code appears in authenticator app

- [ ] **TOTP Verification**
  - [ ] Correct code = Operation succeeds
  - [ ] Wrong code = 401 Unauthorized error
  - [ ] Can retry immediately
  - [ ] Code changes every 30 seconds

- [ ] **Security**
  - [ ] `.env` file is in `.gitignore` (not committed)
  - [ ] Credentials only in environment variables
  - [ ] No hardcoded passwords in code
  - [ ] JWT token in httpOnly cookie (not localStorage)

- [ ] **CORS & Cookies**
  - [ ] Frontend can set JWT cookie
  - [ ] JWT persists across requests
  - [ ] Cross-domain requests include cookies
  - [ ] No CORS errors in browser console

---

## 🐛 Troubleshooting

### ❌ Email Not Arriving

**Check these in order:**

1. **Render Backend Logs**
   - Dashboard → Backend Service → Logs
   - Search for: `Email code sent to` or `nodemailer`
   - No log = Email code generation failed

2. **Gmail Configuration**
   - Is 2FA enabled on `andree.felix2004@gmail.com`?
   - Go to https://myaccount.google.com/apppasswords
   - Is the app password still active?
   - Create a new one if needed

3. **SMTP Error in Logs**
   - Look for: `Error sending email` or `SMTP`
   - Common: "Invalid login" = wrong app password
   - Solution: Copy the exact 16-character app password

4. **Check Email Spam Folder**
   - Gmail may classify it as spam initially
   - Mark as "Not spam" to train filter

### ❌ TOTP Code Not Validating

**Check:**
1. Time sync on your phone (Settings → Date & time)
2. Secret was saved correctly in database
3. You're entering the current 6-digit code (updates every 30 sec)
4. Device time is within 30 seconds of server

### ❌ "sameSite" Cookie Errors

**Current Status:** ✅ Fixed (using sameSite: 'lax')

If still having cookie issues:
1. Clear browser cookies: DevTools → Application → Cookies
2. Delete all `.onrender.com` cookies
3. Restart backend service on Render
4. Login again from fresh browser state

### ❌ 401 Unauthorized on Setup 2FA

**Cause:** JWT cookie not being sent

**Fix:**
1. Ensure login succeeded (no errors on email verification)
2. Check DevTools → Application → Cookies
3. Verify cookie name is `authToken`
4. Verify domain is the backend subdomain
5. Try again in an incognito window (no old cookies)

---

## 📚 API Endpoints Reference

### Public Endpoints
```
POST /api/login
  Body: { username, password }
  Response: { requiresEmailCode: true, userId: "..." }
  
POST /api/verify-email-code
  Body: { username, code }
  Response: (JWT in cookie)
  
GET /api/public/winners
  Response: [{ name, badge_count, ... }]
  
POST /api/public/verify-winner
  Body: { name, numbers: [...] }
  Response: { isWinner: boolean }
```

### Protected Endpoints (Require JWT Cookie)
```
GET /api/admin/check-2fa
  Response: { two_fa_enabled: boolean }
  
POST /api/admin/setup-2fa
  Response: { qr_code, secret, manual_entry_key }
  
POST /api/admin/enable-2fa
  Body: { code }
  Response: { success: true }
```

### Protected Endpoints (Require TOTP Verification)
```
POST /api/admin/verify-2fa
  Body: { code }
  Response: { success: true } or 401
  
POST /api/admin/add-prize
  Requires: Prior /api/admin/verify-2fa success
  
POST /api/admin/update-prize
  Requires: Prior /api/admin/verify-2fa success
```

---

## 🔒 Security Architecture

### What's Protected?
| Layer | Method | Purpose |
|-------|--------|---------|
| Login | Email 2FA | Prevent unauthorized access to admin panel |
| Operations | TOTP 2FA | Prevent unauthorized prize manipulation |
| Database | SSL/TLS | Encrypt database connections |
| Cookies | httpOnly | Prevent JavaScript theft |
| Cookies | sameSite=lax | Prevent CSRF attacks |

### What's Public? (By Design)
- Winner verification (users can check if they won)
- Bingo numbers (part of the game)
- Player voting (anonymous, no auth required)

### Credential Storage
| Secret | Storage | Location |
|--------|---------|----------|
| Database URL | Environment | Render Dashboard |
| JWT Secret | Environment | Render Dashboard |
| Google API Keys | Environment | Render Dashboard |
| Gmail App Password | Environment | Render Dashboard |
| Admin Password | Database | PostgreSQL (hashed) |
| Email Codes | Database | PostgreSQL (expires 10min) |
| TOTP Secret | Database | PostgreSQL (encrypted by app) |

---

## 🚀 Render Deployment Checklist

### Pre-Deployment
- [ ] All changes committed to GitHub
- [ ] `.env` file added to `.gitignore`
- [ ] `.env.example` updated with current vars
- [ ] Database migrations run locally

### Render Setup
- [ ] Backend service created and linked to GitHub
- [ ] Environment variables configured (email + Google Sheets + Cloudinary)
- [ ] Frontend service created (points to backend)
- [ ] PostgreSQL database created (free tier)

### Post-Deployment
- [ ] Backend service is running (no errors in logs)
- [ ] Database connection successful
- [ ] Email code sending works
- [ ] Login flow complete (email → TOTP → admin access)
- [ ] Prize operations protected by TOTP
- [ ] No CORS errors in browser console

### Monitoring
- [ ] Check Render logs daily for errors
- [ ] Monitor email delivery (Render logs + Gmail sent folder)
- [ ] Verify TOTP codes work reliably
- [ ] Monitor database connection (any timeouts?)

---

## 📞 Quick Reference

| Issue | Solution |
|-------|----------|
| Email not arriving | Check Gmail app password in Render env vars |
| TOTP setup fails | Restart backend service, clear browser cookies |
| Login freezes | Check browser console for CORS errors |
| Permission denied on prize ops | Verify TOTP is enabled in Settings |
| "Invalid code" error | Check phone time sync + 30-second window |

---

**Last Updated:** After implementing dual-layer 2FA system
**Commit:** f847dcb - Feature: Implement email-based login 2FA + TOTP 2FA for premium operations
