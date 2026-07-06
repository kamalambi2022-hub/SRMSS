const express = require('express');
const { pool } = require('../db');
const { verifyPassword } = require('../utils/password');
const jwt = require('../utils/jwt');
const { authenticateToken, ACCESS_SECRET } = require('../middleware/auth');

const router = express.Router();

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-only-insecure-refresh-secret-change-me';
const ACCESS_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_MIN || 30) * 60;
const REFRESH_TTL_SECONDS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7) * 24 * 60 * 60;

const INVALID_CREDENTIALS_MESSAGE = 'Invalid username or password. Please try again.';

function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function toAuthUser(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    depot: row.depot || undefined,
    avatarInitials: getInitials(row.display_name),
  };
}

function issueTokens(userRow) {
  const claims = { sub: userRow.id, username: userRow.username, role: userRow.role };
  const accessToken = jwt.sign(claims, ACCESS_SECRET, ACCESS_TTL_SECONDS);
  const refreshToken = jwt.sign(claims, REFRESH_SECRET, REFRESH_TTL_SECONDS);
  return {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + ACCESS_TTL_SECONDS * 1000,
  };
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = req.body.password; // never trim passwords

    if (!username || !password) {
      return res.status(400).json({ success: false, error: INVALID_CREDENTIALS_MESSAGE });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE lower(username) = $1 AND is_active = true',
      [username]
    );
    const userRow = result.rows[0];

    if (!userRow || !verifyPassword(password, userRow.password_hash)) {
      // Same generic error whether the username exists or not, and whichever
      // check failed — avoids leaking account existence.
      return res.status(401).json({ success: false, error: INVALID_CREDENTIALS_MESSAGE });
    }

    const session = { user: toAuthUser(userRow), tokens: issueTokens(userRow) };
    res.json({ success: true, session });
  } catch (err) {
    console.error('Login failed', err);
    res.status(500).json({ success: false, error: 'Login failed due to a server error.' });
  }
});

// GET /api/auth/me — used to validate a persisted session on app load
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1 AND is_active = true', [req.user.id]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Account no longer active.' });
    res.json({ user: toAuthUser(result.rows[0]) });
  } catch (err) {
    console.error('Fetching current user failed', err);
    res.status(500).json({ error: 'Failed to fetch current user.' });
  }
});

// POST /api/auth/refresh — body: { refreshToken }
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const payload = refreshToken && jwt.verify(refreshToken, REFRESH_SECRET);
    if (!payload) return res.status(401).json({ error: 'Refresh token invalid or expired.' });

    const result = await pool.query('SELECT * FROM users WHERE id = $1 AND is_active = true', [payload.sub]);
    const userRow = result.rows[0];
    if (!userRow) return res.status(401).json({ error: 'Account no longer active.' });

    const session = { user: toAuthUser(userRow), tokens: issueTokens(userRow) };
    res.json({ success: true, session });
  } catch (err) {
    console.error('Refresh failed', err);
    res.status(500).json({ error: 'Failed to refresh session.' });
  }
});

// POST /api/auth/logout — JWTs are stateless here, so this is a no-op beyond
// telling the client to drop its tokens (kept as a real endpoint so a token
// blacklist/rotation table can be added later without touching the frontend).
router.post('/logout', (_req, res) => {
  res.json({ success: true });
});

// POST /api/auth/password-reset — body: { username }
router.post('/password-reset', async (_req, res) => {
  // Always return the same generic message regardless of whether the account
  // exists — this endpoint doesn't send real emails yet; wire up a mailer
  // (SES/SendGrid/etc.) here when ready.
  res.json({
    success: true,
    message: 'If an account matches those details, password reset instructions have been sent.',
  });
});

module.exports = router;
