-- ============================================================
-- SmartRx — Complete PostgreSQL Schema
-- Run this file in pgAdmin or psql BEFORE starting the server
-- psql -U postgres -d smartrx -f schema.sql
-- ============================================================

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- ENUM TYPES
-- ============================================
DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- UTILITY: updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- TABLE: doctors
-- ============================================
CREATE TABLE IF NOT EXISTS doctors (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT        NOT NULL,
  email        TEXT        NOT NULL UNIQUE,
  password_hash TEXT       NOT NULL,
  clinic_name  TEXT        NOT NULL DEFAULT 'My Clinic',
  specialization TEXT      NOT NULL DEFAULT 'General Physician',
  phone        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctors_email ON doctors(email);

-- ============================================
-- TABLE: patients
-- ============================================
CREATE TABLE IF NOT EXISTS patients (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_id   TEXT        NOT NULL UNIQUE,
  doctor_id    UUID        NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  phone        TEXT        NOT NULL,
  age          INTEGER     NOT NULL CHECK (age >= 0 AND age <= 150),
  gender       gender_type NOT NULL,
  address      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patients_doctor_id   ON patients(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone       ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_display_id  ON patients(display_id);
CREATE INDEX IF NOT EXISTS idx_patients_name_trgm   ON patients USING GIN (name gin_trgm_ops);

-- ============================================
-- TABLE: medicines  (shared catalog)
-- ============================================
CREATE TABLE IF NOT EXISTS medicines (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT        NOT NULL UNIQUE,
  category     TEXT        NOT NULL DEFAULT 'General',
  usage_count  INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medicines_name_trgm    ON medicines USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_medicines_usage_count  ON medicines(usage_count DESC);

-- ============================================
-- TABLE: diseases
-- ============================================
CREATE TABLE IF NOT EXISTS diseases (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: disease_templates
-- ============================================
CREATE TABLE IF NOT EXISTS disease_templates (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  disease_id UUID        NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
  doctor_id  UUID        REFERENCES doctors(id) ON DELETE CASCADE,  -- NULL = global/system template
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disease_templates_disease_id ON disease_templates(disease_id);
CREATE INDEX IF NOT EXISTS idx_disease_templates_doctor_id  ON disease_templates(doctor_id);

-- ============================================
-- TABLE: template_medicines  (junction)
-- ============================================
CREATE TABLE IF NOT EXISTS template_medicines (
  id           UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id  UUID    NOT NULL REFERENCES disease_templates(id) ON DELETE CASCADE,
  medicine_id  UUID    NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  days         INTEGER NOT NULL DEFAULT 5 CHECK (days > 0),
  times_per_day INTEGER NOT NULL DEFAULT 2 CHECK (times_per_day > 0)
);

CREATE INDEX IF NOT EXISTS idx_template_medicines_template_id ON template_medicines(template_id);

-- Prevent duplicate medicine in same template
ALTER TABLE template_medicines
  DROP CONSTRAINT IF EXISTS uq_template_medicine;
ALTER TABLE template_medicines
  ADD CONSTRAINT uq_template_medicine UNIQUE (template_id, medicine_id);

-- ============================================
-- TABLE: prescriptions
-- ============================================
CREATE TABLE IF NOT EXISTS prescriptions (
  id              UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID  NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
  doctor_id       UUID  NOT NULL REFERENCES doctors(id)   ON DELETE CASCADE,
  date            DATE  NOT NULL DEFAULT CURRENT_DATE,
  diagnosis       TEXT,
  lab_tests       TEXT,
  next_visit_date DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_date ON prescriptions(patient_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_date  ON prescriptions(doctor_id,  date DESC);
-- Standalone date index for dashboard date-range queries in v_recent_prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON prescriptions(date DESC);

-- ============================================
-- TABLE: prescription_items  (junction)
-- ============================================
CREATE TABLE IF NOT EXISTS prescription_items (
  id              UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id UUID    NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_id     UUID    NOT NULL REFERENCES medicines(id),
  description     TEXT,
  days            INTEGER NOT NULL CHECK (days > 0),
  times_per_day   INTEGER NOT NULL CHECK (times_per_day > 0),
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription ON prescription_items(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_medicine     ON prescription_items(medicine_id);

-- ============================================
-- TRIGGER 1-3: auto-update updated_at
-- ============================================
DROP TRIGGER IF EXISTS trg_doctors_updated   ON doctors;
DROP TRIGGER IF EXISTS trg_patients_updated  ON patients;
DROP TRIGGER IF EXISTS trg_medicines_updated ON medicines;

CREATE TRIGGER trg_doctors_updated
  BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_patients_updated
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_medicines_updated
  BEFORE UPDATE ON medicines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER 4: auto-increment medicine usage_count
-- ============================================
CREATE OR REPLACE FUNCTION increment_medicine_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE medicines
    SET usage_count = usage_count + 1
    WHERE id = NEW.medicine_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_usage ON prescription_items;
CREATE TRIGGER trg_increment_usage
  AFTER INSERT ON prescription_items
  FOR EACH ROW EXECUTE FUNCTION increment_medicine_usage();

-- ============================================
-- TRIGGER 5-6: auto-generate patient display_id
-- ============================================
CREATE OR REPLACE FUNCTION generate_patient_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.display_id IS NULL OR NEW.display_id = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(display_id FROM 3) AS INTEGER)), 1000) + 1
      INTO next_num
      FROM patients
      WHERE display_id ~ '^P-[0-9]+$';
    NEW.display_id := 'P-' || next_num;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patient_display_id ON patients;
CREATE TRIGGER trg_patient_display_id
  BEFORE INSERT ON patients
  FOR EACH ROW EXECUTE FUNCTION generate_patient_display_id();

-- ============================================
-- STORED PROCEDURE: create_prescription_with_items
-- Atomic multi-row insert (ACID transaction)
-- ============================================
CREATE OR REPLACE FUNCTION create_prescription_with_items(
  p_patient_id      UUID,
  p_doctor_id       UUID,
  p_date            DATE,
  p_diagnosis       TEXT,
  p_lab_tests       TEXT,
  p_next_visit_date DATE,
  p_items           JSONB
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_prescription_id UUID;
  v_item JSONB;
BEGIN
  INSERT INTO prescriptions (patient_id, doctor_id, date, diagnosis, lab_tests, next_visit_date)
    VALUES (p_patient_id, p_doctor_id, p_date, p_diagnosis, p_lab_tests, p_next_visit_date)
    RETURNING id INTO v_prescription_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO prescription_items (
      prescription_id, medicine_id, description, days, times_per_day, notes
    ) VALUES (
      v_prescription_id,
      (v_item->>'medicine_id')::UUID,
      v_item->>'description',
      (v_item->>'days')::INTEGER,
      (v_item->>'times_per_day')::INTEGER,
      v_item->>'notes'
    );
  END LOOP;

  RETURN v_prescription_id;
END;
$$;

-- ============================================
-- STORED PROCEDURE: get_smart_suggestions
-- Returns medicines frequently co-prescribed
-- ============================================
CREATE OR REPLACE FUNCTION get_smart_suggestions(
  p_medicine_ids UUID[],
  p_limit        INTEGER DEFAULT 5
)
RETURNS TABLE (
  medicine_id   UUID,
  medicine_name TEXT,
  frequency     BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.name,
    COUNT(*) AS frequency
  FROM prescription_items pi
  JOIN medicines m ON m.id = pi.medicine_id
  WHERE pi.prescription_id IN (
    SELECT DISTINCT prescription_id
    FROM prescription_items
    WHERE medicine_id = ANY(p_medicine_ids)
  )
  AND pi.medicine_id <> ALL(p_medicine_ids)
  GROUP BY m.id, m.name
  ORDER BY frequency DESC
  LIMIT p_limit;
END;
$$;

-- ============================================
-- STORED PROCEDURE: get_top_medicines
-- ============================================
CREATE OR REPLACE FUNCTION get_top_medicines(p_limit INTEGER DEFAULT 5)
RETURNS TABLE (id UUID, name TEXT, category TEXT, usage_count INTEGER)
LANGUAGE sql
STABLE
AS $$
  SELECT id, name, category, usage_count
  FROM medicines
  ORDER BY usage_count DESC
  LIMIT p_limit;
$$;

-- ============================================
-- VIEWS
-- ============================================
DROP VIEW IF EXISTS v_top_medicines;
CREATE VIEW v_top_medicines AS
SELECT id, name, category, usage_count
FROM medicines
ORDER BY usage_count DESC;

DROP VIEW IF EXISTS v_patient_visit_frequency;
CREATE VIEW v_patient_visit_frequency AS
SELECT
  p.id          AS patient_id,
  p.display_id,
  p.name,
  p.doctor_id,
  COUNT(rx.id)  AS visit_count,
  MAX(rx.date)  AS last_visit
FROM patients p
LEFT JOIN prescriptions rx ON rx.patient_id = p.id
GROUP BY p.id, p.display_id, p.name, p.doctor_id;

DROP VIEW IF EXISTS v_recent_prescriptions;
CREATE VIEW v_recent_prescriptions AS
SELECT
  rx.id,
  rx.date,
  rx.diagnosis,
  p.display_id  AS patient_display_id,
  p.name        AS patient_name,
  d.name        AS doctor_name,
  rx.doctor_id,
  COUNT(pi.id)  AS item_count
FROM prescriptions rx
JOIN patients p         ON p.id  = rx.patient_id
JOIN doctors d          ON d.id  = rx.doctor_id
LEFT JOIN prescription_items pi ON pi.prescription_id = rx.id
WHERE rx.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY rx.id, rx.date, rx.diagnosis, p.display_id, p.name, d.name, rx.doctor_id
ORDER BY rx.date DESC;

-- ============================================================
-- Schema setup complete.
-- ============================================================

-- ============================================================
-- SEED: 200 medicines (safe to re-run — ON CONFLICT DO NOTHING)
-- ============================================================
INSERT INTO medicines (name, category) VALUES
('Paracetamol', 'Analgesic'),
('Ibuprofen', 'Analgesic'),
('Aspirin', 'Analgesic'),
('Diclofenac', 'Analgesic'),
('Naproxen', 'Analgesic'),
('Mefenamic Acid', 'Analgesic'),
('Tramadol', 'Analgesic'),
('Celecoxib', 'Analgesic'),
('Ketorolac', 'Analgesic'),
('Meloxicam', 'Analgesic'),
('Amoxicillin', 'Antibiotic'),
('Amoxicillin + Clavulanate', 'Antibiotic'),
('Azithromycin', 'Antibiotic'),
('Clarithromycin', 'Antibiotic'),
('Ciprofloxacin', 'Antibiotic'),
('Levofloxacin', 'Antibiotic'),
('Doxycycline', 'Antibiotic'),
('Metronidazole', 'Antibiotic'),
('Ceftriaxone', 'Antibiotic'),
('Cefixime', 'Antibiotic'),
('Cefuroxime', 'Antibiotic'),
('Cephalexin', 'Antibiotic'),
('Erythromycin', 'Antibiotic'),
('Trimethoprim + Sulfamethoxazole', 'Antibiotic'),
('Clindamycin', 'Antibiotic'),
('Nitrofurantoin', 'Antibiotic'),
('Vancomycin', 'Antibiotic'),
('Meropenem', 'Antibiotic'),
('Piperacillin + Tazobactam', 'Antibiotic'),
('Flucloxacillin', 'Antibiotic'),
('Fluconazole', 'Antifungal'),
('Itraconazole', 'Antifungal'),
('Clotrimazole', 'Antifungal'),
('Terbinafine', 'Antifungal'),
('Nystatin', 'Antifungal'),
('Acyclovir', 'Antiviral'),
('Oseltamivir', 'Antiviral'),
('Valacyclovir', 'Antiviral'),
('Albendazole', 'Antiparasitic'),
('Mebendazole', 'Antiparasitic'),
('Chloroquine', 'Antiparasitic'),
('Artemether + Lumefantrine', 'Antiparasitic'),
('Ivermectin', 'Antiparasitic'),
('Cetirizine', 'Antihistamine'),
('Loratadine', 'Antihistamine'),
('Fexofenadine', 'Antihistamine'),
('Chlorpheniramine', 'Antihistamine'),
('Diphenhydramine', 'Antihistamine'),
('Levocetirizine', 'Antihistamine'),
('Desloratadine', 'Antihistamine'),
('Hydroxyzine', 'Antihistamine'),
('Omeprazole', 'Gastro'),
('Pantoprazole', 'Gastro'),
('Esomeprazole', 'Gastro'),
('Rabeprazole', 'Gastro'),
('Ranitidine', 'Gastro'),
('Famotidine', 'Gastro'),
('Domperidone', 'Gastro'),
('Metoclopramide', 'Gastro'),
('Ondansetron', 'Gastro'),
('Loperamide', 'Gastro'),
('Bisacodyl', 'Gastro'),
('Lactulose', 'Gastro'),
('Ispaghula Husk', 'Gastro'),
('Hyoscine Butylbromide', 'Gastro'),
('Sucralfate', 'Gastro'),
('Simethicone', 'Gastro'),
('Zinc Sulphate', 'Gastro'),
('Oral Rehydration Salts', 'Gastro'),
('Salbutamol', 'Respiratory'),
('Ipratropium Bromide', 'Respiratory'),
('Budesonide', 'Respiratory'),
('Fluticasone', 'Respiratory'),
('Salmeterol', 'Respiratory'),
('Montelukast', 'Respiratory'),
('Theophylline', 'Respiratory'),
('Dextromethorphan', 'Respiratory'),
('Guaifenesin', 'Respiratory'),
('Bromhexine', 'Respiratory'),
('Ambroxol', 'Respiratory'),
('Codeine', 'Respiratory'),
('Beclometasone', 'Respiratory'),
('Tiotropium', 'Respiratory'),
('Acetylcysteine', 'Respiratory'),
('Amlodipine', 'Cardiovascular'),
('Atenolol', 'Cardiovascular'),
('Metoprolol', 'Cardiovascular'),
('Bisoprolol', 'Cardiovascular'),
('Carvedilol', 'Cardiovascular'),
('Enalapril', 'Cardiovascular'),
('Lisinopril', 'Cardiovascular'),
('Ramipril', 'Cardiovascular'),
('Losartan', 'Cardiovascular'),
('Valsartan', 'Cardiovascular'),
('Telmisartan', 'Cardiovascular'),
('Hydrochlorothiazide', 'Cardiovascular'),
('Furosemide', 'Cardiovascular'),
('Spironolactone', 'Cardiovascular'),
('Digoxin', 'Cardiovascular'),
('Nitroglycerin', 'Cardiovascular'),
('Isosorbide Mononitrate', 'Cardiovascular'),
('Warfarin', 'Cardiovascular'),
('Heparin', 'Cardiovascular'),
('Clopidogrel', 'Cardiovascular'),
('Aspirin Low Dose', 'Cardiovascular'),
('Nifedipine', 'Cardiovascular'),
('Diltiazem', 'Cardiovascular'),
('Verapamil', 'Cardiovascular'),
('Hydralazine', 'Cardiovascular'),
('Atorvastatin', 'Lipid-Lowering'),
('Simvastatin', 'Lipid-Lowering'),
('Rosuvastatin', 'Lipid-Lowering'),
('Fenofibrate', 'Lipid-Lowering'),
('Gemfibrozil', 'Lipid-Lowering'),
('Metformin', 'Diabetes'),
('Glibenclamide', 'Diabetes'),
('Glimepiride', 'Diabetes'),
('Gliclazide', 'Diabetes'),
('Sitagliptin', 'Diabetes'),
('Empagliflozin', 'Diabetes'),
('Dapagliflozin', 'Diabetes'),
('Pioglitazone', 'Diabetes'),
('Insulin Regular', 'Diabetes'),
('Insulin NPH', 'Diabetes'),
('Insulin Glargine', 'Diabetes'),
('Insulin Lispro', 'Diabetes'),
('Liraglutide', 'Diabetes'),
('Levothyroxine', 'Thyroid'),
('Carbimazole', 'Thyroid'),
('Propylthiouracil', 'Thyroid'),
('Diazepam', 'Neurology'),
('Lorazepam', 'Neurology'),
('Alprazolam', 'Neurology'),
('Clonazepam', 'Neurology'),
('Phenytoin', 'Neurology'),
('Carbamazepine', 'Neurology'),
('Valproate', 'Neurology'),
('Levetiracetam', 'Neurology'),
('Amitriptyline', 'Neurology'),
('Sertraline', 'Neurology'),
('Fluoxetine', 'Neurology'),
('Escitalopram', 'Neurology'),
('Citalopram', 'Neurology'),
('Paroxetine', 'Neurology'),
('Venlafaxine', 'Neurology'),
('Mirtazapine', 'Neurology'),
('Risperidone', 'Neurology'),
('Olanzapine', 'Neurology'),
('Haloperidol', 'Neurology'),
('Propranolol', 'Neurology'),
('Sumatriptan', 'Neurology'),
('Topiramate', 'Neurology'),
('Vitamin C', 'Vitamin'),
('Vitamin D3', 'Vitamin'),
('Vitamin B Complex', 'Vitamin'),
('Vitamin B12', 'Vitamin'),
('Folic Acid', 'Vitamin'),
('Iron Sulphate', 'Vitamin'),
('Calcium Carbonate', 'Vitamin'),
('Magnesium Oxide', 'Vitamin'),
('Zinc', 'Vitamin'),
('Multivitamin', 'Vitamin'),
('Omega-3 Fatty Acids', 'Vitamin'),
('Prednisolone', 'Corticosteroid'),
('Dexamethasone', 'Corticosteroid'),
('Hydrocortisone', 'Corticosteroid'),
('Methylprednisolone', 'Corticosteroid'),
('Betamethasone', 'Corticosteroid'),
('Triamcinolone', 'Corticosteroid'),
('Cyclobenzaprine', 'Musculoskeletal'),
('Baclofen', 'Musculoskeletal'),
('Tizanidine', 'Musculoskeletal'),
('Colchicine', 'Musculoskeletal'),
('Allopurinol', 'Musculoskeletal'),
('Methotrexate', 'Musculoskeletal'),
('Hydroxychloroquine', 'Musculoskeletal'),
('Hydrocortisone Cream', 'Dermatology'),
('Betamethasone Cream', 'Dermatology'),
('Clotrimazole Cream', 'Dermatology'),
('Mupirocin', 'Dermatology'),
('Permethrin', 'Dermatology'),
('Tretinoin', 'Dermatology'),
('Benzoyl Peroxide', 'Dermatology'),
('Calamine Lotion', 'Dermatology'),
('Ciprofloxacin Eye Drops', 'Ophthalmology'),
('Chloramphenicol Eye Drops', 'Ophthalmology'),
('Tobramycin Eye Drops', 'Ophthalmology'),
('Dexamethasone Eye Drops', 'Ophthalmology'),
('Timolol Eye Drops', 'Ophthalmology'),
('Artificial Tears', 'Ophthalmology'),
('Xylometazoline Nasal Spray', 'ENT'),
('Fluticasone Nasal Spray', 'ENT'),
('Mometasone Nasal Spray', 'ENT'),
('Oxymetazoline Nasal Spray', 'ENT'),
('Adrenaline', 'Emergency'),
('Atropine', 'Emergency'),
('Dopamine', 'Emergency'),
('Noradrenaline', 'Emergency'),
('Naloxone', 'Emergency'),
('Activated Charcoal', 'Emergency'),
('Sodium Bicarbonate', 'Emergency'),
('Magnesium Sulphate', 'Emergency')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- FEATURE ADDITIONS: Dosage/Strength, Status, Allergies,
--                    Visit Counter, Dark Mode pref
-- ============================================================

-- 1. Medicine strength on prescription_items
ALTER TABLE prescription_items
  ADD COLUMN IF NOT EXISTS strength TEXT;

-- 2. Prescription status
DO $$ BEGIN
  CREATE TYPE prescription_status AS ENUM ('draft', 'issued', 'dispensed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS status prescription_status NOT NULL DEFAULT 'issued';

-- 3. Patient allergies & visit tracking
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS allergies TEXT,
  ADD COLUMN IF NOT EXISTS visit_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_visit_date DATE;

-- 4. Doctor dark mode preference
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN NOT NULL DEFAULT false;

-- 5. Trigger: auto-update patient visit_count + last_visit_date on new prescription
CREATE OR REPLACE FUNCTION update_patient_visit_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE patients
    SET visit_count    = visit_count + 1,
        last_visit_date = NEW.date,
        updated_at      = now()
  WHERE id = NEW.patient_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patient_visit_stats ON prescriptions;
CREATE TRIGGER trg_patient_visit_stats
  AFTER INSERT ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION update_patient_visit_stats();

-- 6. Index on prescription status
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);

-- 7. Index on patients last_visit_date for sorting
CREATE INDEX IF NOT EXISTS idx_patients_last_visit ON patients(last_visit_date DESC);

-- ============================================================
-- UPDATE stored procedure to accept status + strength
-- ============================================================
CREATE OR REPLACE FUNCTION create_prescription_with_items(
  p_patient_id      UUID,
  p_doctor_id       UUID,
  p_date            DATE,
  p_diagnosis       TEXT,
  p_lab_tests       TEXT,
  p_next_visit_date DATE,
  p_items           JSONB,
  p_status          prescription_status DEFAULT 'issued'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_prescription_id UUID;
  v_item JSONB;
BEGIN
  INSERT INTO prescriptions (patient_id, doctor_id, date, diagnosis, lab_tests, next_visit_date, status)
    VALUES (p_patient_id, p_doctor_id, p_date, p_diagnosis, p_lab_tests, p_next_visit_date, p_status)
    RETURNING id INTO v_prescription_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO prescription_items
      (prescription_id, medicine_id, description, strength, days, times_per_day, notes)
    VALUES (
      v_prescription_id,
      (v_item->>'medicine_id')::UUID,
      v_item->>'description',
      v_item->>'strength',
      (v_item->>'days')::INTEGER,
      (v_item->>'times_per_day')::INTEGER,
      v_item->>'notes'
    );
  END LOOP;

  RETURN v_prescription_id;
END;
$$;
