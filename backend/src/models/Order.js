import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { orderStatuses } from '../utils/checkoutValidation.js';

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
    type: DataTypes.ENUM(...orderStatuses),
    allowNull: false,
    defaultValue: 'aguardando_pagamento'
  },
  fulfillmentType: {
    type: DataTypes.ENUM('delivery', 'pickup'),
    allowNull: false,
    field: 'fulfillment_type'
  },
  addressSnapshot: { type: DataTypes.JSON, field: 'address_snapshot' },
  contactSnapshot: { type: DataTypes.JSON, field: 'contact_snapshot' },
  shippingMode: { type: DataTypes.STRING(30), field: 'shipping_mode' },
  shippingStatus: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'confirmed', field: 'shipping_status' },
  shippingDetails: { type: DataTypes.JSON, field: 'shipping_details' },
  shippingConfirmedAt: { type: DataTypes.DATE, field: 'shipping_confirmed_at' },
  preferredPaymentMethod: { type: DataTypes.STRING(30), field: 'preferred_payment_method' },
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
