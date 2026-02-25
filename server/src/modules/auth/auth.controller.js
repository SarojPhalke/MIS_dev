const { successResponse } = require('../../utils/response.util');
const { register, login } = require('./auth.service');

// POST /api/auth/register  (intended for admin use only; protect with RBAC in routes)
const registerController = async (req, res, next) => {
  try {
    const { full_name, email, password, role } = req.body;

    const user = await register({
      full_name,
      email,
      password,
      role,
      creatorId: req.user ? req.user.id : null,
    });

    return successResponse(
      res,
      {
        message: 'User registered successfully',
        user,
      },
      'User registered successfully',
      201
    );
  } catch (err) {
    return next(err);
  }
};

// POST /api/auth/login
const loginController = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await login({ email, password });

    return successResponse(
      res,
      {
        token: result.token,
        user: result.user,
      },
      'Login successful',
      200
    );
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  registerController,
  loginController,
};

