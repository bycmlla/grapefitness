import {
  Ban,
  BarChart3,
  Boxes,
  CalendarDays,
  ClipboardList,
  Package,
  ShoppingBag,
  Tags,
  TriangleAlert,
  UsersRound,
  Wallet
} from 'lucide-react';
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout/AdminLayout.jsx';
import {
  dashboardIndicatorOptions,
  defaultSettings
} from '../../contexts/SettingsContext.jsx';
import { formatCurrency } from '../../data/mockCatalog.js';
import { api } from '../../services/api.js';
import './Admin.css';

const fallbackMetrics = {
  users: 0,
  products: 0,
  categories: 0,
  orders: 0,
  pendingOrders: 0,
  ordersToday: 0,
  ordersMonth: 0,
  salesToday: 0,
  monthlyRevenue: 0,
  averageTicket: 0,
  outOfStockProducts: 0,
  lowStockProducts: 0,
  totalStockPieces: 0,
  topSellingProducts: [],
  canceledOrders: 0,
  completedOrders: 0,
  dailySalesChart: [],
  monthlyRevenueChart: [],
  orderStatusPie: []
};

const indicatorLabels = Object.fromEntries(
  dashboardIndicatorOptions.map((indicator) => [indicator.id, indicator.label])
);

const indicatorConfig = {
  users: { icon: UsersRound, variant: 'plain' },
  products: { icon: Package, variant: 'plain' },
  categories: { icon: Tags, variant: 'plain' },
  pendingOrders: { icon: ClipboardList, variant: 'alert' },
  ordersToday: { icon: CalendarDays, variant: 'bars' },
  ordersMonth: { icon: BarChart3, variant: 'bars' },
  salesToday: { icon: ShoppingBag, variant: 'money' },
  monthlyRevenue: { icon: Wallet, variant: 'money' },
  averageTicket: { icon: Wallet, variant: 'money' },
  outOfStockProducts: { icon: TriangleAlert, variant: 'danger' },
  lowStockProducts: { icon: TriangleAlert, variant: 'warning' },
  totalStockPieces: { icon: Boxes, variant: 'bars' },
  canceledOrders: { icon: Ban, variant: 'danger' }
};

const moneyIndicators = new Set(['salesToday', 'monthlyRevenue', 'averageTicket']);
const chartIndicators = new Set([
  'topSellingProducts',
  'dailySalesChart',
  'monthlyRevenueChart',
  'orderStatusPie'
]);

const formatMetricValue = (indicatorId, value) => (
  moneyIndicators.has(indicatorId) ? formatCurrency(Number(value || 0)) : Number(value || 0)
);

