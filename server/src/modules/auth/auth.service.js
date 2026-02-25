const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { findUserByEmail, createUser } = require('./auth.repository');

const SALT_ROUNDS = 10;

const generateToken = (user) => {
  const payload = {
    id: user.id,
    role: user.role,
  };

  const options = {
    expiresIn: '8h',
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

const register = async ({ full_name, email, password, role = 'operator', creatorId = null }) => {
  if (!full_name || !email || !password) {
    const error = new Error('full_name, email and password are required');
    error.statusCode = 400;
    throw error;
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    const error = new Error('Email already exists');
    error.statusCode = 409;
    throw error;
  }

  const allowedRoles = ['operator', 'engineer', 'manager', 'admin'];
  const normalizedRole = role?.toLowerCase();
  const finalRole = allowedRoles.includes(normalizedRole) ? normalizedRole : 'operator';

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await createUser({
    full_name,
    email,
    passwordHash,
    role: finalRole,
    created_by: creatorId,
  });

  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
  };
};

const login = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error('email and password are required');
    error.statusCode = 400;
    throw error;
  }

  const user = await findUserByEmail(email);

  if (!user || user.active === false) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    },
  };
};

module.exports = {
  register,
  login,
};

