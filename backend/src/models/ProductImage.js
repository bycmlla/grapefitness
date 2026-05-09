import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ProductImage = sequelize.define('ProductImage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  altText: {
    type: DataTypes.STRING(160),
    field: 'alt_text'
  },
  color: {
    type: DataTypes.STRING(60)
  },
  colorHex: {
    type: DataTypes.STRING(20),
    field: 'color_hex'
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'display_order'
  },
  isMain: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_main'
  }
}, {
  tableName: 'produto_imagens'
});
