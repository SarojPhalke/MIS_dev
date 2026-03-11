const express = require('express');

const { authenticate } = require('../../../middlewares/auth.middleware');
const {
  createCarbonEmissionController,
  listCarbonEmissionController,
  getCarbonDashboardController,
  deleteCarbonEmissionController,
} = require('./carbon.controller');

const router = express.Router();

router.use(authenticate);

router.post('/', createCarbonEmissionController);
router.get('/', listCarbonEmissionController);
router.get('/dashboard', getCarbonDashboardController);
router.delete('/:id', deleteCarbonEmissionController);

module.exports = router;
