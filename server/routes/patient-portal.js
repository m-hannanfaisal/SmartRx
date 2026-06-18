const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const { query } = require('../db');

// ─── Patient Auth Middleware (Multi-Doctor Aware) ─────────────
// Resolves phone from JWT → finds ALL patient records for that phone
async function requirePatientAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization' });
    }

    const token = authHeader.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Token invalid or expired' });
    }

    if (payload.role !== 'patient') {
      return res.status(403).json({ error: 'Not a patient token' });
    }

    // Support both phone-based (new) and patientId-based (old) JWTs
    let phone;
    if (payload.phone) {
      phone = payload.phone;
    } else if (payload.patientId) {
      const { rows: lookup } = await query('SELECT phone FROM patients WHERE id = $1', [payload.patientId]);
      if (lookup.length === 0) return res.status(401).json({ error: 'Patient not found' });
      phone = lookup[0].phone;
    } else {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get ALL patient records for this phone (one per doctor)
    const { rows } = await query(
      `SELECT p.*, d.name AS doctor_name, d.clinic_name, d.specialization
       FROM patients p
       JOIN doctors d ON d.id = p.doctor_id
       WHERE p.phone = $1
       ORDER BY p.created_at ASC`,
      [phone]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Patient not found' });
    }

    // Expose helpers on req
    req.patientPhone = phone;
    req.patientRecords = rows;                        // all records
    req.patientIds = rows.map(r => r.id);             // array of UUIDs
    req.patient = rows[0];                             // primary (first registered)
    req.patientId = rows[0].id;                        // backwards compat
    next();
  } catch (err) {
    console.error('[patient-portal auth]', err);
    res.status(500).json({ error: 'Auth error' });
  }
}

router.use(requirePatientAuth);

