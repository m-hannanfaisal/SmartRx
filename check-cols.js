require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='patients' ORDER BY ordinal_position")
  .then(r => { console.log(r.rows.map(x => x.column_name).join(', ')); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); });
