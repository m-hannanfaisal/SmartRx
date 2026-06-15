// ================================================================
// SmartRx — Transaction Management Demo Route
//
// Demonstrates all four ACID properties and all five PostgreSQL
// transaction states using real prescription data.
//
// Endpoints:
//   POST /api/transactions/acid-demo
//     Runs a real atomic prescription insert, then simulates a
//     failure partway through to show rollback.
//
//   GET  /api/transactions/states
//     Shows the five transaction state transitions with examples.
//
//   GET  /api/transactions/isolation-demo
//     Shows PostgreSQL isolation levels with real examples.
//
//   GET  /api/transactions/lock-demo
//     Demonstrates row-level locking with SELECT FOR UPDATE.
//
//   GET  /api/transactions/log
//     Returns recent transaction audit log from MongoDB.
// ================================================================

const router = require('express').Router();
const { getClient, query } = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// ----------------------------------------------------------------
// GET /api/transactions/states
//
// ✦ FEATURE: Transaction State Machine
//
// PostgreSQL transactions move through these states:
//
//  IDLE → ACTIVE → IDLE          (normal commit)
//  IDLE → ACTIVE → ABORTED → IDLE (error → rollback)
//
// States:
//  1. IDLE      — No transaction in progress. Connection is ready.
//  2. ACTIVE    — BEGIN issued; statements are accumulating in
//                 the transaction's work buffer.
//  3. INTRANS   — A savepoint was set; partial rollback possible.
//  4. INERROR   — A statement inside the transaction failed.
//                 No further statements execute until ROLLBACK.
//  5. UNKNOWN   — Connection state cannot be determined.
// ----------------------------------------------------------------
router.get('/states', async (req, res) => {
  const client = await getClient();
  const log    = [];

  try {
    // STATE 1: IDLE
    log.push({ state: 'IDLE',   description: 'Connection acquired from pool. No transaction active.', txStatus: client.connection?.txStatus || 'I' });

    // STATE 2: ACTIVE — BEGIN
    await client.query('BEGIN');
    log.push({ state: 'ACTIVE', description: 'BEGIN issued. Transaction open. Statements now buffered.', txStatus: 'T' });

    // Normal statement inside transaction
    await client.query(`SELECT COUNT(*) FROM prescriptions WHERE doctor_id = $1`, [req.doctorId]);
    log.push({ state: 'ACTIVE', description: 'SELECT executed inside transaction. Still active.', txStatus: 'T' });

    // STATE 3: INTRANS — Savepoint (partial rollback point)
    await client.query('SAVEPOINT sp1');
    log.push({ state: 'INTRANS', description: 'SAVEPOINT sp1 created. Partial rollback now possible.', txStatus: 'T' });

    // Simulate a risky operation
    await client.query(`SELECT 1`);
    log.push({ state: 'INTRANS', description: 'Statement after savepoint succeeded.', txStatus: 'T' });

    // STATE 4: INERROR — Force an error inside the transaction
    try {
      await client.query(`SELECT * FROM non_existent_table_xyz`);
    } catch {
      log.push({ state: 'INERROR', description: 'Statement failed (table not found). Transaction is now in error state. No further statements will execute until ROLLBACK.', txStatus: 'E' });
    }

    // Rollback to savepoint rescues the transaction from INERROR
    await client.query('ROLLBACK TO SAVEPOINT sp1');
    log.push({ state: 'ACTIVE', description: 'ROLLBACK TO SAVEPOINT sp1 — error cleared. Transaction active again.', txStatus: 'T' });

    // COMMIT — back to IDLE
    await client.query('COMMIT');
    log.push({ state: 'IDLE', description: 'COMMIT issued. Changes persisted. Connection returned to idle.', txStatus: 'I' });

    res.json({
      title: 'PostgreSQL Transaction State Machine',
      states_demonstrated: ['IDLE', 'ACTIVE', 'INTRANS', 'INERROR', 'IDLE (after commit)'],
      trace: log,
      state_reference: {
        IDLE:    'No transaction. Connection is ready for the next command.',
        ACTIVE:  'Inside an open transaction (after BEGIN).',
        INTRANS: 'Inside transaction with at least one SAVEPOINT.',
        INERROR: 'A statement failed inside the transaction. Must ROLLBACK.',
        UNKNOWN: 'Connection state indeterminate (usually a network error).',
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[GET /transactions/states]', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ----------------------------------------------------------------
// POST /api/transactions/acid-demo
//
// ✦ FEATURE: ACID Properties — Live Demonstration
//
// Runs two scenarios using real data:
//   Scenario A — COMMIT path (atomicity + durability)
//   Scenario B — ROLLBACK path (consistency enforced by constraint)
//
// ACID:
//   Atomicity    — All statements commit together or not at all
//   Consistency  — DB constraints are enforced; invalid data rejected
//   Isolation    — Each transaction sees a snapshot; concurrent
//                  reads don't see uncommitted writes
//   Durability   — After COMMIT, data survives crashes (WAL)
// ----------------------------------------------------------------
router.post('/acid-demo', async (req, res) => {
  const { simulateFailure = true } = req.body;
  const results = {};

  // Auto-fetch a real patient (no patientId needed from caller)
  const { rows: patRows } = await query(
    `SELECT id FROM patients WHERE doctor_id = $1 LIMIT 1`, [req.doctorId]
  );
  if (patRows.length === 0) {
    return res.status(400).json({ error: 'No patients found. Add at least one patient first.' });
  }
  const patientId = patRows[0].id;

  // ── SCENARIO A: Successful commit (demonstrates Atomicity + Durability) ──
  const clientA = await getClient();
  let rxIdA = null;
  try {
    await clientA.query('BEGIN');
    const { rows: rxRows } = await clientA.query(
      `INSERT INTO prescriptions (patient_id, doctor_id, date, diagnosis, status)
       VALUES ($1, $2, CURRENT_DATE, 'ACID Demo — Scenario A', 'draft') RETURNING id`,
      [patientId, req.doctorId]
    );
    rxIdA = rxRows[0].id;
    const { rows: meds } = await clientA.query(`SELECT id FROM medicines LIMIT 1`);
    if (meds.length > 0) {
      await clientA.query(
        `INSERT INTO prescription_items (prescription_id, medicine_id, days, times_per_day)
         VALUES ($1, $2, 5, 2)`, [rxIdA, meds[0].id]
      );
    }
    await clientA.query('COMMIT');
    results.scenarioA = {
      outcome: 'COMMITTED ✓ (as expected)',
      what_happened: 'Prescription + item inserted as one atomic unit. Both rows saved.',
      acid_properties: {
        atomicity:   'Both the prescription header AND the item committed together.',
        durability:  'Data flushed to PostgreSQL WAL — survives a server crash.',
      },
    };
    // Clean up demo row
    await query(`DELETE FROM prescriptions WHERE id=$1`, [rxIdA]);
    results.scenarioA.cleanup = 'Demo prescription auto-deleted — your real data is untouched.';
  } catch (err) {
    await clientA.query('ROLLBACK').catch(() => {});
    results.scenarioA = { outcome: 'UNEXPECTED ERROR', error: err.message };
  } finally { clientA.release(); }

  // ── SCENARIO B: Intentional failure → Rollback (demonstrates Atomicity + Consistency) ──
  // This scenario is DESIGNED to fail. We insert a prescription header, then
  // try to insert an item with an invalid medicine UUID. PostgreSQL rejects it
  // (FK violation) and rolls back BOTH rows — the header never survives alone.
  const clientB = await getClient();
  let rxIdB = null;
  try {
    await clientB.query('BEGIN');
    const { rows: rxRows2 } = await clientB.query(
      `INSERT INTO prescriptions (patient_id, doctor_id, date, diagnosis, status)
       VALUES ($1, $2, CURRENT_DATE, 'ACID Demo — Scenario B', 'draft') RETURNING id`,
      [patientId, req.doctorId]
    );
    rxIdB = rxRows2[0].id;

    // INTENTIONAL FAILURE: invalid medicine UUID to trigger FK violation
    if (simulateFailure) {
      await clientB.query(
        `INSERT INTO prescription_items (prescription_id, medicine_id, days, times_per_day)
         VALUES ($1, '00000000-0000-0000-0000-000000000000', 5, 1)`,
        [rxIdB]
      );
    }
    await clientB.query('COMMIT');
    if (rxIdB) await query(`DELETE FROM prescriptions WHERE id=$1`, [rxIdB]);
    results.scenarioB = { outcome: 'COMMITTED (simulateFailure=false)', what_happened: 'No failure triggered.' };
  } catch (err) {
    await clientB.query('ROLLBACK').catch(() => {});
    results.scenarioB = {
      outcome: 'ROLLED_BACK ✓ (this is CORRECT and expected)',
      what_happened: 'The FK violation caused PostgreSQL to reject the item insert. The ROLLBACK also deleted the prescription header — ZERO rows survived.',
      why_this_is_correct: 'This is Atomicity in action: because one statement failed, ALL statements in the transaction were undone. The prescription header was also rolled back even though it had no error itself.',
      error_that_triggered_rollback: err.message,
      acid_properties: {
        atomicity:    'Header insert was also rolled back — neither row survived the failed transaction.',
        consistency:  'The FK constraint kept the DB in a valid state — no orphan prescription items.',
      },
    };
  } finally { clientB.release(); }

  res.json({
    title: 'ACID Properties — Live Demonstration',
    patient_used: patientId,
    important_note: 'Scenario B ROLLED_BACK is INTENTIONAL — it demonstrates that Atomicity works correctly. It is NOT an error in the application.',
    scenarios: results,
    acid_theory: {
      Atomicity:   'All statements in BEGIN…COMMIT succeed together or all roll back. Partial commits are impossible.',
      Consistency: 'Every commit leaves the DB satisfying all constraints (FK, CHECK, DOMAIN).',
      Isolation:   'Uncommitted data is invisible to other concurrent sessions (READ COMMITTED default).',
      Durability:  'After COMMIT, data is written to WAL. Survives power loss, crashes, and restarts.',
    },
  });
});


// ----------------------------------------------------------------
// GET /api/transactions/isolation-demo
// Shows the four SQL isolation levels and their trade-offs
// ----------------------------------------------------------------
router.get('/isolation-demo', async (req, res) => {
  const client = await getClient();
  try {
    // Read Committed (PostgreSQL default)
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    const { rows: rcRows } = await client.query(
      `SELECT COUNT(*) AS total FROM prescriptions WHERE doctor_id = $1`,
      [req.doctorId]
    );
    await client.query('COMMIT');

    // Repeatable Read
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    const { rows: rrRows } = await client.query(
      `SELECT COUNT(*) AS total FROM patients WHERE doctor_id = $1`,
      [req.doctorId]
    );
    await client.query('COMMIT');

    // Serializable
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    const { rows: srRows } = await client.query(
      `SELECT COUNT(*) AS total FROM medicines WHERE doctor_id IS NULL`
    );
    await client.query('COMMIT');

    res.json({
      title: 'Isolation Level Demonstration',
      levels_tested: [
        {
          level:       'READ COMMITTED (default)',
          query:       'SELECT COUNT(*) FROM prescriptions',
          result:      rcRows[0],
          description: 'Sees only committed rows. A concurrent INSERT+COMMIT would be visible on re-read (non-repeatable read possible).',
          phenomena_prevented: ['dirty reads'],
          phenomena_allowed:   ['non-repeatable reads', 'phantom reads'],
        },
        {
          level:       'REPEATABLE READ',
          query:       'SELECT COUNT(*) FROM patients',
          result:      rrRows[0],
          description: 'Snapshot taken at transaction start. Re-reading the same row always returns the same value, even if another session commits a change.',
          phenomena_prevented: ['dirty reads', 'non-repeatable reads'],
          phenomena_allowed:   ['phantom reads (mitigated in PostgreSQL)'],
        },
        {
          level:       'SERIALIZABLE',
          query:       'SELECT COUNT(*) FROM medicines',
          result:      srRows[0],
          description: 'Strictest level. Transactions execute as if they ran one-at-a-time. May produce serialization errors that require retry.',
          phenomena_prevented: ['dirty reads', 'non-repeatable reads', 'phantom reads'],
          phenomena_allowed:   ['none — but serialization failures possible'],
        },
      ],
      note: 'READ UNCOMMITTED is not supported in PostgreSQL — treated as READ COMMITTED.',
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[GET /transactions/isolation-demo]', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ----------------------------------------------------------------
// GET /api/transactions/lock-demo
// Row-level locking with SELECT FOR UPDATE
// ----------------------------------------------------------------
router.get('/lock-demo', async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Lock the first patient row — other transactions trying to UPDATE
    // this row will WAIT until this transaction commits or rolls back
    const { rows } = await client.query(
      `SELECT id, name, visit_count FROM patients
       WHERE doctor_id = $1
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,           // <── acquires exclusive row lock
      [req.doctorId]
    );

    await client.query('COMMIT');

    res.json({
      title: 'Row-Level Locking — SELECT FOR UPDATE',
      locked_row: rows[0] || null,
      explanation: {
        'FOR UPDATE':         'Acquires an exclusive lock on matched rows. Concurrent UPDATE/DELETE on these rows will block until this transaction commits.',
        'FOR SHARE':          'Shared lock — allows other readers but blocks writers.',
        'NOWAIT':             'Returns error immediately instead of blocking if lock unavailable.',
        'SKIP LOCKED':        'Skips rows already locked — useful for job queue patterns.',
        use_case_in_smartrx:  'Prevents two concurrent requests from simultaneously updating the same patient visit_count.',
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
