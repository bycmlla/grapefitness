import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 3333,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'troque-esta-chave-em-producao',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  syncDatabase: process.env.SYNC_DATABASE === 'true',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  adminSeedEmail: process.env.ADMIN_SEED_EMAIL || 'admin@uvamodafitness.com.br',
  adminSeedPassword: process.env.ADMIN_SEED_PASSWORD || 'admin123',
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT) || 3306,
    name: process.env.DATABASE_NAME || 'uva_moda_fitness',
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || ''
  }
};

export const isDevelopment = env.nodeEnv === 'development';

