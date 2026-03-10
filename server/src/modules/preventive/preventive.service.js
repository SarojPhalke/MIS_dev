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

// ==================== PM SCHEDULE SERVICES ====================

const createPmScheduleService = async (userId, payload) => {
  await assertPermission(userId, 'create_pm_schedule');

  const required = ['pm_title', 'asset_id', 'pm_frequency_interval'];
  for (const k of required) {
    if (!payload[k]) {
      const error = new Error(`${k} is required`);
      error.statusCode = 400;
      throw error;
    }
  }

  const db = getDb();

  // Calculate next_pm_date
  let nextPmDate = null;
  if (payload.last_pm_date) {
    const lastPmDate = new Date(payload.last_pm_date);
    // Parse interval (e.g., '30 days', '1 month', '90 days')
    const intervalStr = payload.pm_frequency_interval;
    // Add interval to last_pm_date
    const nextDate = new Date(lastPmDate);
    if (intervalStr.includes('day')) {
      const days = parseInt(intervalStr) || 30;
      nextDate.setDate(nextDate.getDate() + days);
    } else if (intervalStr.includes('month')) {
      const months = parseInt(intervalStr) || 1;
      nextDate.setMonth(nextDate.getMonth() + months);
    } else if (intervalStr.includes('week')) {
      const weeks = parseInt(intervalStr) || 1;
      nextDate.setDate(nextDate.getDate() + weeks * 7);
    }
    nextPmDate = nextDate.toISOString().slice(0, 10);
  } else {
    // If no last_pm_date, set next_pm_date to today + interval
    const today = new Date();
    const intervalStr = payload.pm_frequency_interval;
    if (intervalStr.includes('day')) {
      const days = parseInt(intervalStr) || 30;
      today.setDate(today.getDate() + days);
    } else if (intervalStr.includes('month')) {
      const months = parseInt(intervalStr) || 1;
      today.setMonth(today.getMonth() + months);
    } else if (intervalStr.includes('week')) {
      const weeks = parseInt(intervalStr) || 1;
      today.setDate(today.getDate() + weeks * 7);
    }
    nextPmDate = today.toISOString().slice(0, 10);
  }

  const insertQuery = `
    INSERT INTO pm_schedule (
      pm_title,
      asset_id,
      frequency_interval,
      pm_frequency_interval,
      last_pm_date,
      next_pm_date,
      checklist_ref,
      responsible_person,
      status,
      created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;

  const values = [
    payload.pm_title,
    payload.asset_id,
    payload.frequency_interval || payload.pm_frequency_interval,
    payload.pm_frequency_interval,
    payload.last_pm_date || null,
    nextPmDate,
    payload.checklist_ref || null,
    payload.responsible_person || null,
    'scheduled',
    userId,
  ];

  const { rows } = await db.query(insertQuery, values);
  return rows[0];
};

const listPmSchedulesService = async (userId) => {
  await assertPermission(userId, 'view_pm_schedule');

  const db = getDb();

  const query = `
    SELECT
      ps.id,
      ps.pm_title,
      ps.asset_id,
      a.asset_code,
      a.asset_name,
      ps.frequency_interval,
      ps.pm_frequency_interval,
      ps.last_pm_date,
      ps.next_pm_date,
      ps.checklist_ref,
      ps.responsible_person,
      u.full_name as responsible_person_name,
      ps.status,
      ps.created_at,
      CASE
        WHEN ps.next_pm_date < CURRENT_DATE AND ps.status != 'completed' THEN TRUE
        ELSE FALSE
      END as is_overdue
    FROM pm_schedule ps
    LEFT JOIN asset_master a ON a.id = ps.asset_id
    LEFT JOIN users u ON u.id = ps.responsible_person
    ORDER BY ps.next_pm_date ASC, ps.created_at DESC
  `;

  const { rows } = await db.query(query);
  return rows;
};

const updatePmScheduleService = async (userId, scheduleId, payload) => {
  await assertPermission(userId, 'update_pm_schedule');

  const db = getDb();

  const allowedFields = [
    'pm_title',
    'asset_id',
    'frequency_interval',
    'pm_frequency_interval',
    'last_pm_date',
    'checklist_ref',
    'responsible_person',
    'status',
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

  // Recalculate next_pm_date if frequency or last_pm_date changes
  if (updates.pm_frequency_interval || updates.last_pm_date) {
    const getScheduleQuery = `SELECT last_pm_date, pm_frequency_interval FROM pm_schedule WHERE id = $1`;
    const { rows: scheduleRows } = await db.query(getScheduleQuery, [scheduleId]);
    const schedule = scheduleRows[0];

    const lastPmDate = updates.last_pm_date || schedule.last_pm_date;
    const frequencyInterval = updates.pm_frequency_interval || schedule.pm_frequency_interval;

    if (lastPmDate && frequencyInterval) {
      const lastDate = new Date(lastPmDate);
      const intervalStr = frequencyInterval;
      const nextDate = new Date(lastDate);

      if (intervalStr.includes('day')) {
        const days = parseInt(intervalStr) || 30;
        nextDate.setDate(nextDate.getDate() + days);
      } else if (intervalStr.includes('month')) {
        const months = parseInt(intervalStr) || 1;
        nextDate.setMonth(nextDate.getMonth() + months);
      } else if (intervalStr.includes('week')) {
        const weeks = parseInt(intervalStr) || 1;
        nextDate.setDate(nextDate.getDate() + weeks * 7);
      }

      updates.next_pm_date = nextDate.toISOString().slice(0, 10);
    }
  }

  const setClauses = [];
  const values = [];

  Object.entries(updates).forEach(([k, v]) => {
    values.push(v === '' ? null : v);
    setClauses.push(`${k} = $${values.length}`);
  });

  values.push(scheduleId);

  const updateQuery = `
    UPDATE pm_schedule
    SET ${setClauses.join(', ')}
    WHERE id = $${values.length}
    RETURNING *
  `;

  const { rows } = await db.query(updateQuery, values);
  if (rows.length === 0) {
    const error = new Error('PM schedule not found');
    error.statusCode = 404;
    throw error;
  }

  return rows[0];
};

const deletePmScheduleService = async (userId, scheduleId) => {
  await assertPermission(userId, 'delete_pm_schedule');

  const db = getDb();

  const deleteQuery = `DELETE FROM pm_schedule WHERE id = $1 RETURNING id`;
  const { rows } = await db.query(deleteQuery, [scheduleId]);

  if (rows.length === 0) {
    const error = new Error('PM schedule not found');
    error.statusCode = 404;
    throw error;
  }

  return { id: rows[0].id };
};

// ==================== PM ENTRY SERVICES ====================

const generatePmCode = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PM-${year}${month}${day}-${random}`;
};

