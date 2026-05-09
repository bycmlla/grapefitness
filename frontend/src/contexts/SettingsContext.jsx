import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';

export const defaultSettings = {
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

export const dashboardIndicatorOptions = [
  { id: 'users', label: 'Usuarios' },
  { id: 'products', label: 'Produtos' },
  { id: 'categories', label: 'Categorias' },
  { id: 'pendingOrders', label: 'Pedidos pendentes' },
  { id: 'ordersToday', label: 'Pedidos do dia' },
  { id: 'ordersMonth', label: 'Pedidos do mes' },
  { id: 'salesToday', label: 'Vendas do dia' },
  { id: 'monthlyRevenue', label: 'Faturamento do mes' },
  { id: 'averageTicket', label: 'Ticket medio' },
  { id: 'outOfStockProducts', label: 'Produtos sem estoque' },
  { id: 'lowStockProducts', label: 'Produtos com estoque baixo' },
  { id: 'totalStockPieces', label: 'Total de pecas em estoque' },
  { id: 'topSellingProducts', label: 'Produtos mais vendidos' },
  { id: 'canceledOrders', label: 'Pedidos cancelados' },
  { id: 'dailySalesChart', label: 'Vendas por dia' },
  { id: 'monthlyRevenueChart', label: 'Faturamento por mes' },
  { id: 'orderStatusPie', label: 'Pedidos pendentes, cancelados e finalizados' }
];

const SettingsContext = createContext({
  settings: defaultSettings,
  loading: false,
  reloadSettings: () => {}
});

const getFaviconElement = () => {
  let favicon = document.querySelector('link[rel="icon"]');

  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);
  }

  return favicon;
};

const applyVisualSettings = (settings) => {
  const root = document.documentElement;

  root.style.setProperty('--color-grape', settings.primaryColor || defaultSettings.primaryColor);
  root.style.setProperty('--color-lime', settings.secondaryColor || defaultSettings.secondaryColor);
  root.style.setProperty('--color-pink', settings.accentColor || defaultSettings.accentColor);
  root.style.setProperty('--color-button', settings.buttonColor || settings.primaryColor || defaultSettings.buttonColor);
  root.style.setProperty('--color-ink', settings.textColor || defaultSettings.textColor);

  document.title = settings.storeName || defaultSettings.storeName;

  if (settings.faviconUrl) {
    getFaviconElement().href = settings.faviconUrl;
  }
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  const reloadSettings = useCallback(() => {
    setLoading(true);
    return api.get('/settings')
      .then(({ data }) => {
        setSettings({ ...defaultSettings, ...(data.settings || {}) });
      })
      .catch(() => setSettings(defaultSettings))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reloadSettings();

    window.addEventListener('uva:settings-updated', reloadSettings);
    window.addEventListener('focus', reloadSettings);

    return () => {
      window.removeEventListener('uva:settings-updated', reloadSettings);
      window.removeEventListener('focus', reloadSettings);
    };
  }, [reloadSettings]);

  useEffect(() => {
    applyVisualSettings(settings);
  }, [settings]);

  const value = useMemo(() => ({
    settings,
    loading,
    reloadSettings
  }), [loading, reloadSettings, settings]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
