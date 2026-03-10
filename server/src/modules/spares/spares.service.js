const { getDb } = require('../../config');

// Permission helpers (same pattern as breakdown / preventive modules)
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

// ==================== SPARE INVENTORY SERVICES ====================

const listSparesService = async (userId) => {
  await assertPermission(userId, 'view_spares_module');

  const db = getDb();
  const query = `
    SELECT *
    FROM spare_parts_inventory
    ORDER BY part_name ASC
  `;

  const { rows } = await db.query(query);
  return rows;
};

const createSpareService = async (userId, payload) => {
  await assertPermission(userId, 'create_spare');

  const required = ['part_code', 'part_name'];
  for (const k of required) {
    if (!payload[k]) {
      const err = new Error(`${k} is required`);
      err.statusCode = 400;
      throw err;
    }
  }

  const db = getDb();

  const insertQuery = `
    INSERT INTO spare_parts_inventory (
      part_code,
      part_name,
      part_no,
      min_level,
      reorder_level,
      current_stock,
      unit_cost,
      supplier,
      spare_location,
      bu_name,
      created_at,
      last_updated,
      last_updated_by
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      NOW(),
      NOW(),
      $11
    )
    RETURNING *
  `;

  const values = [
    payload.part_code,
    payload.part_name,
    payload.part_no || null,
    Number.isFinite(Number(payload.min_level)) ? Number(payload.min_level) : 0,
    Number.isFinite(Number(payload.reorder_level)) ? Number(payload.reorder_level) : 0,
    Number.isFinite(Number(payload.current_stock)) ? Number(payload.current_stock) : 0,
    payload.unit_cost !== undefined ? Number(payload.unit_cost) : null,
    payload.supplier || null,
    payload.spare_location || null,
    payload.bu_name || null,
    userId,
  ];

  const { rows } = await db.query(insertQuery, values);
  return rows[0];
};

