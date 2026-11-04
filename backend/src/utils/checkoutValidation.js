export const orderStatuses = [
  'aguardando_definicao_frete',
  'aguardando_confirmacao_frete',
  'aguardando_pagamento',
  'pagamento_aprovado',
  'em_separacao',
  'pronto_para_retirada',
  'enviado',
  'entregue',
  'cancelado',
  'reembolsado'
];

export const paymentMethods = ['pix', 'credit_card', 'debit_card', 'boleto', 'pickup_payment'];
export const states = new Set(
  'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')
);
export const checkoutError = (message, status = 422) =>
  Object.assign(new Error(message), { status });
export const digits = (value) => String(value ?? '').replace(/\D/g, '');
export const normalizeCity = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const textField = (value, label, maxLength, required = true) => {
  if (value != null && typeof value !== 'string') throw checkoutError(`Confira o campo ${label}.`);
  const text = (value || '').trim();
  if ((required && !text) || text.length > maxLength)
    throw checkoutError(`Informe ${label} válido.`);
  return text;
};

export const normalizeZipCode = (value) => {
  if (typeof value !== 'string' || !/^\d{5}-?\d{3}$/.test(value.trim())) {
    throw checkoutError('CEP inválido. Informe os 8 dígitos.');
  }
  return digits(value);
};

export const normalizeAddress = (address) => {
  if (!address || typeof address !== 'object' || Array.isArray(address))
    throw checkoutError('Informe o endereço de entrega.');
  const state = textField(address.state, 'estado', 2).toUpperCase();
  if (!states.has(state)) throw checkoutError('Informe uma UF válida.');
  return {
    zipCode: normalizeZipCode(address.zipCode),
    street: textField(address.street, 'rua', 160),
    number:
      address.noNumber === true
        ? 'S/N'
        : textField(address.number, 'número ou marque Sem número', 20),
    district: textField(address.district, 'bairro', 120),
    city: textField(address.city, 'cidade', 120),
    state,
    complement: textField(address.complement, 'complemento', 120, false),
    reference: textField(address.reference, 'referência', 180, false)
  };
};

export const normalizeContact = (contact, user) => {
  const name = textField(contact?.name ?? user.name, 'nome', 120);
  const rawPhone = textField(contact?.phone ?? user.phone, 'telefone/WhatsApp', 30);
  const phone = digits(rawPhone);
  if (!/^(?:55)?[1-9]\d{9,10}$/.test(phone))
    throw checkoutError('Informe um telefone/WhatsApp válido com DDD.');
  return { name, phone };
};

export const normalizeAddressPreferences = (payload) => {
  const preferences = {};
  if (Object.hasOwn(payload, 'label'))
    preferences.label = textField(payload.label, 'nome do endereço', 80, false);
  if (Object.hasOwn(payload, 'isDefault')) {
    if (typeof payload.isDefault !== 'boolean')
      throw checkoutError('Confira o endereço principal.');
    preferences.isDefault = payload.isDefault;
  }
  return preferences;
};

export const normalizeLocalRegions = (value) => {
  let regions = value;
  if (typeof regions === 'string') {
    try {
      regions = JSON.parse(regions);
    } catch {
      throw checkoutError('Confira as cidades de entrega local.');
    }
  }
  if (!Array.isArray(regions) || regions.length > 50)
    throw checkoutError('Confira as cidades de entrega local.');
  return regions.map((region) => {
    const city = textField(region?.city, 'cidade de entrega local', 120);
    const state = textField(region?.state, 'UF da entrega local', 2).toUpperCase();
    if (!states.has(state)) throw checkoutError('Informe uma UF válida na entrega local.');
    return { city, state };
  });
};

export const isLocalDelivery = (location, regions) =>
  regions.some(
    (region) =>
      normalizeCity(region.city) === normalizeCity(location.city) && region.state === location.state
  );

export const freightAmount = (value) => {
  if (
    !['number', 'string'].includes(typeof value) ||
    value === '' ||
    !/^\d+(?:\.\d{1,2})?$/.test(String(value))
  ) {
    throw checkoutError('Informe um valor de frete válido, com até duas casas decimais.');
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 999999.99)
    throw checkoutError('Informe um valor de frete válido.');
  return amount;
};
