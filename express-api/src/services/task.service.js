const { cloudTasksClient } = require('../config/cloudtasks.config');
const { env } = require('../config/env');

async function scheduleBackupTask(database, delayMinutes) {
    try {
        const scheduleTime = new Date();
        scheduleTime.setMinutes(scheduleTime.getMinutes() + delayMinutes);

        const project = env.GCP_PROJECT_ID;
        const location = env.CLOUD_TASKS_LOCATION || 'us-central1';
        const queue = env.CLOUD_TASKS_QUEUE || 'backup-queue';
        const parent = cloudTasksClient.queuePath(project, location, queue);

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
            name: cloudTasksClient.taskPath(
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
        const [response] = await cloudTasksClient.createTask({ parent, task });
        
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

/**
 * List all scheduled tasks in the queue
 */
async function listScheduledTasks() {
    try {
        const project = env.GCP_PROJECT_ID;
        const location = env.CLOUD_TASKS_LOCATION || 'us-central1';
        const queue = env.CLOUD_TASKS_QUEUE || 'backup-queue';
        const parent = cloudTasksClient.queuePath(project, location, queue);

        console.log(`📋 Listing tasks from queue: ${parent}`);

        // List all tasks in the queue
        const [tasks] = await cloudTasksClient.listTasks({ parent });

        // Parse and format task information
        const scheduledTasks = tasks.map(task => {
            // Extract database type from task name
            const taskNameParts = task.name.split('/');
            const taskId = taskNameParts[taskNameParts.length - 1];
            const database = taskId.includes('postgres') ? 'postgres' :
                           taskId.includes('mongodb') ? 'mongodb' : 'unknown';

            // Parse schedule time
            const scheduleTimeSeconds = task.scheduleTime?.seconds || 0;
            const scheduledFor = new Date(scheduleTimeSeconds * 1000).toISOString();

            return {
                taskName: task.name,
                taskId: taskId,
                database: database,
                scheduledFor: scheduledFor,
                state: task.dispatchCount > 0 ? 'dispatched' : 'pending',
                dispatchCount: task.dispatchCount || 0,
                responseCount: task.responseCount || 0,
                createTime: task.createTime,
                // Add convenient endpoint URLs
                detailsUrl: `/backup/tasks/${taskId}`,
                cancelUrl: `/backup/tasks/${taskId}`,
            };
        });

        // Sort by scheduled time
        scheduledTasks.sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));

        console.log(`✅ Found ${scheduledTasks.length} scheduled tasks`);

        return {
            success: true,
            count: scheduledTasks.length,
            data: scheduledTasks,
            message: 'Scheduled tasks listed successfully',
        };
    } catch (error) {
        console.error('❌ Error listing tasks:', error);
        throw new Error(`Failed to list scheduled tasks: ${error.message}`);
    }
}

/**
 * Get details of a specific task
 */
async function getTaskDetails(taskName) {
    try {
        console.log(`📋 Getting task details for: ${taskName}`);

        const task = await cloudTasksClient.getTask({ name: taskName });

        // Extract database type from task name
        const taskNameParts = taskName.split('/');
        const taskId = taskNameParts[taskNameParts.length - 1];
        const database = taskId.includes('postgres') ? 'postgres' :
                       taskId.includes('mongodb') ? 'mongodb' : 'unknown';

        // Parse schedule time
        const scheduleTimeSeconds = task.scheduleTime?.seconds || 0;
        const scheduledFor = new Date(scheduleTimeSeconds * 1000).toISOString();

        return {
            success: true,
            data: {
                taskName: task.name,
                taskId: taskId,
                database: database,
                scheduledFor: scheduledFor,
                state: task.dispatchCount > 0 ? 'dispatched' : 'pending',
                dispatchCount: task.dispatchCount || 0,
                responseCount: task.responseCount || 0,
                createTime: task.createTime,
                httpRequest: {
                    url: task.httpRequest?.url,
                    httpMethod: task.httpRequest?.httpMethod,
                },
            },
            message: 'Task details retrieved successfully',
        };
    } catch (error) {
        console.error('❌ Error getting task details:', error);
        throw new Error(`Failed to get task details: ${error.message}`);
    }
}

/**
 * Delete/cancel a scheduled task
 */
async function cancelScheduledTask(taskName) {
    try {
        console.log(`🗑️ Cancelling task: ${taskName}`);

        await cloudTasksClient.deleteTask({ name: taskName });

        console.log(`✅ Task cancelled successfully`);

        return {
            success: true,
            taskName: taskName,
            message: 'Scheduled task cancelled successfully',
        };
    } catch (error) {
        console.error('❌ Error cancelling task:', error);
        throw new Error(`Failed to cancel scheduled task: ${error.message}`);
    }
}

module.exports = {
    scheduleBackupTask,
    listScheduledTasks,
    getTaskDetails,
    cancelScheduledTask
};