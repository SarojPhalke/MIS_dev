const { getDb } = require('../config');

// Checks if user has one of the allowed roles
const authorizeRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.roleId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      if (allowedRoles.length === 0) {
        return next();
      }

      const db = getDb();
      const { rows } = await db.query(
        'SELECT name FROM roles WHERE id = $1 AND is_active = TRUE',
        [req.user.roleId]
      );

      if (!rows.length || !allowedRoles.includes(rows[0].name)) {
        return res.status(403).json({ success: false, message: 'Insufficient role permissions' });
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
};

// Checks if user has permission for a given function code
const authorizeFunction = (functionCode) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.roleId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const db = getDb();
      const query = `
        SELECT 1
        FROM role_functions rf
        JOIN functions_master fm ON rf.function_id = fm.id
        WHERE rf.role_id = $1
          AND fm.code = $2
          AND rf.is_allowed = TRUE
          AND fm.is_active = TRUE
      `;

      const { rows } = await db.query(query, [req.user.roleId, functionCode]);

      if (!rows.length) {
        return res.status(403).json({ success: false, message: 'Insufficient function permissions' });
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
};

module.exports = {
  authorizeRole,
  authorizeFunction,
};

