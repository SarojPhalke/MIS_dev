const { initPool } = require('./pg.config');

let pool;

const configureDatabase = () => {
  if (!pool) {
    pool = initPool();
  }
  return pool;
};

const getDb = () => {
  if (!pool) {
    throw new Error('Database pool is not initialized. Call configureDatabase() first.');
  }
  return pool;
};

module.exports = {
  configureDatabase,
  getDb,
};

