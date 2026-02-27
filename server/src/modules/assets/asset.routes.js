const express = require('express');

const { authenticate } = require('../../middlewares/auth.middleware');
const {
  createAssetController,
  listAssetsController,
  getAssetStatsController,
  updateAssetController,
} = require('./asset.controller');

const router = express.Router();

// View assets + stats (permission checked inside service: view_assets)
router.get('/', authenticate, listAssetsController);
router.get('/stats', authenticate, getAssetStatsController);

// Create asset (permission checked inside service: create_asset)
router.post('/', authenticate, createAssetController);

// Update asset (permission checked inside service: update_asset)
router.put('/:id', authenticate, updateAssetController);

module.exports = router;

