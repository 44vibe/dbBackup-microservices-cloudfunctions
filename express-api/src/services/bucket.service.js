const { storageClient } = require('../config/storage.config');
const { env } = require('../config/env');
const logger = require('../utils/logger');

/**
 * List all PostgreSQL backups from GCS
 */
async function listPostgresBackups() {
  try {
    const bucketName = env.GCS_BACKUP_BUCKET;
    const prefix = 'postgres/';

    const [files] = await storageClient.bucket(bucketName).getFiles({ prefix });

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
      data: backups.sort((a, b) => new Date(b.created) - new Date(a.created)), // Sort by created date in descending order
      message: 'PostgreSQL backups listed successfully',
    };
  } catch (error) {
    logger.error('Error listing PostgreSQL backups:', error);
    throw new Error(`Failed to list PostgreSQL backups: ${error.message}`);
  }
}

/**
 * List all MongoDB backups from GCS
 */
async function listMongoDBBackups() {
  try {
    const bucketName = env.GCS_BACKUP_BUCKET;
    const prefix = 'mongodb/';

    const [files] = await storageClient.bucket(bucketName).getFiles({ prefix });

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
      data: backups.sort((a, b) => new Date(b.created) - new Date(a.created)),
      message: 'MongoDB backups listed successfully',
    };
  } catch (error) {
    logger.error('Error listing MongoDB backups:', error);
    throw new Error(`Failed to list MongoDB backups: ${error.message}`);
  }
}

module.exports = {
  listPostgresBackups,
  listMongoDBBackups,
};
