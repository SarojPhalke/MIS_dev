const { logBreakdown } = require('./breakdown.repository');

const logBreakdownService = async (payload, user) => {
  if (!payload.asset_id || !payload.breakdown_description) {
    const error = new Error('asset_id and breakdown_description are required');
    error.statusCode = 400;
    throw error;
  }

  const reported_by_role = payload.reported_by_role || 'OPERATOR';

  const breakdown = await logBreakdown({
    ...payload,
    reported_by_role,
    reporter_id: user.id,
  });

  return breakdown;
};

module.exports = {
  logBreakdownService,
};

