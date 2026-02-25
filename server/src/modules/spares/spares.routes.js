const express = require('express');

const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeFunction } = require('../../middlewares/rbac.middleware');
const { listSparesController } = require('./spares.controller');

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorizeFunction('SPARES_VIEW'),
  listSparesController
);

module.exports = router;

