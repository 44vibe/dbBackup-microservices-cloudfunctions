const { pubsubClient } = require('../config/pubsub.config');
const { env } = require('../config/env');
const logger = require('../utils/logger');

/**
 * Trigger PostgreSQL backup
 */
async function triggerPostgresBackup() {
  try {
    const postgresTopic = pubsubClient.topic(env.POSTGRES_TOPIC);
    const message = {
      action: 'backup',
      database: 'postgres',
      triggeredBy: 'manual',
      timestamp: new Date().toISOString(),
    };

    // Convert message to buffer
    const messageBuffer = Buffer.from(JSON.stringify(message));

    // Publish message to Pub/Sub topic
    const messageId = await postgresTopic.publishMessage({ data: messageBuffer });

    logger.success(`Message published to Pub/Sub. Message ID: ${messageId}`);

    return {
      success: true,
      messageId: messageId,
      message: 'PostgreSQL backup triggered successfully',
      data: message,
    };
  } catch (error) {
    logger.error('Error publishing message to Pub/Sub:', error);
    throw new Error(`Failed to trigger backup: ${error.message}`);
  }
}

/**
 * Trigger MongoDB backup
 */
async function triggerMongoDBBackup() {
  try {
    const mongodbTopic = pubsubClient.topic(env.MONGODB_TOPIC);
    const message = {
      action: 'backup',
      database: 'mongodb',
      triggeredBy: 'manual',
      timestamp: new Date().toISOString(),
    };

    const messageBuffer = Buffer.from(JSON.stringify(message));
    const messageId = await mongodbTopic.publishMessage({ data: messageBuffer });
    
    logger.success(`Message published to Pub/Sub. Message ID: ${messageId}`);

    return {
      success: true,
      messageId: messageId,
      message: 'MongoDB backup triggered successfully',
      data: message,
    };
  } catch (error) {
    logger.error('Error publishing message to Pub/Sub:', error);
    throw new Error(`Failed to trigger backup: ${error.message}`);
  }
}

/**
 * Trigger QuestDB backup
 */
async function triggerQuestDBBackup() {
  try {
    const questdbTopic = pubsubClient.topic(env.QUESTDB_TOPIC);
    const message = {
      action: 'backup',
      database: 'questdb',
      triggeredBy: 'manual',
      timestamp: new Date().toISOString(),
    };

    const messageBuffer = Buffer.from(JSON.stringify(message));
    const messageId = await questdbTopic.publishMessage({ data: messageBuffer });
    
    logger.success(`Message published to Pub/Sub. Message ID: ${messageId}`);

    return {
      success: true,
      messageId: messageId,
      message: 'QuestDB backup triggered successfully',
      data: message,
    };
  } catch (error) {
    logger.error('Error publishing message to Pub/Sub:', error);
    throw new Error(`Failed to trigger backup: ${error.message}`);
  }
}

/**
 * Trigger QdrantDB backup
 */
async function triggerQdrantDBBackup() {
  try {
    const qdrantdbTopic = pubsubClient.topic(env.QDRANTDB_TOPIC);
    const message = {
      action: 'backup',
      database: 'qdrantdb',
      triggeredBy: 'manual',
      timestamp: new Date().toISOString(),
    };

    const messageBuffer = Buffer.from(JSON.stringify(message));
    const messageId = await qdrantdbTopic.publishMessage({ data: messageBuffer });

    logger.success(`Message published to Pub/Sub. Message ID: ${messageId}`);

    return {
      success: true,
      messageId: messageId,
      message: 'QdrantDB backup triggered successfully',
      data: message,
    };
  } catch (error) {
    logger.error('Error publishing message to Pub/Sub:', error);
    throw new Error(`Failed to trigger backup: ${error.message}`);
  }
}

module.exports = { triggerPostgresBackup, triggerMongoDBBackup, triggerQuestDBBackup, triggerQdrantDBBackup };