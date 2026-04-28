import { createContext, useContext, useEffect, useState } from 'react';
import { ADMIN_CREDENTIALS } from '../lib/mockData';

const AdminCtx = createContext(null);

const STORAGE_KEY = 'aio_admin_session';

export function AdminProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // 60 min idle expiry mock
        if (parsed.expiresAt > Date.now()) setSession(parsed);
      }
    } catch (_e) { /* ignore */ }
    setLoading(false);
  }, []);

  const login = async ({ email, password, twoFactor }) => {
    if (
      email !== ADMIN_CREDENTIALS.email ||
      password !== ADMIN_CREDENTIALS.password ||
      twoFactor !== ADMIN_CREDENTIALS.twoFactor
    ) {
      throw new Error('invalid_credentials');
    }
    const next = {
      email,
      loggedInAt: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
    return next;
  };

  const logout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
  };

  return (
    <AdminCtx.Provider value={{ session, isAdmin: !!session, loading, login, logout }}>
      {children}
    </AdminCtx.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminCtx);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
