const { successResponse } = require('../../utils/response.util');
const {
  listBreakdownsService,
  getBreakdownStatsService,
  createBreakdownService,
  updateBreakdownMemoService,
  updateBreakdownStatusService,
  listResponsiblePeopleService,
} = require('./breakdown.service');

const listBreakdownsController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;
    const breakdowns = await listBreakdownsService(userId, { status });
    return res.status(200).json({ success: true, data: breakdowns });
  } catch (err) {
    return next(err);
  }
};

const getBreakdownStatsController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stats = await getBreakdownStatsService(userId);
    return res.status(200).json({ success: true, data: stats });
  } catch (err) {
    return next(err);
  }
};

const createBreakdownController = async (req, res, next) => {
  try {
    const payload = req.body;
    const created = await createBreakdownService(req.user.id, payload);
    return res.status(201).json({
      success: true,
      message: 'Breakdown created successfully',
      data: created,
    });
  } catch (err) {
    return next(err);
  }
};

const updateBreakdownMemoController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await updateBreakdownMemoService(userId, id, req.body);
    return res.status(200).json({ success: true, message: 'Breakdown memo updated successfully' });
  } catch (err) {
    return next(err);
  }
};

const updateBreakdownStatusController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await updateBreakdownStatusService(userId, id, req.body);
    return res.status(200).json({ success: true, message: 'Breakdown status updated successfully' });
  } catch (err) {
    return next(err);
  }
};

const listResponsiblePeopleController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const people = await listResponsiblePeopleService(userId);
    return res.status(200).json({ success: true, data: people });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  listBreakdownsController,
  getBreakdownStatsController,
  createBreakdownController,
  updateBreakdownMemoController,
  updateBreakdownStatusController,
  listResponsiblePeopleController,
};
