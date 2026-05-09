import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Address = sequelize.define('Address', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  label: {
    type: DataTypes.STRING(80),
    defaultValue: 'Endereco principal'
  },
  zipCode: {
    type: DataTypes.STRING(12),
    allowNull: false,
    field: 'zip_code'
  },
  street: {
    type: DataTypes.STRING(160),
    allowNull: false
  },
  number: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  complement: {
    type: DataTypes.STRING(120)
  },
  district: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  city: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  state: {
    type: DataTypes.STRING(2),
    allowNull: false
  },
  reference: {
    type: DataTypes.STRING(180)
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_default'
  }
}, {
  tableName: 'enderecos'
});

