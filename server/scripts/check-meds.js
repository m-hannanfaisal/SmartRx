require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query("SELECT name FROM medicines WHERE name ILIKE '%paracetamol%' OR name ILIKE '%amoxicillin%' OR name ILIKE '%vitamin%' LIMIT 10")
  .then(r => { console.log(r.rows); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); });
