import { createContext, useContext, useMemo, useState } from 'react';
import { api, getApiMessage } from '../services/api.js';

const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('uva_user'));
  } catch (error) {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(false);

  const persistSession = (payload) => {
    localStorage.setItem('uva_token', payload.token);
    localStorage.setItem('uva_user', JSON.stringify(payload.user));
    setUser(payload.user);
  };

  const login = async (credentials) => {
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', credentials);
      persistSession(data);
      return data.user;
    } catch (error) {
      throw new Error(getApiMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);

    try {
      const { data } = await api.post('/auth/register', payload);
      persistSession(data);
      return data.user;
    } catch (error) {
      throw new Error(getApiMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('uva_token');
    localStorage.removeItem('uva_user');
    setUser(null);
  };

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

