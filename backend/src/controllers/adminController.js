import { Op } from 'sequelize';
import {
  Category,
  Order,
  OrderItem,
  Product,
  ProductVariation,
  User
} from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { publicUser } from '../utils/publicUser.js';
import {
  getProductTotalStock
} from '../utils/stock.js';
import { getSiteSettings } from '../utils/siteSettings.js';

const revenueStatuses = [
  'pagamento_aprovado',
  'em_separacao',
  'pronto_para_retirada',
  'enviado',
  'entregue'
];

const getDayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};

const getMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return { start, end };
};

const sumOrdersTotal = (orders) => orders.reduce((total, order) => (
  total + Number(order.total || 0)
), 0);

const formatDateKey = (date) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

const formatDayLabel = (date) => new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit'
}).format(date);

const formatMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const formatMonthLabel = (date) => new Intl.DateTimeFormat('pt-BR', {
  month: 'short'
}).format(date).replace('.', '');

const getDailySalesChart = async () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);

  const orders = await Order.findAll({
    where: {
      status: { [Op.in]: revenueStatuses },
      createdAt: { [Op.gte]: start }
    },
    attributes: ['id', 'total', 'createdAt']
  });
  const valuesByDay = new Map();

  for (let day = 0; day < 7; day += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + day);
    valuesByDay.set(formatDateKey(date), {
      label: formatDayLabel(date),
      value: 0,
      revenue: 0
    });
  }

  for (const order of orders) {
    const key = formatDateKey(order.createdAt);
    const current = valuesByDay.get(key);

    if (!current) {
      continue;
    }

    current.value += 1;
    current.revenue += Number(order.total || 0);
  }

  return [...valuesByDay.values()];
};

const getMonthlyRevenueChart = async () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const orders = await Order.findAll({
    where: {
      status: { [Op.in]: revenueStatuses },
      createdAt: { [Op.gte]: start }
    },
    attributes: ['id', 'total', 'createdAt']
  });
  const valuesByMonth = new Map();

  for (let month = 0; month < 6; month += 1) {
    const date = new Date(start.getFullYear(), start.getMonth() + month, 1);
    valuesByMonth.set(formatMonthKey(date), {
      label: formatMonthLabel(date),
      value: 0
    });
  }

  for (const order of orders) {
    const key = formatMonthKey(order.createdAt);
    const current = valuesByMonth.get(key);

    if (current) {
      current.value += Number(order.total || 0);
    }
  }

  return [...valuesByMonth.values()];
};

const getTopSellingProducts = async () => {
  const items = await OrderItem.findAll({
    include: [{
      model: Order,
      as: 'order',
      attributes: ['id', 'status'],
      where: { status: { [Op.in]: revenueStatuses } }
    }],
    order: [['createdAt', 'DESC']]
  });
  const productsBySku = new Map();

  for (const item of items) {
    const key = item.sku || item.productName;
    const current = productsBySku.get(key) || {
      sku: item.sku,
      name: item.productName,
      quantity: 0,
      revenue: 0
    };

    current.quantity += Number(item.quantity || 0);
    current.revenue += Number(item.total || 0);
    productsBySku.set(key, current);
  }

  return [...productsBySku.values()]
    .sort((first, second) => second.quantity - first.quantity)
    .slice(0, 5);
};

export const getDashboard = asyncHandler(async (req, res) => {
  const todayRange = getDayRange();
  const monthRange = getMonthRange();
  const revenueWhere = { status: { [Op.in]: revenueStatuses } };
  const todayWhere = {
    createdAt: {
      [Op.gte]: todayRange.start,
      [Op.lt]: todayRange.end
    }
  };
  const monthWhere = {
    createdAt: {
      [Op.gte]: monthRange.start,
      [Op.lt]: monthRange.end
    }
  };

  const [
    users,
    productRows,
    categories,
    orders,
    pendingOrders,
    ordersToday,
    ordersMonth,
    revenueOrdersToday,
    revenueOrdersMonth,
    revenueOrdersAllTime,
    canceledOrders,
    completedOrders,
    dailySalesChart,
    monthlyRevenueChart,
    topSellingProducts,
    settings
  ] = await Promise.all([
    User.count(),
    Product.findAll({
      include: [{ model: ProductVariation, as: 'variations' }]
    }),
    Category.count(),
    Order.count(),
    Order.count({ where: { status: 'aguardando_pagamento' } }),
    Order.count({ where: todayWhere }),
    Order.count({ where: monthWhere }),
    Order.findAll({ where: { ...revenueWhere, ...todayWhere }, attributes: ['id', 'total'] }),
    Order.findAll({ where: { ...revenueWhere, ...monthWhere }, attributes: ['id', 'total'] }),
    Order.findAll({ where: revenueWhere, attributes: ['id', 'total'] }),
    Order.count({ where: { status: 'cancelado' } }),
    Order.count({ where: { status: 'entregue' } }),
    getDailySalesChart(),
    getMonthlyRevenueChart(),
    getTopSellingProducts(),
    getSiteSettings()
  ]);
  const stockTotals = productRows.map(getProductTotalStock);
  const lowStockThreshold = Number(settings.lowStockThreshold || 0);
  const outOfStockProducts = stockTotals.filter((total) => total <= 0).length;
  const lowStockProducts = stockTotals
    .filter((total) => total > 0 && total <= lowStockThreshold)
    .length;
  const salesToday = sumOrdersTotal(revenueOrdersToday);
  const monthlyRevenue = sumOrdersTotal(revenueOrdersMonth);
  const allTimeRevenue = sumOrdersTotal(revenueOrdersAllTime);
  const averageTicket = revenueOrdersAllTime.length
    ? allTimeRevenue / revenueOrdersAllTime.length
    : 0;

  res.json({
    metrics: {
      users,
      products: productRows.length,
      categories,
      orders,
      pendingOrders,
      ordersToday,
      ordersMonth,
      salesToday,
      monthlyRevenue,
      averageTicket,
      outOfStockProducts,
      lowStockProducts,
      totalStockPieces: stockTotals.reduce((total, stock) => total + stock, 0),
      topSellingProducts,
      canceledOrders,
      completedOrders,
      dailySalesChart,
      monthlyRevenueChart,
      orderStatusPie: [
        { label: 'Pendentes', value: pendingOrders, color: '#f59e0b' },
        { label: 'Cancelados', value: canceledOrders, color: '#dc2626' },
        { label: 'Finalizados', value: completedOrders, color: '#16a34a' }
      ],
      lowStockThreshold
    },
    visibleIndicators: settings.dashboardIndicators
  });
});

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    order: [['createdAt', 'DESC']]
  });

  res.json({ users: users.map(publicUser) });
});
