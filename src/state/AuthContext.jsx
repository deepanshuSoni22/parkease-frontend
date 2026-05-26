import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshSession = async () => {
    const data = await api.get('/api/v1/auth/me');
    setSession({
      username: data?.username || '',
      role: data?.role || 'USER',
    });
    return data;
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await api.health();
        if (!active) return;
        await refreshSession();
      } catch {
        if (active) setSession(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const login = async (username, password) => {
    setError('');
    await api.login(username, password);
    await refreshSession();
  };

  const register = async ({ username, password, role }) => {
    setError('');
    await api.post('/api/v1/auth/register', { username, password, role });
  };

  const logout = async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } finally {
      setSession(null);
    }
  };

  const value = useMemo(
    () => ({ session, loading, error, setError, login, logout, register, refreshSession }),
    [session, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
