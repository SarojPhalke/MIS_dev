const { successResponse } = require('../../../utils/response.util');
const {
  createMachineConditionService,
  listMachineConditionService,
  getMachineConditionDashboardService,
  deleteMachineConditionService,
} = require('./condition.service');

const createMachineConditionController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const created = await createMachineConditionService(userId, req.body);
    return successResponse(res, created, 'Machine condition log created successfully', 201);
  } catch (err) {
    return next(err);
  }
};

const listMachineConditionController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const filters = {
      asset_id: req.query.asset_id || null,
      shift: req.query.shift || null,
      date_from: req.query.date_from || null,
      date_to: req.query.date_to || null,
    };
    const logs = await listMachineConditionService(userId, filters);
    return successResponse(res, logs);
  } catch (err) {
    return next(err);
  }
};

const getMachineConditionDashboardController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const dashboard = await getMachineConditionDashboardService(userId);
    return successResponse(res, dashboard);
  } catch (err) {
    return next(err);
  }
};

const deleteMachineConditionController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await deleteMachineConditionService(userId, id);
    return successResponse(res, { id }, 'Machine condition log deleted successfully');
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createMachineConditionController,
  listMachineConditionController,
  getMachineConditionDashboardController,
  deleteMachineConditionController,
};
