const { successResponse } = require('../../utils/response.util');
const { listRolesService } = require('./role.service');

const listRolesController = async (req, res, next) => {
  try {
    const roles = await listRolesService();
    return successResponse(res, roles, 'Roles fetched successfully', 200);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  listRolesController,
};

