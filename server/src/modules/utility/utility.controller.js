const { successResponse } = require('../../utils/response.util');
const {
  createUtilityLogService,
  listUtilityLogsService,
  getUtilityDailySummaryService,
  deleteUtilityLogService,
  listLocationsService,
  listBusinessUnitsService,
} = require('./utility.service');

// ==================== CONTROLLERS ====================

const createUtilityLogController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const created = await createUtilityLogService(userId, req.body);
    return successResponse(res, created, 'Utility log created successfully', 201);
  } catch (err) {
    return next(err);
  }
};

const listUtilityLogsController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const filters = {
      utility_type: req.query.utility_type || null,
      location_id: req.query.location_id || null,
      date_from: req.query.date_from || null,
      date_to: req.query.date_to || null,
    };
    const logs = await listUtilityLogsService(userId, filters);
    return successResponse(res, logs);
  } catch (err) {
    return next(err);
  }
};

const getUtilityDailySummaryController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const summary = await getUtilityDailySummaryService(userId);
    return successResponse(res, summary);
  } catch (err) {
    return next(err);
  }
};

const deleteUtilityLogController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await deleteUtilityLogService(userId, id);
    return successResponse(res, { id }, 'Utility log deleted successfully');
  } catch (err) {
    return next(err);
  }
};

const listLocationsController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const locations = await listLocationsService(userId);
    return successResponse(res, locations);
  } catch (err) {
    return next(err);
  }
};

const listBusinessUnitsController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const businessUnits = await listBusinessUnitsService(userId);
    return successResponse(res, businessUnits);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createUtilityLogController,
  listUtilityLogsController,
  getUtilityDailySummaryController,
  deleteUtilityLogController,
  listLocationsController,
  listBusinessUnitsController,
};
