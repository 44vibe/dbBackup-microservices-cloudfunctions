const Cloudflare = require('cloudflare');
const { env } = require('./env');
const logger = require('../utils/logger');

let cloudflareClient = null;

// Initialize Cloudflare client only if API token is configured
if (env.CLOUDFLARE_API_TOKEN) {
  cloudflareClient = new Cloudflare({
    apiToken: env.CLOUDFLARE_API_TOKEN,
  });
}

/**
 * Test Cloudflare connection on startup
 */
const testConnection = async () => {
  if (!cloudflareClient) {
    logger.warn('Cloudflare client not initialized (CLOUDFLARE_API_TOKEN not configured). Manual domain verification workflow only.');
    return;
  }

  try {
    // Test connection by verifying the token
    await cloudflareClient.user.get();
    logger.success('Cloudflare client initialized successfully');
  } catch (error) {
    logger.warn('Cloudflare client initialization failed:', error.message);
    logger.warn('Automatic TXT record creation will not be available. Manual verification workflow only.');
  }
};

module.exports = {
  cloudflareClient,
  testConnection,
};
