const router = require('express').Router();
const { query, getClient } = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// Helper: attach medicines to template rows
async function attachMedicines(templateRows) {
  if (templateRows.length === 0) return [];

  const ids = templateRows.map(r => r.id);
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');

  const { rows: medRows } = await query(
    `SELECT tm.*, m.name AS medicine_name
     FROM template_medicines tm
     JOIN medicines m ON m.id = tm.medicine_id
     WHERE tm.template_id IN (${placeholders})`,
    ids
  );

  const map = new Map();
  medRows.forEach(row => {
    if (!map.has(row.template_id)) map.set(row.template_id, []);
    map.get(row.template_id).push({
      medicine_id:   row.medicine_id,
      medicineName:  row.medicine_name,
      days:          row.days,
      times_per_day: row.times_per_day,
    });
  });

  return templateRows.map(t => ({ ...t, medicines: map.get(t.id) || [] }));
}

// ----------------------------------------------------------------
// GET /api/templates  — returns this doctor's templates + global ones
// ----------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT dt.*, d.name AS disease_name
       FROM disease_templates dt
       JOIN diseases d ON d.id = dt.disease_id
       WHERE dt.doctor_id = $1 OR dt.doctor_id IS NULL
       ORDER BY dt.created_at DESC`,
      [req.doctor.id]
    );

    const enriched = await attachMedicines(rows);
    const result = enriched.map(t => ({
      id:          t.id,
      disease_id:  t.disease_id,
      diseaseName: t.disease_name,
      name:        t.name,
      medicines:   t.medicines,
    }));
    res.json(result);
  } catch (err) {
    console.error('[GET /templates]', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// ----------------------------------------------------------------
// POST /api/templates
// ----------------------------------------------------------------
router.post('/', async (req, res) => {
  const client = await getClient();
  try {
    const { diseaseId, name, medicines } = req.body;

    if (!diseaseId || !name) {
      return res.status(400).json({ error: 'diseaseId and name are required' });
    }

    await client.query('BEGIN');

    const { rows: tplRows } = await client.query(
      `INSERT INTO disease_templates (disease_id, doctor_id, name) VALUES ($1, $2, $3) RETURNING *`,
      [diseaseId, req.doctor.id, name]
    );
    const template = tplRows[0];

    if (medicines && medicines.length > 0) {
      for (const m of medicines) {
        await client.query(
          `INSERT INTO template_medicines (template_id, medicine_id, days, times_per_day)
           VALUES ($1, $2, $3, $4)`,
          [template.id, m.medicine_id, m.days, m.times_per_day]
        );
      }
    }

    await client.query('COMMIT');

    const { rows: fullRows } = await query(
      `SELECT dt.*, d.name AS disease_name
       FROM disease_templates dt
       JOIN diseases d ON d.id = dt.disease_id
       WHERE dt.id = $1`,
      [template.id]
    );
    const [enriched] = await attachMedicines(fullRows);
    res.status(201).json({
      id:          enriched.id,
      disease_id:  enriched.disease_id,
      diseaseName: enriched.disease_name,
      name:        enriched.name,
      medicines:   enriched.medicines,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /templates]', err);
    res.status(500).json({ error: 'Failed to create template' });
  } finally {
    client.release();
  }
});

// ----------------------------------------------------------------
// DELETE /api/templates/:id  — only the owning doctor can delete
// ----------------------------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await query(
      `DELETE FROM disease_templates WHERE id = $1 AND doctor_id = $2`,
      [req.params.id, req.doctor.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Template not found or not yours' });
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /templates/:id]', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

module.exports = router;
