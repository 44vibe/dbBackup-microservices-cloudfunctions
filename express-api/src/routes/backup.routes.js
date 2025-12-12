const express = require('express');
const router = express.Router();
const { authenticateApiKey } = require('../middleware/auth.middleware');
const { triggerPostgresBackup, triggerMongoDBBackup, triggerQuestDBBackup, triggerQdrantDBBackup } = require('../services/backup.service');
const { listPostgresBackups, listMongoDBBackups, listQuestDBBackups, listQdrantDBBackups, generateDownloadUrl, deleteBackupFile } = require('../services/bucket.service');
const logger = require('../utils/logger');
const { scheduleBackupTask, listScheduledTasks, getTaskDetails, cancelScheduledTask } = require('../services/task.service');

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
 * POST /backup/questdb
 * Trigger QuestDB backup
 */
router.post('/questdb', authenticateApiKey, async (req, res, next) => {
  try {
    logger.info('QuestDB backup request received');
    const result = await triggerQuestDBBackup();
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
* POST /backup/questdb/schedule
* Schedule QuestDB backup with delay
*/
router.post('/questdb/schedule', authenticateApiKey, async (req, res, next) => {
  try {
    const { delayMinutes } = req.body;

    // Validate delay
    if (!delayMinutes || delayMinutes < 1 || delayMinutes > 43200) {
      return res.status(400).json({
        success: false,
        message: 'delayMinutes is required and must be between 1 and 43200 (30 days)',
      });
    }

    console.log(`🔄 Scheduling QuestDB backup in ${delayMinutes} minutes`);

    // Schedule task
    const result = await scheduleBackupTask('questdb', delayMinutes);

    // Send success response
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /backup/qdrantdb
 * Trigger QdrantDB backup
 */
router.post('/qdrantdb', authenticateApiKey, async (req, res, next) => {
  try {
    logger.info('QdrantDB backup request received');
    const result = await triggerQdrantDBBackup();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
* POST /backup/qdrantdb/schedule
* Schedule QdrantDB backup with delay
*/
router.post('/qdrantdb/schedule', authenticateApiKey, async (req, res, next) => {
  try {
    const { delayMinutes } = req.body;

    // Validate delay
    if (!delayMinutes || delayMinutes < 1 || delayMinutes > 43200) {
      return res.status(400).json({
        success: false,
        message: 'delayMinutes is required and must be between 1 and 43200 (30 days)',
      });
    }

    console.log(`🔄 Scheduling QdrantDB backup in ${delayMinutes} minutes`);

    // Schedule task
    const result = await scheduleBackupTask('qdrantdb', delayMinutes);

    // Send success response
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});


router.get('/postgres/list', authenticateApiKey, async (req, res, next) => {
  try {
    logger.info('PostgreSQL backup list request received');
    const result = await listPostgresBackups();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/mongodb/list', authenticateApiKey, async (req, res, next) => {
  try {
    logger.info('MongoDB backup list request received');
    const result = await listMongoDBBackups();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/questdb/list', authenticateApiKey, async (req, res, next) => {
  try {
    logger.info('QuestDB backup list request received');
    const result = await listQuestDBBackups();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/qdrantdb/list', authenticateApiKey, async (req, res, next) => {
  try {
    logger.info('QdrantDB backup list request received');
    const result = await listQdrantDBBackups();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});


/**
 * GET /backup/tasks
 * List all scheduled backup tasks
 */
router.get('/tasks', authenticateApiKey, async (req, res, next) => {
  try {
    logger.info('Scheduled tasks list request received');
    const result = await listScheduledTasks();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /backup/tasks/:taskId
 * Get details of a specific scheduled task
 */
router.get('/tasks/:taskId', authenticateApiKey, async (req, res, next) => {
  try {
    const { taskId } = req.params;

    // Construct full task name from taskId
    const project = process.env.GCP_PROJECT_ID;
    const location = process.env.CLOUD_TASKS_LOCATION || 'us-central1';
    const queue = process.env.CLOUD_TASKS_QUEUE || 'backup-queue';
    const taskName = `projects/${project}/locations/${location}/queues/${queue}/tasks/${taskId}`;

    logger.info(`Task details request for: ${taskId}`);
    const result = await getTaskDetails(taskName);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /backup/tasks/:taskId
 * Cancel a scheduled backup task
 */
router.delete('/tasks/:taskId', authenticateApiKey, async (req, res, next) => {
  try {
    const { taskId } = req.params;

    // Construct full task name from taskId
    const project = process.env.GCP_PROJECT_ID;
    const location = process.env.CLOUD_TASKS_LOCATION || 'us-central1';
    const queue = process.env.CLOUD_TASKS_QUEUE || 'backup-queue';
    const taskName = `projects/${project}/locations/${location}/queues/${queue}/tasks/${taskId}`;

    logger.info(`Cancel task request for: ${taskId}`);
    const result = await cancelScheduledTask(taskName);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /backup/download
 * Generate a signed URL for downloading a backup file
 * Query params: ?fileName=postgres/backup-2024-01-01.sql&expiresInMinutes=60
 */
router.get('/download', authenticateApiKey, async (req, res, next) => {
  try {
    const { fileName, expiresInMinutes } = req.query;

    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: 'fileName query parameter is required',
      });
    }

    logger.info(`Download URL request for: ${fileName}`);
    const expiresMinutes = expiresInMinutes ? parseInt(expiresInMinutes) : undefined;
    const result = await generateDownloadUrl(fileName, expiresMinutes);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /backup/delete
 * Delete a backup file from GCS
 * Query params: ?fileName=postgres/backup-2024-01-01.sql
 */
router.delete('/delete', authenticateApiKey, async (req, res, next) => {
  try {
    const { fileName } = req.query;

    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: 'fileName query parameter is required',
      });
    }

    logger.info(`Delete backup request for: ${fileName}`);
    const result = await deleteBackupFile(fileName);
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