const {
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
} = require('./preventive.service');

// ==================== PM SCHEDULE CONTROLLERS ====================

const createPmScheduleController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const payload = req.body;
    const created = await createPmScheduleService(userId, payload);
    return res.status(201).json({
      success: true,
      message: 'PM schedule created successfully',
      data: created,
    });
  } catch (err) {
    return next(err);
  }
};

const listPmSchedulesController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const schedules = await listPmSchedulesService(userId);
    return res.status(200).json({ success: true, data: schedules });
  } catch (err) {
    return next(err);
  }
};

const updatePmScheduleController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updated = await updatePmScheduleService(userId, id, req.body);
    return res.status(200).json({
      success: true,
      message: 'PM schedule updated successfully',
      data: updated,
    });
  } catch (err) {
    return next(err);
  }
};

const deletePmScheduleController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await deletePmScheduleService(userId, id);
    return res.status(200).json({
      success: true,
      message: 'PM schedule deleted successfully',
    });
  } catch (err) {
    return next(err);
  }
};

// ==================== PM ENTRY CONTROLLERS ====================

const createPmEntryController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const payload = req.body;
    const created = await createPmEntryService(userId, payload);
    return res.status(201).json({
      success: true,
      message: 'PM entry created successfully',
      data: created,
    });
  } catch (err) {
    return next(err);
  }
};

const listPmEntriesController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, asset_id, shift_id } = req.query;
    const entries = await listPmEntriesService(userId, { status, asset_id, shift_id });
    return res.status(200).json({ success: true, data: entries });
  } catch (err) {
    return next(err);
  }
};

const updatePmEntryStatusController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updated = await updatePmEntryStatusService(userId, id, req.body);
    return res.status(200).json({
      success: true,
      message: 'PM entry status updated successfully',
      data: updated,
    });
  } catch (err) {
    return next(err);
  }
};

const updatePmEntryController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updated = await updatePmEntryService(userId, id, req.body);
    return res.status(200).json({
      success: true,
      message: 'PM entry updated successfully',
      data: updated,
    });
  } catch (err) {
    return next(err);
  }
};

// ==================== PM ENGINEER CONTROLLERS ====================

const createPmEngineerController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const payload = req.body;
    const created = await createPmEngineerService(userId, payload);
    return res.status(201).json({
      success: true,
      message: 'PM engineer action saved successfully',
      data: created,
    });
  } catch (err) {
    return next(err);
  }
};

const getPmEngineerController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pm_operator_id } = req.params;
    const engineer = await getPmEngineerService(userId, pm_operator_id);
    return res.status(200).json({ success: true, data: engineer });
  } catch (err) {
    return next(err);
  }
};

const listShiftsController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const shifts = await listShiftsService(userId);
    return res.status(200).json({ success: true, data: shifts });
  } catch (err) {
    return next(err);
  }
};

// ==================== PM COMPLIANCE CONTROLLERS ====================

const listPmComplianceController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date, asset_id, bu_name } = req.query;
    const compliance = await listPmComplianceService(userId, {
      start_date,
      end_date,
      asset_id,
      bu_name,
    });
    return res.status(200).json({ success: true, data: compliance });
  } catch (err) {
    return next(err);
  }
};

// ==================== PM STATS CONTROLLERS ====================

const getPmStatsController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stats = await getPmStatsService(userId);
    return res.status(200).json({ success: true, data: stats });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  // PM Schedule
  createPmScheduleController,
  listPmSchedulesController,
  updatePmScheduleController,
  deletePmScheduleController,
  // PM Entry
  createPmEntryController,
  listPmEntriesController,
  updatePmEntryStatusController,
  updatePmEntryController,
  // PM Engineer
  createPmEngineerController,
  getPmEngineerController,
  // PM Compliance
  listPmComplianceController,
  // PM Stats
  getPmStatsController,
  // Shifts
  listShiftsController,
};
