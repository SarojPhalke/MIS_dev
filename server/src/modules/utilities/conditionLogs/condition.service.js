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

// ==================== MACHINE CONDITION SERVICES ====================

const createMachineConditionService = async (userId, payload) => {
  await assertPermission(userId, 'add_machine_condition');

  const required = ['asset_id', 'log_date'];
  for (const k of required) {
    if (!payload[k]) {
      const err = new Error(`${k} is required`);
      err.statusCode = 400;
      throw err;
    }
  }

  const db = getDb();

  const insertQuery = `
    INSERT INTO machine_equipment_condition_logs (
      asset_id,
      log_date,
      shift,
      temperature_c,
      vibration_mm_s,
      noise_db,
      pressure_bar,
      current_amp,
      voltage_v,
      remarks,
      recorded_by,
      created_by,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, NOW())
    RETURNING *
  `;

  const values = [
    payload.asset_id,
    payload.log_date,
    payload.shift || null,
    payload.temperature_c ? Number(payload.temperature_c) : null,
    payload.vibration_mm_s ? Number(payload.vibration_mm_s) : null,
    payload.noise_db ? Number(payload.noise_db) : null,
    payload.pressure_bar ? Number(payload.pressure_bar) : null,
    payload.current_amp ? Number(payload.current_amp) : null,
    payload.voltage_v ? Number(payload.voltage_v) : null,
    payload.remarks || null,
    userId,
  ];

  const { rows } = await db.query(insertQuery, values);

  // Check for condition alerts
  const alerts = [];
  if (rows[0].vibration_mm_s && rows[0].vibration_mm_s > 5) {
    alerts.push('High vibration');
  }
  if (rows[0].temperature_c && rows[0].temperature_c > 80) {
    alerts.push('High temperature');
  }
  if (rows[0].noise_db && rows[0].noise_db > 85) {
    alerts.push('High noise level');
  }

  return {
    ...rows[0],
    alerts: alerts.length > 0 ? alerts : null,
    condition_alert: alerts.length > 0,
  };
};

