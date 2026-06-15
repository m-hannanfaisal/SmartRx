require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const authRoutes         = require('./routes/auth');
const patientRoutes      = require('./routes/patients');
const prescriptionRoutes = require('./routes/prescriptions');
const medicineRoutes     = require('./routes/medicines');
const diseaseRoutes      = require('./routes/diseases');
const templateRoutes     = require('./routes/templates');
const dashboardRoutes    = require('./routes/dashboard');
const alertRoutes        = require('./routes/alerts');
const patientAuthRoutes  = require('./routes/patient-auth');
const patientPortalRoutes= require('./routes/patient-portal');
const chatRoutes         = require('./routes/chat');
const transactionRoutes  = require('./routes/transactions');
const neo4jRoutes        = require('./routes/neo4j');
const { router: mongoRoutes } = require('./routes/mongodb');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:8080','http://localhost:5173','http://localhost:3000'], credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req, res) => {
  const cache    = require('./redis');
  const redisOk  = await cache.isAlive();
  res.json({ status: 'ok', timestamp: new Date().toISOString(),
    services: {
      postgresql: 'connected',
      redis:      redisOk ? 'connected' : 'not available (cache bypassed)',
      neo4j:      process.env.NEO4J_URI  ? 'configured (check /api/neo4j/status)' : 'not configured',
      mongodb:    process.env.MONGO_URI  ? 'configured (check /api/logs/status)'  : 'not configured',
    },
  });
});

app.use('/api/auth',          authRoutes);
app.use('/api/patients',      patientRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/medicines',     medicineRoutes);
app.use('/api/diseases',      diseaseRoutes);
app.use('/api/templates',     templateRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/alerts',        alertRoutes);
app.use('/api/patient-auth',  patientAuthRoutes);
app.use('/api/patient-portal',patientPortalRoutes);
app.use('/api/chat',          chatRoutes);
app.use('/api/transactions',  transactionRoutes);
app.use('/api/neo4j',         neo4jRoutes);
app.use('/api/logs',          mongoRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, _req, res, _next) => { console.error('[Unhandled error]', err); res.status(500).json({ error: 'Internal server error' }); });

app.listen(PORT, () => {
  console.log(`\n✅  SmartRx API running on http://localhost:${PORT}`);
  console.log('    New routes: /api/transactions  /api/neo4j  /api/logs\n');
});

module.exports = app;
