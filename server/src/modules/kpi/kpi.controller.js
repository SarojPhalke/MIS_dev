const { getDb } = require('../../config');
const { successResponse } = require('../../utils/response.util');

const buildKpiWhereClause = (queryParams = {}) => {
  const { asset_id, start_date, end_date } = queryParams;
  const conditions = [];
  const values = [];

  if (asset_id) {
    values.push(asset_id);
    conditions.push(`asset_id = $${values.length}`);
  }

  if (start_date) {
    values.push(start_date);
    conditions.push(`date >= $${values.length}`);
  }

  if (end_date) {
    values.push(end_date);
    conditions.push(`date <= $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, values };
};

// Some views (like summary) may not expose a generic "date" column; adjust to use period_start/period_end if needed
const buildSummaryWhereClause = (queryParams = {}) => {
  const { asset_id, start_date, end_date } = queryParams;
  const conditions = [];
  const values = [];

  if (asset_id) {
    values.push(asset_id);
    conditions.push(`asset_id = $${values.length}`);
  }

  if (start_date) {
    values.push(start_date);
    conditions.push(`period_start >= $${values.length}`);
  }

  if (end_date) {
    values.push(end_date);
    conditions.push(`period_end <= $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, values };
};

const getKpiSummary = async (req, res, next) => {
  try {
    const db = getDb();
    const { whereClause, values } = buildSummaryWhereClause(req.query);
    const query = `SELECT * FROM view_asset_kpi_summary ${whereClause} ORDER BY asset_code ASC`;
    const { rows } = await db.query(query, values);
    return successResponse(res, rows);
  } catch (err) {
    return next(err);
  }
};

const getMTTR = async (req, res, next) => {
  try {
    const db = getDb();
    const { whereClause, values } = buildKpiWhereClause(req.query);
    const query = `SELECT * FROM kpi_mttr ${whereClause} ORDER BY date ASC`;
    const { rows } = await db.query(query, values);
    return successResponse(res, rows);
  } catch (err) {
    return next(err);
  }
};

const getMTBF = async (req, res, next) => {
  try {
    const db = getDb();
    const { whereClause, values } = buildKpiWhereClause(req.query);
    const query = `SELECT * FROM kpi_mtbf ${whereClause} ORDER BY date ASC`;
    const { rows } = await db.query(query, values);
    return successResponse(res, rows);
  } catch (err) {
    return next(err);
  }
};

const getAvailability = async (req, res, next) => {
  try {
    const db = getDb();
    const { whereClause, values } = buildKpiWhereClause(req.query);
    const query = `SELECT * FROM kpi_machine_availability ${whereClause} ORDER BY date ASC`;
    const { rows } = await db.query(query, values);
    return successResponse(res, rows);
  } catch (err) {
    return next(err);
  }
};

const getUptime = async (req, res, next) => {
  try {
    const db = getDb();
    const { whereClause, values } = buildKpiWhereClause(req.query);
    const query = `SELECT * FROM kpi_uptime ${whereClause} ORDER BY date ASC`;
    const { rows } = await db.query(query, values);
    return successResponse(res, rows);
  } catch (err) {
    return next(err);
  }
};

const getSpareCost = async (req, res, next) => {
  try {
    const db = getDb();
    const { whereClause, values } = buildKpiWhereClause(req.query);
    const query = `SELECT * FROM kpi_spare_cost ${whereClause} ORDER BY date ASC`;
    const { rows } = await db.query(query, values);
    return successResponse(res, rows);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getKpiSummary,
  getMTTR,
  getMTBF,
  getAvailability,
  getUptime,
  getSpareCost,
};

