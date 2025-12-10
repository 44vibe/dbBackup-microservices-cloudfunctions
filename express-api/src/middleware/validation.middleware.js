const { z } = require('zod');
const logger = require('../utils/logger');

/**
 * Zod validation middleware factory
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      logger.warn('Request validation failed', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
  };
};

module.exports = { validate };