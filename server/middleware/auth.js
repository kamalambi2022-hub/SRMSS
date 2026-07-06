const jwt = require('../utils/jwt');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-only-insecure-access-secret-change-me';

/**
 * Requires a valid "Authorization: Bearer <accessToken>" header.
 * On success attaches `req.user = { id, username, role }`.
 */
function authenticateToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const payload = jwt.verify(token, ACCESS_SECRET);
  if (!payload) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }

  req.user = { id: payload.sub, username: payload.username, role: payload.role };
  next();
}

/**
 * Mirrors the frontend's write-permission rule: the "Operator" role is
 * read-only across every operational module. Apply this to mutating routes
 * (POST/PUT/DELETE) alongside authenticateToken.
 */
function blockOperatorWrites(req, res, next) {
  if (req.user?.role === 'Operator') {
    return res.status(403).json({ error: 'Operators do not have write access to this resource.' });
  }
  next();
}

module.exports = { authenticateToken, blockOperatorWrites, ACCESS_SECRET };
