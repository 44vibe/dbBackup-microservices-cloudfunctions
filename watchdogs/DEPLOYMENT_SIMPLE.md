# Simple Deployment Guide

## The Problem We Fixed

Your frontend was using `localhost` on Cloud Run even after deployment because Next.js `NEXT_PUBLIC_*` environment variables are baked into the JavaScript bundle at **build time**, not runtime.

## The Solution

**Use `cloudbuild.yaml` with Docker `--build-arg` flags**

This is the ONLY way to pass build-time environment variables when using a custom Dockerfile with Cloud Build. The `gcloud run deploy --set-build-env-vars` flag only works with buildpacks, NOT with custom Dockerfiles.

## How It Works

### Local Development
```bash
npm run dev
```
- Uses `.env.local`
- Points to `http://localhost:3000`

### Production Deployment

**IMPORTANT:** You MUST use Cloud Build with `cloudbuild.yaml`:

```bash
cd watchdogs
gcloud builds submit --config cloudbuild.yaml
```

What happens:
1. Cloud Build runs `docker build` with `--build-arg` flags (see `cloudbuild.yaml`)
2. Dockerfile accepts these ARGs and converts them to ENV variables
3. Next.js reads these ENV vars during `npm run build`
4. Your production backend URL gets baked into the JavaScript bundle
5. Docker image is pushed to Container Registry
6. Cloud Run deploys the new image

**Why NOT `gcloud run deploy`?**
The `--set-build-env-vars` flag only works with buildpacks. When using a custom Dockerfile, you MUST use `cloudbuild.yaml` with `docker build --build-arg`.

## Environment Files

**`.env.local`** (for local dev):
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_API_KEY=your-key
```

## To Change Backend URL

1. Edit `watchdogs/cloudbuild.yaml`
2. Update the `--build-arg` values for `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_API_KEY`
3. Redeploy: `cd watchdogs && gcloud builds submit --config cloudbuild.yaml`

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

# 2. Deploy frontend with Cloud Build
cd ../watchdogs
gcloud builds submit --config cloudbuild.yaml
```

Done! Your frontend will now call the production backend URL instead of localhost.
