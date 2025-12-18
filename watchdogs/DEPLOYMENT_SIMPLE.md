# Simple Deployment Guide

## The Problem We Fixed

Your frontend was using `localhost` on Cloud Run because `.env.production` was in `.dockerignore`, preventing Docker from copying it during build.

## The Solution

**Removed `.env.production` from `.dockerignore`**

Now Docker copies it and Next.js automatically uses it during production builds.

## How It Works

### Local Development
```bash
npm run dev
```
- Uses `.env.local`
- Points to `http://localhost:3000`

### Production Deployment
```bash
gcloud run deploy watchdogs-frontend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-build-env-vars NEXT_PUBLIC_API_URL=https://backup-api-27617992020.us-central1.run.app,NEXT_PUBLIC_API_KEY=a7f3e9d2c1b8a4f6e8d9c2b5a7f3e9d2c1b8a4f6e8d9c2b5a7f3e9d2c1b8a4f6
```

What happens:
1. Cloud Run builds Docker image with build-time environment variables
2. Dockerfile accepts these as ARG and sets them as ENV
3. Next.js reads these ENV vars during `npm run build`
4. Your production backend URL gets baked into the JavaScript bundle
5. Done!

## Environment Files

**`.env.local`** (for local dev):
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_API_KEY=your-key
```

**`.env.production`** (for Cloud Run):
```env
NEXT_PUBLIC_API_URL=https://backup-api-27617992020.us-central1.run.app
NEXT_PUBLIC_API_KEY=your-production-key
```

## To Change Backend URL

1. Edit `watchdogs/.env.production`
2. Update the `NEXT_PUBLIC_API_URL` value
3. Redeploy: `gcloud run deploy watchdogs-frontend --source . --region us-central1 --allow-unauthenticated`

That's it!

## Complete Deployment

Deploy both services:

```bash
# 1. Deploy backend
cd express-api
gcloud run deploy backup-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GCP_PROJECT_ID=your-project,API_KEY=your-key,POSTGRES_TOPIC=postgres-backup-trigger,MONGODB_TOPIC=mongodb-backup-trigger,QUESTDB_TOPIC=questdb-backup-trigger,QDRANTDB_TOPIC=qdrantdb-backup-trigger,GCS_BACKUP_BUCKET=your-bucket,CLOUD_TASKS_QUEUE=backup-queue,CLOUD_TASKS_LOCATION=us-central1,FRONTEND_URL=https://watchdogs-frontend-xxx.run.app"

# 2. Deploy frontend
cd ../watchdogs
gcloud run deploy watchdogs-frontend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

Done!
