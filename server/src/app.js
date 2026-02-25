const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { configureDatabase, getDb } = require('./config');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const app = express();

// Initialize DB (ensures Pool is created)
configureDatabase();

// Basic security middlewares
app.use(helmet());

const corsOptions = {
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true,
};
app.use(cors(corsOptions));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', routes);

// Health check - app only
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'MIS backend is running' });
});

// Health check - database connectivity
app.get('/health/db', async (req, res) => {
  try {
    const db = getDb();
    await db.query('SELECT 1');
    return res
      .status(200)
      .json({ status: 'ok', message: 'Database connection successful' });
  } catch (err) {
    // Do not leak internal details in response
    console.error('Database health check failed:', err);
    return res
      .status(500)
      .json({ status: 'error', message: 'Database connection failed' });
  }
});

// 404 handler
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;

