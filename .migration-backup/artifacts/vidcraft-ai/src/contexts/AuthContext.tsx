import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface User {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'starter' | 'pro' | 'vip';
  credits: number;
  dailyWanClaimed?: string | null;
  referralCode?: string;
  referralCount?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  claimDailyWan: () => Promise<{ credits: number }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('vc_token'));
  const [loading, setLoading] = useState(true);

  const authFetch = useCallback(async (path: string, opts: RequestInit = {}) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as any) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${BASE}${path}`, { ...opts, headers, credentials: 'include' });
  }, [token]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authFetch('/api/auth/me');
      if (res.ok) setUser(await res.json());
      else { setUser(null); setToken(null); localStorage.removeItem('vc_token'); }
    } catch { setUser(null); }
  }, [authFetch]);

  useEffect(() => {
    if (token) refreshUser().finally(() => setLoading(false));
    else setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('vc_token', data.token);
  };

  const register = async (name: string, email: string, password: string, referralCode?: string) => {
    const res = await authFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, referralCode }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('vc_token', data.token);
  };

  const logout = async () => {
    await authFetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setToken(null);
    localStorage.removeItem('vc_token');
  };

  const claimDailyWan = async () => {
    const res = await authFetch('/api/auth/claim-daily-wan', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await refreshUser();
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser, claimDailyWan }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
