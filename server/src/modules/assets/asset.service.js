const { createAsset } = require('./asset.repository');

const createAssetService = async (payload) => {
  // Basic validation can be expanded as per SRS
  if (!payload.asset_code || !payload.asset_name) {
    const error = new Error('asset_code and asset_name are required');
    error.statusCode = 400;
    throw error;
  }

  const asset = await createAsset(payload);
  return asset;
};

module.exports = {
  createAssetService,
};

