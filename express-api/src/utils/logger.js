/**
 * Simple logger utility
 */
const logger = {
    info: (message, data = null) => {
      console.log(`ℹ️  [INFO] ${message}`, data ? data : '');
    },
  
    success: (message, data = null) => {
      console.log(`✅ [SUCCESS] ${message}`, data ? data : '');
    },
  
    error: (message, error = null) => {
      console.error(`❌ [ERROR] ${message}`, error ? error : '');
    },
  
    warn: (message, data = null) => {
      console.warn(`⚠️  [WARN] ${message}`, data ? data : '');
    },
  
    debug: (message, data = null) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🐛 [DEBUG] ${message}`, data ? data : '');
      }
    },
  };
  
  module.exports = logger;