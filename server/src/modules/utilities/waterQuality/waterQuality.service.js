const { getDb } = require('../../../config');

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

// ==================== WATER QUALITY SERVICES ====================

const createWaterQualityService = async (userId, payload) => {
  await assertPermission(userId, 'add_water_quality');

  const required = ['sample_point', 'record_date'];
  for (const k of required) {
    if (!payload[k]) {
      const err = new Error(`${k} is required`);
      err.statusCode = 400;
      throw err;
    }
  }

  const db = getDb();

  const insertQuery = `
    INSERT INTO water_quality_logs (
      sample_point,
      record_date,
      ph,
      tds_mg_l,
      hardness_mg_l,
      conductivity_us_cm,
      temperature_c,
      chlorine_mg_l,
      cod_mg_l,
      bod_mg_l,
      asset_id,
      location_id,
      business_unit_id,
      remarks,
      recorded_by,
      created_by,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15, NOW())
    RETURNING *
  `;

  const values = [
    payload.sample_point,
    payload.record_date,
    payload.ph ? Number(payload.ph) : null,
    payload.tds_mg_l ? Number(payload.tds_mg_l) : null,
    payload.hardness_mg_l ? Number(payload.hardness_mg_l) : null,
    payload.conductivity_us_cm ? Number(payload.conductivity_us_cm) : null,
    payload.temperature_c ? Number(payload.temperature_c) : null,
    payload.chlorine_mg_l ? Number(payload.chlorine_mg_l) : null,
    payload.cod_mg_l ? Number(payload.cod_mg_l) : null,
    payload.bod_mg_l ? Number(payload.bod_mg_l) : null,
    payload.asset_id || null,
    payload.location_id || null,
    payload.business_unit_id || null,
    payload.remarks || null,
    userId,
  ];

  const { rows } = await db.query(insertQuery, values);

  // Check for alerts
  const alerts = [];
  if (rows[0].ph && (rows[0].ph < 6 || rows[0].ph > 9)) {
    alerts.push('pH out of range (6-9)');
  }
  if (rows[0].cod_mg_l && rows[0].cod_mg_l > 250) {
    alerts.push('COD exceeds limit (250 mg/L)');
  }
  if (rows[0].bod_mg_l && rows[0].bod_mg_l > 100) {
    alerts.push('BOD exceeds limit (100 mg/L)');
  }

  return {
    ...rows[0],
    alerts: alerts.length > 0 ? alerts : null,
    has_alert: alerts.length > 0,
  };
};

const listWaterQualityService = async (userId, filters = {}) => {
  await assertPermission(userId, 'view_water_quality');

  const db = getDb();
  const conditions = [];
  const params = [];
  let paramCount = 1;

  if (filters.sample_point) {
    conditions.push(`wql.sample_point ILIKE $${paramCount++}`);
    params.push(`%${filters.sample_point}%`);
  }

  if (filters.location_id) {
    conditions.push(`wql.location_id = $${paramCount++}`);
    params.push(filters.location_id);
  }

  if (filters.date_from) {
    conditions.push(`DATE(wql.record_date) >= $${paramCount++}`);
    params.push(filters.date_from);
  }

  if (filters.date_to) {
    conditions.push(`DATE(wql.record_date) <= $${paramCount++}`);
    params.push(filters.date_to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      wql.id,
      wql.record_date,
      wql.sample_point,
      wql.ph,
      wql.tds_mg_l,
      wql.hardness_mg_l,
      wql.conductivity_us_cm,
      wql.temperature_c,
      wql.chlorine_mg_l,
      wql.cod_mg_l,
      wql.bod_mg_l,
      wql.remarks,
      COALESCE(a.asset_code, 'N/A') as asset_code,
      COALESCE(a.asset_name, 'N/A') as asset_name,
      COALESCE(l.location_name, 'N/A') as location_name,
      COALESCE(bu.bu_name, 'N/A') as bu_name,
      COALESCE(u.full_name, 'Unknown') as recorded_by_name
    FROM water_quality_logs wql
    LEFT JOIN asset_master a ON a.id = wql.asset_id
    LEFT JOIN locations l ON l.id = wql.location_id
    LEFT JOIN business_units bu ON bu.id = wql.business_unit_id
    LEFT JOIN users u ON u.id = wql.recorded_by
    ${whereClause}
    ORDER BY wql.record_date DESC, wql.created_at DESC
    LIMIT 1000
  `;

  const { rows } = await db.query(query, params);

  return rows.map((row) => {
    const alerts = [];
    if (row.ph && (row.ph < 6 || row.ph > 9)) {
      alerts.push('pH out of range');
    }
    if (row.cod_mg_l && row.cod_mg_l > 250) {
      alerts.push('COD exceeds limit');
    }
    if (row.bod_mg_l && row.bod_mg_l > 100) {
      alerts.push('BOD exceeds limit');
    }

    return {
      id: row.id,
      record_date: row.record_date,
      sample_point: row.sample_point,
      ph: row.ph,
      tds_mg_l: row.tds_mg_l,
      hardness_mg_l: row.hardness_mg_l,
      conductivity_us_cm: row.conductivity_us_cm,
      temperature_c: row.temperature_c,
      chlorine_mg_l: row.chlorine_mg_l,
      cod_mg_l: row.cod_mg_l,
      bod_mg_l: row.bod_mg_l,
      asset: row.asset_name !== 'N/A' ? `${row.asset_code} - ${row.asset_name}` : 'N/A',
      location: row.location_name,
      business_unit: row.bu_name,
      recorded_by: row.recorded_by_name,
      remarks: row.remarks,
      alerts: alerts.length > 0 ? alerts : null,
      has_alert: alerts.length > 0,
    };
  });
};

const deleteWaterQualityService = async (userId, logId) => {
  await assertPermission(userId, 'add_water_quality');

  const db = getDb();

  const checkQuery = `SELECT id FROM water_quality_logs WHERE id = $1`;
  const { rows: checkRows } = await db.query(checkQuery, [logId]);

  if (!checkRows.length) {
    const err = new Error('Water quality log not found');
    err.statusCode = 404;
    throw err;
  }

  const deleteQuery = `DELETE FROM water_quality_logs WHERE id = $1 RETURNING id`;
  const { rows } = await db.query(deleteQuery, [logId]);

  return rows[0];
};

module.exports = {
  createWaterQualityService,
  listWaterQualityService,
  deleteWaterQualityService,
};
