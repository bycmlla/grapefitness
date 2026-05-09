import { SiteSetting } from '../models/index.js';

export const defaultSiteSettings = {
  storeName: 'Uva Moda Fitness',
  slogan: 'Moda fitness com energia, conforto e presenca para todos os ritmos.',
  logoUrl: '',
  faviconUrl: '',
  contactEmail: 'contato@uvamodafitness.com.br',
  contactPhone: 'Atendimento via WhatsApp',
  instagram: '@uvamodafitness',
  addressCity: 'Feira de Santana - BA',
  primaryColor: '#510A50',
  secondaryColor: '#ACCD46',
  accentColor: '#EC0FD3',
  buttonColor: '#510A50',
  textColor: '#211827',
  headerLogoUrl: '',
  footerLogoUrl: '',
  lowStockThreshold: 5,
  allowOutOfStockPurchase: false,
  whatsappNumber: '',
  whatsappDefaultMessage: 'Ola, vim pelo site da Uva Moda Fitness e gostaria de atendimento.',
  whatsappFloatingButtonEnabled: true,
  dashboardIndicators: [
    'users',
    'products',
    'categories',
    'pendingOrders',
    'ordersToday',
    'ordersMonth',
    'salesToday',
    'monthlyRevenue',
    'averageTicket',
    'outOfStockProducts',
    'lowStockProducts',
    'totalStockPieces',
    'topSellingProducts',
    'canceledOrders',
    'dailySalesChart',
    'monthlyRevenueChart',
    'orderStatusPie'
  ]
};

const booleanFields = new Set([
  'allowOutOfStockPurchase',
  'whatsappFloatingButtonEnabled'
]);
const numberFields = new Set(['lowStockThreshold']);
const arrayFields = new Set(['dashboardIndicators']);

const normalizeHexColor = (value, fallback) => {
  const color = String(value || '').trim();

  if (!color) {
    return fallback;
  }

  return color.startsWith('#') ? color : `#${color}`;
};

const normalizeBoolean = (value) => value === true || value === 'true' || value === '1' || value === 1;

const serializeValue = (key, value) => {
  if (booleanFields.has(key)) {
    return normalizeBoolean(value) ? 'true' : 'false';
  }

  if (numberFields.has(key)) {
    const number = Number(value);
    return String(Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : defaultSiteSettings[key]);
  }

  if (arrayFields.has(key)) {
    return JSON.stringify(Array.isArray(value) ? value : parseValue(key, value));
  }

  return String(value ?? '');
};

const parseValue = (key, value) => {
  if (booleanFields.has(key)) {
    return normalizeBoolean(value);
  }

  if (numberFields.has(key)) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : defaultSiteSettings[key];
  }

  if (arrayFields.has(key)) {
    if (Array.isArray(value)) {
      return value;
    }

    try {
      const parsed = JSON.parse(value || '[]');
      return Array.isArray(parsed) ? parsed : defaultSiteSettings[key];
    } catch (error) {
      return String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return value ?? '';
};

export const normalizeSiteSettingsPayload = (payload) => {
  const normalized = {};

  for (const key of Object.keys(defaultSiteSettings)) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) {
      continue;
    }

    if (key.endsWith('Color')) {
      normalized[key] = normalizeHexColor(payload[key], defaultSiteSettings[key]);
      continue;
    }

    normalized[key] = parseValue(key, payload[key]);
  }

  return normalized;
};

export const getSiteSettings = async () => {
  const rows = await SiteSetting.findAll();
  const settings = { ...defaultSiteSettings };

  for (const row of rows) {
    const key = row.settingKey;

    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      settings[key] = parseValue(key, row.value);
    }
  }

  return settings;
};

export const updateSiteSettings = async (payload) => {
  const normalized = normalizeSiteSettingsPayload(payload);

  await Promise.all(
    Object.entries(normalized).map(([settingKey, value]) => (
      SiteSetting.upsert({
        settingKey,
        value: serializeValue(settingKey, value)
      })
    ))
  );

  return getSiteSettings();
};
