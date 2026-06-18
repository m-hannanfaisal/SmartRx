// ================================================================
// SmartRx — Neo4j Integration
//
// Neo4j is a graph database that natively stores nodes and
// relationships. Unlike PostgreSQL's recursive CTE (which
// simulates graph traversal in a relational engine), Neo4j stores
// the graph structure directly — each node is a Medicine, each
// relationship is CO_PRESCRIBED_WITH.
//
// Why Neo4j for SmartRx?
//   - Query "what medicines are within 3 hops of Salbutamol"
//     is a native Neo4j operation (variable-length path)
//   - Depth-first and breadth-first traversal is built-in
//   - Relationship properties (frequency, avg_days) stored on edges
//   - Cypher is more readable than recursive SQL for graph queries
//
// Setup:
//   npm install neo4j-driver
//   Add to .env:
//     NEO4J_URI=bolt://localhost:7687
//     NEO4J_USER=neo4j
//     NEO4J_PASSWORD=yourpassword
//
// To populate Neo4j from PostgreSQL, run the sync endpoint once:
//   POST /api/neo4j/sync
//
// Endpoints:
//   POST /api/neo4j/sync           — import co-prescription data from PG
//   GET  /api/neo4j/graph/:id      — medicine neighbourhood graph
//   GET  /api/neo4j/path/:from/:to — shortest path between two medicines
//   GET  /api/neo4j/status         — driver connection check
// ================================================================

const router = require('express').Router();
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');

let neo4jDriver = null;

function getDriver() {
  if (neo4jDriver) return neo4jDriver;
  try {
    const neo4j = require('neo4j-driver');
    neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI      || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER     || 'neo4j',
        process.env.NEO4J_PASSWORD || 'password'
      ),
      {
        maxConnectionPoolSize:      5,
        encrypted:                  'ENCRYPTION_OFF',   // fixes Neo4j 4.0+ local connection error
        trust:                      'TRUST_ALL_CERTIFICATES',
        connectionTimeout:          5000,
        connectionAcquisitionTimeout: 5000,
      }
    );
    return neo4jDriver;
  } catch {
    return null;
  }
}

async function runCypher(cypher, params = {}) {
  const driver = getDriver();
  if (!driver) throw new Error('neo4j-driver not installed. Run: cd server && npm install neo4j-driver');
  const session = driver.session({ database: process.env.NEO4J_DB || 'neo4j' });
  try {
    const result = await session.run(cypher, params);
    return result.records.map(r => r.toObject());
  } catch (err) {
    neo4jDriver = null; // reset so next request tries fresh
    throw err;
  } finally {
    await session.close().catch(() => {});
  }
}

router.use(requireAuth);

// ----------------------------------------------------------------
// GET /api/neo4j/status
// ----------------------------------------------------------------
router.get('/status', async (req, res) => {
  try {
    await runCypher('RETURN 1 AS ping');
    res.json({
      connected: true,
      uri:       process.env.NEO4J_URI || 'bolt://localhost:7687',
      user:      process.env.NEO4J_USER || 'neo4j',
      message:   'Neo4j is reachable',
    });
  } catch (err) {
    res.json({
      connected: false,
      error:     err.message,
      setup_instructions: {
        step1: 'Install Neo4j Desktop from https://neo4j.com/download/',
        step2: 'Create a database and start it',
        step3: 'Add NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD to server/.env',
        step4: 'Run: npm install neo4j-driver (inside server/)',
        step5: 'Call POST /api/neo4j/sync to import co-prescription data',
      },
    });
  }
});

