const router = require('express').Router();
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// ----------------------------------------------------------------
// GET /api/patients?q=search
// ----------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    let sql, params;

    if (q && q.trim()) {
      const term = `%${q.trim()}%`;
      sql = `
        SELECT * FROM patients
        WHERE doctor_id = $1
          AND (name ILIKE $2 OR phone ILIKE $2 OR display_id ILIKE $2)
        ORDER BY last_visit_date DESC NULLS LAST, created_at DESC`;
      params = [req.doctorId, term];
    } else {
      sql    = `SELECT * FROM patients WHERE doctor_id = $1 ORDER BY last_visit_date DESC NULLS LAST, created_at DESC`;
      params = [req.doctorId];
    }

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('[GET /patients]', err);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// ----------------------------------------------------------------
// GET /api/patients/:id
// ----------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM patients WHERE id = $1 AND doctor_id = $2`,
      [req.params.id, req.doctorId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[GET /patients/:id]', err);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// ----------------------------------------------------------------
// POST /api/patients
// ----------------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const { name, phone, age, gender, address, allergies } = req.body;

    if (!name || !phone || age == null || !gender) {
      return res.status(400).json({ error: 'name, phone, age, and gender are required' });
    }
    if (!['Male', 'Female', 'Other'].includes(gender)) {
      return res.status(400).json({ error: 'gender must be Male, Female, or Other' });
    }

    const { rows } = await query(
      `INSERT INTO patients (doctor_id, name, phone, age, gender, address, allergies, display_id)
       VALUES ($1, $2, $3, $4, $5::gender_type, $6, $7, '')
       RETURNING *`,
      [req.doctorId, name, phone, parseInt(age), gender, address || null, allergies || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /patients]', err);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

// ----------------------------------------------------------------
// PUT /api/patients/:id
// ----------------------------------------------------------------
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, age, gender, address, allergies } = req.body;

    const { rows } = await query(
      `UPDATE patients
       SET name=$1, phone=$2, age=$3, gender=$4::gender_type,
           address=$5, allergies=$6, updated_at=now()
       WHERE id=$7 AND doctor_id=$8
       RETURNING *`,
      [name, phone, parseInt(age), gender, address || null, allergies || null, req.params.id, req.doctorId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[PUT /patients/:id]', err);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// ----------------------------------------------------------------
// DELETE /api/patients/:id
// ----------------------------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await query(
      `DELETE FROM patients WHERE id=$1 AND doctor_id=$2`,
      [req.params.id, req.doctorId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /patients/:id]', err);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

module.exports = router;
