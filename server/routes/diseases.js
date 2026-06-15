const router = require('express').Router();
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// ----------------------------------------------------------------
// GET /api/diseases
// ----------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM diseases ORDER BY name`);
    res.json(rows);
  } catch (err) {
    console.error('[GET /diseases]', err);
    res.status(500).json({ error: 'Failed to fetch diseases' });
  }
});

// ----------------------------------------------------------------
// POST /api/diseases
// ----------------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const { rows } = await query(
      `INSERT INTO diseases (name)
       VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING *`,
      [name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /diseases]', err);
    res.status(500).json({ error: 'Failed to add disease' });
  }
});

module.exports = router;
