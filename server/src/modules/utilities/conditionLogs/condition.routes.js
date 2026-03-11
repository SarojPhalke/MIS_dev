const express = require('express');

const { authenticate } = require('../../../middlewares/auth.middleware');
const {
  createMachineConditionController,
  listMachineConditionController,
  getMachineConditionDashboardController,
  deleteMachineConditionController,
} = require('./condition.controller');

const router = express.Router();

router.use(authenticate);

router.post('/', createMachineConditionController);
router.get('/', listMachineConditionController);
router.get('/dashboard', getMachineConditionDashboardController);
router.delete('/:id', deleteMachineConditionController);

module.exports = router;
