const router = require('express').Router();
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// ----------------------------------------------------------------
// GET /api/alerts/prescription/:prescriptionId
// Returns all allergy alerts for a given prescription.
// Only returns alerts for prescriptions belonging to this doctor.
// ----------------------------------------------------------------
router.get('/prescription/:prescriptionId', async (req, res) => {
  try {
    const { prescriptionId } = req.params;

    // Confirm the prescription belongs to this doctor
    const { rows: rxRows } = await query(
      `SELECT id, has_allergy_conflict FROM prescriptions
       WHERE id = $1 AND doctor_id = $2`,
      [prescriptionId, req.doctorId]
    );

    if (rxRows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    const { rows: alerts } = await query(
      `SELECT
         aa.id,
         aa.medicine_id,
         aa.medicine_name,
         aa.allergy_term,
         aa.created_at
       FROM allergy_alerts aa
       WHERE aa.prescription_id = $1
       ORDER BY aa.created_at ASC`,
      [prescriptionId]
    );

    res.json({
      prescription_id:      prescriptionId,
      has_allergy_conflict: rxRows[0].has_allergy_conflict,
      alerts,
    });
  } catch (err) {
    console.error('[GET /alerts/prescription/:id]', err);
    res.status(500).json({ error: 'Failed to fetch allergy alerts' });
  }
});

// ----------------------------------------------------------------
// GET /api/alerts/patient/:patientId
// Returns all allergy alerts across all prescriptions for a patient.
// Useful for showing a warning history on the patient detail page.
// ----------------------------------------------------------------
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;

    // Verify the patient belongs to this doctor
    const { rows: patRows } = await query(
      `SELECT id FROM patients WHERE id = $1 AND doctor_id = $2`,
      [patientId, req.doctorId]
    );

    if (patRows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const { rows: alerts } = await query(
      `SELECT
         aa.id,
         aa.prescription_id,
         rx.date            AS prescription_date,
         aa.medicine_id,
         aa.medicine_name,
         aa.allergy_term,
         aa.created_at
       FROM allergy_alerts aa
       JOIN prescriptions rx ON rx.id = aa.prescription_id
       WHERE rx.patient_id = $1
       ORDER BY aa.created_at DESC`,
      [patientId]
    );

    res.json({ patient_id: patientId, alerts });
  } catch (err) {
    console.error('[GET /alerts/patient/:id]', err);
    res.status(500).json({ error: 'Failed to fetch patient allergy history' });
  }
});

module.exports = router;