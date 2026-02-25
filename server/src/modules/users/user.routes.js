const express = require('express');

const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRole } = require('../../middlewares/rbac.middleware');
const { listUsersController } = require('./user.controller');

const router = express.Router();

// Example: only ADMIN and MANAGER can view users
router.get(
  '/',
  authenticate,
  authorizeRole(['ADMIN', 'MANAGER']),
  listUsersController
);

module.exports = router;

