const { successResponse } = require('../../utils/response.util');
const {
  getUserStatsService,
  listUsersService,
  updateUserRoleService,
  deleteUserService,
  getUserFunctionsService,
  upsertUserFunctionService,
  deleteUserFunctionService,
} = require('./user.service');

const getUserStatsController = async (req, res, next) => {
  try {
    const stats = await getUserStatsService();
    return successResponse(res, stats, 'User stats fetched successfully', 200);
  } catch (err) {
    return next(err);
  }
};

const listUsersController = async (req, res, next) => {
  try {
    const users = await listUsersService();
    return successResponse(res, users, 'Users fetched successfully', 200);
  } catch (err) {
    return next(err);
  }
};

const updateUserRoleController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const updated = await updateUserRoleService({ id, role, updatedBy: req.user?.id || null });
    return successResponse(res, updated, 'User role updated successfully', 200);
  } catch (err) {
    return next(err);
  }
};

const deleteUserController = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteUserService({ id });
    return successResponse(res, null, 'User deleted successfully', 200);
  } catch (err) {
    return next(err);
  }
};

const getUserFunctionsController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const functions = await getUserFunctionsService({ userId: id });
    return successResponse(res, functions, 'User functions fetched successfully', 200);
  } catch (err) {
    return next(err);
  }
};

const upsertUserFunctionController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { functionId, allowed } = req.body;
    const result = await upsertUserFunctionService({
      userId: id,
      functionId,
      allowed,
      grantedBy: req.user?.id || null,
    });
    return successResponse(res, result, 'User function updated successfully', 200);
  } catch (err) {
    return next(err);
  }
};

const deleteUserFunctionController = async (req, res, next) => {
  try {
    const { id, functionId } = req.params;
    await deleteUserFunctionService({ userId: id, functionId });
    return successResponse(res, null, 'User function override removed successfully', 200);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getUserStatsController,
  listUsersController,
  updateUserRoleController,
  deleteUserController,
  getUserFunctionsController,
  upsertUserFunctionController,
  deleteUserFunctionController,
};

