const jwt = require('jsonwebtoken');
const { query } = require('../db');

/**
 * Middleware: verifies the Bearer JWT in Authorization header.
 * On success, attaches `req.doctorId` and `req.doctor` to the request.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Token invalid or expired' });
    }

    // Load fresh doctor record from DB on every request
    const { rows } = await query(
      'SELECT id, name, email, clinic_name, specialization, phone FROM doctors WHERE id = $1',
      [payload.doctorId]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Doctor account not found' });
    }

    req.doctorId = rows[0].id;
    req.doctor   = rows[0];
    next();
  } catch (err) {
    console.error('[auth middleware]', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
}

module.exports = { requireAuth };
