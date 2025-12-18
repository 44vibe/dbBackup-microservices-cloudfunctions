const { Storage } = require('@google-cloud/storage');
const { env } = require('./env');
const logger = require('../utils/logger');

/**
 * Initialize Storage client
 */
const storageClient = new Storage({
  projectId: env.GCP_PROJECT_ID,
  ...(env.GOOGLE_APPLICATION_CREDENTIALS && {
    keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS
  })
});

/**
 * Get bucket reference
 */
const getBucketReference = (bucketName) => {
  return storageClient.bucket(bucketName);
};

// Test connection on startup
const testConnection = async () => {
  try {
    const [buckets] = await storageClient.getBuckets();
    logger.success('Storage client initialized successfully');
    logger.debug(`Found ${buckets.length} buckets in project`);
  } catch (error) {
    logger.error('Failed to initialize Storage client', error.message);
    process.exit(1);
  }
};

module.exports = {
  storageClient,
  getBucketReference,
  testConnection,
};
