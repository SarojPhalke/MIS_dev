const { listUsers } = require('./user.repository');

const listUsersService = async () => {
  const users = await listUsers();
  return users;
};

module.exports = {
  listUsersService,
};

