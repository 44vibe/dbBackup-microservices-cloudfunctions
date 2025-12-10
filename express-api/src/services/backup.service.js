const { pubsubClient } = require('../config/pubsub.config');
const { Storage } = require('@google-cloud/storage');
const { env } = require('../config/env');
const logger = require('../utils/logger');

const storage = new Storage();

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
 * List all PostgreSQL backups from GCS
 */

async function listPostgresBackups() {
  try{
    const bucketName = env.GCS_BACKUP_BUCKET;
    const prefix = 'postgres/';

    const [files] = await storage.bucket(bucketName).getFiles({prefix});

    const backups = files.map(file => ({
      name: file.name,
      size: file.metadata.size,
      created: file.metadata.timeCreated,
      updated: file.metadata.updated,
      url: `gs://${bucketName}/${file.name}`,
    }));

    return {
      success: true,
      count: backups.length,
      data: backups.sort((a,b)=> new Date(b.created) - new Date(a.created)), // Sort by created date in descending order
      message: 'PostgreSQL backups listed successfully',
    }
  } catch(error) {
    logger.error('Error listing PostgreSQL backups:', error);
    throw new Error(`Failed to list PostgreSQL backups: ${error.message}`);
  }
}




module.exports = { triggerPostgresBackup, triggerMongoDBBackup, listPostgresBackups };