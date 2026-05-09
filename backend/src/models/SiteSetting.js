import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const SiteSetting = sequelize.define('SiteSetting', {
  settingKey: {
    type: DataTypes.STRING(80),
    allowNull: false,
    primaryKey: true,
    field: 'setting_key'
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'site_configuracoes'
});
