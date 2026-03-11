const express = require('express');

const { authenticate } = require('../../../middlewares/auth.middleware');
const {
  createWaterQualityController,
  listWaterQualityController,
  deleteWaterQualityController,
} = require('./waterQuality.controller');

const router = express.Router();

router.use(authenticate);

router.post('/', createWaterQualityController);
router.get('/', listWaterQualityController);
router.delete('/:id', deleteWaterQualityController);

module.exports = router;
