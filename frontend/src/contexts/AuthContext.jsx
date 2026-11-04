import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { api, getApiMessage } from '../services/api.js';
import {
  clearSession,
  dismissSessionNotice,
  expireSession,
  getSession,
  persistSession,
  subscribeSession,
  updateSessionUser
} from '../services/session.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { user, token, expiresAt, sessionExpired } = useSyncExternalStore(subscribeSession, getSession);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;

    let timeout;
    const checkExpiration = () => {
      window.clearTimeout(timeout);
      const remaining = expiresAt - Date.now();

      if (remaining <= 0) {
        expireSession(token);
      } else {
        timeout = window.setTimeout(checkExpiration, Math.min(remaining, 2147483647));
      }
    };

    checkExpiration();
    window.addEventListener('focus', checkExpiration);
    document.addEventListener('visibilitychange', checkExpiration);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('focus', checkExpiration);
      document.removeEventListener('visibilitychange', checkExpiration);
    };
  }, [token, expiresAt]);

  useEffect(() => {
    if (!token) return;

    let active = true;

    api.get('/auth/me')
      .then(({ data }) => {
        if (active && getSession().token === token) updateSessionUser(data.user);
      })
      // Apenas uma resposta 401 encerra a sessão; falhas de rede permitem tentar novamente.
      .catch(() => {});

    return () => { active = false; };
  }, [token]);

  const login = useCallback(async (credentials) => {
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
  }, []);

  const register = useCallback(async (payload) => {
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
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
    sessionExpired,
    login,
    register,
    updateUser: updateSessionUser,
    logout: clearSession,
    dismissSessionNotice
  }), [user, loading, sessionExpired, login, register]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
