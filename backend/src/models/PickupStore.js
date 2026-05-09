import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const PickupStore = sequelize.define('PickupStore', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  address: {
    type: DataTypes.STRING(220),
    allowNull: false
  },
  city: {
    type: DataTypes.STRING(120),
    allowNull: false,
    defaultValue: 'Feira de Santana'
  },
  state: {
    type: DataTypes.STRING(2),
    allowNull: false,
    defaultValue: 'BA'
  },
  zipCode: {
    type: DataTypes.STRING(12),
    field: 'zip_code'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'lojas_retirada'
});

