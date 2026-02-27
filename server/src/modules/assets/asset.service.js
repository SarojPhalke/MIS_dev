const { getDb } = require('../../config');
const { createAsset } = require('./asset.repository');

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

const getEnumLabelsForColumn = async (tableName, columnName) => {
  const db = getDb();

  const udtRes = await db.query(
    `
      SELECT udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1
    `,
    [tableName, columnName]
  );

  const udt = udtRes.rows[0]?.udt_name;
  if (!udt) return null;

  const enumRes = await db.query(
    `
      SELECT e.enumlabel AS label
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = $1
      ORDER BY e.enumsortorder
    `,
    [udt]
  );

  if (!enumRes.rows.length) return null;
  return enumRes.rows.map((r) => r.label);
};

const validateEnumValue = async (tableName, columnName, value) => {
  if (value === undefined || value === null) return;
  const labels = await getEnumLabelsForColumn(tableName, columnName);
  if (!labels) return; // if not enum, skip

  if (!labels.includes(value)) {
    const error = new Error(`Invalid ${columnName}. Must be one of: ${labels.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
};

const listAssetsService = async (userId, { status, search } = {}) => {
  await assertPermission(userId, 'view_assets');

  const db = getDb();
  const where = [];
  const values = [];

  if (status) {
    values.push(status);
    where.push(`asset_status = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    const p = `$${values.length}`;
    where.push(`(asset_name ILIKE ${p} OR asset_code ILIKE ${p})`);
  }

  const query = `
    SELECT
      id,
      asset_code,
      asset_name,
      asset_location,
      bu_name,
      asset_type,
      manufacturer,
      model_number,
      model_name,
      install_date,
      asset_status,
      warranty_expiry
    FROM asset_master
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY asset_name ASC
  `;

  const { rows } = await db.query(query, values);
  return rows;
};

const getAssetStatsService = async (userId) => {
  await assertPermission(userId, 'view_assets');

  const db = getDb();
  const query = `
    SELECT
      COUNT(*)::int AS "totalAssets",
      COUNT(*) FILTER (WHERE asset_status::text = 'active')::int AS "active",
      COUNT(*) FILTER (WHERE asset_status::text = 'inactive')::int AS "inactive",
      COUNT(*) FILTER (
        WHERE asset_status::text IN ('under_amc', 'under amc', 'amc')
      )::int AS "under_amc",
      COUNT(*) FILTER (WHERE asset_status::text = 'disposed')::int AS "disposed"
    FROM asset_master
  `;

  const { rows } = await db.query(query);
  return rows[0] || {
    totalAssets: 0,
    active: 0,
    inactive: 0,
    under_amc: 0,
    disposed: 0,
  };
};

const createAssetService = async (userId, payload) => {
  await assertPermission(userId, 'create_asset');

  const required = ['asset_code', 'asset_name'];
  for (const k of required) {
    if (!payload[k]) {
      const error = new Error(`${k} is required`);
      error.statusCode = 400;
      throw error;
    }
  }

  // Enum validation (introspected from DB)
  await validateEnumValue('asset_master', 'asset_type', payload.asset_type);
  await validateEnumValue('asset_master', 'asset_status', payload.asset_status);

  const db = getDb();

  // Unique checks (asset_code, qr_code)
  const dupQuery = `
    SELECT 1
    FROM asset_master
    WHERE asset_code = $1
       OR qr_code = $2
    LIMIT 1
  `;
  const { rows: dupRows } = await db.query(dupQuery, [payload.asset_code, payload.qr_code || null]);
  if (dupRows.length) {
    const error = new Error('asset_code or qr_code already exists');
    error.statusCode = 409;
    throw error;
  }

  const insertQuery = `
    INSERT INTO asset_master (
      asset_code,
      asset_name,
      asset_location,
      bu_name,
      asset_type,
      manufacturer,
      model_number,
      model_name,
      install_date,
      asset_status,
      warranty_expiry,
      qr_code,
      created_by
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING
      asset_code,
      asset_name,
      asset_location,
      bu_name,
      asset_type,
      manufacturer,
      model_number,
      model_name,
      install_date,
      asset_status,
      warranty_expiry
  `;

  const values = [
    payload.asset_code,
    payload.asset_name,
    payload.asset_location || null,
    payload.bu_name || null,
    payload.asset_type || null,
    payload.manufacturer || null,
    payload.model_number || null,
    payload.model_name || null,
    payload.install_date || null,
    payload.asset_status || null,
    payload.warranty_expiry || null,
    payload.qr_code || null,
    userId,
  ];

  const { rows } = await db.query(insertQuery, values);
  return rows[0];
};

const updateAssetService = async (userId, assetId, payload) => {
  await assertPermission(userId, 'update_asset');

  // Only allow updating these fields
  const allowedFields = [
    'asset_name',
    'asset_location',
    'bu_name',
    'asset_type',
    'manufacturer',
    'model_number',
    'model_name',
    'install_date',
    'asset_status',
    'warranty_expiry',
    'qr_code',
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

  await validateEnumValue('asset_master', 'asset_type', updates.asset_type);
  await validateEnumValue('asset_master', 'asset_status', updates.asset_status);

  const db = getDb();

  if (updates.qr_code) {
    const dupQr = await db.query(
      `
        SELECT 1 FROM asset_master
        WHERE qr_code = $1 AND id <> $2
        LIMIT 1
      `,
      [updates.qr_code, assetId]
    );
    if (dupQr.rows.length) {
      const error = new Error('qr_code already exists');
      error.statusCode = 409;
      throw error;
    }
  }

  const setClauses = [];
  const values = [];

  Object.entries(updates).forEach(([k, v]) => {
    values.push(v === '' ? null : v);
    setClauses.push(`${k} = $${values.length}`);
  });

  values.push(userId);
  setClauses.push(`updated_by = $${values.length}`);
  setClauses.push(`updated_at = now()`);

  values.push(assetId);

  const updateQuery = `
    UPDATE asset_master
       SET ${setClauses.join(', ')}
     WHERE id = $${values.length}
  `;

  const res = await db.query(updateQuery, values);
  if (res.rowCount === 0) {
    const error = new Error('Asset not found');
    error.statusCode = 404;
    throw error;
  }
};

module.exports = {
  userHasPermission,
  listAssetsService,
  getAssetStatsService,
  createAssetService,
  updateAssetService,
};

