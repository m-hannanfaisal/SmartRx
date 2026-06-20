import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────
export interface PatientProfile {
  id: string;
  display_id: string;
  name: string;
  phone: string;
  age: number;
  gender: string;
  address?: string | null;
  allergies?: string | null;
  visit_count: number;
  last_visit_date?: string | null;
  doctor_id: string;
  doctor_name: string;
  clinic_name: string;
  specialization: string;
  created_at: string;
}

export interface DoctorRelation {
  patient_id: string;
  display_id?: string;
  doctor_id: string;
  doctor_name: string;
  clinic_name: string;
  specialization?: string;
  unread_count?: number;
}

interface PatientAuthContextValue {
  patient:          PatientProfile | null;
  doctors:          DoctorRelation[];
  token:            string | null;
  loading:          boolean;
  setPatientAuth:   (token: string, patient: PatientProfile, doctors?: DoctorRelation[]) => void;
  clearPatientAuth: () => void;
  setDoctors:       (doctors: DoctorRelation[]) => void;
}

// ─── Storage helpers ─────────────────────────────────────────
const PATIENT_TOKEN_KEY  = 'smartrx_patient_token';
const PATIENT_DATA_KEY   = 'smartrx_patient_data';
const PATIENT_DOCTORS_KEY = 'smartrx_patient_doctors';

export function getPatientToken(): string | null {
  return localStorage.getItem(PATIENT_TOKEN_KEY);
}

function storePatientAuth(token: string, patient: PatientProfile, doctors?: DoctorRelation[]) {
  localStorage.setItem(PATIENT_TOKEN_KEY, token);
  localStorage.setItem(PATIENT_DATA_KEY, JSON.stringify(patient));
  if (doctors) {
    localStorage.setItem(PATIENT_DOCTORS_KEY, JSON.stringify(doctors));
  }
}

function clearPatientStorage() {
  localStorage.removeItem(PATIENT_TOKEN_KEY);
  localStorage.removeItem(PATIENT_DATA_KEY);
  localStorage.removeItem(PATIENT_DOCTORS_KEY);
}

// ─── Context ─────────────────────────────────────────────────
const PatientAuthContext = createContext<PatientAuthContextValue>({
  patient: null, doctors: [], token: null, loading: true,
  setPatientAuth: () => {},
  clearPatientAuth: () => {},
  setDoctors: () => {},
});

// ─── Provider ─────────────────────────────────────────────────
export function PatientAuthProvider({ children }: { children: ReactNode }) {
  const [patient, setPatient]   = useState<PatientProfile | null>(null);
  const [doctors, setDoctorsState] = useState<DoctorRelation[]>([]);
  const [token,   setToken]     = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const storedToken   = localStorage.getItem(PATIENT_TOKEN_KEY);
    const storedPatient = localStorage.getItem(PATIENT_DATA_KEY);
    const storedDoctors = localStorage.getItem(PATIENT_DOCTORS_KEY);

    if (storedToken && storedPatient) {
      try {
        const parsed = JSON.parse(storedPatient) as PatientProfile;
        setToken(storedToken);
        setPatient(parsed);
        if (storedDoctors) {
          setDoctorsState(JSON.parse(storedDoctors) as DoctorRelation[]);
        }
      } catch {
        clearPatientStorage();
      }
    }
    setLoading(false);
  }, []);

  const setPatientAuth = (newToken: string, newPatient: PatientProfile, newDoctors?: DoctorRelation[]) => {
    storePatientAuth(newToken, newPatient, newDoctors);
    setToken(newToken);
    setPatient(newPatient);
    if (newDoctors) {
      setDoctorsState(newDoctors);
    }
  };

  const setDoctors = (docs: DoctorRelation[]) => {
    setDoctorsState(docs);
    localStorage.setItem(PATIENT_DOCTORS_KEY, JSON.stringify(docs));
  };

  const clearPatientAuth = () => {
    clearPatientStorage();
    setToken(null);
    setPatient(null);
    setDoctorsState([]);
  };

  return (
    <PatientAuthContext.Provider value={{ patient, doctors, token, loading, setPatientAuth, clearPatientAuth, setDoctors }}>
      {children}
    </PatientAuthContext.Provider>
  );
}

export const usePatientAuth = () => useContext(PatientAuthContext);