const createPmEntryService = async (userId, payload) => {
  await assertPermission(userId, 'create_pm_entry');

  const required = ['asset_id', 'entry_date', 'entry_time'];
  for (const k of required) {
    if (!payload[k]) {
      const error = new Error(`${k} is required`);
      error.statusCode = 400;
      throw error;
    }
  }

  const db = getDb();

  const pmCode = generatePmCode();

  const insertQuery = `
    INSERT INTO pm_entry_operator (
      pm_code,
      shift_id,
      entry_date,
      entry_time,
      asset_id,
      pm_status,
      operator_name,
      key_issue,
      nature_of_activity,
      note,
      reported_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;

  const values = [
    pmCode,
    payload.shift_id || null,
    payload.entry_date,
    payload.entry_time,
    payload.asset_id,
    'open',
    payload.operator_name || null,
    payload.key_issue || null,
    payload.nature_of_activity || null,
    payload.note || null,
    userId,
  ];

  const { rows } = await db.query(insertQuery, values);
  // Map id to pm_id to match view structure
  const result = rows[0];
  if (result) {
    result.pm_id = result.id;
  }
  return result;
};

const listPmEntriesService = async (userId, { status, asset_id, shift_id } = {}) => {
  await assertPermission(userId, 'view_pm_entry');

  const db = getDb();
  const where = [];
  const values = [];

  if (status) {
    values.push(status);
    where.push(`pm_status = $${values.length}`);
  }

  if (asset_id) {
    values.push(asset_id);
    where.push(`asset_id = $${values.length}`);
  }

  if (shift_id) {
    values.push(shift_id);
    where.push(`shift_id = $${values.length}`);
  }

  const query = `
    SELECT *
    FROM pm_entry_view
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY entry_date DESC, entry_time DESC
  `;

  const { rows } = await db.query(query, values);
  return rows;
};

const updatePmEntryStatusService = async (userId, entryId, payload) => {
  await assertPermission(userId, 'update_pm_status');

  const db = getDb();

  const validStatuses = ['open', 'ack', 'in_progress', 'resolved', 'closed'];
  const { status } = payload;

  if (!status || !validStatuses.includes(status)) {
    const error = new Error('Invalid status. Valid statuses: ' + validStatuses.join(', '));
    error.statusCode = 400;
    throw error;
  }

  // Get current status
  const getStatusQuery = `SELECT pm_status FROM pm_entry_operator WHERE id = $1`;
  const { rows: currentRows } = await db.query(getStatusQuery, [entryId]);

  if (currentRows.length === 0) {
    const error = new Error('PM entry not found');
    error.statusCode = 404;
    throw error;
  }

  const currentStatus = currentRows[0].pm_status;

  // Validate status transition
  const validTransitions = {
    open: ['ack'],
    ack: ['in_progress'],
    in_progress: ['resolved'],
    resolved: ['closed'],
    closed: [], // Cannot transition from closed
  };

  if (!validTransitions[currentStatus]?.includes(status)) {
    const error = new Error(`Invalid status transition from ${currentStatus} to ${status}`);
    error.statusCode = 400;
    throw error;
  }

  const updateQuery = `
    UPDATE pm_entry_operator
    SET pm_status = $1
    WHERE id = $2
    RETURNING id
  `;

  const { rows } = await db.query(updateQuery, [status, entryId]);
  if (rows.length === 0) {
    const error = new Error('PM entry not found');
    error.statusCode = 404;
    throw error;
  }

  return { id: rows[0].id, pm_status: status };
};

const updatePmEntryService = async (userId, entryId, payload) => {
  await assertPermission(userId, 'update_pm_entry');

  const db = getDb();

  const allowedFields = [
    'shift_id',
    'entry_date',
    'entry_time',
    'operator_name',
    'key_issue',
    'nature_of_activity',
    'note',
    'pm_status',
  ];

  const updates = {};
  for (const f of allowedFields) {
    if (payload[f] !== undefined) updates[f] = payload[f] === '' ? null : payload[f];
  }

  if (!Object.keys(updates).length) {
    const error = new Error('No valid fields to update');
    error.statusCode = 400;
    throw error;
  }

  // If status is being updated, validate transition
  if (updates.pm_status) {
    const validStatuses = ['open', 'ack', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(updates.pm_status)) {
      const error = new Error('Invalid status. Valid statuses: ' + validStatuses.join(', '));
      error.statusCode = 400;
      throw error;
    }

    // Get current status
    const getStatusQuery = `SELECT pm_status FROM pm_entry_operator WHERE id = $1`;
    const { rows: currentRows } = await db.query(getStatusQuery, [entryId]);

    if (currentRows.length === 0) {
      const error = new Error('PM entry not found');
      error.statusCode = 404;
      throw error;
    }

    const currentStatus = currentRows[0].pm_status;

    // Validate status transition
    const validTransitions = {
      open: ['ack'],
      ack: ['in_progress'],
      in_progress: ['resolved'],
      resolved: ['closed'],
      closed: [], // Cannot transition from closed
    };

    if (!validTransitions[currentStatus]?.includes(updates.pm_status)) {
      const error = new Error(
        `Invalid status transition from ${currentStatus} to ${updates.pm_status}`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const setClauses = [];
  const values = [];

  Object.entries(updates).forEach(([k, v]) => {
    values.push(v);
    setClauses.push(`${k} = $${values.length}`);
  });

  values.push(entryId);

  const updateQuery = `
    UPDATE pm_entry_operator
    SET ${setClauses.join(', ')}
    WHERE id = $${values.length}
    RETURNING *
  `;

  const { rows } = await db.query(updateQuery, values);
  if (rows.length === 0) {
    const error = new Error('PM entry not found');
    error.statusCode = 404;
    throw error;
  }

  const result = rows[0];
  if (result) {
    result.pm_id = result.id;
  }
  return result;
};

const listShiftsService = async (userId) => {
  // No permission check needed - shifts are reference data
  const db = getDb();

  const query = `
    SELECT shift_id, shift_from, shift_to, description
    FROM shift_table
    ORDER BY shift_id ASC
  `;

  const { rows } = await db.query(query);
  return rows;
};

// ==================== PM ENGINEER SERVICES ====================

const createPmEngineerService = async (userId, payload) => {
  await assertPermission(userId, 'create_pm_engineer');

  const required = ['pm_operator_id'];
  for (const k of required) {
    if (!payload[k]) {
      const error = new Error(`${k} is required`);
      error.statusCode = 400;
      throw error;
    }
  }

  const db = getDb();

  // Check if engineer record already exists
  const checkQuery = `
    SELECT pm_operator_id FROM pm_entry_engineer WHERE pm_operator_id = $1 LIMIT 1
  `;
  const { rows: existingRows } = await db.query(checkQuery, [payload.pm_operator_id]);

  if (existingRows.length > 0) {
    // UPDATE existing record
    const allowedFields = [
      'action_taken',
      'engineer_findings',
      'job_start',
      'job_completion_date',
      'responsible_person',
      'spare_usage_id',
    ];

    const updates = {};
    for (const f of allowedFields) {
      if (payload[f] !== undefined) updates[f] = payload[f] === '' ? null : payload[f];
    }

    const setClauses = [];
    const values = [];

    Object.entries(updates).forEach(([k, v]) => {
      values.push(v);
      setClauses.push(`${k} = $${values.length}`);
    });

    values.push(payload.pm_operator_id);

    const updateQuery = `
      UPDATE pm_entry_engineer
      SET ${setClauses.join(', ')}
      WHERE pm_operator_id = $${values.length}
      RETURNING pm_operator_id
    `;

    await db.query(updateQuery, values);
  } else {
    // INSERT new record
    const insertFields = ['pm_operator_id'];
    const values = [payload.pm_operator_id];

    const allowedFields = [
      'action_taken',
      'engineer_findings',
      'job_start',
      'job_completion_date',
      'responsible_person',
      'spare_usage_id',
    ];

    for (const field of allowedFields) {
      if (payload[field] !== undefined) {
        insertFields.push(field);
        values.push(payload[field] === '' ? null : payload[field]);
      }
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const fieldNames = insertFields.join(', ');

    const insertQuery = `
      INSERT INTO pm_entry_engineer (${fieldNames})
      VALUES (${placeholders})
      RETURNING pm_operator_id
    `;

    await db.query(insertQuery, values);
  }

  // Update pm_entry_operator status based on engineer actions
  let newStatus = null;
  if (payload.job_start) {
    newStatus = 'in_progress';
  } else if (payload.job_completion_date) {
    newStatus = 'closed';

    // Insert into pm_compliance
    const getPmEntryQuery = `
      SELECT pm_code, asset_id, entry_date, shift_id
    FROM pm_entry_operator WHERE id = $1
    `;
    const { rows: pmEntryRows } = await db.query(getPmEntryQuery, [payload.pm_operator_id]);
    const pmEntry = pmEntryRows[0];

    if (pmEntry) {
      // Get pm_schedule_id from pm_entry_operator if it exists, or find by asset_id
      const getScheduleQuery = `
        SELECT id FROM pm_schedule 
        WHERE asset_id = $1 AND status != 'completed'
        ORDER BY next_pm_date ASC
        LIMIT 1
      `;
      const { rows: scheduleRows } = await db.query(getScheduleQuery, [pmEntry.asset_id]);
      const scheduleId = scheduleRows.length > 0 ? scheduleRows[0].id : null;

      const complianceInsertQuery = `
        INSERT INTO pm_compliance (
          pm_schedule_id,
          pm_code,
          asset_id,
          pm_date,
          shift_id,
          remarks,
          responsible_person
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      await db.query(complianceInsertQuery, [
        scheduleId,
        pmEntry.pm_code,
        pmEntry.asset_id,
        pmEntry.entry_date,
        pmEntry.shift_id,
        payload.engineer_findings || payload.action_taken || null,
        payload.responsible_person || null,
      ]);

      // Update pm_schedule
      if (scheduleId) {
        const today = new Date().toISOString().slice(0, 10);
        const getScheduleIntervalQuery = `SELECT pm_frequency_interval FROM pm_schedule WHERE id = $1`;
        const { rows: intervalRows } = await db.query(getScheduleIntervalQuery, [scheduleId]);
        const intervalStr = intervalRows[0]?.pm_frequency_interval || '30 days';

        const nextDate = new Date(today);
        if (intervalStr.includes('day')) {
          const days = parseInt(intervalStr) || 30;
          nextDate.setDate(nextDate.getDate() + days);
        } else if (intervalStr.includes('month')) {
          const months = parseInt(intervalStr) || 1;
          nextDate.setMonth(nextDate.getMonth() + months);
        } else if (intervalStr.includes('week')) {
          const weeks = parseInt(intervalStr) || 1;
          nextDate.setDate(nextDate.getDate() + weeks * 7);
        }

        const nextPmDate = nextDate.toISOString().slice(0, 10);

        const updateScheduleQuery = `
          UPDATE pm_schedule
          SET last_pm_date = $1,
              next_pm_date = $2,
              status = 'completed'
          WHERE id = $3
        `;
        await db.query(updateScheduleQuery, [today, nextPmDate, scheduleId]);
      }
    }
  }

  if (newStatus) {
    const updateStatusQuery = `
      UPDATE pm_entry_operator
      SET pm_status = $1
      WHERE id = $2
    `;
    await db.query(updateStatusQuery, [newStatus, payload.pm_operator_id]);
  }

  return { pm_operator_id: payload.pm_operator_id };
};

