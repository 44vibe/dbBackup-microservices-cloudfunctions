const { CloudTasksClient } = require('@google-cloud/tasks');
const { env } = require('../config/env');

const taskClient = new CloudTasksClient({
    projectId: env.GCP_PROJECT_ID,
    keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS
});

async function scheduleBackupTask(database, delayMinutes) {
    try {
        const scheduleTime = new Date();
        scheduleTime.setMinutes(scheduleTime.getMinutes() + delayMinutes);

        const project = env.GCP_PROJECT_ID;
        const location = env.CLOUD_TASKS_LOCATION || 'us-central1';
        const queue = env.CLOUD_TASKS_QUEUE || 'backup-queue';
        const parent = taskClient.queuePath(project, location, queue);

        console.log(`📋 Queue path: ${parent}`);
    
        const topicName = database === 'postgres' ? 'postgres-backup-trigger' : 'mongodb-backup-trigger';

        const message = {
            action: 'backup',
            database: database,
            triggeredBy: 'scheduled-task',
            scheduledFor: scheduleTime.toISOString(),
            timestamp: new Date().toISOString(),
        }

        const task = {
            name: taskClient.taskPath(
              project,
              location,
              queue,
              `${database}-backup-${Date.now()}`
            ),
            scheduleTime: {
              seconds: Math.floor(scheduleTime.getTime() / 1000),
            },
            httpRequest: {
              httpMethod: 'POST',
              url: `https://pubsub.googleapis.com/v1/projects/${project}/topics/${topicName}:publish`,
              headers: {
                'Content-Type': 'application/json',
              },
              body: Buffer.from(
                JSON.stringify({
                  messages: [
                    {
                      data: Buffer.from(JSON.stringify(message)).toString('base64'),
                    },
                  ],
                })
              ),
              oauthToken: {
                serviceAccountEmail: `backup-api-publisher@${project}.iam.gserviceaccount.com`,
                scope: 'https://www.googleapis.com/auth/pubsub',
              },
            },
          };

              // Create the task
        const [response] = await taskClient.createTask({ parent, task });
        
        console.log(`✅ Task created: ${response.name}`);
        console.log(`📅 Scheduled for: ${scheduleTime.toISOString()}`);
          


        return {
            success: true,
            taskName: response.name,
            scheduledFor: scheduleTime.toISOString(),
            delayMinutes: delayMinutes,
            database: database,
            message: `Backup scheduled for ${database} in ${delayMinutes} minutes`,
        };
    
    } catch (error) {
        console.error('❌ Error creating task:', error);
        throw new Error(`Failed to create backup task: ${error.message}`);
    }
}

module.exports = { scheduleBackupTask };