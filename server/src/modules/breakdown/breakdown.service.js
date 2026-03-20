const { getDb } = require('../../config');

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

const listBreakdownsService = async (userId, { status } = {}) => {
  await assertPermission(userId, 'view_bd');

  const db = getDb();
  const where = [];
  const values = [];

  if (status) {
    values.push(status);
    where.push(`bd_status = $${values.length}`);
  }

  const query = `
    SELECT
      bd_id,
      bd_code,
      entry_date,
      entry_time,
      asset_code,
      bd_status,
      asset_location,
      operator_name,
      key_issue,
      nature_of_complaint,
      note,
      action_taken,
      engineer_findings,
      job_start,
      job_completion_date,
      responsible_person,
      spare_usage_id
    FROM breakdown_entry_view
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY entry_date DESC, entry_time DESC
  `;

  const { rows } = await db.query(query, values);
  return rows;
};

const getBreakdownStatsService = async (userId) => {
  await assertPermission(userId, 'view_bd');

  const db = getDb();
  const query = `
    SELECT
      COUNT(*)::int AS "total",
      COUNT(*) FILTER (WHERE bd_status::text = 'open')::int AS "open",
      COUNT(*) FILTER (WHERE bd_status::text = 'ack')::int AS "ack",
      COUNT(*) FILTER (WHERE bd_status::text = 'in_progress')::int AS "in_progress",
      COUNT(*) FILTER (WHERE bd_status::text = 'resolved')::int AS "resolved",
      COUNT(*) FILTER (WHERE bd_status::text = 'closed')::int AS "closed"
    FROM breakdown_entry_view
  `;

  const { rows } = await db.query(query);
  return rows[0] || {
    total: 0,
    open: 0,
    ack: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
  };
};

const createBreakdownService = async (userId, payload) => {
  await assertPermission(userId, 'add_bd');

  const required = ['bd_code', 'entry_date', 'entry_time', 'asset_code', 'bd_status'];
  for (const k of required) {
    if (!payload[k]) {
      const error = new Error(`${k} is required`);
      error.statusCode = 400;
      throw error;
    }
  }

  const db = getDb();

  // Convert asset_code to asset_id
  const assetQuery = `
    SELECT id FROM asset_master WHERE asset_code = $1 LIMIT 1
  `;
  const { rows: assetRows } = await db.query(assetQuery, [payload.asset_code]);
  
  if (!assetRows.length) {
    const error = new Error(`Asset with code "${payload.asset_code}" not found`);
    error.statusCode = 404;
    throw error;
  }

  const assetId = assetRows[0].id;

  // Allowed fields for operator entry
  const allowedFields = [
    'bd_code',
    'shift_id',
    'entry_date',
    'entry_time',
    'bd_status',
    'asset_location',
    'bu_name',
    'operator_name',
    'key_issue',
    'nature_of_complaint',
    'note',
  ];

  const insertFields = [];
  const values = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      insertFields.push(field);
      values.push(payload[field] === '' ? null : payload[field]);
      paramIndex++;
    }
  }

  // Add asset_id (converted from asset_code)
  insertFields.push('asset_id');
  values.push(assetId);

  // Add reported_by
  insertFields.push('reported_by');
  values.push(userId);

  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
  const fieldNames = insertFields.join(', ');

  const insertQuery = `
    INSERT INTO bd_entry_operator (${fieldNames})
    VALUES (${placeholders})
    RETURNING id, bd_code, entry_date, entry_time, asset_id, bd_status
  `;

  const { rows } = await db.query(insertQuery, values);
  // Map id to bd_id to match the view structure
  const result = rows[0];
  if (result) {
    result.bd_id = result.id;
  }
  return result;
};

