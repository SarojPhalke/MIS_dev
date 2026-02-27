const {
  getUserStats,
  listUsers,
  updateUserRole,
  deleteUserById,
  getUserFunctions,
  upsertUserFunction,
  deleteUserFunction,
} = require('./user.repository');

const getUserStatsService = async () => getUserStats();

const listUsersService = async () => listUsers();

const updateUserRoleService = async ({ id, role, updatedBy }) => {
  const allowedRoles = ['operator', 'engineer', 'manager', 'admin'];
  const normalized = String(role || '').toLowerCase();
  if (!allowedRoles.includes(normalized)) {
    const error = new Error('Invalid role');
    error.statusCode = 400;
    throw error;
  }
  const updated = await updateUserRole({ id, role: normalized, updatedBy });
  if (!updated) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return updated;
};

const deleteUserService = async ({ id }) => {
  const ok = await deleteUserById({ id });
  if (!ok) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
};

const getUserFunctionsService = async ({ userId }) => getUserFunctions({ userId });

const upsertUserFunctionService = async ({ userId, functionId, allowed, grantedBy }) => {
  if (typeof allowed !== 'boolean') {
    const error = new Error('allowed must be boolean');
    error.statusCode = 400;
    throw error;
  }
  if (!functionId) {
    const error = new Error('functionId is required');
    error.statusCode = 400;
    throw error;
  }
  return upsertUserFunction({ userId, functionId, allowed, grantedBy });
};

const deleteUserFunctionService = async ({ userId, functionId }) => {
  await deleteUserFunction({ userId, functionId });
};

module.exports = {
  getUserStatsService,
  listUsersService,
  updateUserRoleService,
  deleteUserService,
  getUserFunctionsService,
  upsertUserFunctionService,
  deleteUserFunctionService,
};

