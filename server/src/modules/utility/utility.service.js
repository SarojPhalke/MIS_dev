const { getDb } = require('../../config');

// Permission helpers
const userHasPermission = async (userId, functionKey) => {
  const db = getDb();

  const query = `
    SELECT
      CASE
        WHEN uf.allowed IS NOT NULL THEN uf.allowed
        WHEN rf.function_id IS NOT NULL THEN TRUE
        ELSE FALSE
      END AS allowed
    FROM users u
    JOIN functions_master fm
      ON fm.function_key = $2
    LEFT JOIN user_functions uf
      ON uf.user_id = u.id
     AND uf.function_id = fm.id
    LEFT JOIN role_functions rf
      ON rf.role = u.role
     AND rf.function_id = fm.id
    WHERE u.id = $1
    LIMIT 1
  `;

  const { rows } = await db.query(query, [userId, functionKey]);
  return rows.length ? rows[0].allowed === true : false;
};

const assertPermission = async (userId, functionKey) => {
  const allowed = await userHasPermission(userId, functionKey);
  if (!allowed) {
    const error = new Error(`Access denied. ${functionKey} permission required.`);
    error.statusCode = 403;
    throw error;
  }
};

// ==================== UTILITY LOGS SERVICES ====================

const createUtilityLogService = async (userId, payload) => {
  await assertPermission(userId, 'add_utility_logs');

  const required = ['utility_type', 'meter_point', 'reading_unit', 'reading_value'];
  for (const k of required) {
    if (!payload[k]) {
      const err = new Error(`${k} is required`);
      err.statusCode = 400;
      throw err;
    }
  }

  const readingValue = Number(payload.reading_value);
  if (!Number.isFinite(readingValue) || readingValue < 0) {
    const err = new Error('reading_value must be a non-negative number');
    err.statusCode = 400;
    throw err;
  }

  const db = getDb();

  const insertQuery = `
    INSERT INTO utility_logs (
      utility_type,
      meter_point,
      reading_unit,
      reading_value,
      asset_id,
      business_unit_id,
      location_id,
      remarks,
      recorded_by,
      created_by,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, NOW())
    RETURNING *
  `;

  const values = [
    payload.utility_type,
    payload.meter_point,
    payload.reading_unit,
    readingValue,
    payload.asset_id || null,
    payload.business_unit_id || null,
    payload.location_id || null,
    payload.remarks || null,
    userId,
  ];

  const { rows } = await db.query(insertQuery, values);
  return rows[0];
};

const listUtilityLogsService = async (userId, filters = {}) => {
  await assertPermission(userId, 'view_utility_logs');

  const db = getDb();
  const conditions = [];
  const params = [];
  let paramCount = 1;

  // Build WHERE clause based on filters
  if (filters.utility_type) {
    conditions.push(`ul.utility_type = $${paramCount++}`);
    params.push(filters.utility_type);
  }

  if (filters.location_id) {
    conditions.push(`ul.location_id = $${paramCount++}`);
    params.push(filters.location_id);
  }

  if (filters.date_from) {
    conditions.push(`DATE(ul.created_at) >= $${paramCount++}`);
    params.push(filters.date_from);
  }

  if (filters.date_to) {
    conditions.push(`DATE(ul.created_at) <= $${paramCount++}`);
    params.push(filters.date_to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      ul.id,
      ul.utility_type,
      ul.meter_point,
      ul.reading_value,
      ul.reading_unit,
      ul.remarks,
      ul.created_at as timestamp,
      COALESCE(a.asset_code, 'N/A') as asset_code,
      COALESCE(a.asset_name, 'N/A') as asset_name,
      COALESCE(l.location_name, 'N/A') as location_name,
      COALESCE(bu.bu_name, 'N/A') as bu_name,
      COALESCE(u.full_name, 'Unknown') as recorded_by_name
    FROM utility_logs ul
    LEFT JOIN asset_master a ON a.id = ul.asset_id
    LEFT JOIN locations l ON l.id = ul.location_id
    LEFT JOIN business_units bu ON bu.id = ul.business_unit_id
    LEFT JOIN users u ON u.id = ul.recorded_by
    ${whereClause}
    ORDER BY ul.created_at DESC
    LIMIT 1000
  `;

  const { rows } = await db.query(query, params);
  
  // Format response
  return rows.map((row) => ({
    id: row.id,
    utility_type: row.utility_type,
    meter_point: row.meter_point,
    reading_value: row.reading_value,
    reading_unit: row.reading_unit,
    asset: row.asset_name !== 'N/A' ? `${row.asset_code} - ${row.asset_name}` : 'N/A',
    location: row.location_name,
    business_unit: row.bu_name,
    recorded_by: row.recorded_by_name,
    timestamp: row.timestamp,
    remarks: row.remarks,
  }));
};

const getUtilityDailySummaryService = async (userId) => {
  await assertPermission(userId, 'view_utility_logs');

  const db = getDb();

  // Check if view exists, if not use a query
  const query = `
    SELECT 
      DATE(created_at) as record_day,
      utility_type,
      SUM(reading_value) as total_consumption,
      reading_unit
    FROM utility_logs
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(created_at), utility_type, reading_unit
    ORDER BY record_day DESC, utility_type
  `;

  const { rows } = await db.query(query);
  
  return rows.map((row) => ({
    record_day: row.record_day,
    utility_type: row.utility_type,
    total_consumption: Number(row.total_consumption),
    reading_unit: row.reading_unit,
  }));
};

const deleteUtilityLogService = async (userId, logId) => {
  await assertPermission(userId, 'add_utility_logs');

  const db = getDb();

  // Check if log exists
  const checkQuery = `SELECT id FROM utility_logs WHERE id = $1`;
  const { rows: checkRows } = await db.query(checkQuery, [logId]);
  
  if (!checkRows.length) {
    const err = new Error('Utility log not found');
    err.statusCode = 404;
    throw err;
  }

  const deleteQuery = `DELETE FROM utility_logs WHERE id = $1 RETURNING id`;
  const { rows } = await db.query(deleteQuery, [logId]);
  
  return rows[0];
};

const listLocationsService = async (userId) => {
  await assertPermission(userId, 'view_utility_logs');

  const db = getDb();
  const query = `SELECT id, location_name FROM locations ORDER BY location_name ASC`;
  const { rows } = await db.query(query);
  return rows;
};

const listBusinessUnitsService = async (userId) => {
  await assertPermission(userId, 'view_utility_logs');

  const db = getDb();
  const query = `SELECT id, bu_name FROM business_units ORDER BY bu_name ASC`;
  const { rows } = await db.query(query);
  return rows;
};

module.exports = {
  createUtilityLogService,
  listUtilityLogsService,
  getUtilityDailySummaryService,
  deleteUtilityLogService,
  listLocationsService,
  listBusinessUnitsService,
};
