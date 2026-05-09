import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Banner = sequelize.define('Banner', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(140),
    allowNull: false
  },
  subtitle: {
    type: DataTypes.STRING(220)
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'image_url'
  },
  linkUrl: {
    type: DataTypes.STRING,
    field: 'link_url'
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'display_order'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'banners'
});

