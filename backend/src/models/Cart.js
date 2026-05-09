import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Cart = sequelize.define('Cart', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sessionId: {
    type: DataTypes.STRING(120),
    field: 'session_id'
  },
  status: {
    type: DataTypes.ENUM('active', 'converted', 'abandoned'),
    allowNull: false,
    defaultValue: 'active'
  }
}, {
  tableName: 'carrinhos'
});

