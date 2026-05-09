import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ProductVariation = sequelize.define('ProductVariation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sku: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  size: {
    type: DataTypes.STRING(30)
  },
  color: {
    type: DataTypes.STRING(60)
  },
  colorHex: {
    type: DataTypes.STRING(20),
    field: 'color_hex'
  },
  model: {
    type: DataTypes.STRING(80)
  },
  print: {
    type: DataTypes.STRING(80)
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'quantidade'
  },
  stock: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('quantity');
    },
    set(value) {
      this.setDataValue('quantity', Number(value || 0));
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2)
  },
  imageUrl: {
    type: DataTypes.STRING,
    field: 'image_url'
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'produto_variacoes'
});
