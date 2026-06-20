/**
 * Patient Portal API helper — uses the patient JWT token
 * Now supports multi-doctor endpoints
 */

import { getPatientToken } from '@/hooks/usePatientAuth';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  json?: unknown;
}

export async function patientApiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { json, ...rest } = options;

  const headers: Record<string, string> = {
    ...(rest.headers as Record<string, string> | undefined),
  };

  const token = getPatientToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    rest.body = JSON.stringify(json);
  }

  const res = await fetch(`${BASE}${path}`, { ...rest, headers });

  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ─── Auth ──────────────────────────────────────────────────
export async function patientSignIn(phone: string, password: string) {
  const res = await fetch(`${BASE}/api/patient-auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Login failed');
  }
  return res.json();
}

export async function patientSignUp(phone: string, password: string) {
  const res = await fetch(`${BASE}/api/patient-auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Registration failed');
  }
  return res.json();
}

// ─── Dashboard ─────────────────────────────────────────────
export async function getPatientDashboard() {
  return patientApiFetch('/api/patient-portal/dashboard');
}

// ─── Prescriptions ─────────────────────────────────────────
export async function getPatientPrescriptionsList() {
  return patientApiFetch('/api/patient-portal/prescriptions');
}

export async function getPatientPrescriptionDetail(id: string) {
  return patientApiFetch(`/api/patient-portal/prescriptions/${id}`);
}

// ─── Doctors ───────────────────────────────────────────────
export async function getPatientDoctors() {
  return patientApiFetch('/api/patient-portal/doctors');
}

// ─── Chat (Multi-Doctor) ──────────────────────────────────
export async function getPatientChatMessages(doctorId?: string) {
  const qs = doctorId ? `?doctorId=${doctorId}` : '';
  return patientApiFetch(`/api/patient-portal/chat${qs}`);
}

export async function sendPatientChatMessage(message: string, doctorId?: string) {
  return patientApiFetch('/api/patient-portal/chat', {
    method: 'POST',
    json: { message, doctorId },
  });
}