const getPmEngineerService = async (userId, pmOperatorId) => {
  await assertPermission(userId, 'view_pm_engineer');

  const db = getDb();

  const query = `
    SELECT *
    FROM pm_entry_engineer
    WHERE pm_operator_id = $1
    LIMIT 1
  `;

  const { rows } = await db.query(query, [pmOperatorId]);
  return rows[0] || null;
};

// ==================== PM COMPLIANCE SERVICES ====================

const listPmComplianceService = async (userId, { start_date, end_date, asset_id, bu_name } = {}) => {
  await assertPermission(userId, 'view_pm_compliance');

  const db = getDb();
  const where = [];
  const values = [];

  if (start_date) {
    values.push(start_date);
    where.push(`pc.pm_date >= $${values.length}`);
  }

  if (end_date) {
    values.push(end_date);
    where.push(`pc.pm_date <= $${values.length}`);
  }

  if (asset_id) {
    values.push(asset_id);
    where.push(`pc.asset_id = $${values.length}`);
  }

  if (bu_name) {
    values.push(`%${bu_name}%`);
    where.push(`a.bu_name ILIKE $${values.length}`);
  }

  const query = `
    SELECT
      pc.id,
      pc.pm_schedule_id,
      ps.pm_title,
      pc.pm_code,
      pc.asset_id,
      a.asset_code,
      a.asset_name,
      a.bu_name,
      pc.pm_date,
      pc.shift_id,
      pc.remarks,
      pc.responsible_person,
      u.full_name as responsible_person_name
    FROM pm_compliance pc
    LEFT JOIN pm_schedule ps ON ps.id = pc.pm_schedule_id
    LEFT JOIN asset_master a ON a.id = pc.asset_id
    LEFT JOIN users u ON u.id = pc.responsible_person
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY pc.pm_date DESC, pc.id DESC
  `;

  const { rows } = await db.query(query, values);
  return rows;
};

