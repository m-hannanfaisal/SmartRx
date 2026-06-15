require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const password = 'doctor123';
  const hash = await bcrypt.hash(password, 12);

  await pool.query(
    'UPDATE doctors SET password_hash = $1 WHERE email = $2',
    [hash, 'hannanfaisal0507@gmail.com']
  );

  console.log('\n✅  Doctor password reset!');
  console.log('─────────────────────────────');
  console.log('  Email:    hannanfaisal0507@gmail.com');
  console.log('  Password: doctor123');
  console.log('  Name:     Dr Yasir');
  console.log('─────────────────────────────');
  console.log('\nGo to: http://localhost:8080/login\n');

  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); });
