import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: new MemoryStorage(), configurable: true });

const {
  clearSession,
  dismissSessionNotice,
  expireSession,
  getSession,
  persistSession,
  SESSION_EXPIRED_MESSAGE
} = await import('../src/services/session.js');
const { api, getApiMessage } = await import('../src/services/api.js');
const { AxiosError } = await import('axios');

const user = { id: 1, name: 'Cliente Uva', role: 'customer' };
const makeToken = (expiresAt = Date.now() + 3600000, id = 1) => [
  Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url'),
  Buffer.from(JSON.stringify({ id, exp: Math.floor(expiresAt / 1000) })).toString('base64url'),
  'signature'
].join('.');
let restoreCount = 0;
const restore = () => import(`../src/services/session.js?restore=${restoreCount++}`);
const unauthorized = (config, message = 'Token invalido ou expirado.', status = 401) =>
  new AxiosError(message, AxiosError.ERR_BAD_REQUEST, config, null, {
    status, data: { message }, headers: {}, config
  });

beforeEach(() => {
  clearSession();
  localStorage.clear();
  sessionStorage.clear();
});

test('ao reabrir com acesso expirado, desconecta antes das requisições e preserva o carrinho', async () => {
  localStorage.setItem('uva_token', makeToken(Date.now() - 86400000));
  localStorage.setItem('uva_user', JSON.stringify(user));
  localStorage.setItem('uva_cart', '[{"productId":1,"quantity":2}]');

  const restored = await restore();

  assert.equal(restored.getSession().user, null);
  assert.equal(restored.getSession().token, null);
  assert.equal(restored.getSession().sessionExpired, true);
  assert.equal(localStorage.getItem('uva_token'), null);
  assert.equal(localStorage.getItem('uva_user'), null);
  assert.equal(localStorage.getItem('uva_cart'), '[{"productId":1,"quantity":2}]');
  assert.equal((await restore()).getSession().sessionExpired, true);
});

test('sessões incompletas ou corrompidas exigem um novo login', async () => {
  for (const [token, storedUser] of [
    ['token-invalido', JSON.stringify(user)],
    ['header.eyJpZCI6MX0.signature', JSON.stringify(user)],
    [makeToken(), '{json-invalido'],
    [makeToken(), null],
    [null, JSON.stringify(user)]
  ]) {
    localStorage.clear();
    sessionStorage.clear();
    if (token) localStorage.setItem('uva_token', token);
    if (storedUser) localStorage.setItem('uva_user', storedUser);

    const restored = await restore();
    assert.equal(restored.getSession().user, null);
    assert.equal(restored.getSession().sessionExpired, true);
  }
});

test('mantém uma sessão válida e não avisa visitantes que nunca fizeram login', async () => {
  assert.equal((await restore()).getSession().sessionExpired, false);
  const token = makeToken();
  localStorage.setItem('uva_token', token);
  localStorage.setItem('uva_user', JSON.stringify(user));

  const restored = await restore();
  assert.deepEqual(restored.getSession().user, user);
  assert.equal(restored.getSession().token, token);
  assert.equal(restored.getSession().sessionExpired, false);
});

test('401 de uma requisição autenticada desconecta e substitui a mensagem técnica', async () => {
  const token = makeToken();
  persistSession({ token, user });

  await assert.rejects(api.get('/orders/me', {
    adapter: async (config) => {
      assert.equal(config.headers.Authorization, `Bearer ${token}`);
      throw unauthorized(config);
    }
  }), (error) => {
    assert.equal(getApiMessage(error), SESSION_EXPIRED_MESSAGE);
    return true;
  });

  assert.equal(getSession().user, null);
  assert.equal(getSession().sessionExpired, true);
  assert.equal(localStorage.getItem('uva_token'), null);
});

test('uma requisição não envia o token que expirou enquanto o site estava aberto', async (t) => {
  const expiresAt = Date.now() + 3600000;
  persistSession({ token: makeToken(expiresAt), user });
  t.mock.method(Date, 'now', () => expiresAt + 1000);

  await api.get('/products', {
    adapter: async (config) => {
      assert.equal(config.headers.Authorization, undefined);
      return { status: 200, data: { products: [] }, headers: {}, config };
    }
  });

  assert.equal(getSession().user, null);
  assert.equal(getSession().sessionExpired, true);
});

test('resposta atrasada de uma sessão antiga não desconecta um novo login', async () => {
  persistSession({ token: makeToken(), user });
  const pending = Promise.withResolvers();
  const sent = Promise.withResolvers();
  const request = api.get('/orders/me', {
    adapter: (config) => {
      sent.resolve(config);
      return pending.promise;
    }
  });
  const config = await sent.promise;
  const newToken = makeToken(Date.now() + 7200000, 2);
  persistSession({ token: newToken, user: { ...user, id: 2 } });
  pending.reject(unauthorized(config));
  await assert.rejects(request);

  assert.equal(getSession().token, newToken);
  assert.equal(getSession().user.id, 2);
  assert.equal(getSession().sessionExpired, false);
});

test('senha incorreta continua sendo erro de login, sem encerrar outra sessão', async () => {
  persistSession({ token: makeToken(), user });

  await assert.rejects(api.post('/auth/login', {}, {
    adapter: async (config) => {
      assert.equal(config.headers.Authorization, undefined);
      throw unauthorized(config, 'E-mail ou senha invalidos.');
    }
  }), (error) => {
    assert.equal(getApiMessage(error), 'E-mail ou senha invalidos.');
    return true;
  });

  assert.deepEqual(getSession().user, user);
  assert.equal(getSession().sessionExpired, false);
});

test('falhas de rede, erros do servidor e falta de permissão não desconectam', async () => {
  persistSession({ token: makeToken(), user });

  for (const status of [403, 500, null]) {
    await assert.rejects(api.get('/orders/me', {
      adapter: async (config) => {
        throw status ? unauthorized(config, 'Falha temporária.', status) : new Error('Network Error');
      }
    }));
    assert.deepEqual(getSession().user, user);
    assert.equal(getSession().sessionExpired, false);
  }
});

test('novo login remove o aviso; sair voluntariamente não informa expiração', () => {
  const token = makeToken();
  persistSession({ token, user });
  expireSession(token);
  assert.equal(getSession().sessionExpired, true);
  persistSession({ token: makeToken(), user });
  assert.equal(getSession().sessionExpired, false);
  assert.equal(sessionStorage.getItem('uva_session_expired'), null);
  clearSession();
  assert.equal(getSession().user, null);
  assert.equal(getSession().sessionExpired, false);
});

test('o aviso pode ser fechado sem autenticar novamente', async () => {
  const token = makeToken();
  persistSession({ token, user });
  expireSession(token);
  dismissSessionNotice();

  assert.equal(getSession().user, null);
  assert.equal(getSession().sessionExpired, false);
  assert.equal((await restore()).getSession().sessionExpired, false);
});
