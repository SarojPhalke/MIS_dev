const express = require('express');

const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRole } = require('../../middlewares/rbac.middleware');
const {
  getUserStatsController,
  listUsersController,
  updateUserRoleController,
  deleteUserController,
  getUserFunctionsController,
  upsertUserFunctionController,
  deleteUserFunctionController,
} = require('./user.controller');

const router = express.Router();

// Admin-only user management APIs
router.use(authenticate, authorizeRole(['admin']));

router.get('/stats', getUserStatsController);
router.get('/', listUsersController);
router.put('/:id/role', updateUserRoleController);
router.delete('/:id', deleteUserController);

router.get('/:id/functions', getUserFunctionsController);
router.put('/:id/functions', upsertUserFunctionController);
router.delete('/:id/functions/:functionId', deleteUserFunctionController);

module.exports = router;

