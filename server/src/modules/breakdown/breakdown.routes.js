const express = require('express');

const { authenticate } = require('../../middlewares/auth.middleware');
const {
  createBreakdownController,
  listBreakdownsController,
  getBreakdownStatsController,
  updateBreakdownMemoController,
  updateBreakdownStatusController,
  listResponsiblePeopleController,
} = require('./breakdown.controller');

const router = express.Router();

// View breakdowns + stats (permission checked inside service: view_bd)
router.get('/', authenticate, listBreakdownsController);
router.get('/stats', authenticate, getBreakdownStatsController);

// Create breakdown (permission checked inside service: add_bd)
router.post('/', authenticate, createBreakdownController);

// Update breakdown memo (permission checked inside service: update_bd_memo)
router.put('/:id/memo', authenticate, updateBreakdownMemoController);

// Update breakdown status (permission checked inside service: update_bd_status)
router.put('/:id/status', authenticate, updateBreakdownStatusController);

// Dropdown data for "Responsible Person" field in the UI (permission checked inside service: update_bd_status)
router.get('/responsible-people', authenticate, listResponsiblePeopleController);

module.exports = router;
