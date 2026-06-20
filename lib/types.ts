export interface Doctor {
  id: string;
  user_id: string;
  name: string;
  email: string;
  clinic_name: string;
  specialization: string;
  phone?: string | null;
  dark_mode?: boolean;
}

export interface Patient {
  id: string;
  display_id: string;
  doctor_id: string;
  name: string;
  phone: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  address?: string | null;
  allergies?: string | null;
  visit_count: number;
  last_visit_date?: string | null;
  created_at: string;
}

export interface Medicine {
  id: string;
  name: string;
  category: string;
  usage_count: number;
  created_at?: string;
}

export interface PrescriptionItem {
  id: string;
  medicine_id: string;
  medicineName: string;
  description?: string | null;
  strength?: string | null;
  days: number;
  times_per_day: number;
  notes: string | null;
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  date: string;
  status: 'draft' | 'issued' | 'dispensed';
  diagnosis?: string | null;
  lab_tests?: string | null;
  next_visit_date?: string | null;
  items: PrescriptionItem[];
}

export interface Disease {
  id: string;
  name: string;
}

export interface TemplateMedicine {
  medicine_id: string;
  medicineName: string;
  days: number;
  times_per_day: number;
}

export interface DiseaseTemplate {
  id: string;
  disease_id: string;
  diseaseName: string;
  name: string;
  medicines: TemplateMedicine[];
}
