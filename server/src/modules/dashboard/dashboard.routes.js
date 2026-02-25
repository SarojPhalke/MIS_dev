const express = require('express');

const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeFunction } = require('../../middlewares/rbac.middleware');
const { kpiDashboardController } = require('./dashboard.controller');

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorizeFunction('DASHBOARD_VIEW'),
  kpiDashboardController
);

module.exports = router;

