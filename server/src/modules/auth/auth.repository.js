const { getDb } = require('../../config');

// NOTE: This assumes your users table has a "password_hash" column for storing hashed passwords.
// If not, add it: ALTER TABLE users ADD COLUMN password_hash text NOT NULL;

const findUserByEmail = async (email) => {
  const db = getDb();
  const query = `
    SELECT id, email, full_name, role, password_hash, active
    FROM users
    WHERE email = $1
    LIMIT 1
  `;
  const { rows } = await db.query(query, [email]);
  return rows[0] || null;
};

const createUser = async ({ full_name, email, passwordHash, role = 'operator', created_by = null }) => {
  const db = getDb();
  const query = `
    INSERT INTO users (full_name, email, password_hash, role, created_by)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, full_name, email, role
  `;
  const values = [full_name, email, passwordHash, role, created_by];
  const { rows } = await db.query(query, values);
  return rows[0];
};

module.exports = {
  findUserByEmail,
  createUser,
};

