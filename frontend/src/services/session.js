export const SESSION_EXPIRED_MESSAGE =
  'Sua sessão expirou. Faça login novamente para continuar acessando sua conta com segurança.';

const noticeKey = 'uva_session_expired';
const listeners = new Set();

export const getTokenExpiresAt = (token) => {
  try {
    const parts = token.split('.');

    if (parts.length !== 3 || parts.some((part) => !part)) return null;

    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
    const expiresAt = exp * 1000;

    return typeof exp === 'number' && Number.isFinite(expiresAt) ? expiresAt : null;
  } catch {
    return null;
  }
};

const restoreSession = () => {
  const token = localStorage.getItem('uva_token');
  const storedUser = localStorage.getItem('uva_user');
  const expiresAt = getTokenExpiresAt(token);
  let user = null;

  try {
    user = JSON.parse(storedUser);
  } catch {
    // Dados incompletos ou corrompidos também exigem um novo login.
  }

  if (user?.id && expiresAt > Date.now()) {
    sessionStorage.removeItem(noticeKey);
    return { token, user, expiresAt, sessionExpired: false };
  }

  const sessionExpired = Boolean(token || storedUser || sessionStorage.getItem(noticeKey));
  localStorage.removeItem('uva_token');
  localStorage.removeItem('uva_user');

  if (sessionExpired) sessionStorage.setItem(noticeKey, 'true');

  return { token: null, user: null, expiresAt: null, sessionExpired };
};

let session = restoreSession();

const publishSession = (nextSession) => {
  session = nextSession;
  listeners.forEach((listener) => listener());
};

export const getSession = () => session;

export const subscribeSession = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const persistSession = ({ token, user }) => {
  const expiresAt = getTokenExpiresAt(token);

  if (!user?.id || !expiresAt || expiresAt <= Date.now()) {
    throw new Error(SESSION_EXPIRED_MESSAGE);
  }

  localStorage.setItem('uva_token', token);
  localStorage.setItem('uva_user', JSON.stringify(user));
  sessionStorage.removeItem(noticeKey);
  publishSession({ token, user, expiresAt, sessionExpired: false });
};

export const updateSessionUser = (user) => {
  if (!session.token) return;

  localStorage.setItem('uva_user', JSON.stringify(user));
  publishSession({ ...session, user });
};

export const clearSession = () => {
  localStorage.removeItem('uva_token');
  localStorage.removeItem('uva_user');
  sessionStorage.removeItem(noticeKey);
  publishSession({ token: null, user: null, expiresAt: null, sessionExpired: false });
};

export const expireSession = (token) => {
  // Uma resposta atrasada da sessão anterior não pode encerrar um novo login.
  if (!token || session.token !== token) return;

  localStorage.removeItem('uva_token');
  localStorage.removeItem('uva_user');
  sessionStorage.setItem(noticeKey, 'true');
  publishSession({ token: null, user: null, expiresAt: null, sessionExpired: true });
};

export const dismissSessionNotice = () => {
  sessionStorage.removeItem(noticeKey);
  publishSession({ ...session, sessionExpired: false });
};
