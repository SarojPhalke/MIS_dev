const { getDb } = require('../../config');

const listUsers = async () => {
  const db = getDb();
  const { rows } = await db.query(
    'SELECT id, username, role_id, is_active FROM users ORDER BY id DESC'
  );
  return rows;
};

module.exports = {
  listUsers,
};

