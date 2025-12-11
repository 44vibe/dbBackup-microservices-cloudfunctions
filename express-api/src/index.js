const express = require('express');
const { env } = require('./config/env');
const { testConnection } = require('./config/pubsub.config');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const backupRoutes = require('./routes/backup.routes');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Backup API - Microservice for triggering database backups via Cloud Functions',
      version: '1.0.0',
      endpoints: {
        health: 'GET /backup/health',
        triggerBackup: 'POST /backup/postgres (requires x-api-key header)',
        triggerMongoDBBackup: 'POST /backup/mongodb (requires x-api-key header)',
        schedulePostgreSQLBackup: 'POST /backup/postgres/schedule (requires x-api-key header and delayMinutes in body)',
        scheduleMongoDBBackup: 'POST /backup/mongodb/schedule (requires x-api-key header and delayMinutes in body)',
        listPostgresBackups: 'GET /backup/postgres/list (requires x-api-key header)',
        listMongoDBBackups: 'GET /backup/mongodb/list (requires x-api-key header)',
        downloadPostgresBackup: 'GET /backup/download?fileName=postgres/backup-2024-01-01.sql (requires x-api-key header)',
        listTasks: 'GET /backup/tasks (requires x-api-key header)',
        getTaskDetails: 'GET /backup/tasks/:taskId (requires x-api-key header)',
        cancelTask: 'DELETE /backup/tasks/:taskId (requires x-api-key header)',
        triggerQuestDBBackup: 'POST /backup/questdb (requires x-api-key header)',
        scheduleQuestDBBackup: 'POST /backup/questdb/schedule (requires x-api-key header and delayMinutes in body)',
        listQuestDBBackups: 'GET /backup/questdb/list (requires x-api-key header)',
      },
    });
  });


// Routes
app.use('/backup', backupRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backup Express API is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);
// Start server
const PORT = process.env.PORT || 3000;
// Start server
const startServer = async () => {
  try {
    // Test Pub/Sub connection
    await testConnection();

    // Start Express server
    app.listen(env.PORT, () => {
      logger.success(`Server running on port ${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`Project ID: ${env.GCP_PROJECT_ID}`);
      logger.info(`🔗 API: http://localhost:${PORT}`);
      console.log('\n📋 Available endpoints:');
      console.log(`   GET  http://localhost:${PORT}/`);
      console.log(`   GET  http://localhost:${PORT}/backup/health`);
      console.log(`   POST http://localhost:${PORT}/backup/postgres`);
      console.log(`   POST http://localhost:${PORT}/backup/mongodb`);
      console.log(`   POST http://localhost:${PORT}/backup/postgres/schedule`);
      console.log(`   POST http://localhost:${PORT}/backup/mongodb/schedule`);
      console.log(`   GET http://localhost:${PORT}/backup/postgres/list`);
      console.log(`   GET http://localhost:${PORT}/backup/mongodb/list`);
      console.log(`   GET http://localhost:${PORT}/backup/download?fileName=postgres/backup-2024-01-01.sql`);
      console.log(`   GET http://localhost:${PORT}/backup/tasks`);
      console.log(`   GET http://localhost:${PORT}/backup/tasks/:taskId`);
      console.log(`   DELETE http://localhost:${PORT}/backup/tasks/:taskId`);
      console.log(`   POST http://localhost:${PORT}/backup/questdb`);
      console.log(`   POST http://localhost:${PORT}/backup/questdb/schedule`);
      console.log(`   GET http://localhost:${PORT}/backup/questdb/list`);
      console.log('\n✨ Ready to accept requests!\n');
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

startServer();