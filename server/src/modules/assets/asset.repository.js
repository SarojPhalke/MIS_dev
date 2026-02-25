const { getDb } = require('../../config');

// assets_master table repository
const createAsset = async (payload) => {
  const db = getDb();
  const {
    asset_code,
    asset_name,
    asset_type,
    location,
    criticality,
    manufacturer,
  } = payload;

  const query = `
    INSERT INTO assets_master (
      asset_code,
      asset_name,
      asset_type,
      location,
      criticality,
      manufacturer
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const values = [asset_code, asset_name, asset_type, location, criticality, manufacturer];
  const { rows } = await db.query(query, values);
  return rows[0];
};

module.exports = {
  createAsset,
};

