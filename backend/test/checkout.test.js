import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import {
  normalizeAddress,
  normalizeContact,
  normalizeLocalRegions,
  isLocalDelivery,
  freightAmount
} from '../src/utils/checkoutValidation.js';
import {
  lookupZipCode,
  resolveDelivery,
  signShippingQuote,
  verifyShippingQuote
} from '../src/services/shippingService.js';

const address = {
  zipCode: '01001-000',
  street: 'Praça da Sé',
  number: '10',
  district: 'Sé',
  city: 'São Paulo',
  state: 'SP'
};
const binding = {
  zipCode: '01001000',
  userId: 'customer',
  items: [{ productId: 'p1', quantity: 2 }]
};
const originalFetch = globalThis.fetch;
after(() => {
  globalThis.fetch = originalFetch;
});

test('endereço exige todos os campos necessários e aceita Sem número e opcionais vazios', () => {
  const normalized = normalizeAddress({
    ...address,
    number: '',
    noNumber: true,
    id: 'injected',
    user_id: 'other-user'
  });
  assert.equal(normalized.number, 'S/N');
  assert.equal(normalized.zipCode, '01001000');
  assert.equal(normalized.complement, '');
  assert.equal(normalized.user_id, undefined);
  assert.equal(normalized.id, undefined);
  for (const field of ['zipCode', 'street', 'number', 'district', 'city', 'state'])
    assert.throws(() => normalizeAddress({ ...address, [field]: '' }));
  for (const zipCode of ['01001A00', '010010000', '123', null])
    assert.throws(() => normalizeAddress({ ...address, zipCode }));
  assert.throws(() => normalizeAddress({ ...address, state: 'ZZ' }));
});

test('contato reutiliza a conta e só permite nome e telefone válidos', () => {
  assert.deepEqual(normalizeContact(undefined, { name: 'Cliente', phone: '(75) 99999-9999' }), {
    name: 'Cliente',
    phone: '75999999999'
  });
  assert.throws(() => normalizeContact({ phone: '1234' }, { name: 'Cliente' }));
});

test('entrega local compara a cidade consultada e a UF, sem usar prefixo de CEP', () => {
  const regions = normalizeLocalRegions('[{"city":"Feira de Santana","state":"ba"}]');
  assert.equal(isLocalDelivery({ city: ' feira DE santana ', state: 'BA' }, regions), true);
  assert.equal(isLocalDelivery({ city: 'Feira de Santana', state: 'SP' }, regions), false);
  assert.equal(isLocalDelivery({ city: 'São Paulo', state: 'SP' }, regions), false);
  assert.throws(() => normalizeLocalRegions([{ city: 'Cidade', state: 'ZZ' }]));
});

test('frete rejeita números negativos, não finitos e precisão inválida; aceita grátis', () => {
  for (const value of [-1, NaN, Infinity, null, '', ' ', '1.234', true, '1e2'])
    assert.throws(() => freightAmount(value));
  assert.equal(freightAmount('0.00'), 0);
  assert.equal(freightAmount('12.50'), 12.5);
});

test('cotação assinada rejeita adulteração, outra conta, CEP, carrinho e expiração', () => {
  const quote = { amount: 25.5, service: 'Transportadora', deliveryDays: 5 };
  const token = signShippingQuote(quote, binding);
  assert.deepEqual(verifyShippingQuote(token, binding), quote);
  for (const changed of [
    { userId: 'other' },
    { zipCode: '44056000' },
    { items: [{ productId: 'p1', quantity: 3 }] }
  ])
    assert.throws(() => verifyShippingQuote(token, { ...binding, ...changed }));
  const [header, payload, signature] = token.split('.');
  const data = JSON.parse(Buffer.from(payload, 'base64url'));
  data.quote.amount = 0;
  assert.throws(() =>
    verifyShippingQuote(
      `${header}.${Buffer.from(JSON.stringify(data)).toString('base64url')}.${signature}`,
      binding
    )
  );
  const expired = jwt.sign({ purpose: 'shipping_quote', ...binding, quote }, env.jwtSecret, {
    audience: 'uva-shipping',
    expiresIn: -1
  });
  assert.throws(() => verifyShippingQuote(expired, binding));
});

test('consulta trata CEP inexistente e falha de serviço sem gerar frete grátis', async () => {
  globalThis.fetch = async () => Response.json({ erro: true });
  await assert.rejects(lookupZipCode('99999999'), { status: 422 });
  globalThis.fetch = async () => {
    throw new Error('Network unavailable');
  };
  await assert.rejects(lookupZipCode('12345678'), { status: 503 });
});

test('CEP genérico sem rua e bairro preserva cidade/UF para preenchimento manual', async () => {
  globalThis.fetch = async () =>
    Response.json({ localidade: 'Feira de Santana', uf: 'BA', logradouro: '', bairro: '' });
  const result = await resolveDelivery({
    zipCode: '44000000',
    items: binding.items,
    settings: { localDeliveryRegions: [{ city: 'Feira de Santana', state: 'BA' }] },
    userId: binding.userId
  });
  assert.equal(result.address.street, '');
  assert.equal(result.address.district, '');
  assert.equal(result.shipping.mode, 'local');
  assert.equal(result.shipping.amount, null);
  assert.equal(result.shipping.status, 'pending');
});
