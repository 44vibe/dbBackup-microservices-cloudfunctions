const { PubSub } = require('@google-cloud/pubsub');
const { env } = require('./env');
const logger = require('../utils/logger');

/**
 * Initialize Pub/Sub client
 */
const pubsubClient = new PubSub({
  projectId: env.GCP_PROJECT_ID,
  keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS,
});

/**
 * Get topic reference
 */
const getTopicReference = (topicName) => {
  return pubsubClient.topic(topicName);
};

// Test connection on startup
const testConnection = async () => {
  try {
    const [topics] = await pubsubClient.getTopics();
    logger.success('Pub/Sub client initialized successfully');
    logger.debug(`Found ${topics.length} topics in project`);
  } catch (error) {
    logger.error('Failed to initialize Pub/Sub client', error.message);
    process.exit(1);
  }
};

module.exports = {
  pubsubClient,
  getTopicReference,
  testConnection,
};