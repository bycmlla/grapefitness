import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/index.js';

export const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');

  if (!token) {
    res.status(401).json({ message: 'Token de acesso nao informado.' });
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findByPk(payload.id);

    if (!user || !user.active) {
      res.status(401).json({ message: 'Usuario nao autorizado.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalido ou expirado.' });
  }
};

export const optionalAuthenticate = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');

  if (!token) {
    next();
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findByPk(payload.id);
    req.user = user?.active ? user : null;
    next();
  } catch (error) {
    next();
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ message: 'Acesso permitido apenas para administradores.' });
    return;
  }

  next();
};