function MetricCard({ indicatorId, value, maxValue }) {
  const config = indicatorConfig[indicatorId];

  if (!config) {
    return null;
  }

  const Icon = config.icon;
  const progress = maxValue > 0 ? Math.max(8, Math.min(100, (Number(value || 0) / maxValue) * 100)) : 0;

  return (
    <article className={`admin-metric-card admin-metric-card--${config.variant}`}>
      <Icon size={22} />
      <span>{indicatorLabels[indicatorId]}</span>
      <strong>{formatMetricValue(indicatorId, value)}</strong>
      {config.variant === 'bars' && (
        <div className="admin-metric-card__bar" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
    </article>
  );
}

function BarChartCard({
  title,
  items,
  valueFormatter = (value) => value,
  detailFormatter
}) {
  const maxValue = items.reduce((max, item) => Math.max(max, Number(item.value || 0)), 0);

  return (
    <article className="admin-chart-card">
      <div>
        <BarChart3 size={22} />
        <span>{title}</span>
      </div>

      {items.length ? (
        <div className="admin-bar-chart">
          {items.map((item) => {
            const value = Number(item.value || 0);
            const height = maxValue > 0 ? Math.max(8, (value / maxValue) * 100) : 0;

            return (
              <div className="admin-bar-chart__item" key={item.label}>
                <div aria-hidden="true">
                  <span style={{ height: `${height}%` }} />
                </div>
                <strong>{valueFormatter(value, item)}</strong>
                <small>{item.label}</small>
                {detailFormatter && <em>{detailFormatter(item)}</em>}
              </div>
            );
          })}
        </div>
      ) : (
        <p>Nenhum dado registrado.</p>
      )}
    </article>
  );
}

function OrderStatusPieCard({ items }) {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
  let currentPercent = 0;
  const slices = items.map((item) => {
    const percent = total > 0 ? (Number(item.value || 0) / total) * 100 : 0;
    const start = currentPercent;
    currentPercent += percent;

    return `${item.color} ${start}% ${currentPercent}%`;
  });

  return (
    <article className="admin-chart-card admin-pie-card">
      <div>
        <ClipboardList size={22} />
        <span>Pedidos por status</span>
      </div>

      <div className="admin-pie-card__content">
        <div
          className="admin-pie"
          style={{
            background: total > 0
              ? `conic-gradient(${slices.join(', ')})`
              : 'var(--color-soft)'
          }}
          aria-hidden="true"
        >
          <strong>{total}</strong>
        </div>

        <div className="admin-pie-card__legend">
          {items.map((item) => (
            <span key={item.label}>
              <i style={{ backgroundColor: item.color }} />
              {item.label}: <strong>{Number(item.value || 0)}</strong>
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function TopSellingProductsCard({ products }) {
  const maxQuantity = products.reduce((max, product) => Math.max(max, Number(product.quantity || 0)), 0);

  return (
    <article className="admin-chart-card">
      <div>
        <BarChart3 size={22} />
        <span>Produtos mais vendidos</span>
      </div>

      {products.length ? (
        <div className="admin-top-products">
          {products.map((product) => {
            const quantity = Number(product.quantity || 0);
            const width = maxQuantity > 0 ? Math.max(8, (quantity / maxQuantity) * 100) : 0;

            return (
              <div className="admin-top-products__row" key={`${product.sku}-${product.name}`}>
                <strong>{product.name}</strong>
                <span>{quantity} peca(s)</span>
                <div aria-hidden="true">
                  <span style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p>Nenhuma venda registrada.</p>
      )}
    </article>
  );
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(fallbackMetrics);
  const [visibleIndicators, setVisibleIndicators] = useState(defaultSettings.dashboardIndicators);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(({ data }) => {
        setMetrics({ ...fallbackMetrics, ...(data.metrics || {}) });
        setVisibleIndicators(data.visibleIndicators || defaultSettings.dashboardIndicators);
      })
      .catch(() => {
        setMetrics(fallbackMetrics);
        setVisibleIndicators(defaultSettings.dashboardIndicators);
      });
  }, []);

  const simpleIndicators = visibleIndicators.filter((indicatorId) => !chartIndicators.has(indicatorId));
  const maxBarValue = Math.max(
    Number(metrics.ordersToday || 0),
    Number(metrics.ordersMonth || 0),
    Number(metrics.totalStockPieces || 0),
    1
  );

  return (
    <AdminLayout title="Dashboard">
      <div className="admin-metrics">
        {simpleIndicators.map((indicatorId) => (
          <MetricCard
            key={indicatorId}
            indicatorId={indicatorId}
            value={metrics[indicatorId]}
            maxValue={maxBarValue}
          />
        ))}
      </div>

      {visibleIndicators.includes('topSellingProducts') && (
        <TopSellingProductsCard products={metrics.topSellingProducts || []} />
      )}

      {visibleIndicators.includes('dailySalesChart') && (
        <BarChartCard
          title="Vendas por dia"
          items={metrics.dailySalesChart || []}
          detailFormatter={(item) => formatCurrency(Number(item.revenue || 0))}
        />
      )}

      {visibleIndicators.includes('monthlyRevenueChart') && (
        <BarChartCard
          title="Faturamento por mes"
          items={metrics.monthlyRevenueChart || []}
          valueFormatter={(value) => formatCurrency(value)}
        />
      )}

      {visibleIndicators.includes('orderStatusPie') && (
        <OrderStatusPieCard items={metrics.orderStatusPie || []} />
      )}
    </AdminLayout>
  );
}
