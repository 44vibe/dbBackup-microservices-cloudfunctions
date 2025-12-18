# Deployment Guide: Local Development & Cloud Run

This guide walks you through setting up the application for both local development and Cloud Run deployment with automatic CI/CD.

---

## Table of Contents
- [Part 1: Code Changes](#part-1-code-changes-make-it-work-for-both-local--cloud-run)
- [Part 2: CI/CD Setup](#part-2-automatic-deployment-with-github-actions)
- [Summary](#summary-checklist)

---

# Part 1: Code Changes (Make it work for both Local & Cloud Run)

## Step 1: Update Environment Validation ✅ COMPLETED

**File**: `express-api/src/config/env.js`

**Line 9**: Already changed to:
```javascript
GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
```

**Why**: Cloud Run doesn't need this file, only local dev does.

---

## Step 2: Update Storage Client Config ✅ COMPLETED

**File**: `express-api/src/config/storage.config.js`

**Lines 8-13**: Already updated to:
```javascript
const storageClient = new Storage({
  projectId: env.GCP_PROJECT_ID,
  ...(env.GOOGLE_APPLICATION_CREDENTIALS && {
    keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS
  })
});
```

**Why**: Only use keyFilename if it exists (local). Cloud Run uses automatic credentials.

---

## Step 3: Update Pub/Sub Client Config

**File**: `express-api/src/config/pubsub.config.js`

Find the `new PubSub({...})` initialization and apply the same change:

**Change from:**
```javascript
const pubSubClient = new PubSub({
  projectId: env.GCP_PROJECT_ID,
  keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS,
});
```

**Change to:**
```javascript
const pubSubClient = new PubSub({
  projectId: env.GCP_PROJECT_ID,
  ...(env.GOOGLE_APPLICATION_CREDENTIALS && {
    keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS
  })
});
```

---

## Step 4: Update Cloud Tasks Client Config

**File**: `express-api/src/config/cloudtasks.config.js`

Find the `new CloudTasksClient({...})` initialization and apply the same pattern:

**Change from:**
```javascript
const client = new CloudTasksClient({
  projectId: env.GCP_PROJECT_ID,
  keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS,
});
```

**Change to:**
```javascript
const client = new CloudTasksClient({
  projectId: env.GCP_PROJECT_ID,
  ...(env.GOOGLE_APPLICATION_CREDENTIALS && {
    keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS
  })
});
```

---

## Step 5: Add CORS Support

**File**: `express-api/src/index.js`

### Step 5a: Install CORS package
```bash
cd express-api
npm install cors
```

### Step 5b: Add import at the top of the file (around line 2)
```javascript
const cors = require('cors');
```

### Step 5c: Add CORS middleware (after `app.use(express.json())`, around line 10)
```javascript
// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',  // Local development
  process.env.FRONTEND_URL   // Cloud Run production
].filter(Boolean);  // Remove undefined values

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
```

### Step 5d: Add to environment configuration

**File**: `express-api/src/config/env.js`

Add to the `envSchema` object:
```javascript
FRONTEND_URL: z.string().optional(),
```

**Local** (`express-api/.env` or `.env.local`):
```bash
FRONTEND_URL=http://localhost:3000
```

**Production** (will be set during Cloud Run deployment):
```bash
FRONTEND_URL=https://watchdogs-xxxxx-uc.a.run.app
```

---

## Step 6: Update .gitignore

**File**: `.gitignore` (root)

Add these lines if not already there:
```
.env
.env.local
.env.production
*.local
```

**Why**: Don't commit your local environment files with credentials.

---

## Step 7: Test Locally

```bash
# Terminal 1 - Backend
cd express-api
npm run dev

# Terminal 2 - Frontend
cd watchdogs
npm run dev

# Open browser: http://localhost:3000
# Should work!
```

---

# Part 2: Automatic Deployment with GitHub Actions

## Step 1: Enable Required APIs in GCP

```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

---

## Step 2: Create Service Account for Deployment

```bash
# Create service account
gcloud iam service-accounts create github-actions-deployer \
  --display-name="GitHub Actions Deployer"

# Get your project ID
PROJECT_ID=$(gcloud config get-value project)

# Grant Cloud Run Admin role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Grant Service Account User role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Grant Storage Admin (for building containers)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Grant Cloud Build Editor (for building images)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"
```

---

## Step 3: Create Service Account Key

```bash
# Create and download key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com

# This creates a file: github-actions-key.json
# You'll use this in GitHub Secrets (next step)
```

**IMPORTANT**: Keep this file secure! Don't commit it to Git.

---

## Step 4: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `GCP_PROJECT_ID` | Your GCP project ID | `my-project-123456` |
| `GCP_SA_KEY` | Contents of `github-actions-key.json` (entire JSON) | `{"type":"service_account",...}` |
| `GCP_REGION` | Your preferred region | `us-central1` |
| `API_KEY` | Your production API key (20+ characters) | `your-super-secure-api-key-123` |
| `GCS_BACKUP_BUCKET` | Your GCS bucket name | `my-backup-bucket` |
| `POSTGRES_TOPIC` | Postgres Pub/Sub topic | `postgres-backup-trigger` |
| `MONGODB_TOPIC` | MongoDB Pub/Sub topic | `mongodb-backup-trigger` |
| `QUESTDB_TOPIC` | QuestDB Pub/Sub topic | `questdb-backup-trigger` |
| `QDRANTDB_TOPIC` | QdrantDB Pub/Sub topic | `qdrantdb-backup-trigger` |
| `CLOUD_TASKS_QUEUE` | Cloud Tasks queue name | `backup-scheduler` |
| `CLOUD_TASKS_LOCATION` | Cloud Tasks location | `us-central1` |

**How to add the `GCP_SA_KEY` secret:**
1. Open `github-actions-key.json` in a text editor
2. Copy the ENTIRE file contents (all the JSON)
3. Paste it as the secret value

---

## Step 5: Create GitHub Actions Workflow

**File**: `.github/workflows/deploy-cloudrun.yml`

Create this file in your repository:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches:
      - main  # Deploy when pushing to main branch
  workflow_dispatch:  # Allow manual deployment

jobs:
  deploy-backend:
    name: Deploy Express API
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy backup-api \
            --source ./express-api \
            --region ${{ secrets.GCP_REGION }} \
            --platform managed \
            --allow-unauthenticated \
            --set-env-vars "\
          GCP_PROJECT_ID=${{ secrets.GCP_PROJECT_ID }},\
          POSTGRES_TOPIC=${{ secrets.POSTGRES_TOPIC }},\
          MONGODB_TOPIC=${{ secrets.MONGODB_TOPIC }},\
          QUESTDB_TOPIC=${{ secrets.QUESTDB_TOPIC }},\
          QDRANTDB_TOPIC=${{ secrets.QDRANTDB_TOPIC }},\
          GCS_BACKUP_BUCKET=${{ secrets.GCS_BACKUP_BUCKET }},\
          CLOUD_TASKS_QUEUE=${{ secrets.CLOUD_TASKS_QUEUE }},\
          CLOUD_TASKS_LOCATION=${{ secrets.CLOUD_TASKS_LOCATION }},\
          API_KEY=${{ secrets.API_KEY }}"

      - name: Get Backend URL
        id: backend-url
        run: |
          URL=$(gcloud run services describe backup-api \
            --region ${{ secrets.GCP_REGION }} \
            --format 'value(status.url)')
          echo "url=$URL" >> $GITHUB_OUTPUT
          echo "Backend URL: $URL"

    outputs:
      backend_url: ${{ steps.backend-url.outputs.url }}

  deploy-frontend:
    name: Deploy Watchdogs Frontend
    runs-on: ubuntu-latest
    needs: deploy-backend  # Wait for backend to deploy first

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy watchdogs \
            --source ./watchdogs \
            --region ${{ secrets.GCP_REGION }} \
            --platform managed \
            --allow-unauthenticated \
            --set-env-vars "\
          NEXT_PUBLIC_API_URL=${{ needs.deploy-backend.outputs.backend_url }},\
          NEXT_PUBLIC_API_KEY=${{ secrets.API_KEY }}"

      - name: Get Frontend URL
        run: |
          URL=$(gcloud run services describe watchdogs \
            --region ${{ secrets.GCP_REGION }} \
            --format 'value(status.url)')
          echo "Frontend URL: $URL"

      - name: Update Backend CORS
        run: |
          FRONTEND_URL=$(gcloud run services describe watchdogs \
            --region ${{ secrets.GCP_REGION }} \
            --format 'value(status.url)')

          gcloud run services update backup-api \
            --region ${{ secrets.GCP_REGION }} \
            --update-env-vars "FRONTEND_URL=$FRONTEND_URL"
```

---

## Step 6: Test the Workflow

### Option A: Push to Main Branch
```bash
git add .
git commit -m "Add Cloud Run deployment workflow"
git push origin main

# GitHub Actions will automatically deploy!
# Watch progress: GitHub repo → Actions tab
```

### Option B: Manual Trigger
1. Go to GitHub repository
2. Click **Actions** tab
3. Click **Deploy to Cloud Run** workflow
4. Click **Run workflow** → **Run workflow**

---

## Step 7: Monitor Deployment

1. Go to **GitHub** → **Actions** tab
2. Watch the deployment progress
3. Click on the running workflow to see logs
4. After completion, you'll see the URLs in the logs

**Expected output:**
```
Deploy Express API
  Backend URL: https://backup-api-xxxxx-uc.a.run.app

Deploy Watchdogs Frontend
  Frontend URL: https://watchdogs-yyyyy-uc.a.run.app
```

---

## Step 8: Verify Deployment

```bash
# Get your service URLs
gcloud run services list

# Test backend health endpoint
curl https://backup-api-xxxxx-uc.a.run.app/health

# Expected response:
# {"success":true,"message":"Backup Express API is running","timestamp":"2025-12-17T..."}

# Open frontend in browser
# https://watchdogs-yyyyy-uc.a.run.app
```

---

# Summary Checklist

## Part 1 - Code Changes

- [x] Make `GOOGLE_APPLICATION_CREDENTIALS` optional (env.js) ✅ DONE
- [x] Update storage.config.js ✅ DONE
- [ ] Update pubsub.config.js
- [ ] Update cloudtasks.config.js
- [ ] Add CORS middleware to Express
- [ ] Update .gitignore
- [ ] Test locally

## Part 2 - CI/CD Setup

- [ ] Enable GCP APIs
- [ ] Create service account for deployment
- [ ] Create service account key
- [ ] Add secrets to GitHub
- [ ] Create `.github/workflows/deploy-cloudrun.yml`
- [ ] Push to main branch
- [ ] Monitor deployment in GitHub Actions
- [ ] Verify deployed services

---

# Workflow After Setup

Once everything is configured:

1. **Make code changes** locally
2. **Test locally**:
   ```bash
   npm run dev  # in both express-api and watchdogs
   ```
3. **Commit and push**:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
4. **GitHub Actions automatically deploys** to Cloud Run
5. **Verify** by visiting your Cloud Run URLs

---

# Troubleshooting

## Deployment fails with "Permission denied"
- Check that your service account has all required roles
- Verify `GCP_SA_KEY` secret is correct (entire JSON)

## CORS errors in browser
- Ensure `FRONTEND_URL` is set correctly in backend
- Check CORS middleware is configured properly

## "Module not found" errors
- Run `npm install` in both express-api and watchdogs
- Ensure `package.json` includes all dependencies

## Local development not working
- Check `.env.local` files have correct values
- Ensure `GOOGLE_APPLICATION_CREDENTIALS` points to valid key file
- Verify GCP service account has required permissions

---

# Environment Variables Reference

## Express API (Backend)

**Local** (`.env.local`):
```bash
PORT=3001
NODE_ENV=development
GCP_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./path/to/key.json
POSTGRES_TOPIC=postgres-backup-trigger
MONGODB_TOPIC=mongodb-backup-trigger
QUESTDB_TOPIC=questdb-backup-trigger
QDRANTDB_TOPIC=qdrantdb-backup-trigger
GCS_BACKUP_BUCKET=your-bucket
CLOUD_TASKS_QUEUE=backup-scheduler
CLOUD_TASKS_LOCATION=us-central1
API_KEY=your-dev-api-key-20-chars
FRONTEND_URL=http://localhost:3000
```

**Cloud Run** (set via `gcloud run deploy` or GitHub Actions):
- Same as above, but no `GOOGLE_APPLICATION_CREDENTIALS`
- `FRONTEND_URL` will be the Cloud Run frontend URL

## Watchdogs (Frontend)

**Local** (`.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_KEY=your-dev-api-key-20-chars
```

**Cloud Run** (set via `gcloud run deploy` or GitHub Actions):
```bash
NEXT_PUBLIC_API_URL=https://backup-api-xxxxx-uc.a.run.app
NEXT_PUBLIC_API_KEY=your-production-api-key
```

---

# Security Notes

⚠️ **IMPORTANT**: As identified in the security review, `NEXT_PUBLIC_API_KEY` is exposed in the client-side JavaScript bundle. For production:

1. Consider implementing service-to-service authentication
2. Add additional security layers (rate limiting, IP restrictions)
3. Or implement a backend-for-frontend pattern where the frontend doesn't directly call the Express API

See the security review report for detailed recommendations.
