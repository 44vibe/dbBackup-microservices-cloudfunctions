const express = require('express');
const router = express.Router();
const { authenticateApiKey } = require('../middleware/auth.middleware');
const { triggerPostgresBackup, triggerMongoDBBackup } = require('../services/backup.service');
const logger = require('../utils/logger');
const { scheduleBackupTask } = require('../services/task.service');

/**
 * POST /backup/postgres
 * Trigger PostgreSQL backup
 */
router.post('/postgres', authenticateApiKey, async (req, res, next) => {
  try {
    logger.info('PostgreSQL backup request received');
    const result = await triggerPostgresBackup();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /backup/mongodb
 * Trigger MongoDB backup
 */
router.post('/mongodb', authenticateApiKey, async (req, res, next) => {
  try {
    logger.info('MongoDB backup request received');
    const result = await triggerMongoDBBackup();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /backup/postgres/schedule
 * Schedule PostgreSQL backup with delay
 */
router.post('/postgres/schedule', authenticateApiKey, async (req, res, next) => {
  try {
    const { delayMinutes } = req.body;

    // Validate delay
    if (!delayMinutes || delayMinutes < 1 || delayMinutes > 43200) {
      return res.status(400).json({
        success: false,
        message: 'delayMinutes is required and must be between 1 and 43200 (30 days)',
      });
    }

    console.log(`🔄 Scheduling PostgreSQL backup in ${delayMinutes} minutes`);

    // Schedule task
    const result = await scheduleBackupTask('postgres', delayMinutes);

    // Send success response
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});


/**
* POST /backup/mongodb/schedule
* Schedule MongoDB backup with delay
*/
router.post('/mongodb/schedule', authenticateApiKey, async (req, res, next) => {
  try {
    const { delayMinutes } = req.body;

    // Validate delay
    if (!delayMinutes || delayMinutes < 1 || delayMinutes > 43200) {
      return res.status(400).json({
        success: false,
        message: 'delayMinutes is required and must be between 1 and 43200 (30 days)',
      });
    }

    console.log(`🔄 Scheduling MongoDB backup in ${delayMinutes} minutes`);

    // Schedule task
    const result = await scheduleBackupTask('mongodb', delayMinutes);

    // Send success response
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});


/**
 * GET /backup/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backup API is running',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;