const updateBreakdownMemoService = async (userId, breakdownId, payload) => {
  await assertPermission(userId, 'update_bd_memo');

  const db = getDb();

  // Allowed fields for engineer memo
  const allowedFields = [
    'action_taken',
    'engineer_findings',
    'job_start',
    'job_completion_date',
    'spare_usage_id',
  ];

  const updates = {};
  for (const f of allowedFields) {
    if (payload[f] !== undefined) updates[f] = payload[f];
  }

  if (!Object.keys(updates).length) {
    const error = new Error('No valid fields to update');
    error.statusCode = 400;
    throw error;
  }

  // breakdownId from the view is actually the id from bd_entry_operator
  // bd_entry_engineer table uses 'bd_operator_id' as the foreign key to bd_entry_operator.id
  // Check if record exists
  const checkQuery = `
    SELECT bd_operator_id FROM bd_entry_engineer WHERE bd_operator_id = $1 LIMIT 1
  `;
  const { rows: existingRows } = await db.query(checkQuery, [breakdownId]);

  if (existingRows.length > 0) {
    // UPDATE
    const setClauses = [];
    const values = [];

    Object.entries(updates).forEach(([k, v]) => {
      values.push(v === '' ? null : v);
      setClauses.push(`${k} = $${values.length}`);
    });

    values.push(breakdownId);

    const updateQuery = `
      UPDATE bd_entry_engineer
      SET ${setClauses.join(', ')}
      WHERE bd_operator_id = $${values.length}
      RETURNING bd_operator_id
    `;

    const { rows } = await db.query(updateQuery, values);
    if (rows.length === 0) {
      const error = new Error('Breakdown memo not found');
      error.statusCode = 404;
      throw error;
    }
  } else {
    // INSERT - use bd_operator_id as the foreign key column
    const insertFields = ['bd_operator_id'];
    const values = [breakdownId];
    let paramIndex = 2;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        insertFields.push(field);
        values.push(updates[field] === '' ? null : updates[field]);
        paramIndex++;
      }
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const fieldNames = insertFields.join(', ');

    const insertQuery = `
      INSERT INTO bd_entry_engineer (${fieldNames})
      VALUES (${placeholders})
      RETURNING bd_operator_id
    `;

    await db.query(insertQuery, values);
  }
};

const updateBreakdownStatusService = async (userId, breakdownId, payload) => {
  await assertPermission(userId, 'update_bd_status');

  const db = getDb();

  // Separate fields for operator and engineer tables
  const operatorUpdates = {};
  const engineerUpdates = {};

  // bd_status goes to bd_entry_operator
  if (payload.bd_status !== undefined) {
    operatorUpdates.bd_status = payload.bd_status;
  }

  // responsible_person goes to bd_entry_engineer
  if (payload.responsible_person !== undefined) {
    engineerUpdates.responsible_person = payload.responsible_person === '' ? null : payload.responsible_person;
  }

  if (!Object.keys(operatorUpdates).length && !Object.keys(engineerUpdates).length) {
    const error = new Error('No valid fields to update');
    error.statusCode = 400;
    throw error;
  }

  // Update bd_entry_operator if bd_status is provided
  if (Object.keys(operatorUpdates).length > 0) {
    const setClauses = [];
    const values = [];

    Object.entries(operatorUpdates).forEach(([k, v]) => {
      values.push(v === '' ? null : v);
      setClauses.push(`${k} = $${values.length}`);
    });

    values.push(breakdownId);

    const updateQuery = `
      UPDATE bd_entry_operator
      SET ${setClauses.join(', ')}
      WHERE id = $${values.length}
      RETURNING id
    `;

    const res = await db.query(updateQuery, values);
    if (res.rowCount === 0) {
      const error = new Error('Breakdown not found');
      error.statusCode = 404;
      throw error;
    }
  }

  // Update or insert responsible_person in bd_entry_engineer
  if (Object.keys(engineerUpdates).length > 0) {
    // Check if engineer record exists
    const checkQuery = `
      SELECT bd_operator_id FROM bd_entry_engineer WHERE bd_operator_id = $1 LIMIT 1
    `;
    const { rows: existingRows } = await db.query(checkQuery, [breakdownId]);

    if (existingRows.length > 0) {
      // UPDATE existing record
      const setClauses = [];
      const values = [];

      Object.entries(engineerUpdates).forEach(([k, v]) => {
        values.push(v);
        setClauses.push(`${k} = $${values.length}`);
      });

      values.push(breakdownId);

      const updateQuery = `
        UPDATE bd_entry_engineer
        SET ${setClauses.join(', ')}
        WHERE bd_operator_id = $${values.length}
        RETURNING bd_operator_id
      `;

      await db.query(updateQuery, values);
    } else {
      // INSERT new record with only responsible_person
      const insertFields = ['bd_operator_id'];
      const values = [breakdownId];

      Object.entries(engineerUpdates).forEach(([k, v]) => {
        insertFields.push(k);
        values.push(v);
      });

      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      const fieldNames = insertFields.join(', ');

      const insertQuery = `
        INSERT INTO bd_entry_engineer (${fieldNames})
        VALUES (${placeholders})
        RETURNING bd_operator_id
      `;

      await db.query(insertQuery, values);
    }
  }
};

const listResponsiblePeopleService = async (userId) => {
  await assertPermission(userId, 'update_bd_status');

  const db = getDb();
  const query = `
    SELECT
      id,
      full_name
    FROM users
    ORDER BY full_name ASC
  `;

  const { rows } = await db.query(query);
  return rows || [];
};

module.exports = {
  userHasPermission,
  listBreakdownsService,
  getBreakdownStatsService,
  createBreakdownService,
  updateBreakdownMemoService,
  updateBreakdownStatusService,
  listResponsiblePeopleService,
};