const listMachineConditionService = async (userId, filters = {}) => {
  await assertPermission(userId, 'view_machine_condition');

  const db = getDb();
  const conditions = [];
  const params = [];
  let paramCount = 1;

  if (filters.asset_id) {
    conditions.push(`mecl.asset_id = $${paramCount++}`);
    params.push(filters.asset_id);
  }

  if (filters.shift) {
    conditions.push(`mecl.shift = $${paramCount++}`);
    params.push(filters.shift);
  }

  if (filters.date_from) {
    conditions.push(`DATE(mecl.log_date) >= $${paramCount++}`);
    params.push(filters.date_from);
  }

  if (filters.date_to) {
    conditions.push(`DATE(mecl.log_date) <= $${paramCount++}`);
    params.push(filters.date_to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      mecl.id,
      mecl.log_date,
      mecl.shift,
      mecl.temperature_c,
      mecl.vibration_mm_s,
      mecl.noise_db,
      mecl.pressure_bar,
      mecl.current_amp,
      mecl.voltage_v,
      mecl.remarks,
      COALESCE(a.asset_code, 'N/A') as asset_code,
      COALESCE(a.asset_name, 'N/A') as asset_name,
      COALESCE(u.full_name, 'Unknown') as recorded_by_name
    FROM machine_equipment_condition_logs mecl
    LEFT JOIN asset_master a ON a.id = mecl.asset_id
    LEFT JOIN users u ON u.id = mecl.recorded_by
    ${whereClause}
    ORDER BY mecl.log_date DESC, mecl.created_at DESC
    LIMIT 1000
  `;

  const { rows } = await db.query(query, params);

  return rows.map((row) => {
    const alerts = [];
    if (row.vibration_mm_s && row.vibration_mm_s > 5) {
      alerts.push('High vibration');
    }
    if (row.temperature_c && row.temperature_c > 80) {
      alerts.push('High temperature');
    }
    if (row.noise_db && row.noise_db > 85) {
      alerts.push('High noise level');
    }

    return {
      id: row.id,
      log_date: row.log_date,
      shift: row.shift,
      temperature_c: row.temperature_c,
      vibration_mm_s: row.vibration_mm_s,
      noise_db: row.noise_db,
      pressure_bar: row.pressure_bar,
      current_amp: row.current_amp,
      voltage_v: row.voltage_v,
      asset: row.asset_name !== 'N/A' ? `${row.asset_code} - ${row.asset_name}` : 'N/A',
      recorded_by: row.recorded_by_name,
      remarks: row.remarks,
      alerts: alerts.length > 0 ? alerts : null,
      condition_alert: alerts.length > 0,
    };
  });
};

const getMachineConditionDashboardService = async (userId) => {
  await assertPermission(userId, 'view_machine_condition');

  const db = getDb();

  // Vibration trend
  const vibrationQuery = `
    SELECT 
      DATE_TRUNC('day', log_date) as day,
      AVG(vibration_mm_s) as avg_vibration
    FROM machine_equipment_condition_logs
    WHERE log_date >= CURRENT_DATE - INTERVAL '30 days'
      AND vibration_mm_s IS NOT NULL
    GROUP BY DATE_TRUNC('day', log_date)
    ORDER BY day ASC
  `;
  const { rows: vibrationRows } = await db.query(vibrationQuery);

  // Temperature trend
  const temperatureQuery = `
    SELECT 
      DATE_TRUNC('day', log_date) as day,
      AVG(temperature_c) as avg_temperature
    FROM machine_equipment_condition_logs
    WHERE log_date >= CURRENT_DATE - INTERVAL '30 days'
      AND temperature_c IS NOT NULL
    GROUP BY DATE_TRUNC('day', log_date)
    ORDER BY day ASC
  `;
  const { rows: temperatureRows } = await db.query(temperatureQuery);

  // Machine health summary
  const healthQuery = `
    SELECT 
      COUNT(*) FILTER (WHERE vibration_mm_s > 5 OR temperature_c > 80 OR noise_db > 85) as alert_count,
      COUNT(*) as total_logs
    FROM machine_equipment_condition_logs
    WHERE log_date >= CURRENT_DATE - INTERVAL '30 days'
  `;
  const { rows: healthRows } = await db.query(healthQuery);

  return {
    vibration_trend: vibrationRows.map((r) => ({
      day: r.day,
      avg_vibration: Number(r.avg_vibration || 0),
    })),
    temperature_trend: temperatureRows.map((r) => ({
      day: r.day,
      avg_temperature: Number(r.avg_temperature || 0),
    })),
    health_summary: {
      alert_count: Number(healthRows[0]?.alert_count || 0),
      total_logs: Number(healthRows[0]?.total_logs || 0),
      health_percentage:
        healthRows[0]?.total_logs > 0
          ? Math.round(
              ((healthRows[0].total_logs - (healthRows[0].alert_count || 0)) /
                healthRows[0].total_logs) *
                100
            )
          : 100,
    },
  };
};

const deleteMachineConditionService = async (userId, logId) => {
  await assertPermission(userId, 'add_machine_condition');

  const db = getDb();

  const checkQuery = `SELECT id FROM machine_equipment_condition_logs WHERE id = $1`;
  const { rows: checkRows } = await db.query(checkQuery, [logId]);

  if (!checkRows.length) {
    const err = new Error('Machine condition log not found');
    err.statusCode = 404;
    throw err;
  }

  const deleteQuery = `DELETE FROM machine_equipment_condition_logs WHERE id = $1 RETURNING id`;
  const { rows } = await db.query(deleteQuery, [logId]);

  return rows[0];
};

module.exports = {
  createMachineConditionService,
  listMachineConditionService,
  getMachineConditionDashboardService,
  deleteMachineConditionService,
};
