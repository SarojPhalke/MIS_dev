const { successResponse } = require('../../../utils/response.util');
const {
  createCarbonEmissionService,
  listCarbonEmissionService,
  getCarbonDashboardService,
  deleteCarbonEmissionService,
} = require('./carbon.service');

const createCarbonEmissionController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const created = await createCarbonEmissionService(userId, req.body);
    return successResponse(res, created, 'Carbon emission log created successfully', 201);
  } catch (err) {
    return next(err);
  }
};

const listCarbonEmissionController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const filters = {
      source_type: req.query.source_type || null,
      location_id: req.query.location_id || null,
      date_from: req.query.date_from || null,
      date_to: req.query.date_to || null,
    };
    const logs = await listCarbonEmissionService(userId, filters);
    return successResponse(res, logs);
  } catch (err) {
    return next(err);
  }
};

const getCarbonDashboardController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const dashboard = await getCarbonDashboardService(userId);
    return successResponse(res, dashboard);
  } catch (err) {
    return next(err);
  }
};

const deleteCarbonEmissionController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await deleteCarbonEmissionService(userId, id);
    return successResponse(res, { id }, 'Carbon emission log deleted successfully');
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createCarbonEmissionController,
  listCarbonEmissionController,
  getCarbonDashboardController,
  deleteCarbonEmissionController,
};
