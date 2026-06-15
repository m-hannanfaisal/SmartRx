require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Add all missing columns from schema.sql feature additions
  console.log('Adding missing columns...');

  // prescription_items strength
  await pool.query(`ALTER TABLE prescription_items ADD COLUMN IF NOT EXISTS strength TEXT`);

  // prescription status enum + column
  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE prescription_status AS ENUM ('draft', 'issued', 'dispensed');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await pool.query(`ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS status prescription_status NOT NULL DEFAULT 'issued'`);

  // patients extra columns
  await pool.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT`);
  await pool.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS visit_count INTEGER NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_visit_date DATE`);

  // doctors dark mode
  await pool.query(`ALTER TABLE doctors ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN NOT NULL DEFAULT false`);

  // Trigger for visit stats
  await pool.query(`
    CREATE OR REPLACE FUNCTION update_patient_visit_stats()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      UPDATE patients
        SET visit_count = visit_count + 1,
            last_visit_date = NEW.date,
            updated_at = now()
      WHERE id = NEW.patient_id;
      RETURN NEW;
    END;
    $$
  `);
  await pool.query(`DROP TRIGGER IF EXISTS trg_patient_visit_stats ON prescriptions`);
  await pool.query(`
    CREATE TRIGGER trg_patient_visit_stats
      AFTER INSERT ON prescriptions
      FOR EACH ROW EXECUTE FUNCTION update_patient_visit_stats()
  `);

  // Indexes
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_patients_last_visit ON patients(last_visit_date DESC)`);

  console.log('All columns and triggers fixed!');
  await pool.end();
}
main().catch(e => { console.error('ERROR:', e.message); pool.end(); });
