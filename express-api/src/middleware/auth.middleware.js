const { env } = require('../config/env');
const logger = require('../utils/logger');

/**
 * API Key authentication middleware
 */
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    logger.warn('Request missing API key');
    return res.status(401).json({
      success: false,
      error: 'API key is required. Provide x-api-key header.',
    });
  }

  if (apiKey !== env.API_KEY) {
    logger.warn('Invalid API key attempted');
    return res.status(403).json({
      success: false,
      error: 'Invalid API key',
    });
  }

  logger.debug('API key authenticated successfully');
  next();
};

module.exports = { authenticateApiKey };