const { successResponse } = require('../../utils/response.util');
const { createAssetService } = require('./asset.service');

const createAssetController = async (req, res, next) => {
  try {
    const payload = req.body;
    const asset = await createAssetService(payload);
    return successResponse(res, asset, 'Asset created successfully', 201);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createAssetController,
};

