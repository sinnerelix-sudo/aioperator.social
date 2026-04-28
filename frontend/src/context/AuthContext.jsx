import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../lib/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem('aio_token');
    if (!token) {
      setUser(null);
      setSubscription(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.me();
      setUser(data.user);
      setSubscription(data.subscription);
    } catch (err) {
      localStorage.removeItem('aio_token');
      setUser(null);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (payload) => {
    const { data } = await authApi.login(payload);
    localStorage.setItem('aio_token', data.token);
    setUser(data.user);
    setSubscription(data.subscription);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await authApi.register(payload);
    localStorage.setItem('aio_token', data.token);
    setUser(data.user);
    setSubscription(data.subscription);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('aio_token');
    setUser(null);
    setSubscription(null);
  }, []);

  const value = {
    user,
    subscription,
    setSubscription,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refresh,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
