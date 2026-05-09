import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Coupon = sequelize.define('Coupon', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(40),
    allowNull: false,
    unique: true
  },
  type: {
    type: DataTypes.ENUM('fixed', 'percentage'),
    allowNull: false
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    field: 'expires_at'
  },
  minimumOrderValue: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'minimum_order_value'
  },
  usageLimit: {
    type: DataTypes.INTEGER,
    field: 'usage_limit'
  },
  usedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'used_count'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'cupons'
});

