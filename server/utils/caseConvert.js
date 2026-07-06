// Small helpers to translate between Postgres' snake_case columns and the
// camelCase shape the React app (and its TypeScript types) already expects.
// This keeps every existing component untouched — only App.tsx's data
// source changes (localStorage/mockData -> API).

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** Convert a single DB row (or array of rows) to camelCase keys. */
function rowToCamel(row) {
  if (Array.isArray(row)) return row.map(rowToCamel);
  if (row === null || typeof row !== 'object') return row;
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[snakeToCamel(key)] = value;
  }
  return out;
}

/** Convert a camelCase JS object's keys to snake_case for SQL use. */
function objToSnake(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    out[camelToSnake(key)] = value;
  }
  return out;
}

module.exports = { snakeToCamel, camelToSnake, rowToCamel, objToSnake };
