import axios from 'axios';
import { expireSession, getSession, SESSION_EXPIRED_MESSAGE } from './session.js';

export const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL || 'http://localhost:3333/api'
});

const isCredentialsRequest = (config) => /^\/auth\/(login|register)\/?$/.test(config?.url || '');

api.interceptors.request.use((config) => {
  const { token, expiresAt } = getSession();

  if (token && expiresAt <= Date.now()) {
    expireSession(token);
  } else if (token && !isCredentialsRequest(config)) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isCredentialsRequest(error.config)) {
      const authorization = error.config?.headers?.Authorization || '';
      const token = authorization.replace(/^Bearer\s+/i, '');

      if (token || getSession().sessionExpired) {
        expireSession(token);
        error.sessionExpired = true;
      }
    }

    return Promise.reject(error);
  }
);

export const getApiMessage = (error) =>
  error.sessionExpired
    ? SESSION_EXPIRED_MESSAGE
    : error.response?.data?.message || 'Nao foi possivel concluir a operacao.';

