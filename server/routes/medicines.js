// ================================================================
// SmartRx — Medicines Route
// New features: Redis caching, CTE recursive graph with explanation
// ================================================================
const router   = require('express').Router();
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');
const cache    = require('../redis');

router.use(requireAuth);

// GET /api/medicines?q=search  — cached
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const cacheKey = q
      ? `medicines:search:${req.doctorId}:${q.trim().toLowerCase()}`
      : `medicines:all:${req.doctorId}`;

    const cached = await cache.get(cacheKey);
    if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

    let sql, params;
    if (q && q.trim()) {
      sql    = `SELECT * FROM medicines WHERE name ILIKE $1 AND (doctor_id IS NULL OR doctor_id = $2) ORDER BY usage_count DESC LIMIT 20`;
      params = [`%${q.trim()}%`, req.doctorId];
    } else {
      sql    = `SELECT * FROM medicines WHERE (doctor_id IS NULL OR doctor_id = $1) ORDER BY usage_count DESC`;
      params = [req.doctorId];
    }

    const { rows } = await query(sql, params);
    await cache.set(cacheKey, rows, q ? cache.TTL.search : cache.TTL.medicines);
    res.setHeader('X-Cache', 'MISS');
    res.json(rows);
  } catch (err) {
    console.error('[GET /medicines]', err);
    res.status(500).json({ error: 'Failed to fetch medicines' });
  }
});

// POST /api/medicines — add medicine, bust cache
router.post('/', async (req, res) => {
  try {
    const { name, category } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const { rows: existing } = await query(
      `SELECT * FROM medicines WHERE name ILIKE $1 AND doctor_id IS NULL`, [name.trim()]);
    if (existing.length > 0) return res.status(201).json(existing[0]);

    const { rows: doctorExisting } = await query(
      `SELECT * FROM medicines WHERE name ILIKE $1 AND doctor_id = $2`, [name.trim(), req.doctorId]);
    if (doctorExisting.length > 0) return res.status(201).json(doctorExisting[0]);

    const { rows } = await query(
      `INSERT INTO medicines (name, category, doctor_id) VALUES ($1, $2, $3) RETURNING *`,
      [name.trim(), category || 'General', req.doctorId]);

    // Bust all medicines cache for this doctor
    await cache.bustPattern(`medicines:*:${req.doctorId}*`);
    await cache.bustPattern('medicines:suggestions:*');

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /medicines]', err);
    res.status(500).json({ error: 'Failed to add medicine' });
  }
});

// POST /api/medicines/suggestions — cached
router.post('/suggestions', async (req, res) => {
  try {
    const { medicine_ids } = req.body;
    if (!medicine_ids || !Array.isArray(medicine_ids) || medicine_ids.length === 0) return res.json([]);

    const cacheKey = `medicines:suggestions:${[...medicine_ids].sort().join(',')}`;
    const cached   = await cache.get(cacheKey);
    if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

    const { rows } = await query(`SELECT * FROM get_smart_suggestions($1::uuid[], $2)`, [medicine_ids, 5]);
    const result = rows.map(r => ({ medicine_id: r.medicine_id, medicineName: r.medicine_name, frequency: Number(r.frequency) }));

    await cache.set(cacheKey, result, cache.TTL.search);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    console.error('[POST /medicines/suggestions]', err);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// ----------------------------------------------------------------
// GET /api/medicines/:id/graph?depth=3
//
// ✦ WITH RECURSIVE CTE — Medicine Co-Prescription Graph
//
// Theory:
//  A recursive CTE has two parts joined by UNION:
//    1. Base case  — the starting set (medicines directly
//                    co-prescribed with the seed)
//    2. Recursive step — references the CTE itself, adding one
//                    more graph hop per iteration.
//  PostgreSQL maintains an internal work table:
//    → Seeds it with the base result
//    → Each iteration applies the recursive step on the current
//      work table, appends new rows, swaps the work table
//    → Stops when depth >= max OR no new rows produced
//  Cycle prevention: visited_ids UUID[] blocks revisiting nodes.
// ----------------------------------------------------------------
router.get('/:id/graph', async (req, res) => {
  try {
    const { id } = req.params;
    const depth   = Math.min(parseInt(req.query.depth) || 3, 5);
    const cacheKey = `medicines:graph:${id}:d${depth}`;

    const cached = await cache.get(cacheKey);
    if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

    const { rows } = await query(`
      WITH RECURSIVE med_graph AS (

        -- BASE CASE: medicines directly co-prescribed with seed
        SELECT DISTINCT
          pi2.medicine_id                           AS related_id,
          m2.name                                   AS related_name,
          m2.category                               AS related_category,
          1                                         AS depth,
          ARRAY[seed.medicine_id, pi2.medicine_id]  AS visited_ids
        FROM prescription_items seed
        JOIN prescription_items pi2
          ON  pi2.prescription_id = seed.prescription_id
          AND pi2.medicine_id     != seed.medicine_id
        JOIN medicines m2 ON m2.id = pi2.medicine_id
        WHERE seed.medicine_id = $1::UUID

        UNION

        -- RECURSIVE STEP: one more hop, cycle-safe via visited_ids
        SELECT DISTINCT
          pi3.medicine_id,
          m3.name,
          m3.category,
          mg.depth + 1,
          mg.visited_ids || pi3.medicine_id
        FROM med_graph mg
        JOIN prescription_items pi2  ON  pi2.medicine_id = mg.related_id
        JOIN prescription_items pi3
          ON  pi3.prescription_id = pi2.prescription_id
          AND pi3.medicine_id     != mg.related_id
          AND NOT (pi3.medicine_id = ANY(mg.visited_ids))
        JOIN medicines m3 ON m3.id = pi3.medicine_id
        WHERE mg.depth < $2
      )
      SELECT
        related_id        AS medicine_id,
        related_name      AS medicine_name,
        related_category  AS category,
        MIN(depth)        AS depth,
        COUNT(*)          AS frequency
      FROM med_graph
      GROUP BY related_id, related_name, related_category
      ORDER BY MIN(depth) ASC, COUNT(*) DESC
      LIMIT 20`,
      [id, depth]
    );

    const { rows: seedRows } = await query(
      `SELECT id, name, category FROM medicines WHERE id = $1`, [id]);

    const result = {
      seed:        seedRows[0] || null,
      max_depth:   depth,
      graph:       rows.map(r => ({ ...r, depth: Number(r.depth), frequency: Number(r.frequency) })),
      total_found: rows.length,
      cte_explanation: {
        algorithm:  'WITH RECURSIVE — iterative SQL graph traversal',
        base_case:  'All medicines directly co-prescribed with seed (depth=1)',
        recursive:  'Each iteration extends one more co-prescription hop',
        cycle_guard:'visited_ids UUID[] prevents infinite loops',
        termination:'Stops at max_depth OR when no new rows are found',
      },
    };

    await cache.set(cacheKey, result, cache.TTL.medicines);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    console.error('[GET /medicines/:id/graph]', err);
    res.status(500).json({ error: 'Failed to build medicine graph' });
  }
});

module.exports = router;
