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

async function listQuestDBBackups() {
  try {
    const bucketName = env.GCS_BACKUP_BUCKET;
    const prefix = 'questdb/';

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
      message: 'QuestDB backups listed successfully',
    };
  } catch (error) {
    logger.error('Error listing QuestDB backups:', error);
    throw new Error(`Failed to list QuestDB backups: ${error.message}`);
  }
}

/**
 * Generate a signed URL for downloading a backup file
 * @param {string} fileName - The full path to the file in GCS (e.g., 'postgres/backup-2024-01-01.sql')
 * @param {number} expiresInMinutes - How long the URL should be valid (default: 60 minutes)
 */
async function generateDownloadUrl(fileName, expiresInMinutes = 60) {
  try {
    const bucketName = env.GCS_BACKUP_BUCKET;
    const file = storageClient.bucket(bucketName).file(fileName);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File not found: ${fileName}`);
    }

    // Generate signed URL
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000, // Convert minutes to milliseconds
    });

    logger.success(`Generated signed URL for: ${fileName}`);

    return {
      success: true,
      fileName: fileName,
      signedUrl: signedUrl,
      expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString(),
      expiresInMinutes: expiresInMinutes,
      message: 'Signed URL generated successfully',
    };
  } catch (error) {
    logger.error('Error generating signed URL:', error);
    throw new Error(`Failed to generate download URL: ${error.message}`);
  }
}

module.exports = {
  listPostgresBackups,
  listMongoDBBackups,
  listQuestDBBackups,
  generateDownloadUrl,
};
