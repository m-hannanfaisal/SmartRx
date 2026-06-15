/**
 * migrate-seed-templates.js
 * One-time script: seeds the 10 starter templates for ALL existing doctors.
 * Run from the server/ directory:
 *   node scripts/migrate-seed-templates.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../db');
const { seedDoctorTemplates } = require('../seed-templates');

async function run() {
  const client = await pool.connect();
  try {
    const { rows: doctors } = await client.query(`SELECT id, email FROM doctors ORDER BY created_at`);
    console.log(`Found ${doctors.length} doctor(s). Seeding templates...\n`);

    for (const doc of doctors) {
      console.log(`→ ${doc.email}`);
      await client.query('BEGIN');
      try {
        await seedDoctorTemplates(client, doc.id);
        await client.query('COMMIT');
        console.log(`  ✓ 10 templates seeded`);
      } catch (e) {
        await client.query('ROLLBACK');
        console.error(`  ✗ failed: ${e.message}`);
      }
    }

    console.log('\nDone.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