// ==================== PM STATS SERVICES ====================

const getPmStatsService = async (userId) => {
  await assertPermission(userId, 'view_pm_schedule');

  const db = getDb();

  const query = `
    SELECT
      COUNT(*)::int AS total_scheduled,
      COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
      COUNT(*) FILTER (WHERE next_pm_date < CURRENT_DATE AND status != 'completed')::int AS overdue,
      COUNT(*) FILTER (WHERE status = 'completed' AND last_pm_date >= DATE_TRUNC('month', CURRENT_DATE))::int AS completed_this_month
    FROM pm_schedule
  `;

  const { rows } = await db.query(query);
  const stats = rows[0] || {
    total_scheduled: 0,
    scheduled: 0,
    completed: 0,
    overdue: 0,
    completed_this_month: 0,
  };

  // Calculate compliance percentage
  const complianceQuery = `
    SELECT
      COUNT(*)::int AS total_completed,
      COUNT(DISTINCT asset_id)::int AS unique_assets
    FROM pm_compliance
    WHERE pm_date >= DATE_TRUNC('month', CURRENT_DATE)
  `;
  const { rows: complianceRows } = await db.query(complianceQuery);
  const compliance = complianceRows[0] || { total_completed: 0, unique_assets: 0 };

  stats.compliance_percentage = stats.total_scheduled > 0
    ? Math.round((stats.completed / stats.total_scheduled) * 100)
    : 0;

  return stats;
};

module.exports = {
  userHasPermission,
  assertPermission,
  // PM Schedule
  createPmScheduleService,
  listPmSchedulesService,
  updatePmScheduleService,
  deletePmScheduleService,
  // PM Entry
  createPmEntryService,
  listPmEntriesService,
  updatePmEntryStatusService,
  updatePmEntryService,
  // PM Engineer
  createPmEngineerService,
  getPmEngineerService,
  // PM Compliance
  listPmComplianceService,
  // PM Stats
  getPmStatsService,
  // Shifts
  listShiftsService,
};
