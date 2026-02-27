const { successResponse } = require('../../utils/response.util');
const {
  createAssetService,
  listAssetsService,
  getAssetStatsService,
  updateAssetService,
} = require('./asset.service');

const createAssetController = async (req, res, next) => {
  try {
    const payload = req.body;
    const created = await createAssetService(req.user.id, payload);
    return res.status(201).json({
      success: true,
      message: 'Asset created successfully',
      data: created,
    });
  } catch (err) {
    return next(err);
  }
};

const listAssetsController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, search } = req.query;
    const assets = await listAssetsService(userId, { status, search });
    return res.status(200).json({ success: true, data: assets });
  } catch (err) {
    return next(err);
  }
};

const getAssetStatsController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stats = await getAssetStatsService(userId);
    return res.status(200).json({ success: true, data: stats });
  } catch (err) {
    return next(err);
  }
};

const updateAssetController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await updateAssetService(userId, id, req.body);
    return res.status(200).json({ success: true, message: 'Asset updated successfully' });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createAssetController,
  listAssetsController,
  getAssetStatsController,
  updateAssetController,
};

