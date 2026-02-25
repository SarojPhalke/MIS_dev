const express = require('express');
const rateLimit = require('express-rate-limit');

const authRoutes = require('../modules/auth/auth.routes');
const userRoutes = require('../modules/users/user.routes');
const roleRoutes = require('../modules/roles/role.routes');
const assetRoutes = require('../modules/assets/asset.routes');
const breakdownRoutes = require('../modules/breakdown/breakdown.routes');
const preventiveRoutes = require('../modules/preventive/preventive.routes');
const sparesRoutes = require('../modules/spares/spares.routes');
const dashboardRoutes = require('../modules/dashboard/dashboard.routes');

const router = express.Router();

const authRateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Base route structure
router.use('/auth', authRateLimiter, authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/assets', assetRoutes);
router.use('/breakdowns', breakdownRoutes);
router.use('/pm', preventiveRoutes);
router.use('/spares', sparesRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;

