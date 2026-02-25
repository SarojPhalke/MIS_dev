const express = require('express');

const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeFunction } = require('../../middlewares/rbac.middleware');
const { createAssetController } = require('./asset.controller');

const router = express.Router();

// Example function code for RBAC: ASSET_CREATE
router.post(
  '/',
  authenticate,
  authorizeFunction('ASSET_CREATE'),
  createAssetController
);

module.exports = router;

