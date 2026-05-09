import { Sequelize } from 'sequelize';
import { env, isDevelopment } from './env.js';

export const sequelize = new Sequelize(
  env.database.name,
  env.database.user,
  env.database.password,
  {
    host: env.database.host,
    port: env.database.port,
    dialect: 'mysql',
    logging: isDevelopment ? console.log : false,
    define: {
      underscored: true,
      timestamps: true
    }
  }
);

