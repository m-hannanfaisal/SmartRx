require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const medicines = [
  // ── Analgesics / Pain Relief (20) ─────────────────────
  ['Paracetamol 500mg', 'Analgesic'],
  ['Paracetamol 650mg', 'Analgesic'],
  ['Ibuprofen 200mg', 'Analgesic'],
  ['Ibuprofen 400mg', 'Analgesic'],
  ['Aspirin 75mg', 'Analgesic'],
  ['Aspirin 325mg', 'Analgesic'],
  ['Diclofenac 50mg', 'Analgesic'],
  ['Diclofenac 75mg Injection', 'Analgesic'],
  ['Naproxen 250mg', 'Analgesic'],
  ['Naproxen 500mg', 'Analgesic'],
  ['Mefenamic Acid 250mg', 'Analgesic'],
  ['Mefenamic Acid 500mg', 'Analgesic'],
  ['Tramadol 50mg', 'Analgesic'],
  ['Tramadol 100mg', 'Analgesic'],
  ['Celecoxib 200mg', 'Analgesic'],
  ['Ketorolac 10mg', 'Analgesic'],
  ['Ketorolac 30mg Injection', 'Analgesic'],
  ['Meloxicam 7.5mg', 'Analgesic'],
  ['Meloxicam 15mg', 'Analgesic'],
  ['Piroxicam 20mg', 'Analgesic'],

  // ── Antibiotics (30) ──────────────────────────────────
  ['Amoxicillin 250mg', 'Antibiotic'],
  ['Amoxicillin 500mg', 'Antibiotic'],
  ['Amoxicillin + Clavulanate 375mg', 'Antibiotic'],
  ['Amoxicillin + Clavulanate 625mg', 'Antibiotic'],
  ['Azithromycin 250mg', 'Antibiotic'],
  ['Azithromycin 500mg', 'Antibiotic'],
  ['Clarithromycin 250mg', 'Antibiotic'],
  ['Clarithromycin 500mg', 'Antibiotic'],
  ['Ciprofloxacin 250mg', 'Antibiotic'],
  ['Ciprofloxacin 500mg', 'Antibiotic'],
  ['Levofloxacin 250mg', 'Antibiotic'],
  ['Levofloxacin 500mg', 'Antibiotic'],
  ['Levofloxacin 750mg', 'Antibiotic'],
  ['Doxycycline 100mg', 'Antibiotic'],
  ['Metronidazole 200mg', 'Antibiotic'],
  ['Metronidazole 400mg', 'Antibiotic'],
  ['Ceftriaxone 1g Injection', 'Antibiotic'],
  ['Cefixime 200mg', 'Antibiotic'],
  ['Cefixime 400mg', 'Antibiotic'],
  ['Cefuroxime 250mg', 'Antibiotic'],
  ['Cefuroxime 500mg', 'Antibiotic'],
  ['Cephalexin 250mg', 'Antibiotic'],
  ['Cephalexin 500mg', 'Antibiotic'],
  ['Erythromycin 250mg', 'Antibiotic'],
  ['Erythromycin 500mg', 'Antibiotic'],
  ['Co-trimoxazole 480mg', 'Antibiotic'],
  ['Clindamycin 300mg', 'Antibiotic'],
  ['Nitrofurantoin 100mg', 'Antibiotic'],
  ['Flucloxacillin 250mg', 'Antibiotic'],
  ['Flucloxacillin 500mg', 'Antibiotic'],

  // ── Antifungals (6) ───────────────────────────────────
  ['Fluconazole 150mg', 'Antifungal'],
  ['Fluconazole 50mg', 'Antifungal'],
  ['Itraconazole 100mg', 'Antifungal'],
  ['Clotrimazole Cream 1%', 'Antifungal'],
  ['Terbinafine 250mg', 'Antifungal'],
  ['Nystatin Oral Suspension', 'Antifungal'],

  // ── Antivirals (5) ────────────────────────────────────
  ['Acyclovir 200mg', 'Antiviral'],
  ['Acyclovir 400mg', 'Antiviral'],
  ['Valacyclovir 500mg', 'Antiviral'],
  ['Oseltamivir 75mg', 'Antiviral'],
  ['Famciclovir 500mg', 'Antiviral'],

  // ── Antiparasitics (5) ────────────────────────────────
  ['Albendazole 400mg', 'Antiparasitic'],
  ['Mebendazole 100mg', 'Antiparasitic'],
  ['Ivermectin 12mg', 'Antiparasitic'],
  ['Chloroquine 250mg', 'Antiparasitic'],
  ['Artemether + Lumefantrine', 'Antiparasitic'],

  // ── Antihistamines / Allergy (12) ─────────────────────
  ['Cetirizine 10mg', 'Antihistamine'],
  ['Cetirizine 5mg Syrup', 'Antihistamine'],
  ['Loratadine 10mg', 'Antihistamine'],
  ['Fexofenadine 120mg', 'Antihistamine'],
  ['Fexofenadine 180mg', 'Antihistamine'],
  ['Chlorpheniramine 4mg', 'Antihistamine'],
  ['Diphenhydramine 25mg', 'Antihistamine'],
  ['Levocetirizine 5mg', 'Antihistamine'],
  ['Desloratadine 5mg', 'Antihistamine'],
  ['Hydroxyzine 10mg', 'Antihistamine'],
  ['Hydroxyzine 25mg', 'Antihistamine'],
  ['Promethazine 25mg', 'Antihistamine'],

  // ── Gastro / GI (22) ─────────────────────────────────
  ['Omeprazole 20mg', 'Gastro'],
  ['Omeprazole 40mg', 'Gastro'],
  ['Pantoprazole 20mg', 'Gastro'],
  ['Pantoprazole 40mg', 'Gastro'],
  ['Esomeprazole 20mg', 'Gastro'],
  ['Esomeprazole 40mg', 'Gastro'],
  ['Rabeprazole 20mg', 'Gastro'],
  ['Famotidine 20mg', 'Gastro'],
  ['Famotidine 40mg', 'Gastro'],
  ['Domperidone 10mg', 'Gastro'],
  ['Metoclopramide 10mg', 'Gastro'],
  ['Ondansetron 4mg', 'Gastro'],
  ['Ondansetron 8mg', 'Gastro'],
  ['Loperamide 2mg', 'Gastro'],
  ['Bisacodyl 5mg', 'Gastro'],
  ['Lactulose Syrup', 'Gastro'],
  ['Ispaghula Husk Sachet', 'Gastro'],
  ['Hyoscine Butylbromide 10mg', 'Gastro'],
  ['Sucralfate 1g', 'Gastro'],
  ['Simethicone 80mg', 'Gastro'],
  ['Oral Rehydration Salts (ORS)', 'Gastro'],
  ['Zinc Sulphate 20mg', 'Gastro'],

  // ── Respiratory (18) ──────────────────────────────────
  ['Salbutamol Inhaler 100mcg', 'Respiratory'],
  ['Salbutamol Nebulizer 2.5mg', 'Respiratory'],
  ['Salbutamol Syrup 2mg/5ml', 'Respiratory'],
  ['Ipratropium Inhaler', 'Respiratory'],
  ['Budesonide Inhaler 200mcg', 'Respiratory'],
  ['Fluticasone Inhaler 125mcg', 'Respiratory'],
  ['Fluticasone Inhaler 250mcg', 'Respiratory'],
  ['Salmeterol + Fluticasone 50/250', 'Respiratory'],
  ['Montelukast 5mg', 'Respiratory'],
  ['Montelukast 10mg', 'Respiratory'],
  ['Theophylline 200mg', 'Respiratory'],
  ['Dextromethorphan 15mg Syrup', 'Respiratory'],
  ['Guaifenesin 100mg Syrup', 'Respiratory'],
  ['Bromhexine 8mg', 'Respiratory'],
  ['Ambroxol 30mg', 'Respiratory'],
  ['Codeine Phosphate 15mg', 'Respiratory'],
  ['Tiotropium Inhaler 18mcg', 'Respiratory'],
  ['Acetylcysteine 600mg', 'Respiratory'],

  // ── Cardiovascular (30) ───────────────────────────────
  ['Amlodipine 2.5mg', 'Cardiovascular'],
  ['Amlodipine 5mg', 'Cardiovascular'],
  ['Amlodipine 10mg', 'Cardiovascular'],
  ['Atenolol 25mg', 'Cardiovascular'],
  ['Atenolol 50mg', 'Cardiovascular'],
  ['Metoprolol 25mg', 'Cardiovascular'],
  ['Metoprolol 50mg', 'Cardiovascular'],
  ['Bisoprolol 2.5mg', 'Cardiovascular'],
  ['Bisoprolol 5mg', 'Cardiovascular'],
  ['Carvedilol 6.25mg', 'Cardiovascular'],
  ['Carvedilol 12.5mg', 'Cardiovascular'],
  ['Enalapril 5mg', 'Cardiovascular'],
  ['Enalapril 10mg', 'Cardiovascular'],
  ['Lisinopril 5mg', 'Cardiovascular'],
  ['Lisinopril 10mg', 'Cardiovascular'],
  ['Ramipril 2.5mg', 'Cardiovascular'],
  ['Ramipril 5mg', 'Cardiovascular'],
  ['Losartan 25mg', 'Cardiovascular'],
  ['Losartan 50mg', 'Cardiovascular'],
  ['Valsartan 80mg', 'Cardiovascular'],
  ['Telmisartan 40mg', 'Cardiovascular'],
  ['Telmisartan 80mg', 'Cardiovascular'],
  ['Hydrochlorothiazide 12.5mg', 'Cardiovascular'],
  ['Hydrochlorothiazide 25mg', 'Cardiovascular'],
  ['Furosemide 20mg', 'Cardiovascular'],
  ['Furosemide 40mg', 'Cardiovascular'],
  ['Spironolactone 25mg', 'Cardiovascular'],
  ['Digoxin 0.25mg', 'Cardiovascular'],
  ['Nitroglycerin 0.5mg SL', 'Cardiovascular'],
  ['Isosorbide Mononitrate 20mg', 'Cardiovascular'],

  // ── Anticoagulants / Antiplatelets (8) ────────────────
  ['Aspirin Low Dose 75mg', 'Anticoagulant'],
  ['Clopidogrel 75mg', 'Anticoagulant'],
  ['Warfarin 2mg', 'Anticoagulant'],
  ['Warfarin 5mg', 'Anticoagulant'],
  ['Rivaroxaban 10mg', 'Anticoagulant'],
  ['Rivaroxaban 20mg', 'Anticoagulant'],
  ['Dabigatran 110mg', 'Anticoagulant'],
  ['Enoxaparin 40mg Injection', 'Anticoagulant'],

  // ── Lipid-Lowering (8) ────────────────────────────────
  ['Atorvastatin 10mg', 'Lipid-Lowering'],
  ['Atorvastatin 20mg', 'Lipid-Lowering'],
  ['Atorvastatin 40mg', 'Lipid-Lowering'],
  ['Rosuvastatin 5mg', 'Lipid-Lowering'],
  ['Rosuvastatin 10mg', 'Lipid-Lowering'],
  ['Rosuvastatin 20mg', 'Lipid-Lowering'],
  ['Simvastatin 20mg', 'Lipid-Lowering'],
  ['Fenofibrate 200mg', 'Lipid-Lowering'],

  // ── Diabetes (16) ─────────────────────────────────────
  ['Metformin 500mg', 'Diabetes'],
  ['Metformin 850mg', 'Diabetes'],
  ['Metformin 1000mg', 'Diabetes'],
  ['Glibenclamide 5mg', 'Diabetes'],
  ['Glimepiride 1mg', 'Diabetes'],
  ['Glimepiride 2mg', 'Diabetes'],
  ['Gliclazide 40mg', 'Diabetes'],
  ['Gliclazide 80mg MR', 'Diabetes'],
  ['Sitagliptin 50mg', 'Diabetes'],
  ['Sitagliptin 100mg', 'Diabetes'],
  ['Empagliflozin 10mg', 'Diabetes'],
  ['Empagliflozin 25mg', 'Diabetes'],
  ['Dapagliflozin 10mg', 'Diabetes'],
  ['Pioglitazone 15mg', 'Diabetes'],
  ['Insulin Glargine 100IU/ml', 'Diabetes'],
  ['Insulin Lispro 100IU/ml', 'Diabetes'],

  // ── Thyroid (4) ───────────────────────────────────────
  ['Levothyroxine 25mcg', 'Thyroid'],
  ['Levothyroxine 50mcg', 'Thyroid'],
  ['Levothyroxine 100mcg', 'Thyroid'],
  ['Carbimazole 5mg', 'Thyroid'],

  // ── Neurology / Psychiatry (24) ───────────────────────
  ['Diazepam 5mg', 'Neurology'],
  ['Diazepam 10mg', 'Neurology'],
  ['Lorazepam 1mg', 'Neurology'],
  ['Alprazolam 0.25mg', 'Neurology'],
  ['Alprazolam 0.5mg', 'Neurology'],
  ['Clonazepam 0.5mg', 'Neurology'],
  ['Phenytoin 100mg', 'Neurology'],
  ['Carbamazepine 200mg', 'Neurology'],
  ['Valproate 200mg', 'Neurology'],
  ['Valproate 500mg', 'Neurology'],
  ['Levetiracetam 500mg', 'Neurology'],
  ['Levetiracetam 1000mg', 'Neurology'],
  ['Amitriptyline 10mg', 'Neurology'],
  ['Amitriptyline 25mg', 'Neurology'],
  ['Sertraline 50mg', 'Neurology'],
  ['Fluoxetine 20mg', 'Neurology'],
  ['Escitalopram 5mg', 'Neurology'],
  ['Escitalopram 10mg', 'Neurology'],
  ['Venlafaxine 75mg', 'Neurology'],
  ['Mirtazapine 15mg', 'Neurology'],
  ['Risperidone 1mg', 'Neurology'],
  ['Olanzapine 5mg', 'Neurology'],
  ['Haloperidol 5mg', 'Neurology'],
  ['Propranolol 40mg', 'Neurology'],

  // ── Migraine (4) ──────────────────────────────────────
  ['Sumatriptan 50mg', 'Migraine'],
  ['Sumatriptan 100mg', 'Migraine'],
  ['Topiramate 25mg', 'Migraine'],
  ['Topiramate 50mg', 'Migraine'],

  // ── Vitamins & Supplements (14) ───────────────────────
  ['Vitamin C 500mg', 'Vitamin'],
  ['Vitamin C 1000mg', 'Vitamin'],
  ['Vitamin D3 1000IU', 'Vitamin'],
  ['Vitamin D3 5000IU', 'Vitamin'],
  ['Vitamin D3 200000IU Injection', 'Vitamin'],
  ['Vitamin B Complex', 'Vitamin'],
  ['Vitamin B12 1000mcg', 'Vitamin'],
  ['Folic Acid 5mg', 'Vitamin'],
  ['Iron Sulphate 200mg', 'Vitamin'],
  ['Calcium + Vitamin D', 'Vitamin'],
  ['Calcium Carbonate 500mg', 'Vitamin'],
  ['Magnesium Oxide 400mg', 'Vitamin'],
  ['Zinc 20mg', 'Vitamin'],
  ['Multivitamin Tablet', 'Vitamin'],

  // ── Corticosteroids (8) ───────────────────────────────
  ['Prednisolone 5mg', 'Corticosteroid'],
  ['Prednisolone 20mg', 'Corticosteroid'],
  ['Dexamethasone 0.5mg', 'Corticosteroid'],
  ['Dexamethasone 4mg', 'Corticosteroid'],
  ['Dexamethasone 8mg Injection', 'Corticosteroid'],
  ['Hydrocortisone 10mg', 'Corticosteroid'],
  ['Methylprednisolone 4mg', 'Corticosteroid'],
  ['Betamethasone 0.5mg', 'Corticosteroid'],

  // ── Musculoskeletal (8) ───────────────────────────────
  ['Cyclobenzaprine 10mg', 'Musculoskeletal'],
  ['Baclofen 10mg', 'Musculoskeletal'],
  ['Tizanidine 2mg', 'Musculoskeletal'],
  ['Colchicine 0.5mg', 'Musculoskeletal'],
  ['Allopurinol 100mg', 'Musculoskeletal'],
  ['Allopurinol 300mg', 'Musculoskeletal'],
  ['Methotrexate 2.5mg', 'Musculoskeletal'],
  ['Hydroxychloroquine 200mg', 'Musculoskeletal'],

  // ── Dermatology (8) ───────────────────────────────────
  ['Hydrocortisone Cream 1%', 'Dermatology'],
  ['Betamethasone Cream 0.05%', 'Dermatology'],
  ['Clobetasol Cream 0.05%', 'Dermatology'],
  ['Mupirocin Ointment 2%', 'Dermatology'],
  ['Fusidic Acid Cream 2%', 'Dermatology'],
  ['Tretinoin Cream 0.025%', 'Dermatology'],
  ['Benzoyl Peroxide Gel 5%', 'Dermatology'],
  ['Calamine Lotion', 'Dermatology'],

  // ── Ophthalmology (6) ─────────────────────────────────
  ['Ciprofloxacin Eye Drops 0.3%', 'Ophthalmology'],
  ['Tobramycin Eye Drops 0.3%', 'Ophthalmology'],
  ['Dexamethasone Eye Drops 0.1%', 'Ophthalmology'],
  ['Moxifloxacin Eye Drops 0.5%', 'Ophthalmology'],
  ['Timolol Eye Drops 0.5%', 'Ophthalmology'],
  ['Artificial Tears (CMC)', 'Ophthalmology'],

  // ── ENT (6) ───────────────────────────────────────────
  ['Xylometazoline Nasal Spray', 'ENT'],
  ['Fluticasone Nasal Spray', 'ENT'],
  ['Mometasone Nasal Spray', 'ENT'],
  ['Oxymetazoline Nasal Spray', 'ENT'],
  ['Ciprofloxacin Ear Drops', 'ENT'],
  ['Betahistine 16mg', 'ENT'],

  // ── Emergency (6) ─────────────────────────────────────
  ['Adrenaline 1mg Injection', 'Emergency'],
  ['Atropine 0.6mg Injection', 'Emergency'],
  ['Dopamine Injection', 'Emergency'],
  ['Naloxone 0.4mg Injection', 'Emergency'],
  ['Sodium Bicarbonate 7.5%', 'Emergency'],
  ['Activated Charcoal', 'Emergency'],
];

async function main() {
  console.log(`\nSeeding ${medicines.length} medicines...\n`);

  // Clear existing medicines (cascade won't affect prescriptions since we use ON DELETE CASCADE only on prescription_items)
  // Instead, use ON CONFLICT to upsert
  let inserted = 0;
  let skipped = 0;

  for (const [name, category] of medicines) {
    try {
      const { rowCount } = await pool.query(
        `INSERT INTO medicines (name, category) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
        [name, category]
      );
      if (rowCount > 0) inserted++;
      else skipped++;
    } catch (err) {
      console.error(`  ✗ Failed: ${name} — ${err.message}`);
    }
  }

  // Count total
  const { rows } = await pool.query('SELECT COUNT(*) AS total FROM medicines');

  console.log('──────────────────────────────────────');
  console.log(`  ✅ Inserted: ${inserted} new medicines`);
  console.log(`  ⏭  Skipped:  ${skipped} (already existed)`);
  console.log(`  📦 Total:    ${rows[0].total} medicines in catalog`);
  console.log('──────────────────────────────────────\n');

  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); });
