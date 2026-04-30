import { createContext, useContext, useEffect, useState } from 'react';
import { ADMIN_CREDENTIALS } from '../lib/mockData';
import { ADMIN_MOCK_ENABLED } from '../lib/adminConfig';

const AdminCtx = createContext(null);

const STORAGE_KEY = 'aio_admin_session';

export function AdminProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ADMIN_MOCK_ENABLED) {
      // Drop any leftover mock session from a previous build/env.
      try { sessionStorage.removeItem(STORAGE_KEY); } catch (_e) { /* ignore */ }
      setLoading(false);
      return;
    }
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
    if (!ADMIN_MOCK_ENABLED) {
      throw new Error('admin_mock_disabled');
    }
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
    <AdminCtx.Provider
      value={{
        session,
        isAdmin: !!session,
        loading,
        login,
        logout,
        mockEnabled: ADMIN_MOCK_ENABLED,
      }}
    >
      {children}
    </AdminCtx.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminCtx);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
