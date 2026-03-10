const { successResponse } = require('../../utils/response.util');
const {
  listSparesService,
  createSpareService,
  updateSpareService,
  deleteSpareService,
  issueSpareService,
  returnSpareService,
  listSpareTransactionsService,
  listLowStockSparesService,
} = require('./spares.service');

// ==================== CONTROLLERS ====================

const listSparesController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const spares = await listSparesService(userId);
    return successResponse(res, spares);
  } catch (err) {
    return next(err);
  }
};

const createSpareController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const created = await createSpareService(userId, req.body);
    return successResponse(res, created, 'Spare created successfully', 201);
  } catch (err) {
    return next(err);
  }
};

const updateSpareController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updated = await updateSpareService(userId, id, req.body);
    return successResponse(res, updated, 'Spare updated successfully');
  } catch (err) {
    return next(err);
  }
};

const deleteSpareController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await deleteSpareService(userId, id);
    return successResponse(res, {}, 'Spare deleted successfully');
  } catch (err) {
    return next(err);
  }
};

const issueSpareController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await issueSpareService(userId, req.body);
    return successResponse(res, result, 'Spare issued successfully', 201);
  } catch (err) {
    return next(err);
  }
};

const returnSpareController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await returnSpareService(userId, req.body);
    return successResponse(res, result, 'Spare returned successfully', 201);
  } catch (err) {
    return next(err);
  }
};

const listSpareTransactionsController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const transactions = await listSpareTransactionsService(userId);
    return successResponse(res, transactions);
  } catch (err) {
    return next(err);
  }
};

const listLowStockSparesController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const spares = await listLowStockSparesService(userId);
    return successResponse(res, spares);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  listSparesController,
  createSpareController,
  updateSpareController,
  deleteSpareController,
  issueSpareController,
  returnSpareController,
  listSpareTransactionsController,
  listLowStockSparesController,
};

