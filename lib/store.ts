import { apiFetch } from './api';
import { getStoredToken } from '@/hooks/useAuth';
import type {
  Patient, Prescription, Medicine, Disease, DiseaseTemplate, Doctor,
} from './types';

export interface AuthResult {
  token:  string;
  doctor: Doctor;
}

export async function signUp(email: string, password: string, name: string, clinicName: string, specialization: string, phone: string): Promise<AuthResult> {
  return apiFetch<AuthResult>('/api/auth/register', { method: 'POST', json: { email, password, name, clinic_name: clinicName, specialization, phone } });
}
export async function signIn(email: string, password: string): Promise<AuthResult> {
  return apiFetch<AuthResult>('/api/auth/login', { method: 'POST', json: { email, password } });
}
export async function signOut(): Promise<void> {}
export async function getCurrentDoctor(): Promise<Doctor | null> {
  if (!getStoredToken()) return null;
  try { const { doctor } = await apiFetch<{ doctor: Doctor }>('/api/auth/me'); return doctor; }
  catch { return null; }
}

// ============================================
// PATIENTS
// ============================================
export async function getPatients(): Promise<Patient[]> {
  return apiFetch<Patient[]>('/api/patients');
}
export async function getPatient(id: string): Promise<Patient | null> {
  try { return await apiFetch<Patient>(`/api/patients/${id}`); } catch { return null; }
}
export async function searchPatients(query: string): Promise<Patient[]> {
  const q = query.trim();
  if (!q) return getPatients();
  return apiFetch<Patient[]>(`/api/patients?q=${encodeURIComponent(q)}`);
}
export async function addPatient(p: {
  name: string; phone: string; age: number;
  gender: 'Male' | 'Female' | 'Other'; address?: string; allergies?: string;
}): Promise<Patient> {
  return apiFetch<Patient>('/api/patients', { method: 'POST', json: p });
}
export async function updatePatient(id: string, p: {
  name: string; phone: string; age: number; gender: string; address?: string; allergies?: string;
}): Promise<Patient> {
  return apiFetch<Patient>(`/api/patients/${id}`, { method: 'PUT', json: p });
}
export async function deletePatient(id: string): Promise<void> {
  await apiFetch(`/api/patients/${id}`, { method: 'DELETE' });
}

// ============================================
// MEDICINES
// ============================================
export async function getMedicines(): Promise<Medicine[]> {
  return apiFetch<Medicine[]>('/api/medicines');
}
export async function searchMedicines(query: string): Promise<Medicine[]> {
  const q = query.trim();
  if (!q) return getMedicines();
  return apiFetch<Medicine[]>(`/api/medicines?q=${encodeURIComponent(q)}`);
}
export async function addMedicine(name: string, category: string): Promise<Medicine> {
  return apiFetch<Medicine>('/api/medicines', { method: 'POST', json: { name, category } });
}
export async function getTopMedicines(limit = 5): Promise<Medicine[]> {
  return apiFetch<Medicine[]>(`/api/dashboard/top-medicines?limit=${limit}`);
}

// ============================================
// PRESCRIPTIONS
// ============================================
export async function getPrescriptions(filters?: { status?: string; from?: string; to?: string }): Promise<Prescription[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.from)   params.set('from',   filters.from);
  if (filters?.to)     params.set('to',     filters.to);
  const qs = params.toString();
  return apiFetch<Prescription[]>(`/api/prescriptions${qs ? '?' + qs : ''}`);
}
export async function getPatientPrescriptions(patientId: string): Promise<Prescription[]> {
  return apiFetch<Prescription[]>(`/api/prescriptions?patientId=${patientId}`);
}
export async function getPrescription(id: string): Promise<Prescription | null> {
  try { return await apiFetch<Prescription>(`/api/prescriptions/${id}`); } catch { return null; }
}
export async function addPrescription(p: {
  patientId: string; date: string; diagnosis?: string; labTests?: string;
  nextVisitDate?: string; status?: string;
  items: { medicine_id: string; description?: string | null; strength?: string | null; days: number; times_per_day: number; notes?: string | null }[];
}): Promise<Prescription> {
  return apiFetch<Prescription>('/api/prescriptions', { method: 'POST', json: p });
}
export async function updatePrescriptionStatus(id: string, status: 'draft' | 'issued'): Promise<Prescription> {
  return apiFetch<Prescription>(`/api/prescriptions/${id}/status`, { method: 'PATCH', json: { status } });
}
export async function updatePrescription(id: string, p: {
  diagnosis?: string; labTests?: string; nextVisitDate?: string; status?: string;
  items: { medicine_id: string; description?: string | null; strength?: string | null; days: number; times_per_day: number; notes?: string | null }[];
}): Promise<Prescription> {
  return apiFetch<Prescription>(`/api/prescriptions/${id}`, { method: 'PUT', json: p });
}

// ============================================
// DISEASES & TEMPLATES
// ============================================
export async function getDiseases(): Promise<Disease[]> {
  return apiFetch<Disease[]>('/api/diseases');
}
export async function addDisease(name: string): Promise<Disease> {
  return apiFetch<Disease>('/api/diseases', { method: 'POST', json: { name } });
}
export async function getTemplates(): Promise<DiseaseTemplate[]> {
  return apiFetch<DiseaseTemplate[]>('/api/templates');
}
export async function getTemplatesByDisease(diseaseId: string): Promise<DiseaseTemplate[]> {
  const all = await getTemplates();
  return all.filter(t => t.disease_id === diseaseId);
}
export async function addTemplate(t: {
  diseaseId: string; name: string;
  medicines: { medicine_id: string; days: number; times_per_day: number }[];
}): Promise<void> {
  await apiFetch('/api/templates', { method: 'POST', json: { diseaseId: t.diseaseId, name: t.name, medicines: t.medicines } });
}
export async function deleteTemplate(id: string): Promise<void> {
  await apiFetch(`/api/templates/${id}`, { method: 'DELETE' });
}

// ============================================
// SMART SUGGESTIONS
// ============================================
export async function getFrequentCombinations(currentMedicineIds: string[]) {
  if (currentMedicineIds.length === 0) return [];
  try {
    return await apiFetch<{ medicine_id: string; medicineName: string; frequency: number }[]>(
      '/api/medicines/suggestions',
      { method: 'POST', json: { medicine_ids: currentMedicineIds } }
    );
  } catch { return []; }
}

// ============================================
// DOCTOR CHAT
// ============================================
export async function getDoctorConversations() {
  return apiFetch<any[]>('/api/chat/conversations');
}

export async function getDoctorChatMessages(patientId: string) {
  return apiFetch<{ messages: any[]; patient: any }>(`/api/chat/${patientId}`);
}

export async function sendDoctorChatMessage(patientId: string, message: string) {
  return apiFetch<any>(`/api/chat/${patientId}`, { method: 'POST', json: { message } });
}

export async function getDoctorUnreadCount(): Promise<number> {
  try {
    const conversations = await getDoctorConversations();
    return conversations.reduce((sum, c) => sum + (parseInt(c.unread_count) || 0), 0);
  } catch { return 0; }
}

