require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool } = require('./db');
const { authenticateToken, blockOperatorWrites } = require('./middleware/auth');

const app = express();
const PORT = process.env.SERVER_PORT || 4000;

app.use(cors());
app.use(express.json());

// Simple request log so CRUD activity is visible while developing.
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'unreachable', message: err.message });
  }
});

// Auth endpoints are public (you can't send a bearer token before you have one).
app.use('/api/auth', require('./routes/auth.routes'));

// Everything below requires a valid access token. Operators (read-only role)
// are additionally blocked from any non-GET request by blockOperatorWrites.
const requireAuth = [authenticateToken];
const writeGuard = (req, res, next) => (req.method === 'GET' ? next() : blockOperatorWrites(req, res, next));

app.use('/api/depots', ...requireAuth, writeGuard, require('./routes/depots.routes'));
app.use('/api/buses', ...requireAuth, writeGuard, require('./routes/buses.routes'));
app.use('/api/drivers', ...requireAuth, writeGuard, require('./routes/drivers.routes'));
app.use('/api/routes', ...requireAuth, writeGuard, require('./routes/routes.routes'));
app.use('/api/schedules', ...requireAuth, writeGuard, require('./routes/schedules.routes'));
app.use('/api/maintenance-logs', ...requireAuth, writeGuard, require('./routes/maintenance.routes'));
app.use('/api/fuel-logs', ...requireAuth, writeGuard, require('./routes/fuel.routes'));
// Audit logs are written by the server on every mutating action taken by the
// app — the frontend itself only ever creates entries (as the acting user),
// never edits/deletes history, so no writeGuard here.
app.use('/api/audit-logs', ...requireAuth, require('./routes/audit.routes'));
app.use('/api/bus-stops', ...requireAuth, writeGuard, require('./routes/busstops.routes'));

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`SRMSS API listening on http://localhost:${PORT}`);
});
