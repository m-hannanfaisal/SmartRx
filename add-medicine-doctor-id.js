require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('Adding doctor_id column to medicines...');

  // Add nullable doctor_id column (NULL = global shared catalog)
  await pool.query(`ALTER TABLE medicines ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE`);

  // All existing 290 medicines stay with doctor_id = NULL (global)
  // Future doctor-added medicines will have doctor_id set

  // Create index for doctor-specific queries
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_medicines_doctor_id ON medicines(doctor_id)`);

  const { rows } = await pool.query("SELECT COUNT(*) AS total FROM medicines WHERE doctor_id IS NULL");
  console.log(`\n✅ Done! ${rows[0].total} medicines marked as global (shared catalog).`);
  console.log('   New medicines added by doctors will be private to them.\n');

  await pool.end();
}
main().catch(e => { console.error(e); pool.end(); });
