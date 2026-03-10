const cron = require('node-cron');
const { getDb } = require('../config');

/**
 * Daily cron job to update overdue PM schedules
 * Runs every day at midnight (00:00)
 */
const updateOverduePmSchedules = async () => {
  try {
    const db = getDb();
    
    const updateQuery = `
      UPDATE pm_schedule
      SET status = 'overdue'
      WHERE next_pm_date < CURRENT_DATE
        AND status != 'completed'
        AND status != 'overdue'
    `;

    const result = await db.query(updateQuery);
    console.log(`[PM Overdue Job] Updated ${result.rowCount} overdue PM schedules at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('[PM Overdue Job] Error updating overdue PM schedules:', error);
  }
};

// Schedule job to run daily at midnight (00:00)
// Cron format: minute hour day month day-of-week
// '0 0 * * *' = every day at 00:00
const startPmOverdueJob = () => {
  // Run immediately on startup (for testing/debugging)
  // updateOverduePmSchedules();
  
  // Schedule daily at midnight
  cron.schedule('0 0 * * *', () => {
    console.log('[PM Overdue Job] Running scheduled job...');
    updateOverduePmSchedules();
  });

  console.log('[PM Overdue Job] Scheduled to run daily at midnight (00:00)');
};

module.exports = {
  startPmOverdueJob,
  updateOverduePmSchedules, // Export for manual testing
};
