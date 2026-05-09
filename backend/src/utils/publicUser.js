export const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  provider: user.provider,
  active: user.active,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

