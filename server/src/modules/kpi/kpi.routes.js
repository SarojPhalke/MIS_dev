const express = require('express');

const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeFunction } = require('../../middlewares/rbac.middleware');
const {
  getKpiSummary,
  getMTTR,
  getMTBF,
  getAvailability,
  getUptime,
  getSpareCost,
} = require('./kpi.controller');

const router = express.Router();

// All KPI endpoints require authentication
router.use(authenticate);

// KPI summary table
router.get('/summary', authorizeFunction('view_kpi_summary'), getKpiSummary);

// KPI trend charts
router.get('/mttr', authorizeFunction('view_kpi_charts'), getMTTR);
router.get('/mtbf', authorizeFunction('view_kpi_charts'), getMTBF);
router.get('/availability', authorizeFunction('view_kpi_charts'), getAvailability);
router.get('/uptime', authorizeFunction('view_kpi_charts'), getUptime);
router.get('/spare-cost', authorizeFunction('view_kpi_charts'), getSpareCost);

module.exports = router;

