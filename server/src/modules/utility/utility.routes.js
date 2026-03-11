const express = require('express');

const { authenticate } = require('../../middlewares/auth.middleware');
const {
  createUtilityLogController,
  listUtilityLogsController,
  getUtilityDailySummaryController,
  deleteUtilityLogController,
  listLocationsController,
  listBusinessUnitsController,
} = require('./utility.controller');

// Submodule routes
const carbonRoutes = require('../utilities/carbon/carbon.routes');
const waterQualityRoutes = require('../utilities/waterQuality/waterQuality.routes');
const conditionRoutes = require('../utilities/conditionLogs/condition.routes');

const router = express.Router();

// All utility routes require authentication; fine-grained permissions are checked in services
router.use(authenticate);

// Utility logs
router.post('/', createUtilityLogController);
router.get('/', listUtilityLogsController);
router.delete('/:id', deleteUtilityLogController);

// Daily summary
router.get('/daily-summary', getUtilityDailySummaryController);

// Helper endpoints
router.get('/locations', listLocationsController);
router.get('/business-units', listBusinessUnitsController);

// Submodule routes
router.use('/carbon', carbonRoutes);
router.use('/water-quality', waterQualityRoutes);
router.use('/machine-condition', conditionRoutes);

module.exports = router;
