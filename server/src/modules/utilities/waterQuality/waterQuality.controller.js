const { successResponse } = require('../../../utils/response.util');
const {
  createWaterQualityService,
  listWaterQualityService,
  deleteWaterQualityService,
} = require('./waterQuality.service');

const createWaterQualityController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const created = await createWaterQualityService(userId, req.body);
    return successResponse(res, created, 'Water quality log created successfully', 201);
  } catch (err) {
    return next(err);
  }
};

const listWaterQualityController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const filters = {
      sample_point: req.query.sample_point || null,
      location_id: req.query.location_id || null,
      date_from: req.query.date_from || null,
      date_to: req.query.date_to || null,
    };
    const logs = await listWaterQualityService(userId, filters);
    return successResponse(res, logs);
  } catch (err) {
    return next(err);
  }
};

const deleteWaterQualityController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await deleteWaterQualityService(userId, id);
    return successResponse(res, { id }, 'Water quality log deleted successfully');
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createWaterQualityController,
  listWaterQualityController,
  deleteWaterQualityController,
};
