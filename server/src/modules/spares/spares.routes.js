const express = require('express');

const { authenticate } = require('../../middlewares/auth.middleware');
const {
  listSparesController,
  createSpareController,
  updateSpareController,
  deleteSpareController,
  issueSpareController,
  returnSpareController,
  listSpareTransactionsController,
  listLowStockSparesController,
} = require('./spares.controller');

const router = express.Router();

// All spares routes require authentication; fine-grained permissions are checked in services
router.use(authenticate);

// Inventory
router.get('/', listSparesController);
router.post('/', createSpareController);
router.put('/:id', updateSpareController);
router.delete('/:id', deleteSpareController);

// Stock movements
router.post('/issue', issueSpareController);
router.post('/return', returnSpareController);

// Reporting
router.get('/transactions', listSpareTransactionsController);
router.get('/low-stock', listLowStockSparesController);

module.exports = router;

