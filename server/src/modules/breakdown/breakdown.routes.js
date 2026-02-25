const express = require('express');

const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeFunction } = require('../../middlewares/rbac.middleware');
const { logBreakdownController } = require('./breakdown.controller');

const router = express.Router();

// Example function code for RBAC: BREAKDOWN_LOG
router.post(
  '/',
  authenticate,
  authorizeFunction('BREAKDOWN_LOG'),
  logBreakdownController
);

module.exports = router;