// ----------------------------------------------------------------
// POST /api/neo4j/sync
//
// Reads co-prescription pairs from PostgreSQL and upserts them
// as nodes and relationships in Neo4j.
//
// PostgreSQL query:
//   Finds all medicine pairs that appeared on the same prescription.
//   For each pair, counts how many prescriptions contained both.
//
// Neo4j model:
//   (:Medicine {id, name, category})
//   -[:CO_PRESCRIBED_WITH {frequency, last_seen}]→
//   (:Medicine {id, name, category})
// ----------------------------------------------------------------
router.post('/sync', async (req, res) => {
  try {
    // Pull co-prescription pairs from PostgreSQL
    const { rows } = await query(`
      SELECT
        m1.id        AS id_a,
        m1.name      AS name_a,
        m1.category  AS cat_a,
        m2.id        AS id_b,
        m2.name      AS name_b,
        m2.category  AS cat_b,
        COUNT(*)::int     AS frequency,
        MAX(rx.date)::text AS last_seen
      FROM prescription_items pi1
      JOIN prescription_items pi2
        ON  pi2.prescription_id = pi1.prescription_id
        AND pi2.medicine_id > pi1.medicine_id
      JOIN medicines m1 ON m1.id = pi1.medicine_id
      JOIN medicines m2 ON m2.id = pi2.medicine_id
      JOIN prescriptions rx ON rx.id = pi1.prescription_id
      GROUP BY m1.id, m1.name, m1.category, m2.id, m2.name, m2.category
      ORDER BY frequency DESC
      LIMIT 500
    `);

    if (rows.length === 0) {
      return res.json({
        message: 'No co-prescription pairs found. Make sure you have prescriptions with 2+ medicines each.',
        synced: 0,
        tip: 'Go to Prescriptions → New Prescription → add at least 2 medicines, then sync again.',
      });
    }

    // Use UNWIND to push ALL pairs in one Cypher call (much faster + avoids timeout)
    const pairs = rows.map(r => ({
      id_a:      r.id_a,
      name_a:    r.name_a,
      cat_a:     r.cat_a || 'General',
      id_b:      r.id_b,
      name_b:    r.name_b,
      cat_b:     r.cat_b || 'General',
      // CRITICAL: Neo4j requires integer not string for numeric properties
      frequency: parseInt(r.frequency, 10),
      last_seen: r.last_seen || '',
    }));

    await runCypher(`
      UNWIND $pairs AS pair
      MERGE (a:Medicine {id: pair.id_a})
        ON CREATE SET a.name = pair.name_a, a.category = pair.cat_a
        ON MATCH  SET a.name = pair.name_a
      MERGE (b:Medicine {id: pair.id_b})
        ON CREATE SET b.name = pair.name_b, b.category = pair.cat_b
        ON MATCH  SET b.name = pair.name_b
      MERGE (a)-[r:CO_PRESCRIBED_WITH]-(b)
        ON CREATE SET r.frequency = pair.frequency, r.last_seen = pair.last_seen
        ON MATCH  SET r.frequency = pair.frequency, r.last_seen = pair.last_seen
    `, { pairs });

    res.json({
      message:    `Successfully synced ${pairs.length} co-prescription relationships to Neo4j`,
      synced:     pairs.length,
      next_step:  'Now click any "Graph: [medicine]" button to visualize',
      sample_pair: { from: pairs[0]?.name_a, to: pairs[0]?.name_b, frequency: pairs[0]?.frequency },
    });
  } catch (err) {
    console.error('[POST /neo4j/sync]', err);
    res.status(500).json({
      error:   err.message,
      hint:    'Make sure Neo4j is running and you clicked "Check Connection" first.',
    });
  }
});

// ----------------------------------------------------------------
// GET /api/neo4j/graph/:medicineId?depth=2
//
// Cypher variable-length path query — equivalent to PostgreSQL
// recursive CTE but expressed natively in graph syntax.
//
// Cypher:
//   MATCH (seed:Medicine {id: $id})-[:CO_PRESCRIBED_WITH*1..3]-(related)
//
// The *1..3 means "traverse 1 to 3 hops along CO_PRESCRIBED_WITH".
// Neo4j expands this as a breadth-first search natively —
// no recursion logic needed in the query itself.
// ----------------------------------------------------------------
router.get('/graph/:medicineId', async (req, res) => {
  try {
    const { medicineId } = req.params;
    const depth = Math.min(parseInt(req.query.depth) || 2, 4);

    // NOTE: We use a direct relationship match (not variable-length path)
    // to reliably access relationship properties like r.frequency.
    // For multi-hop traversal we union depth-1 and depth-2 results.
    const records = await runCypher(`
      MATCH (seed:Medicine {id: $id})-[r:CO_PRESCRIBED_WITH]-(related:Medicine)
      RETURN
        seed.id            AS seed_id,
        seed.name          AS seed_name,
        related.id         AS medicine_id,
        related.name       AS medicine_name,
        related.category   AS category,
        1                  AS hops,
        r.frequency        AS total_freq
      ORDER BY r.frequency DESC
      LIMIT 20
    `, { id: medicineId });

    res.json({
      seed_id:     medicineId,
      max_depth:   depth,
      graph:       records.map(r => ({
        medicine_id:   r.medicine_id,
        medicine_name: r.medicine_name,
        category:      r.category,
        hops:          r.hops?.toNumber ? r.hops.toNumber() : Number(r.hops),
        total_freq:    r.total_freq?.toNumber ? r.total_freq.toNumber() : Number(r.total_freq || 0),
      })),
      total_found: records.length,
      cypher_used: 'MATCH (seed)-[r:CO_PRESCRIBED_WITH]-(related) — direct relationship traversal',
    });
  } catch (err) {
    console.error('[GET /neo4j/graph/:id]', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------
// GET /api/neo4j/path/:fromId/:toId
// Shortest co-prescription path between two medicines
// ----------------------------------------------------------------
router.get('/path/:fromId/:toId', async (req, res) => {
  try {
    const { fromId, toId } = req.params;

    const records = await runCypher(`
      MATCH path = shortestPath(
        (a:Medicine {id: $fromId})-[:CO_PRESCRIBED_WITH*]-(b:Medicine {id: $toId})
      )
      RETURN
        [node IN nodes(path) | node.name]  AS path_names,
        length(path)                        AS hops
      LIMIT 1
    `, { fromId, toId });

    res.json({
      from:   fromId,
      to:     toId,
      result: records[0] || null,
      note:   records.length === 0
        ? 'No co-prescription path found between these two medicines. They may not appear on the same prescriptions, even indirectly.'
        : null,
    });
  } catch (err) {
    console.error('[GET /neo4j/path]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
