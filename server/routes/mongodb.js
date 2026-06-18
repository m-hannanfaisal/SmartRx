// ================================================================
// SmartRx — MongoDB Integration (Audit / Activity Logs)
//
// MongoDB is used alongside PostgreSQL for a specific task where
// it excels: storing flexible, schema-less event logs.
//
// Why MongoDB here and not PostgreSQL?
//   - Audit events have varying shapes (login, prescription,
//     patient edit) — each has different fields
//   - MongoDB stores them as JSON documents natively
//   - No schema migrations needed when event types are added
//   - TTL indexes allow automatic expiry of old logs
//   - Reading all recent events for a doctor is a single find()
//
// PostgreSQL handles: structured relational data (patients,
//   prescriptions, medicines) with strict schema + FK integrity.
// MongoDB handles:   unstructured event stream (audit log).
//
// This is the polyglot persistence pattern.
//
// Setup:
//   npm install mongoose (inside server/)
//   Add to .env:
//     MONGO_URI=mongodb://localhost:27017/smartrx_logs
//
// Endpoints:
//   POST /api/logs/event      — write an audit event
//   GET  /api/logs            — read recent events for doctor
//   GET  /api/logs/stats      — aggregation pipeline stats
//   GET  /api/logs/status     — MongoDB connection check
// ================================================================

const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');

let mongoose = null;
let AuditLog = null;
let mongoConnected = false;

// ── Lazy-load mongoose so server starts even if Mongo isn't up ──
async function getModel() {
  if (AuditLog) return AuditLog;

  try {
    mongoose = require('mongoose');

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smartrx_logs', {
        serverSelectionTimeoutMS: 3000,
      });
      mongoConnected = true;
      console.log('✅  MongoDB connected');
    }

    // ── Schema definition ──
    // Each audit event is a flexible document.
    // Required fields: doctorId, eventType, timestamp.
    // The `meta` field accepts any additional key-value pairs.
    const auditSchema = new mongoose.Schema({
      doctorId:   { type: String, required: true, index: true },
      eventType:  {
        type: String,
        required: true,
        enum: ['LOGIN', 'LOGOUT', 'CREATE_PRESCRIPTION', 'UPDATE_PRESCRIPTION',
               'DELETE_PATIENT', 'UPDATE_PATIENT', 'CREATE_PATIENT',
               'CREATE_MEDICINE', 'VIEW_REPORT', 'TRANSACTION_DEMO'],
      },
      timestamp:  { type: Date, default: Date.now, index: true },
      ipAddress:  { type: String },
      meta:       { type: mongoose.Schema.Types.Mixed },  // flexible payload
    }, { timestamps: false });

    // ── TTL Index: auto-delete documents older than 90 days ──
    auditSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

    AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditSchema);
    return AuditLog;
  } catch (err) {
    mongoConnected = false;
    throw new Error(`MongoDB not available: ${err.message}`);
  }
}

// ── Public helper — call from other routes to log events ────────
async function logEvent(doctorId, eventType, meta = {}, ipAddress = null) {
  try {
    const Model = await getModel();
    await Model.create({ doctorId, eventType, meta, ipAddress });
  } catch { /* non-fatal — logging should never break the main flow */ }
}

router.use(requireAuth);

// ----------------------------------------------------------------
// GET /api/logs/status
// ----------------------------------------------------------------
router.get('/status', async (req, res) => {
  try {
    await getModel();
    res.json({
      connected: true,
      uri:       process.env.MONGO_URI || 'mongodb://localhost:27017/smartrx_logs',
      message:   'MongoDB is reachable',
    });
  } catch (err) {
    res.json({
      connected: false,
      error:     err.message,
      setup_instructions: {
        step1: 'Install MongoDB Community from https://www.mongodb.com/try/download/community',
        step2: 'Start mongod service',
        step3: 'Add MONGO_URI=mongodb://localhost:27017/smartrx_logs to server/.env',
        step4: 'Run: npm install mongoose (inside server/)',
        step5: 'Events will now be logged automatically on each API call',
      },
    });
  }
});

// ----------------------------------------------------------------
// POST /api/logs/event
// Manually write an audit event (also called internally)
// ----------------------------------------------------------------
router.post('/event', async (req, res) => {
  try {
    const Model = await getModel();
    const { eventType, meta } = req.body;

    if (!eventType) return res.status(400).json({ error: 'eventType is required' });

    const doc = await Model.create({
      doctorId:  req.doctorId,
      eventType,
      meta:      meta || {},
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'Event logged',
      document: doc,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------
// GET /api/logs?limit=50&type=
// Recent audit events for this doctor
// ----------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const Model = await getModel();
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const filter = { doctorId: req.doctorId };
    if (req.query.type) filter.eventType = req.query.type;

    const docs = await Model
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.json({
      total:  docs.length,
      events: docs,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------
// GET /api/logs/stats
//
// MongoDB Aggregation Pipeline — equivalent to SQL GROUP BY
//
// Pipeline stages:
//   $match  → filter to this doctor's events
//   $group  → count by eventType
//   $sort   → highest count first
//
// This is the MongoDB equivalent of:
//   SELECT eventType, COUNT(*) FROM audit_log
//   WHERE doctorId = $1 GROUP BY eventType ORDER BY count DESC
// ----------------------------------------------------------------
router.get('/stats', async (req, res) => {
  try {
    const Model = await getModel();

    const stats = await Model.aggregate([
      { $match: { doctorId: req.doctorId } },
      { $group: {
          _id:   '$eventType',
          count: { $sum: 1 },
          last:  { $max: '$timestamp' },
        }
      },
      { $sort: { count: -1 } },
      { $project: { _id: 0, eventType: '$_id', count: 1, last: 1 } },
    ]);

    const total = await Model.countDocuments({ doctorId: req.doctorId });

    res.json({
      total_events: total,
      by_type:      stats,
      pipeline_explanation: {
        '$match':   'Filter documents to only this doctor (like SQL WHERE)',
        '$group':   'Group by eventType, count occurrences (like SQL GROUP BY)',
        '$sort':    'Order by count descending (like SQL ORDER BY count DESC)',
        '$project': 'Rename _id to eventType (like SQL column aliases)',
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, logEvent };
