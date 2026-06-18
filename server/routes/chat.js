const router = require('express').Router();
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// ----------------------------------------------------------------
// GET /api/chat/conversations
// Get all patients who have chatted with this doctor
// ----------------------------------------------------------------
router.get('/conversations', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT DISTINCT ON (cm.patient_id)
              cm.patient_id,
              p.name AS patient_name,
              p.display_id,
              p.phone,
              cm.message AS last_message,
              cm.sender_type AS last_sender,
              cm.created_at AS last_message_at,
              (SELECT COUNT(*) FROM chat_messages
               WHERE patient_id = cm.patient_id AND doctor_id = $1
               AND sender_type = 'patient' AND is_read = false) AS unread_count
       FROM chat_messages cm
       JOIN patients p ON p.id = cm.patient_id
       WHERE cm.doctor_id = $1
       ORDER BY cm.patient_id, cm.created_at DESC`,
      [req.doctorId]
    );

    // Sort by last_message_at descending
    rows.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

    res.json(rows);
  } catch (err) {
    console.error('[GET /chat/conversations]', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// ----------------------------------------------------------------
// GET /api/chat/:patientId
// Get all messages between doctor and a specific patient
// ----------------------------------------------------------------
router.get('/:patientId', async (req, res) => {
  try {
    // Verify patient belongs to this doctor
    const { rows: patRows } = await query(
      'SELECT id, name, display_id, phone FROM patients WHERE id = $1 AND doctor_id = $2',
      [req.params.patientId, req.doctorId]
    );
    if (patRows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const { rows } = await query(
      `SELECT id, sender_type, message, is_read, created_at
       FROM chat_messages
       WHERE patient_id = $1 AND doctor_id = $2
       ORDER BY created_at ASC`,
      [req.params.patientId, req.doctorId]
    );

    // Mark patient messages as read
    await query(
      `UPDATE chat_messages SET is_read = true
       WHERE patient_id = $1 AND doctor_id = $2 AND sender_type = 'patient' AND is_read = false`,
      [req.params.patientId, req.doctorId]
    );

    res.json({
      messages: rows,
      patient: patRows[0],
    });
  } catch (err) {
    console.error('[GET /chat/:patientId]', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ----------------------------------------------------------------
// POST /api/chat/:patientId
// Doctor sends a message to a patient
// ----------------------------------------------------------------
router.post('/:patientId', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify patient belongs to this doctor
    const { rows: patRows } = await query(
      'SELECT id FROM patients WHERE id = $1 AND doctor_id = $2',
      [req.params.patientId, req.doctorId]
    );
    if (patRows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const { rows } = await query(
      `INSERT INTO chat_messages (patient_id, doctor_id, sender_type, message)
       VALUES ($1, $2, 'doctor', $3)
       RETURNING id, sender_type, message, is_read, created_at`,
      [req.params.patientId, req.doctorId, message.trim()]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /chat/:patientId]', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
