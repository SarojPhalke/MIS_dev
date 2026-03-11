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

// ==================== CARBON EMISSION SERVICES ====================

const createCarbonEmissionService = async (userId, payload) => {
  await assertPermission(userId, 'add_carbon_logs');

  const required = ['source_type', 'record_date'];
  for (const k of required) {
    if (!payload[k]) {
      const err = new Error(`${k} is required`);
      err.statusCode = 400;
      throw err;
    }
  }

  // At least one consumption value must be provided
  if (!payload.energy_consumed_kwh && !payload.fuel_consumed_litre) {
    const err = new Error('Either energy_consumed_kwh or fuel_consumed_litre must be provided');
    err.statusCode = 400;
    throw err;
  }

  const db = getDb();

  const insertQuery = `
    INSERT INTO carbon_emission_logs (
      source_type,
      record_date,
      energy_consumed_kwh,
      fuel_consumed_litre,
      emission_factor,
      scope_category,
      asset_id,
      location_id,
      business_unit_id,
      remarks,
      recorded_by,
      created_by,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, NOW())
    RETURNING *
  `;

  const values = [
    payload.source_type,
    payload.record_date,
    payload.energy_consumed_kwh ? Number(payload.energy_consumed_kwh) : null,
    payload.fuel_consumed_litre ? Number(payload.fuel_consumed_litre) : null,
    payload.emission_factor ? Number(payload.emission_factor) : null,
    payload.scope_category || null,
    payload.asset_id || null,
    payload.location_id || null,
    payload.business_unit_id || null,
    payload.remarks || null,
    userId,
  ];

  const { rows } = await db.query(insertQuery, values);
  return rows[0];
};

const listCarbonEmissionService = async (userId, filters = {}) => {
  await assertPermission(userId, 'view_carbon_logs');

  const db = getDb();
  const conditions = [];
  const params = [];
  let paramCount = 1;

  if (filters.source_type) {
    conditions.push(`cel.source_type = $${paramCount++}`);
    params.push(filters.source_type);
  }

  if (filters.location_id) {
    conditions.push(`cel.location_id = $${paramCount++}`);
    params.push(filters.location_id);
  }

  if (filters.date_from) {
    conditions.push(`DATE(cel.record_date) >= $${paramCount++}`);
    params.push(filters.date_from);
  }

  if (filters.date_to) {
    conditions.push(`DATE(cel.record_date) <= $${paramCount++}`);
    params.push(filters.date_to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      cel.id,
      cel.record_date,
      cel.source_type,
      cel.energy_consumed_kwh,
      cel.fuel_consumed_litre,
      cel.co2e_kg,
      cel.emission_factor,
      cel.scope_category,
      cel.remarks,
      COALESCE(a.asset_code, 'N/A') as asset_code,
      COALESCE(a.asset_name, 'N/A') as asset_name,
      COALESCE(l.location_name, 'N/A') as location_name,
      COALESCE(bu.bu_name, 'N/A') as bu_name,
      COALESCE(u.full_name, 'Unknown') as recorded_by_name
    FROM carbon_emission_logs cel
    LEFT JOIN asset_master a ON a.id = cel.asset_id
    LEFT JOIN locations l ON l.id = cel.location_id
    LEFT JOIN business_units bu ON bu.id = cel.business_unit_id
    LEFT JOIN users u ON u.id = cel.recorded_by
    ${whereClause}
    ORDER BY cel.record_date DESC, cel.created_at DESC
    LIMIT 1000
  `;

  const { rows } = await db.query(query, params);

  return rows.map((row) => ({
    id: row.id,
    record_date: row.record_date,
    source_type: row.source_type,
    energy_consumed_kwh: row.energy_consumed_kwh,
    fuel_consumed_litre: row.fuel_consumed_litre,
    co2e_kg: row.co2e_kg,
    emission_factor: row.emission_factor,
    scope_category: row.scope_category,
    asset: row.asset_name !== 'N/A' ? `${row.asset_code} - ${row.asset_name}` : 'N/A',
    location: row.location_name,
    business_unit: row.bu_name,
    recorded_by: row.recorded_by_name,
    remarks: row.remarks,
  }));
};

const getCarbonDashboardService = async (userId) => {
  await assertPermission(userId, 'view_carbon_logs');

  const db = getDb();

  // Total CO2 emissions
  const totalQuery = `
    SELECT SUM(co2e_kg) as total_co2e_kg
    FROM carbon_emission_logs
    WHERE record_date >= CURRENT_DATE - INTERVAL '30 days'
  `;
  const { rows: totalRows } = await db.query(totalQuery);

  // Emission by source type
  const sourceQuery = `
    SELECT 
      source_type,
      SUM(co2e_kg) as total_co2e_kg
    FROM carbon_emission_logs
    WHERE record_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY source_type
    ORDER BY total_co2e_kg DESC
  `;
  const { rows: sourceRows } = await db.query(sourceQuery);

  // Emission by location
  const locationQuery = `
    SELECT 
      COALESCE(l.location_name, 'Unknown') as location_name,
      SUM(cel.co2e_kg) as total_co2e_kg
    FROM carbon_emission_logs cel
    LEFT JOIN locations l ON l.id = cel.location_id
    WHERE cel.record_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY l.location_name
    ORDER BY total_co2e_kg DESC
    LIMIT 10
  `;
  const { rows: locationRows } = await db.query(locationQuery);

  // Monthly emission trend
  const trendQuery = `
    SELECT 
      DATE_TRUNC('month', record_date) as month,
      SUM(co2e_kg) as total_co2e_kg
    FROM carbon_emission_logs
    WHERE record_date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', record_date)
    ORDER BY month ASC
  `;
  const { rows: trendRows } = await db.query(trendQuery);

  return {
    total_co2e_kg: Number(totalRows[0]?.total_co2e_kg || 0),
    by_source: sourceRows.map((r) => ({
      source_type: r.source_type,
      total_co2e_kg: Number(r.total_co2e_kg || 0),
    })),
    by_location: locationRows.map((r) => ({
      location: r.location_name,
      total_co2e_kg: Number(r.total_co2e_kg || 0),
    })),
    monthly_trend: trendRows.map((r) => ({
      month: r.month,
      total_co2e_kg: Number(r.total_co2e_kg || 0),
    })),
  };
};

const deleteCarbonEmissionService = async (userId, logId) => {
  await assertPermission(userId, 'add_carbon_logs');

  const db = getDb();

  const checkQuery = `SELECT id FROM carbon_emission_logs WHERE id = $1`;
  const { rows: checkRows } = await db.query(checkQuery, [logId]);

  if (!checkRows.length) {
    const err = new Error('Carbon emission log not found');
    err.statusCode = 404;
    throw err;
  }

  const deleteQuery = `DELETE FROM carbon_emission_logs WHERE id = $1 RETURNING id`;
  const { rows } = await db.query(deleteQuery, [logId]);

  return rows[0];
};

module.exports = {
  createCarbonEmissionService,
  listCarbonEmissionService,
  getCarbonDashboardService,
  deleteCarbonEmissionService,
};
