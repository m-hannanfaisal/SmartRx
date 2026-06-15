const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query, getClient } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { seedDoctorTemplates } = require('../seed-templates');

// ----------------------------------------------------------------
// POST /api/auth/register
// ----------------------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, clinic_name, specialization, phone } = req.body;

    if (!email || !password || !name || !clinic_name || !specialization || !phone) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!/^\d{11}$/.test(phone)) {
      return res.status(400).json({ error: 'Phone number must be exactly 11 digits' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check for duplicate email
    const existing = await query('SELECT id FROM doctors WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    // Use a transaction so doctor + templates are created atomically
    const client = await getClient();
    let doctor;
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `INSERT INTO doctors (name, email, password_hash, clinic_name, specialization, phone)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, email, clinic_name, specialization, phone, created_at`,
        [name, email.toLowerCase().trim(), password_hash, clinic_name, specialization, phone]
      );
      doctor = rows[0];

      // Seed 10 starter templates for this doctor
      await seedDoctorTemplates(client, doctor.id);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      client.release();
      throw err;
    }
    client.release();

    const token = jwt.sign(
      { doctorId: doctor.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({ token, doctor });
  } catch (err) {
    console.error('[POST /auth/register]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ----------------------------------------------------------------
// POST /api/auth/login
// ----------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { rows } = await query(
      `SELECT id, name, email, password_hash, clinic_name, specialization, phone
       FROM doctors WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const doctor = rows[0];
    const valid  = await bcrypt.compare(password, doctor.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { doctorId: doctor.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Strip password_hash before sending
    const { password_hash, ...doctorSafe } = doctor;
    res.json({ token, doctor: doctorSafe });
  } catch (err) {
    console.error('[POST /auth/login]', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ----------------------------------------------------------------
// GET /api/auth/me  — returns current doctor from JWT
// ----------------------------------------------------------------
router.get('/me', requireAuth, async (req, res) => {
  res.json({ doctor: req.doctor });
});

// ----------------------------------------------------------------
// PUT /api/auth/profile  — update doctor profile
// ----------------------------------------------------------------
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, clinic_name, specialization, phone } = req.body;
    if (!name || !clinic_name || !specialization) {
      return res.status(400).json({ error: 'Name, clinic name, and specialization are required' });
    }

    const { rows } = await query(
      `UPDATE doctors
       SET name = $1, clinic_name = $2, specialization = $3, phone = $4
       WHERE id = $5
       RETURNING id, name, email, clinic_name, specialization, phone, created_at`,
      [name.trim(), clinic_name.trim(), specialization.trim(), phone?.trim() || null, req.doctor.id]
    );

    res.json({ doctor: rows[0] });
  } catch (err) {
    console.error('[PUT /auth/profile]', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
