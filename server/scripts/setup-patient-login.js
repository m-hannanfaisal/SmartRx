require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const password = 'patient123';
  const hash = await bcrypt.hash(password, 12);

  // Set password for patient Ahmed Hassan (phone: 03001234567)
  await pool.query(
    'UPDATE patients SET password_hash = $1 WHERE phone = $2',
    [hash, '03001234567']
  );

  console.log('\n✅  Patient login created!');
  console.log('─────────────────────────────');
  console.log('  Phone:    03001234567');
  console.log('  Password: patient123');
  console.log('  Name:     Ahmed Hassan');
  console.log('─────────────────────────────');
  console.log('\nGo to: http://localhost:8080/patient/login\n');

  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); });
