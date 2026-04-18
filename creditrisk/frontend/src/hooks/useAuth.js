import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('creditiq_user');
    const token  = localStorage.getItem('creditiq_token');
    if (stored && token) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    const { data } = await authAPI.login(credentials);
    localStorage.setItem('creditiq_token', data.token);
    localStorage.setItem('creditiq_user',  JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const signup = async (credentials) => {
    const { data } = await authAPI.signup(credentials);
    localStorage.setItem('creditiq_token', data.token);
    localStorage.setItem('creditiq_user',  JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('creditiq_token');
    localStorage.removeItem('creditiq_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
