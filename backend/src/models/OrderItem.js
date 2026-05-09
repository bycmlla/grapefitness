import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  variation_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  productName: {
    type: DataTypes.STRING(160),
    allowNull: false,
    field: 'product_name'
  },
  sku: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  variationColor: {
    type: DataTypes.STRING(60),
    field: 'variation_color'
  },
  variationSize: {
    type: DataTypes.STRING(30),
    field: 'variation_size'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'unit_price'
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'pedido_itens'
});
