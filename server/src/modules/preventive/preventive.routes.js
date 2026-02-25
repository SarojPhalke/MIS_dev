const express = require('express');

const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeFunction } = require('../../middlewares/rbac.middleware');
const { listPmSchedulesController } = require('./preventive.controller');

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorizeFunction('PM_VIEW'),
  listPmSchedulesController
);

module.exports = router;

