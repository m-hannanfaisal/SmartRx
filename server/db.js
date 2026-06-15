const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Optional SSL for cloud/remote Postgres:
  // ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

/**
 * Run a single parameterised query.
 * Usage: const { rows } = await query('SELECT * FROM doctors WHERE id=$1', [id]);
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[db] ${text.slice(0, 80)} — ${Date.now() - start}ms`);
  }
  return res;
}

/**
 * Acquire a client for multi-statement transactions.
 * Always call client.release() in a finally block.
 */
async function getClient() {
  return pool.connect();
}

module.exports = { query, getClient, pool };
