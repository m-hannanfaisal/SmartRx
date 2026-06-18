const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query } = require('../db');

// ----------------------------------------------------------------
// POST /api/patient-auth/login
// Patient logs in with phone + password
// JWT now carries `phone` so portal can access ALL doctor relationships
// ----------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    // Find all patients with this phone number that have a password set
    const { rows } = await query(
      `SELECT p.id, p.display_id, p.name, p.phone, p.age, p.gender,
              p.address, p.allergies, p.visit_count, p.last_visit_date,
              p.doctor_id, p.password_hash, p.created_at,
              d.name AS doctor_name, d.clinic_name, d.specialization
       FROM patients p
       JOIN doctors d ON d.id = p.doctor_id
       WHERE p.phone = $1 AND p.password_hash IS NOT NULL`,
      [phone.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'No account found with this phone number. Ask your doctor to set up your portal access.' });
    }

    // Try to match password against any patient record with this phone
    let matchedPatient = null;
    for (const row of rows) {
      const valid = await bcrypt.compare(password, row.password_hash);
      if (valid) {
        matchedPatient = row;
        break;
      }
    }

    if (!matchedPatient) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    // JWT now carries phone + role so we can find ALL patient records
    const token = jwt.sign(
      { phone: matchedPatient.phone, role: 'patient' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Build doctors list for this patient
    const doctors = rows.map(r => ({
      patient_id: r.id,
      doctor_id: r.doctor_id,
      doctor_name: r.doctor_name,
      clinic_name: r.clinic_name,
      specialization: r.specialization,
    }));

    const { password_hash, ...patientSafe } = matchedPatient;
    res.json({ token, patient: patientSafe, doctors });
  } catch (err) {
    console.error('[POST /patient-auth/login]', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ----------------------------------------------------------------
// POST /api/patient-auth/register
// Patient self-registers with phone + password (must already exist in system)
// ----------------------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    const { phone, password, name } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    // Find patients with this phone
    const { rows } = await query(
      `SELECT p.id, p.name, p.phone, p.password_hash, p.doctor_id,
              d.name AS doctor_name, d.clinic_name
       FROM patients p
       JOIN doctors d ON d.id = p.doctor_id
       WHERE p.phone = $1`,
      [phone.trim()]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No patient record found with this phone number. Please visit your doctor first.' });
    }

    // Check if already registered
    const alreadyRegistered = rows.find(r => r.password_hash);
    if (alreadyRegistered) {
      return res.status(409).json({ error: 'An account already exists for this phone number. Please sign in.' });
    }

    // Set password on ALL matching patient records with this phone
    const password_hash = await bcrypt.hash(password, 12);
    for (const row of rows) {
      await query(
        'UPDATE patients SET password_hash = $1 WHERE id = $2',
        [password_hash, row.id]
      );
    }

    const patientToRegister = rows[0];

    const token = jwt.sign(
      { phone: patientToRegister.phone, role: 'patient' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const doctors = rows.map(r => ({
      patient_id: r.id,
      doctor_id: r.doctor_id,
      doctor_name: r.doctor_name,
      clinic_name: r.clinic_name,
    }));

    res.status(201).json({
      token,
      patient: {
        id: patientToRegister.id,
        name: patientToRegister.name,
        phone: patientToRegister.phone,
        doctor_name: patientToRegister.doctor_name,
        clinic_name: patientToRegister.clinic_name,
      },
      doctors,
    });
  } catch (err) {
    console.error('[POST /patient-auth/register]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ----------------------------------------------------------------
// GET /api/patient-auth/me — returns current patient profile from JWT
// Now returns ALL doctor relationships
// ----------------------------------------------------------------
router.get('/me', async (req, res) => {
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

    // Support both old (patientId) and new (phone) JWT formats
    const phone = payload.phone;
    const patientId = payload.patientId;

    let rows;
    if (phone) {
      const result = await query(
        `SELECT p.id, p.display_id, p.name, p.phone, p.age, p.gender,
                p.address, p.allergies, p.visit_count, p.last_visit_date,
                p.doctor_id, p.created_at,
                d.name AS doctor_name, d.clinic_name, d.specialization
         FROM patients p
         JOIN doctors d ON d.id = p.doctor_id
         WHERE p.phone = $1
         ORDER BY p.created_at ASC`,
        [phone]
      );
      rows = result.rows;
    } else if (patientId) {
      // Backwards-compatible: old JWT with patientId
      const result = await query(
        `SELECT p.id, p.display_id, p.name, p.phone, p.age, p.gender,
                p.address, p.allergies, p.visit_count, p.last_visit_date,
                p.doctor_id, p.created_at,
                d.name AS doctor_name, d.clinic_name, d.specialization
         FROM patients p
         JOIN doctors d ON d.id = p.doctor_id
         WHERE p.phone = (SELECT phone FROM patients WHERE id = $1)
         ORDER BY p.created_at ASC`,
        [patientId]
      );
      rows = result.rows;
    }

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Patient not found' });
    }

    // Return primary patient profile (first record) + all doctor relationships
    const doctors = rows.map(r => ({
      patient_id: r.id,
      display_id: r.display_id,
      doctor_id: r.doctor_id,
      doctor_name: r.doctor_name,
      clinic_name: r.clinic_name,
      specialization: r.specialization,
    }));

    res.json({ patient: rows[0], doctors });
  } catch (err) {
    console.error('[GET /patient-auth/me]', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

module.exports = router;
