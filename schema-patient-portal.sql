-- ============================================================
-- SmartRx Patient Portal — Schema Additions
-- Run after schema.sql:
-- psql -U postgres -d smartrx -f schema-patient-portal.sql
-- ============================================================

-- 1. Add PIN / password_hash for patient login
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 2. Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id  UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id   UUID        NOT NULL REFERENCES doctors(id)  ON DELETE CASCADE,
  sender_type TEXT        NOT NULL CHECK (sender_type IN ('patient', 'doctor')),
  message     TEXT        NOT NULL,
  is_read     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_patient_doctor ON chat_messages(patient_id, doctor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_unread         ON chat_messages(is_read) WHERE is_read = false;

-- ============================================================
-- Schema additions complete.
-- ============================================================
