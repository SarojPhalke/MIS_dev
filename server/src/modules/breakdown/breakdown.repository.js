const { getDb } = require('../../config');

// Breakdown logging in daily_entry_operator / daily_entry_engineer
const logBreakdown = async (payload) => {
  const db = getDb();
  const {
    asset_id,
    breakdown_description,
    reported_by_role,
    reporter_id,
    start_time,
  } = payload;

  const table =
    reported_by_role === 'OPERATOR'
      ? 'daily_entry_operator'
      : 'daily_entry_engineer';

  const query = `
    INSERT INTO ${table} (
      asset_id,
      breakdown_description,
      reporter_id,
      start_time
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;

  const values = [asset_id, breakdown_description, reporter_id, start_time];
  const { rows } = await db.query(query, values);
  return rows[0];
};

module.exports = {
  logBreakdown,
};

