const { getDb } = require('../../config');

const listRoles = async () => {
  const db = getDb();
  const { rows } = await db.query(
    'SELECT id, name, is_active FROM roles ORDER BY id ASC'
  );
  return rows;
};

module.exports = {
  listRoles,
};

