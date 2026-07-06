const { Pool } = require('pg');

// DATABASE_URL example: postgres://postgres:yourpassword@localhost:5432/srmss
// Falls back to discrete PG* vars if DATABASE_URL isn't set.
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT) || 5432,
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'srmss',
      }
);

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error', err);
});

module.exports = { pool };
