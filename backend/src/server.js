import app from './app.js';
import { env } from './config/env.js';
import { sequelize } from './models/index.js';
import { runStartupMigrations } from './utils/databaseMigrations.js';

const bootstrap = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexao com MySQL confirmada.');
    await runStartupMigrations(sequelize);

    if (env.syncDatabase) {
      await sequelize.sync({ alter: true });
      console.log('Modelos sincronizados com o banco.');
    }
  } catch (error) {
    console.warn('API iniciada sem conexao ativa com MySQL:', error.message);
  }

  app.listen(env.port, () => {
    console.log(`API Uva Moda Fitness em http://localhost:${env.port}`);
  });
};

bootstrap();
