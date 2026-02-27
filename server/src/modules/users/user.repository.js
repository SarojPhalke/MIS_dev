const { getDb } = require('../../config');

const getUserStats = async () => {
  const db = getDb();

  const totalRes = await db.query('SELECT COUNT(*)::int AS total_users FROM users');
  const perRoleRes = await db.query(
    `
      SELECT role, COUNT(*)::int AS count
      FROM users
      GROUP BY role
      ORDER BY role
    `
  );

  return {
    totalUsers: totalRes.rows[0]?.total_users || 0,
    perRole: perRoleRes.rows,
  };
};

// Returns: [{ id, full_name, role, effectiveFunctions: [{ functionId, function_key, allowed }] }]
const listUsers = async () => {
  const db = getDb();

  const query = `
    SELECT
      u.id,
      u.full_name,
      u.role,
      COALESCE(
        json_agg(
          jsonb_build_object(
            'functionId', fm.id,
            'function_key', fm.function_key,
            'allowed',
              CASE
                WHEN uf.allowed IS NOT NULL THEN uf.allowed
                WHEN rf.function_id IS NOT NULL THEN TRUE
                ELSE FALSE
              END
          )
          ORDER BY fm.function_key
        ) FILTER (
          WHERE
            CASE
              WHEN uf.allowed IS NOT NULL THEN uf.allowed
              WHEN rf.function_id IS NOT NULL THEN TRUE
              ELSE FALSE
            END = TRUE
        ),
        '[]'::json
      ) AS effective_functions
    FROM users u
    LEFT JOIN functions_master fm ON TRUE
    LEFT JOIN role_functions rf
      ON rf.role = u.role
     AND rf.function_id = fm.id
    LEFT JOIN user_functions uf
      ON uf.user_id = u.id
     AND uf.function_id = fm.id
    GROUP BY u.id, u.full_name, u.role
    ORDER BY u.created_at DESC NULLS LAST;
  `;

  const { rows } = await db.query(query);

  return rows.map((r) => ({
    id: r.id,
    full_name: r.full_name,
    role: r.role,
    effectiveFunctions: r.effective_functions,
  }));
};

const updateUserRole = async ({ id, role, updatedBy = null }) => {
  const db = getDb();
  const { rows } = await db.query(
    `
      UPDATE users
         SET role = $1,
             updated_at = now(),
             updated_by = $2
       WHERE id = $3
       RETURNING id, full_name, email, role
    `,
    [role, updatedBy, id]
  );
  return rows[0] || null;
};

const deleteUserById = async ({ id }) => {
  const db = getDb();
  const res = await db.query('DELETE FROM users WHERE id = $1', [id]);
  return res.rowCount > 0;
};

const getUserFunctions = async ({ userId }) => {
  const db = getDb();
  const { rows } = await db.query(
    `
      SELECT
        fm.id AS "functionId",
        fm.function_key,
        fm.description,
        CASE
          WHEN uf.allowed IS NOT NULL THEN uf.allowed
          WHEN rf.function_id IS NOT NULL THEN TRUE
          ELSE FALSE
        END AS allowed,
        CASE
          WHEN uf.allowed IS NOT NULL THEN 'override'
          WHEN rf.function_id IS NOT NULL THEN 'role'
          ELSE 'none'
        END AS source
      FROM users u
      JOIN functions_master fm ON TRUE
      LEFT JOIN role_functions rf
        ON rf.role = u.role
       AND rf.function_id = fm.id
      LEFT JOIN user_functions uf
        ON uf.user_id = u.id
       AND uf.function_id = fm.id
      WHERE u.id = $1
      ORDER BY fm.function_key
    `,
    [userId]
  );
  return rows;
};

const upsertUserFunction = async ({ userId, functionId, allowed, grantedBy = null }) => {
  const db = getDb();
  const { rows } = await db.query(
    `
      INSERT INTO user_functions (user_id, function_id, allowed, granted_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, function_id)
      DO UPDATE SET
        allowed = EXCLUDED.allowed,
        granted_by = EXCLUDED.granted_by,
        granted_at = now()
      RETURNING user_id, function_id, allowed, granted_by, granted_at
    `,
    [userId, functionId, allowed, grantedBy]
  );
  return rows[0];
};

const deleteUserFunction = async ({ userId, functionId }) => {
  const db = getDb();
  await db.query(
    'DELETE FROM user_functions WHERE user_id = $1 AND function_id = $2',
    [userId, functionId]
  );
};

module.exports = {
  getUserStats,
  listUsers,
  updateUserRole,
  deleteUserById,
  getUserFunctions,
  upsertUserFunction,
  deleteUserFunction,
};

