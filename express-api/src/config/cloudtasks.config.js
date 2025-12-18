const { CloudTasksClient } = require('@google-cloud/tasks');
const { env } = require('./env');
const logger = require('../utils/logger');

/**
 * Initialize Cloud Tasks client
 */
const cloudTasksClient = new CloudTasksClient({
  projectId: env.GCP_PROJECT_ID,
  ...(env.GOOGLE_APPLICATION_CREDENTIALS && {
    keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS
  })
});

/**
 * Get queue path
 */
const getQueuePath = (location, queueName) => {
  return cloudTasksClient.queuePath(env.GCP_PROJECT_ID, location, queueName);
};

/**
 * Get task path
 */
const getTaskPath = (location, queueName, taskName) => {
  return cloudTasksClient.taskPath(env.GCP_PROJECT_ID, location, queueName, taskName);
};

// Test connection on startup
const testConnection = async () => {
  try {
    const location = env.CLOUD_TASKS_LOCATION || 'us-central1';
    const parent = `projects/${env.GCP_PROJECT_ID}/locations/${location}`;
    const [queues] = await cloudTasksClient.listQueues({ parent });
    logger.success('Cloud Tasks client initialized successfully');
    logger.debug(`Found ${queues.length} queues in project`);
  } catch (error) {
    logger.error('Failed to initialize Cloud Tasks client', error.message);
    process.exit(1);
  }
};

module.exports = {
  cloudTasksClient,
  getQueuePath,
  getTaskPath,
  testConnection,
};
