const express = require('express');

const { loginController, registerController } = require('./auth.controller');
// const { authenticate } = require('../../middlewares/auth.middleware');
// const { authorizeRole } = require('../../middlewares/rbac.middleware');

const router = express.Router();

// LOGIN (public)
router.post('/login', loginController);

// REGISTER (intended ADMIN-only; once RBAC is wired, uncomment below)
// router.post(
//   '/register',
//   authenticate,
//   authorizeRole(['admin']), // adjust role name to match your role_enum
//   registerController
// );
router.post('/register', registerController);

module.exports = router;