const updateSpareService = async (userId, spareId, payload) => {
  await assertPermission(userId, 'edit_spare');

  const db = getDb();

  const allowedFields = [
    'part_code',
    'part_name',
    'part_no',
    'min_level',
    'reorder_level',
    'current_stock',
    'unit_cost',
    'supplier',
    'spare_location',
    'bu_name',
  ];

  const updates = {};
  for (const f of allowedFields) {
    if (payload[f] !== undefined) updates[f] = payload[f];
  }

  if (!Object.keys(updates).length) {
    const err = new Error('No valid fields to update');
    err.statusCode = 400;
    throw err;
  }

  const setClauses = [];
  const values = [];

  Object.entries(updates).forEach(([k, v]) => {
    let val = v;
    if (['min_level', 'reorder_level', 'current_stock', 'unit_cost'].includes(k)) {
      val = v !== null && v !== undefined ? Number(v) : null;
    }
    values.push(val === '' ? null : val);
    setClauses.push(`${k} = $${values.length}`);
  });

  // last_updated, last_updated_by
  values.push(userId);
  setClauses.push(`last_updated_by = $${values.length}`);
  setClauses.push('last_updated = NOW()');

  values.push(spareId);

  const updateQuery = `
    UPDATE spare_parts_inventory
       SET ${setClauses.join(', ')}
     WHERE id = $${values.length}
     RETURNING *
  `;

  const { rows } = await db.query(updateQuery, values);
  if (!rows.length) {
    const err = new Error('Spare not found');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

const deleteSpareService = async (userId, spareId) => {
  await assertPermission(userId, 'delete_spare');

  const db = getDb();

  // Check if spare is used in transactions
  const checkQuery = `
    SELECT 1
    FROM spare_transactions
    WHERE part_id = $1
    LIMIT 1
  `;
  const { rows: usedRows } = await db.query(checkQuery, [spareId]);
  if (usedRows.length) {
    const err = new Error('Cannot delete spare: transactions exist');
    err.statusCode = 400;
    throw err;
  }

  const deleteQuery = `
    DELETE FROM spare_parts_inventory
    WHERE id = $1
    RETURNING id
  `;
  const { rows } = await db.query(deleteQuery, [spareId]);
  if (!rows.length) {
    const err = new Error('Spare not found');
    err.statusCode = 404;
    throw err;
  }

  return { id: rows[0].id };
};

// ==================== STOCK MOVEMENT HELPERS ====================

const issueSpareService = async (userId, payload) => {
  await assertPermission(userId, 'issue_spare');

  const required = ['part_id', 'quantity'];
  for (const k of required) {
    if (!payload[k]) {
      const err = new Error(`${k} is required`);
      err.statusCode = 400;
      throw err;
    }
  }

  const qty = Number(payload.quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    const err = new Error('quantity must be a positive number');
    err.statusCode = 400;
    throw err;
  }

  const db = getDb();
  try {
    await db.query('BEGIN');

    // Lock the spare row
    const spareQuery = `
      SELECT id, part_code, part_name, current_stock
      FROM spare_parts_inventory
      WHERE id = $1
      FOR UPDATE
    `;
    const { rows: spareRows } = await db.query(spareQuery, [payload.part_id]);
    if (!spareRows.length) {
      const err = new Error('Spare not found');
      err.statusCode = 404;
      throw err;
    }

    const spare = spareRows[0];
    if (Number(spare.current_stock) < qty) {
      const err = new Error('Insufficient stock');
      err.statusCode = 400;
      throw err;
    }

    const newStock = Number(spare.current_stock) - qty;

    // Insert into spare_usage
    const usageInsertQuery = `
      INSERT INTO spare_usage (
        part_id,
        part_code,
        quantity,
        asset_id,
        pm_bd_id,
        pm_bd_type,
        remarks,
        created_by,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
      RETURNING *
    `;
    await db.query(usageInsertQuery, [
      payload.part_id,
      spare.part_code, // denormalized part_code for reporting
      qty,
      payload.asset_id || null,
      payload.pm_bd_id || null,
      payload.pm_bd_type || null,
      payload.purpose || null, // purpose from frontend goes into remarks
      userId,
    ]);

    // Insert into spare_transactions
    const transInsertQuery = `
      INSERT INTO spare_transactions (
        part_id,
        part_code,
        quantity,
        direction,
        balance_after,
        asset_id,
        pm_bd_id,
        pm_bd_type,
        purpose,
        created_by,
        created_at
      )
      VALUES ($1,$2,$3,'issue',$4,$5,$6,$7,$8,$9,NOW())
      RETURNING *
    `;
    const { rows: transRows } = await db.query(transInsertQuery, [
      payload.part_id,
      spare.part_code, // denormalized part_code for reporting
      qty,
      newStock,
      payload.asset_id || null,
      payload.pm_bd_id || null,
      payload.pm_bd_type || null,
      payload.purpose || null,
      userId,
    ]);

    // Update stock
    const stockUpdateQuery = `
      UPDATE spare_parts_inventory
      SET current_stock = $1,
          last_updated = NOW(),
          last_updated_by = $2
      WHERE id = $3
    `;
    await db.query(stockUpdateQuery, [newStock, userId, payload.part_id]);

    await db.query('COMMIT');
    return { transaction: transRows[0], current_stock: newStock };
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
};

const returnSpareService = async (userId, payload) => {
  await assertPermission(userId, 'return_spare');

  const required = ['part_id', 'quantity'];
  for (const k of required) {
    if (!payload[k]) {
      const err = new Error(`${k} is required`);
      err.statusCode = 400;
      throw err;
    }
  }

  const qty = Number(payload.quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    const err = new Error('quantity must be a positive number');
    err.statusCode = 400;
    throw err;
  }

  // Normalize pm_bd_type to lowercase (enum expects 'pm' or 'bd')
  if (payload.pm_bd_type) {
    payload.pm_bd_type = payload.pm_bd_type.toLowerCase();
    if (!['pm', 'bd'].includes(payload.pm_bd_type)) {
      const err = new Error('pm_bd_type must be either "pm" or "bd"');
      err.statusCode = 400;
      throw err;
    }
  }

  const db = getDb();
  try {
    await db.query('BEGIN');

    const spareQuery = `
      SELECT id, part_code, part_name, current_stock
      FROM spare_parts_inventory
      WHERE id = $1
      FOR UPDATE
    `;
    const { rows: spareRows } = await db.query(spareQuery, [payload.part_id]);
    if (!spareRows.length) {
      const err = new Error('Spare not found');
      err.statusCode = 404;
      throw err;
    }

    const spare = spareRows[0];
    const newStock = Number(spare.current_stock) + qty;

    // Insert into spare_transactions (no usage entry for returns)
    const transInsertQuery = `
      INSERT INTO spare_transactions (
        part_id,
        part_code,
        quantity,
        direction,
        balance_after,
        asset_id,
        pm_bd_id,
        pm_bd_type,
        purpose,
        created_by,
        created_at
      )
      VALUES ($1,$2,$3,'return',$4,$5,$6,$7,$8,$9,NOW())
      RETURNING *
    `;
    const { rows: transRows } = await db.query(transInsertQuery, [
      payload.part_id,
      spare.part_code, // denormalized part_code for reporting
      qty,
      newStock,
      payload.asset_id || null,
      payload.pm_bd_id || null,
      payload.pm_bd_type || null,
      payload.purpose || null,
      userId,
    ]);

    // Update stock
    const stockUpdateQuery = `
      UPDATE spare_parts_inventory
      SET current_stock = $1,
          last_updated = NOW(),
          last_updated_by = $2
      WHERE id = $3
    `;
    await db.query(stockUpdateQuery, [newStock, userId, payload.part_id]);

    await db.query('COMMIT');
    return { transaction: transRows[0], current_stock: newStock };
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
};

// ==================== REPORTING SERVICES ====================

const listSpareTransactionsService = async (userId) => {
  await assertPermission(userId, 'view_spare_transactions');

  const db = getDb();
  const query = `
    SELECT
      t.created_at AS transaction_date,
      p.part_code,
      p.part_name,
      t.direction,
      t.quantity,
      t.balance_after,
      a.asset_code,
      t.purpose
    FROM spare_transactions t
    LEFT JOIN spare_parts_inventory p ON p.id = t.part_id
    LEFT JOIN asset_master a ON a.id = t.asset_id
    ORDER BY t.created_at DESC, t.id DESC
  `;

  const { rows } = await db.query(query);
  return rows;
};

const listLowStockSparesService = async (userId) => {
  await assertPermission(userId, 'view_spares_module');

  const db = getDb();
  const query = `
    SELECT *
    FROM spare_parts_inventory
    WHERE current_stock <= min_level
    ORDER BY part_name ASC
  `;

  const { rows } = await db.query(query);
  return rows;
};

module.exports = {
  userHasPermission,
  assertPermission,
  listSparesService,
  createSpareService,
  updateSpareService,
  deleteSpareService,
  issueSpareService,
  returnSpareService,
  listSpareTransactionsService,
  listLowStockSparesService,
};

