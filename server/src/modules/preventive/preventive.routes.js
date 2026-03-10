const express = require('express');

const { authenticate } = require('../../middlewares/auth.middleware');
const {
  // PM Schedule
  createPmScheduleController,
  listPmSchedulesController,
  updatePmScheduleController,
  deletePmScheduleController,
  // PM Entry
  createPmEntryController,
  listPmEntriesController,
  updatePmEntryStatusController,
  updatePmEntryController,
  // PM Engineer
  createPmEngineerController,
  getPmEngineerController,
  // PM Compliance
  listPmComplianceController,
  // PM Stats
  getPmStatsController,
  // Shifts
  listShiftsController,
} = require('./preventive.controller');

const router = express.Router();

// PM Stats (permission checked inside service: view_pm_schedule)
router.get('/stats', authenticate, getPmStatsController);

// PM Schedule routes (permissions checked inside services)
router.get('/schedule', authenticate, listPmSchedulesController);
router.post('/schedule', authenticate, createPmScheduleController);
router.put('/schedule/:id', authenticate, updatePmScheduleController);
router.delete('/schedule/:id', authenticate, deletePmScheduleController);

// PM Entry routes (permissions checked inside services)
router.get('/entry', authenticate, listPmEntriesController);
router.post('/entry', authenticate, createPmEntryController);
router.patch('/entry/:id/status', authenticate, updatePmEntryStatusController);
router.put('/entry/:id', authenticate, updatePmEntryController);

// PM Engineer routes (permissions checked inside services)
router.post('/engineer', authenticate, createPmEngineerController);
router.get('/engineer/:pm_operator_id', authenticate, getPmEngineerController);

// PM Compliance routes (permissions checked inside services)
router.get('/compliance', authenticate, listPmComplianceController);

// Shifts routes (reference data, no permission check needed)
router.get('/shifts', authenticate, listShiftsController);

module.exports = router;
