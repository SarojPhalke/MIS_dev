const express = require('express');

const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRole } = require('../../middlewares/rbac.middleware');
const { listRolesController } = require('./role.controller');

const router = express.Router();

// Example: only ADMIN can manage roles (here we just list them)
router.get(
  '/',
  authenticate,
  authorizeRole(['ADMIN']),
  listRolesController
);

module.exports = router;