// ----------------------------------------------------------------
// GET /api/patient-portal/dashboard
// Aggregated dashboard across ALL doctors
// ----------------------------------------------------------------
router.get('/dashboard', async (req, res) => {
  try {
    const patientIds = req.patientIds;

    // Build $1, $2, ... parameter list for IN clause
    const placeholders = patientIds.map((_, i) => `$${i + 1}`).join(', ');

    // Get total prescription count (all doctors)
    const { rows: rxCount } = await query(
      `SELECT COUNT(*) AS count FROM prescriptions WHERE patient_id IN (${placeholders})`,
      patientIds
    );

    // Get latest prescription (across all doctors)
    const { rows: latestRx } = await query(
      `SELECT rx.id, rx.date, rx.diagnosis, rx.status, rx.next_visit_date,
              d.name AS doctor_name, d.clinic_name
       FROM prescriptions rx
       JOIN doctors d ON d.id = rx.doctor_id
       WHERE rx.patient_id IN (${placeholders})
       ORDER BY rx.date DESC, rx.created_at DESC
       LIMIT 1`,
      patientIds
    );

    // Get unread message count (from ALL doctors)
    const { rows: unreadCount } = await query(
      `SELECT COUNT(*) AS count FROM chat_messages
       WHERE patient_id IN (${placeholders}) AND sender_type = 'doctor' AND is_read = false`,
      patientIds
    );

    // Get distinct medicine count (all doctors)
    const { rows: medCount } = await query(
      `SELECT COUNT(DISTINCT pi.medicine_id) AS count
       FROM prescription_items pi
       JOIN prescriptions rx ON rx.id = pi.prescription_id
       WHERE rx.patient_id IN (${placeholders})`,
      patientIds
    );

    // Total visits across all doctors
    const totalVisits = req.patientRecords.reduce((sum, r) => sum + (r.visit_count || 0), 0);

    // Build doctors list
    const doctors = req.patientRecords.map(r => ({
      patient_id: r.id,
      doctor_id: r.doctor_id,
      doctor_name: r.doctor_name,
      clinic_name: r.clinic_name,
      specialization: r.specialization,
    }));

    const primary = req.patient;

    res.json({
      totalPrescriptions: parseInt(rxCount[0].count),
      unreadMessages: parseInt(unreadCount[0].count),
      totalMedicines: parseInt(medCount[0].count),
      latestPrescription: latestRx[0] || null,
      totalVisits,
      doctorCount: doctors.length,
      doctors,
      patient: {
        id: primary.id,
        display_id: primary.display_id,
        name: primary.name,
        phone: primary.phone,
        age: primary.age,
        gender: primary.gender,
        address: primary.address,
        allergies: primary.allergies,
        visit_count: totalVisits,
        last_visit_date: primary.last_visit_date,
        doctor_name: primary.doctor_name,
        clinic_name: primary.clinic_name,
        specialization: primary.specialization,
      },
    });
  } catch (err) {
    console.error('[GET /patient-portal/dashboard]', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ----------------------------------------------------------------
// GET /api/patient-portal/prescriptions
// Returns prescriptions from ALL doctors
// ----------------------------------------------------------------
router.get('/prescriptions', async (req, res) => {
  try {
    const patientIds = req.patientIds;
    const placeholders = patientIds.map((_, i) => `$${i + 1}`).join(', ');

    const { rows } = await query(
      `SELECT rx.id, rx.date, rx.diagnosis, rx.status, rx.lab_tests,
              rx.next_visit_date, rx.created_at,
              d.name AS doctor_name, d.clinic_name
       FROM prescriptions rx
       JOIN doctors d ON d.id = rx.doctor_id
       WHERE rx.patient_id IN (${placeholders})
       ORDER BY rx.date DESC, rx.created_at DESC`,
      patientIds
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /patient-portal/prescriptions]', err);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
});

// ----------------------------------------------------------------
// GET /api/patient-portal/prescriptions/:id
// ----------------------------------------------------------------
router.get('/prescriptions/:id', async (req, res) => {
  try {
    const patientIds = req.patientIds;
    const placeholders = patientIds.map((_, i) => `$${i + 2}`).join(', ');

    const { rows: rxRows } = await query(
      `SELECT rx.*, d.name AS doctor_name, d.clinic_name, d.specialization AS doctor_specialization,
              d.phone AS doctor_phone
       FROM prescriptions rx
       JOIN doctors d ON d.id = rx.doctor_id
       WHERE rx.id = $1 AND rx.patient_id IN (${placeholders})`,
      [req.params.id, ...patientIds]
    );

    if (rxRows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    // Attach items
    const { rows: itemRows } = await query(
      `SELECT pi.*, m.name AS medicine_name, m.category
       FROM prescription_items pi
       JOIN medicines m ON m.id = pi.medicine_id
       WHERE pi.prescription_id = $1`,
      [req.params.id]
    );

    const prescription = {
      ...rxRows[0],
      items: itemRows.map(row => ({
        id: row.id,
        medicine_id: row.medicine_id,
        medicineName: row.medicine_name,
        category: row.category,
        description: row.description,
        strength: row.strength,
        days: row.days,
        times_per_day: row.times_per_day,
        notes: row.notes,
      })),
    };

    res.json(prescription);
  } catch (err) {
    console.error('[GET /patient-portal/prescriptions/:id]', err);
    res.status(500).json({ error: 'Failed to fetch prescription' });
  }
});

// ----------------------------------------------------------------
// GET /api/patient-portal/doctors
// Returns all doctors this patient is registered with
// ----------------------------------------------------------------
router.get('/doctors', async (req, res) => {
  try {
    const doctors = req.patientRecords.map(r => ({
      patient_id: r.id,
      doctor_id: r.doctor_id,
      doctor_name: r.doctor_name,
      clinic_name: r.clinic_name,
      specialization: r.specialization,
    }));

    // Add unread count per doctor
    for (const doc of doctors) {
      const { rows } = await query(
        `SELECT COUNT(*) AS count FROM chat_messages
         WHERE patient_id = $1 AND doctor_id = $2 AND sender_type = 'doctor' AND is_read = false`,
        [doc.patient_id, doc.doctor_id]
      );
      doc.unread_count = parseInt(rows[0].count);
    }

    res.json(doctors);
  } catch (err) {
    console.error('[GET /patient-portal/doctors]', err);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// ----------------------------------------------------------------
// GET /api/patient-portal/chat?doctorId=xxx
// Get messages for a SPECIFIC doctor (required query param)
// If no doctorId, returns the first doctor's chat (backwards compat)
// ----------------------------------------------------------------
router.get('/chat', async (req, res) => {
  try {
    const doctorId = req.query.doctorId;

    // Find the patient record for this doctor
    let patientRecord;
    if (doctorId) {
      patientRecord = req.patientRecords.find(r => r.doctor_id === doctorId);
      if (!patientRecord) {
        return res.status(404).json({ error: 'Doctor not found in your records' });
      }
    } else {
      // backwards compat: use first doctor
      patientRecord = req.patient;
    }

    const { rows } = await query(
      `SELECT id, sender_type, message, is_read, created_at
       FROM chat_messages
       WHERE patient_id = $1 AND doctor_id = $2
       ORDER BY created_at ASC`,
      [patientRecord.id, patientRecord.doctor_id]
    );

    // Mark doctor messages as read
    await query(
      `UPDATE chat_messages SET is_read = true
       WHERE patient_id = $1 AND doctor_id = $2 AND sender_type = 'doctor' AND is_read = false`,
      [patientRecord.id, patientRecord.doctor_id]
    );

    res.json({
      messages: rows,
      doctor: {
        id: patientRecord.doctor_id,
        name: patientRecord.doctor_name,
        clinic_name: patientRecord.clinic_name,
        specialization: patientRecord.specialization,
      },
    });
  } catch (err) {
    console.error('[GET /patient-portal/chat]', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ----------------------------------------------------------------
// POST /api/patient-portal/chat
// Send a message to a specific doctor
// ----------------------------------------------------------------
router.post('/chat', async (req, res) => {
  try {
    const { message, doctorId } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Find patient record for this doctor
    let patientRecord;
    if (doctorId) {
      patientRecord = req.patientRecords.find(r => r.doctor_id === doctorId);
      if (!patientRecord) {
        return res.status(404).json({ error: 'Doctor not found in your records' });
      }
    } else {
      // backwards compat
      patientRecord = req.patient;
    }

    const { rows } = await query(
      `INSERT INTO chat_messages (patient_id, doctor_id, sender_type, message)
       VALUES ($1, $2, 'patient', $3)
       RETURNING id, sender_type, message, is_read, created_at`,
      [patientRecord.id, patientRecord.doctor_id, message.trim()]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /patient-portal/chat]', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
