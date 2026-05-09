import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { publicUser } from '../utils/publicUser.js';
import { signToken } from '../utils/token.js';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ where: { email: normalizedEmail } });

  if (existingUser) {
    res.status(409).json({ message: 'Este e-mail ja esta cadastrado.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    phone,
    role: normalizedEmail === env.adminSeedEmail.toLowerCase() ? 'admin' : 'customer'
  });

  res.status(201).json({
    user: publicUser(user),
    token: signToken(user)
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ where: { email: normalizedEmail } });

  if (!user || !user.passwordHash || !user.active) {
    res.status(401).json({ message: 'E-mail ou senha invalidos.' });
    return;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    res.status(401).json({ message: 'E-mail ou senha invalidos.' });
    return;
  }

  res.json({
    user: publicUser(user),
    token: signToken(user)
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export const googleLoginPlaceholder = (req, res) => {
  res.status(501).json({
    message: 'Login com Google preparado para integracao futura.'
  });
};

