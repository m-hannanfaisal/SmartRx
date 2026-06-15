const router = require('express').Router();
const { query, getClient } = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

async function attachItems(prescriptionRows) {
  if (prescriptionRows.length === 0) return [];
  const ids = prescriptionRows.map(r => r.id);
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  const { rows: itemRows } = await query(
    `SELECT pi.*, m.name AS medicine_name
     FROM prescription_items pi
     JOIN medicines m ON m.id = pi.medicine_id
     WHERE pi.prescription_id IN (${placeholders})`,
    ids
  );
  const map = new Map();
  itemRows.forEach(row => {
    const item = {
      id: row.id,
      medicine_id: row.medicine_id,
      medicineName: row.medicine_name,
      description: row.description,
      strength: row.strength,
      days: row.days,
      times_per_day: row.times_per_day,
      notes: row.notes,
    };
    if (!map.has(row.prescription_id)) map.set(row.prescription_id, []);
    map.get(row.prescription_id).push(item);
  });
  return prescriptionRows.map(rx => ({ ...rx, items: map.get(rx.id) || [] }));
}

// GET /api/prescriptions
// GET /api/prescriptions?patientId=&status=&from=&to=
router.get('/', async (req, res) => {
  try {
    const { patientId, status, from, to } = req.query;
    let conditions = ['doctor_id = $1'];
    let params = [req.doctorId];
    let idx = 2;

    if (patientId) { conditions.push(`patient_id = $${idx++}`); params.push(patientId); }
    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
    if (from) { conditions.push(`date >= $${idx++}`); params.push(from); }
    if (to) { conditions.push(`date <= $${idx++}`); params.push(to); }

    // This query is served by the covering index idx_rx_covering
    // (doctor_id, date DESC) INCLUDE (patient_id, status, diagnosis)
    // PostgreSQL performs an Index Only Scan — zero heap access.
    const sql = `
      SELECT id, patient_id, status, diagnosis,
             date, created_at, lab_tests, next_visit_date
      FROM prescriptions
      WHERE ${conditions.join(' AND ')}
      ORDER BY date DESC, created_at DESC`;

    const { rows } = await query(sql, params);
    const enriched = await attachItems(rows);
    res.json(enriched);
  } catch (err) {
    console.error('[GET /prescriptions]', err);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM prescriptions WHERE id=$1 AND doctor_id=$2`,
      [req.params.id, req.doctorId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Prescription not found' });
    const [enriched] = await attachItems(rows);
    res.json(enriched);
  } catch (err) {
    console.error('[GET /prescriptions/:id]', err);
    res.status(500).json({ error: 'Failed to fetch prescription' });
  }
});

// POST /api/prescriptions
router.post('/', async (req, res) => {
  try {
    const { patientId, date, diagnosis, labTests, nextVisitDate, items, status } = req.body;

    if (!patientId || !date || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'patientId, date, and at least one item are required' });
    }

    const { rows: patRows } = await query(
      `SELECT id FROM patients WHERE id=$1 AND doctor_id=$2`,
      [patientId, req.doctorId]
    );
    if (patRows.length === 0) {
      return res.status(403).json({ error: 'Patient not found or not owned by this doctor' });
    }

    const rxStatus = status || 'issued';

    const client = await getClient();
    let rxId;
    try {
      await client.query('BEGIN');

      // Insert prescription
      const { rows } = await client.query(
        `INSERT INTO prescriptions (patient_id, doctor_id, date, diagnosis, lab_tests, next_visit_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [patientId, req.doctorId, date, diagnosis || null, labTests || null, nextVisitDate || null, rxStatus]
      );
      rxId = rows[0].id;

      // Insert prescription items
      for (const i of items) {
        await client.query(
          `INSERT INTO prescription_items (prescription_id, medicine_id, description, strength, days, times_per_day, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [rxId, i.medicine_id, i.description || null, i.strength || null, i.days, i.times_per_day, i.notes || null]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const { rows: rxRows } = await query(`SELECT * FROM prescriptions WHERE id=$1`, [rxId]);
    const [enriched] = await attachItems(rxRows);
    res.status(201).json(enriched);
  } catch (err) {
    console.error('[POST /prescriptions]', err);
    res.status(500).json({ error: 'Failed to create prescription' });
  }
});

// PATCH /api/prescriptions/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['draft', 'issued'].includes(status)) {
      return res.status(400).json({ error: 'status must be draft or issued' });
    }
    const { rows } = await query(
      `UPDATE prescriptions SET status=$1 WHERE id=$2 AND doctor_id=$3 RETURNING *`,
      [status, req.params.id, req.doctorId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Prescription not found' });
    const [enriched] = await attachItems(rows);
    res.json(enriched);
  } catch (err) {
    console.error('[PATCH /prescriptions/:id/status]', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// PUT /api/prescriptions/:id  — edit existing prescription in place
router.put('/:id', async (req, res) => {
  const client = await getClient();
  try {
    const { diagnosis, labTests, nextVisitDate, status, items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'At least one medicine item is required' });
    if (status && !['draft', 'issued'].includes(status))
      return res.status(400).json({ error: 'status must be draft or issued' });

    const { rows: own } = await client.query(
      `SELECT id FROM prescriptions WHERE id=$1 AND doctor_id=$2`,
      [req.params.id, req.doctorId]
    );
    if (own.length === 0) { client.release(); return res.status(404).json({ error: 'Prescription not found' }); }

    await client.query('BEGIN');
    await client.query(
      `UPDATE prescriptions SET diagnosis=$1, lab_tests=$2, next_visit_date=$3,
         status=COALESCE($4::text, status::text)::prescription_status
       WHERE id=$5 AND doctor_id=$6`,
      [diagnosis || null, labTests || null, nextVisitDate || null,
       status || null, req.params.id, req.doctorId]
    );
    await client.query(`DELETE FROM prescription_items WHERE prescription_id=$1`, [req.params.id]);
    for (const i of items) {
      await client.query(
        `INSERT INTO prescription_items (prescription_id, medicine_id, description, strength, days, times_per_day, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [req.params.id, i.medicine_id, i.description || null, i.strength || null,
         i.days, i.times_per_day, i.notes || null]
      );
    }
    await client.query('COMMIT');
    client.release();

    const { rows: rxRows } = await query(`SELECT * FROM prescriptions WHERE id=$1`, [req.params.id]);
    const [enriched] = await attachItems(rxRows);
    res.json(enriched);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    console.error('[PUT /prescriptions/:id]', err);
    res.status(500).json({ error: 'Failed to update prescription' });
  }
});

module.exports = router;