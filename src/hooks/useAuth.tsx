import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Doctor } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────
interface AuthContextValue {
  doctor:         Doctor | null;
  token:          string | null;
  loading:        boolean;
  refreshDoctor:  () => Promise<void>;
  setAuth:        (token: string, doctor: Doctor) => void;
  clearAuth:      () => void;
}

// ─── Storage helpers ─────────────────────────────────────────
const TOKEN_KEY  = 'smartrx_token';
const DOCTOR_KEY = 'smartrx_doctor';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function storeAuth(token: string, doctor: Doctor) {
  localStorage.setItem(TOKEN_KEY,  token);
  localStorage.setItem(DOCTOR_KEY, JSON.stringify(doctor));
}

function clearStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(DOCTOR_KEY);
}

// ─── Context ─────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue>({
  doctor: null, token: null, loading: true,
  refreshDoctor: async () => {},
  setAuth:  () => {},
  clearAuth: () => {},
});

// ─── Provider ─────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [doctor,  setDoctor]  = useState<Doctor | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore session from localStorage
  useEffect(() => {
    const storedToken  = localStorage.getItem(TOKEN_KEY);
    const storedDoctor = localStorage.getItem(DOCTOR_KEY);

    if (storedToken && storedDoctor) {
      try {
        const parsed = JSON.parse(storedDoctor) as Doctor;
        setToken(storedToken);
        setDoctor(parsed);
      } catch {
        clearStorage();
      }
    }
    setLoading(false);
  }, []);

  /** Re-fetch the doctor profile from the API (e.g. after profile update). */
  const refreshDoctor = async () => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const { doctor: d } = await res.json();
        setDoctor(d);
        localStorage.setItem(DOCTOR_KEY, JSON.stringify(d));
      } else {
        clearAuth();
      }
    } catch {
      // network error — keep current doctor
    }
  };

  const setAuth = (newToken: string, newDoctor: Doctor) => {
    storeAuth(newToken, newDoctor);
    setToken(newToken);
    setDoctor(newDoctor);
  };

  const clearAuth = () => {
    clearStorage();
    setToken(null);
    setDoctor(null);
  };

  return (
    <AuthContext.Provider value={{ doctor, token, loading, refreshDoctor, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
