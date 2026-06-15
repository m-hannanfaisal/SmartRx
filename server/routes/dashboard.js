const router = require('express').Router();
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// ----------------------------------------------------------------
// GET /api/dashboard/stats
// Returns: total patients, prescriptions, medicines counts
// ----------------------------------------------------------------
router.get('/stats', async (req, res) => {
  try {
    const [patients, prescriptions, medicines, unreadMessages] = await Promise.all([
      query(`SELECT COUNT(*) AS count FROM patients WHERE doctor_id = $1`, [req.doctorId]),
      query(`SELECT COUNT(*) AS count FROM prescriptions WHERE doctor_id = $1`, [req.doctorId]),
      query(`SELECT COUNT(*) AS count FROM medicines`, []),
      query(
        `SELECT COUNT(*) AS count FROM chat_messages
         WHERE doctor_id = $1 AND sender_type = 'patient' AND is_read = false`,
        [req.doctorId]
      ),
    ]);

    res.json({
      totalPatients:      parseInt(patients.rows[0].count),
      totalPrescriptions: parseInt(prescriptions.rows[0].count),
      totalMedicines:     parseInt(medicines.rows[0].count),
      unreadMessages:     parseInt(unreadMessages.rows[0].count),
    });
  } catch (err) {
    console.error('[GET /dashboard/stats]', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// ----------------------------------------------------------------
// GET /api/dashboard/top-medicines?limit=5
// Uses the get_top_medicines stored procedure
// ----------------------------------------------------------------
router.get('/top-medicines', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const { rows } = await query(
      `SELECT * FROM get_top_medicines($1)`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /dashboard/top-medicines]', err);
    res.status(500).json({ error: 'Failed to fetch top medicines' });
  }
});

module.exports = router;
