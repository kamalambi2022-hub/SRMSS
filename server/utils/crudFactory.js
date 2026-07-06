const express = require('express');
const { pool } = require('../db');
const { rowToCamel, objToSnake } = require('./caseConvert');
const { authenticateToken, blockOperatorWrites } = require('../middleware/auth');

/**
 * Builds a full REST CRUD router (GET all, GET one, POST, PUT, DELETE) for a
 * single Postgres table. Every route requires a valid access token; mutating
 * routes additionally block the read-only "Operator" role, mirroring the
 * frontend's isAuthorized() checks in App.tsx.
 *
 * @param {object} opts
 * @param {string} opts.table        - Postgres table name, e.g. "routes"
 * @param {string} opts.idPrefix     - Prefix used when the client doesn't send an id, e.g. "R"
 * @param {string} [opts.orderBy]    - ORDER BY clause (defaults to "id")
 */
function createCrudRouter({ table, idPrefix, orderBy = 'id' }) {
  const router = express.Router();
  router.use(authenticateToken);

  // GET /  -> list everything
  router.get('/', async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
      res.json(rowToCamel(result.rows));
    } catch (err) {
      console.error(`[${table}] list failed`, err);
      res.status(500).json({ error: `Failed to fetch ${table}` });
    }
  });

  // GET /:id -> single record
  router.get('/:id', async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rowToCamel(result.rows[0]));
    } catch (err) {
      console.error(`[${table}] get failed`, err);
      res.status(500).json({ error: `Failed to fetch record from ${table}` });
    }
  });

  // POST / -> create
  router.post('/', blockOperatorWrites, async (req, res) => {
    try {
      const body = { ...req.body };
      if (!body.id) body.id = `${idPrefix}-${Date.now()}`;

      const snake = objToSnake(body);
      const columns = Object.keys(snake);
      const values = Object.values(snake);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      const result = await pool.query(sql, values);
      res.status(201).json(rowToCamel(result.rows[0]));
    } catch (err) {
      console.error(`[${table}] create failed`, err);
      res.status(400).json({ error: err.message || `Failed to create record in ${table}` });
    }
  });

  // PUT /:id -> full update
  router.put('/:id', blockOperatorWrites, async (req, res) => {
    try {
      const body = { ...req.body };
      delete body.id; // id comes from the URL, never mutated
      const snake = objToSnake(body);
      const columns = Object.keys(snake);
      const values = Object.values(snake);

      if (columns.length === 0) {
        return res.status(400).json({ error: 'No fields provided to update' });
      }

      const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
      const sql = `UPDATE ${table} SET ${setClause} WHERE id = $${columns.length + 1} RETURNING *`;
      const result = await pool.query(sql, [...values, req.params.id]);

      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rowToCamel(result.rows[0]));
    } catch (err) {
      console.error(`[${table}] update failed`, err);
      res.status(400).json({ error: err.message || `Failed to update record in ${table}` });
    }
  });

  // DELETE /:id
  router.delete('/:id', blockOperatorWrites, async (req, res) => {
    try {
      const result = await pool.query(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
      console.error(`[${table}] delete failed`, err);
      res.status(400).json({ error: err.message || `Failed to delete record from ${table}` });
    }
  });

  return router;
}

module.exports = { createCrudRouter };
