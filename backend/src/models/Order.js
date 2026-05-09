import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderNumber: {
    type: DataTypes.STRING(40),
    allowNull: false,
    unique: true,
    field: 'order_number'
  },
  status: {
    type: DataTypes.ENUM(
      'aguardando_pagamento',
      'pagamento_aprovado',
      'em_separacao',
      'pronto_para_retirada',
      'enviado',
      'entregue',
      'cancelado',
      'reembolsado'
    ),
    allowNull: false,
    defaultValue: 'aguardando_pagamento'
  },
  fulfillmentType: {
    type: DataTypes.ENUM('delivery', 'pickup'),
    allowNull: false,
    field: 'fulfillment_type'
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  discountTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'discount_total'
  },
  shippingTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'shipping_total'
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  couponCode: {
    type: DataTypes.STRING(40),
    field: 'coupon_code'
  }
}, {
  tableName: 'pedidos'
});

