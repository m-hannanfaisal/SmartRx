require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── 1. Fix doctor phone ──────────────────────────────
    await client.query(
      `UPDATE doctors SET phone = '03001112233' WHERE email = 'hannanfaisal0507@gmail.com' AND (phone IS NULL OR phone = '')`
    );

    // Get doctor ID
    const { rows: docs } = await client.query(
      `SELECT id FROM doctors WHERE email = 'hannanfaisal0507@gmail.com'`
    );
    if (docs.length === 0) throw new Error('Doctor not found');
    const doctorId = docs[0].id;

    // ── 2. Delete old patients to start fresh ────────────
    await client.query('DELETE FROM patients WHERE doctor_id = $1', [doctorId]);

    // ── 3. Create 10 patients ────────────────────────────
    const patientPassword = await bcrypt.hash('patient123', 12);

    const patients = [
      { name: 'Ahmed Hassan',    phone: '03001234567', age: 32, gender: 'Male',   address: '123 Gulberg III, Lahore',    allergies: 'Penicillin' },
      { name: 'Fatima Malik',    phone: '03012345678', age: 28, gender: 'Female', address: '45 DHA Phase 5, Karachi',    allergies: null },
      { name: 'Muhammad Ali',    phone: '03023456789', age: 45, gender: 'Male',   address: '78 F-8 Markaz, Islamabad',   allergies: 'Sulfa drugs' },
      { name: 'Ayesha Khan',     phone: '03034567890', age: 35, gender: 'Female', address: '12 Cantt Area, Rawalpindi',  allergies: null },
      { name: 'Usman Tariq',     phone: '03045678901', age: 55, gender: 'Male',   address: '90 Model Town, Lahore',      allergies: 'Aspirin' },
      { name: 'Sana Iqbal',      phone: '03056789012', age: 22, gender: 'Female', address: '34 Satellite Town, Multan',  allergies: null },
      { name: 'Bilal Ahmed',     phone: '03067890123', age: 40, gender: 'Male',   address: '56 University Road, Peshawar', allergies: 'Ibuprofen' },
      { name: 'Hira Noor',       phone: '03078901234', age: 30, gender: 'Female', address: '23 Jail Road, Lahore',       allergies: null },
      { name: 'Zain Ul Abideen', phone: '03089012345', age: 60, gender: 'Male',   address: '67 Clifton Block 5, Karachi', allergies: 'Codeine' },
      { name: 'Mariam Bibi',     phone: '03090123456', age: 50, gender: 'Female', address: '89 Wapda Town, Faisalabad', allergies: null },
    ];

    const patientIds = [];
    for (const p of patients) {
      const { rows } = await client.query(
        `INSERT INTO patients (doctor_id, name, phone, age, gender, address, allergies, display_id, password_hash)
         VALUES ($1, $2, $3, $4, $5::gender_type, $6, $7, '', $8)
         RETURNING id, display_id`,
        [doctorId, p.name, p.phone, p.age, p.gender, p.address, p.allergies, patientPassword]
      );
      patientIds.push({ id: rows[0].id, displayId: rows[0].display_id, name: p.name, phone: p.phone });
    }

    // ── 4. Get some medicine IDs (names include strength like 'Paracetamol 500mg') ──
    const medNames = [
      'Paracetamol', 'Amoxicillin', 'Omeprazole', 'Cetirizine', 'Metformin',
      'Ibuprofen', 'Azithromycin', 'Vitamin D3', 'Vitamin C', 'Amlodipine',
      'Montelukast', 'Salbutamol', 'Atorvastatin', 'Losartan', 'Pantoprazole'
    ];
    const medMap = {};
    for (const baseName of medNames) {
      const { rows: found } = await client.query(
        "SELECT id, name FROM medicines WHERE name ILIKE $1 LIMIT 1",
        [baseName + '%']
      );
      if (found.length > 0) medMap[baseName] = found[0].id;
    }

    // ── 5. Create prescriptions ──────────────────────────
    const prescriptions = [
      {
        patientIdx: 0, date: '2026-05-08', diagnosis: 'Acute Pharyngitis',
        labTests: 'CBC, ESR', nextVisit: '2026-05-15',
        items: [
          { med: 'Amoxicillin', strength: '500mg', days: 7, times: 3, notes: 'Take after meals' },
          { med: 'Paracetamol', strength: '500mg', days: 5, times: 3, notes: 'For fever' },
          { med: 'Cetirizine', strength: '10mg', days: 5, times: 1, notes: 'At bedtime' },
        ]
      },
      {
        patientIdx: 0, date: '2026-04-20', diagnosis: 'Gastritis',
        labTests: null, nextVisit: '2026-05-08',
        items: [
          { med: 'Omeprazole', strength: '20mg', days: 14, times: 2, notes: 'Before meals' },
          { med: 'Paracetamol', strength: '500mg', days: 3, times: 2, notes: 'As needed for pain' },
        ]
      },
      {
        patientIdx: 1, date: '2026-05-07', diagnosis: 'Upper Respiratory Infection',
        labTests: 'Throat culture', nextVisit: '2026-05-14',
        items: [
          { med: 'Azithromycin', strength: '500mg', days: 5, times: 1, notes: 'Take on empty stomach' },
          { med: 'Vitamin C', strength: '1000mg', days: 10, times: 1, notes: 'Daily supplement' },
          { med: 'Paracetamol', strength: '650mg', days: 5, times: 3, notes: 'For fever/pain' },
        ]
      },
      {
        patientIdx: 2, date: '2026-05-05', diagnosis: 'Hypertension - Follow up',
        labTests: 'Lipid profile, Renal function', nextVisit: '2026-06-05',
        items: [
          { med: 'Amlodipine', strength: '5mg', days: 30, times: 1, notes: 'Morning dose' },
          { med: 'Losartan', strength: '50mg', days: 30, times: 1, notes: 'Evening dose' },
          { med: 'Atorvastatin', strength: '20mg', days: 30, times: 1, notes: 'At bedtime' },
        ]
      },
      {
        patientIdx: 4, date: '2026-05-01', diagnosis: 'Type 2 Diabetes Mellitus',
        labTests: 'HbA1c, Fasting glucose', nextVisit: '2026-06-01',
        items: [
          { med: 'Metformin', strength: '500mg', days: 30, times: 2, notes: 'After meals' },
          { med: 'Vitamin D3', strength: '2000IU', days: 30, times: 1, notes: 'Daily' },
        ]
      },
      {
        patientIdx: 5, date: '2026-05-06', diagnosis: 'Allergic Rhinitis',
        labTests: null, nextVisit: null,
        items: [
          { med: 'Cetirizine', strength: '10mg', days: 10, times: 1, notes: 'At bedtime' },
          { med: 'Montelukast', strength: '10mg', days: 14, times: 1, notes: 'Evening' },
          { med: 'Vitamin C', strength: '500mg', days: 14, times: 1, notes: 'Morning' },
        ]
      },
      {
        patientIdx: 8, date: '2026-05-03', diagnosis: 'Chronic Back Pain',
        labTests: 'X-ray Lumbar Spine', nextVisit: '2026-05-17',
        items: [
          { med: 'Ibuprofen', strength: '400mg', days: 7, times: 3, notes: 'After meals' },
          { med: 'Paracetamol', strength: '500mg', days: 7, times: 3, notes: 'Alternate with Ibuprofen' },
          { med: 'Vitamin D3', strength: '5000IU', days: 30, times: 1, notes: 'Weekly' },
        ]
      },
    ];

    for (const rx of prescriptions) {
      const pat = patientIds[rx.patientIdx];
      const { rows: rxRows } = await client.query(
        `INSERT INTO prescriptions (patient_id, doctor_id, date, diagnosis, lab_tests, next_visit_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'issued')
         RETURNING id`,
        [pat.id, doctorId, rx.date, rx.diagnosis, rx.labTests, rx.nextVisit]
      );
      const rxId = rxRows[0].id;

      for (const item of rx.items) {
        const medId = medMap[item.med];
        if (!medId) { console.warn('Medicine not found:', item.med); continue; }
        await client.query(
          `INSERT INTO prescription_items (prescription_id, medicine_id, strength, days, times_per_day, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [rxId, medId, item.strength, item.days, item.times, item.notes]
        );
      }
    }

    // ── 6. Add some chat messages for patient 1 ──────────
    const pat1 = patientIds[0].id;
    const chatMessages = [
      { sender: 'patient', msg: 'Assalam o Alaikum Doctor, I have been experiencing sore throat for 3 days now.' },
      { sender: 'doctor',  msg: 'Wa Alaikum Assalam Ahmed. Please come to the clinic today for a check-up. Are you having fever as well?' },
      { sender: 'patient', msg: 'Yes doctor, mild fever around 100°F. Should I take any medicine before coming?' },
      { sender: 'doctor',  msg: 'You can take Paracetamol 500mg for now. Come to the clinic between 4-6 PM today.' },
      { sender: 'patient', msg: 'Thank you doctor. I will be there at 5 PM InshaAllah.' },
    ];
    for (const cm of chatMessages) {
      await client.query(
        `INSERT INTO chat_messages (patient_id, doctor_id, sender_type, message, is_read)
         VALUES ($1, $2, $3, $4, true)`,
        [pat1, doctorId, cm.sender, cm.msg]
      );
    }

    await client.query('COMMIT');

    // ── Print results ────────────────────────────────────
    console.log('\n✅  Database seeded successfully!\n');
    console.log('══════════════════════════════════════════');
    console.log('  🩺 DOCTOR LOGIN  →  /login');
    console.log('──────────────────────────────────────────');
    console.log('  Email:    hannanfaisal0507@gmail.com');
    console.log('  Password: doctor123');
    console.log('══════════════════════════════════════════');
    console.log('  👤 PATIENT LOGIN  →  /patient/login');
    console.log('──────────────────────────────────────────');
    console.log('  ALL patients use password: patient123');
    console.log('──────────────────────────────────────────');
    patientIds.forEach(p => {
      console.log(`  ${p.displayId}  ${p.name.padEnd(18)} Phone: ${p.phone}`);
    });
    console.log('══════════════════════════════════════════');
    console.log('\n  7 prescriptions + 5 chat messages created.\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
