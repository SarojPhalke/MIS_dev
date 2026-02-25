const { listRoles } = require('./role.repository');

const listRolesService = async () => {
  const roles = await listRoles();
  return roles;
};

module.exports = {
  listRolesService,
};

