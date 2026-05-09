import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadPath = path.resolve(__dirname, '..', '..', env.uploadDir);

fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadPath);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeName = path.basename(file.originalname, extension)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 42);

    callback(null, `${Date.now()}-${randomUUID()}-${safeName || 'produto'}${extension}`);
  }
});

const fileFilter = (req, file, callback) => {
  if (file.mimetype.startsWith('image/')) {
    callback(null, true);
    return;
  }

  const error = new Error('Envie apenas arquivos de imagem.');
  error.status = 422;
  callback(error);
};

const productImageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

export const uploadProductImages = productImageUpload.fields([
  { name: 'images', maxCount: 80 },
  { name: 'image', maxCount: 1 }
]);

export const uploadSettingsImages = productImageUpload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'favicon', maxCount: 1 },
  { name: 'headerLogo', maxCount: 1 },
  { name: 'footerLogo', maxCount: 1 }
]);
