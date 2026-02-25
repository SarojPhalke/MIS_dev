const { successResponse } = require('../../utils/response.util');
const { listUsersService } = require('./user.service');

const listUsersController = async (req, res, next) => {
  try {
    const users = await listUsersService();
    return successResponse(res, users, 'Users fetched successfully', 200);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  listUsersController,
};

