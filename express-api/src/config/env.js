const {z} = require('zod');
require('dotenv').config();


const envSchema = z.object({
PORT: z.coerce.number().default(3000),
API_KEY: z.string().min(20, 'API_KEY must be at least 20 characters'),
GCP_PROJECT_ID: z.string().min(1, 'GCP_PROJECT_ID is required'),
GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1, 'GOOGLE_APPLICATION_CREDENTIALS path is required'),
POSTGRES_TOPIC: z.string().min(1, 'POSTGRES_TOPIC is required'),
MONGODB_TOPIC: z.string().min(1, 'MONGODB_TOPIC is required'),
CLOUD_TASKS_QUEUE: z.string().optional(),
CLOUD_TASKS_LOCATION: z.string().default('us-central1'),
});

function validateEnv() {
    try {
        const env = envSchema.parse(process.env);
        console.log('✅ Environment variables validated successfully');
        return env;
    } catch (error) {
        console.error('❌ Environment variables validation failed');
        console.error(error.issues || error);
        process.exit(1);
    }
}

module.exports = { env: validateEnv() };