const { successResponse } = require('../../utils/response.util');
const { logBreakdownService } = require('./breakdown.service');

const logBreakdownController = async (req, res, next) => {
  try {
    const payload = req.body;
    const breakdown = await logBreakdownService(payload, req.user);
    return successResponse(res, breakdown, 'Breakdown logged successfully', 201);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  logBreakdownController,
};

