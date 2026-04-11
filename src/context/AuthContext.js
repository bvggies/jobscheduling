import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authAPI } from '../services/api';

const TOKEN_KEY = 'jobscheduler_token';
const USER_KEY = 'jobscheduler_user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      const token = localStorage.getItem(TOKEN_KEY);
      if (raw && token) {
        setUser(JSON.parse(raw));
      }
    } catch {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
    setAuthReady(true);
  }, []);

  const persistSession = useCallback((token, nextUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const { data } = await authAPI.login({ email, password });
      persistSession(data.token, data.user);
      return data.user;
    },
    [persistSession]
  );

  const register = useCallback(
    async (payload) => {
      const { data } = await authAPI.register(payload);
      persistSession(data.token, data.user);
      return data.user;
    },
    [persistSession]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data } = await authAPI.me();
    const next = { id: data.id, email: data.email, role: data.role, name: data.name };
    localStorage.setItem(USER_KEY, JSON.stringify(next));
    setUser(next);
    return next;
  }, []);

  const value = useMemo(
    () => ({
      user,
      authReady,
      login,
      register,
      logout,
      refreshProfile,
      isAdmin: user?.role === 'admin',
      isCustomer: user?.role === 'customer',
      isWorker: user?.role === 'worker',
    }),
    [user, authReady, login, register, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export { TOKEN_KEY, USER_KEY };
