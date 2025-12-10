# Database Backup Microservices

A comprehensive cloud-native backup management system for PostgreSQL and MongoDB databases, built with Google Cloud Platform services and featuring a modern web interface.

## 📋 Table of Contents

- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Frontend Documentation](#frontend-documentation)
- [Environment Variables](#environment-variables)

---

## 🏗️ Architecture

This system consists of three main components:

1. **Express API** (`express-api/`) - REST API for backup orchestration
2. **Watchdogs Frontend** (`watchdogs/`) - Next.js dashboard for managing backups
3. **Cloud Functions** - Event-driven backup execution (PostgreSQL & MongoDB)

### Data Flow

```
User → Watchdogs UI → Express API → Pub/Sub → Cloud Functions → GCS Bucket
                         ↓
                    Cloud Tasks (Scheduled)
```

---

## 📁 Project Structure

```
dbBackup-microservices-cloudfunctions/
├── express-api/                 # Backend API Server
│   ├── src/
│   │   ├── config/              # Configuration files
│   │   │   ├── env.js           # Environment variables
│   │   │   ├── pubsub.config.js # Google Pub/Sub client
│   │   │   ├── storage.config.js # Google Cloud Storage client
│   │   │   └── cloudtasks.config.js # Google Cloud Tasks client
│   │   ├── middleware/
│   │   │   └── auth.middleware.js # API key authentication
│   │   ├── routes/
│   │   │   └── backup.routes.js # Backup API routes
│   │   ├── services/
│   │   │   ├── backup.service.js # Backup triggering logic
│   │   │   ├── bucket.service.js # GCS operations
│   │   │   └── task.service.js   # Cloud Tasks scheduling
│   │   ├── utils/
│   │   │   └── logger.js        # Winston logger
│   │   └── index.js             # Express app entry point
│   ├── package.json
│   └── .env                     # API environment variables
│
├── watchdogs/                   # Frontend Dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # Root layout
│   │   │   ├── page.tsx         # Main dashboard
│   │   │   └── providers.tsx    # React Query provider
│   │   ├── components/
│   │   │   ├── backup-triggers.tsx      # Immediate backup buttons
│   │   │   ├── backup-management.tsx    # List & download backups
│   │   │   ├── scheduled-backups.tsx    # Scheduled tasks table
│   │   │   ├── schedule-backup-form.tsx # Schedule new backup
│   │   │   ├── task-actions.tsx         # View/cancel task actions
│   │   │   └── ui/              # shadcn/ui components
│   │   └── lib/
│   │       ├── api.ts           # Centralized API client
│   │       └── utils.ts         # Utility functions
│   ├── .env.local               # Frontend environment variables
│   ├── package.json
│   └── next.config.ts           # Next.js configuration
│
└── README.md                    # This file
```

---

## ✨ Features

### Backup Management
- ✅ Trigger immediate backups for PostgreSQL & MongoDB
- ✅ Schedule delayed backups (1 minute to 30 days)
- ✅ List all backup files with metadata
- ✅ Generate signed download URLs with expiration
- ✅ View scheduled tasks with status
- ✅ Cancel scheduled tasks

### Technical Features
- 🔐 API key authentication
- 📊 Comprehensive logging
- 🎯 Type-safe API client
- 🎨 Modern UI with dark mode
- ⚡ Real-time updates with React Query
- 🔄 Automatic retry and caching
- 📱 Responsive design

---

## 🛠️ Tech Stack

### Backend (Express API)
- **Runtime:** Node.js
- **Framework:** Express.js
- **GCP Services:**
  - Cloud Pub/Sub - Event messaging
  - Cloud Storage - Backup file storage
  - Cloud Tasks - Scheduled backups
- **Logging:** Winston
- **Validation:** Custom middleware

### Frontend (Watchdogs)
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **UI Library:** React 19
- **Styling:** Tailwind CSS 4
- **Components:** shadcn/ui + Radix UI
- **Data Fetching:** TanStack React Query v5
- **Validation:** Zod
- **Icons:** Lucide React
- **Notifications:** Sonner

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- Google Cloud Platform account
- GCP Project with enabled APIs:
  - Cloud Pub/Sub API
  - Cloud Storage API
  - Cloud Tasks API
- Service account with appropriate permissions

### Backend Setup (Express API)

1. **Navigate to the API directory:**
   ```bash
   cd express-api
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables:**
   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=development

   # Google Cloud Platform
   GCP_PROJECT_ID=your-project-id
   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

   # Pub/Sub Topics
   POSTGRES_TOPIC=postgres-backup-trigger
   MONGODB_TOPIC=mongodb-backup-trigger

   # Cloud Storage
   GCS_BACKUP_BUCKET=your-backup-bucket-name

   # Cloud Tasks
   CLOUD_TASKS_LOCATION=us-central1
   CLOUD_TASKS_QUEUE=backup-queue

   # API Security
   API_KEY=your-secure-api-key-here
   ```

5. **Start the server:**
   ```bash
   npm run dev    # Development
   npm start      # Production
   ```

   Server will run on `http://localhost:3000`

### Frontend Setup (Watchdogs)

1. **Navigate to the frontend directory:**
   ```bash
   cd watchdogs
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env.local` file:**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure environment variables:**
   ```env
   # Backend API Configuration
   NEXT_PUBLIC_API_URL=http://localhost:3000
   NEXT_PUBLIC_API_KEY=your-secure-api-key-here

   # Application Configuration
   NEXT_PUBLIC_APP_NAME=Database Backup Manager
   NEXT_PUBLIC_APP_VERSION=1.0.0
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

   Frontend will run on `http://localhost:3000`

---

## 📚 API Documentation

### Base URL
```
http://localhost:3000
```

### Authentication

All endpoints require an API key in the `x-api-key` header:

```bash
curl -H "x-api-key: your-api-key-here" http://localhost:3000/backup/health
```

### Endpoints

#### Health Check
`GET /backup/health`

#### Trigger Backups
- `POST /backup/postgres` - Trigger immediate PostgreSQL backup
- `POST /backup/mongodb` - Trigger immediate MongoDB backup

#### Schedule Backups
- `POST /backup/postgres/schedule` - Schedule PostgreSQL backup
- `POST /backup/mongodb/schedule` - Schedule MongoDB backup

Request body:
```json
{
  "delayMinutes": 60
}
```

#### List Backups
- `GET /backup/postgres/list` - List all PostgreSQL backups
- `GET /backup/mongodb/list` - List all MongoDB backups

#### Download Backup
`GET /backup/download?fileName=postgres/backup.sql.gz&expiresInMinutes=60`

#### Task Management
- `GET /backup/tasks` - List all scheduled tasks
- `GET /backup/tasks/{taskId}` - Get task details
- `DELETE /backup/tasks/{taskId}` - Cancel scheduled task

---

## 🎨 Frontend Documentation

### Components

#### BackupTriggers
Displays buttons to trigger immediate backups for PostgreSQL and MongoDB.

#### BackupManagement
Tab-based interface to list and download backup files.

#### ScheduledBackups
Displays all scheduled backup tasks in a table.

#### ScheduleBackupForm
Dialog form to create new scheduled backups.

#### TaskActions
Action buttons for individual tasks (view details, cancel).

### API Client (`src/lib/api.ts`)

Centralized API service with TypeScript types and authentication.

**Usage Example:**
```typescript
import { api } from "@/lib/api";

// Trigger backup
const result = await api.backup.triggerPostgresBackup();

// List backups
const backups = await api.backup.listPostgresBackups();

// Schedule backup
const task = await api.backup.schedulePostgresBackup(60);

// List tasks
const tasks = await api.task.listTasks();

// Cancel task
await api.task.cancelTask(taskId);
```

---

## 🔒 Environment Variables

### Backend (`express-api/.env`)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 3000 |
| `NODE_ENV` | Environment mode | No | development |
| `GCP_PROJECT_ID` | Google Cloud project ID | Yes | - |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON | Yes | - |
| `POSTGRES_TOPIC` | Pub/Sub topic for PostgreSQL | Yes | - |
| `MONGODB_TOPIC` | Pub/Sub topic for MongoDB | Yes | - |
| `GCS_BACKUP_BUCKET` | GCS bucket for backups | Yes | - |
| `CLOUD_TASKS_LOCATION` | Cloud Tasks location | No | us-central1 |
| `CLOUD_TASKS_QUEUE` | Cloud Tasks queue name | No | backup-queue |
| `API_KEY` | API authentication key | Yes | - |

### Frontend (`watchdogs/.env.local`)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | Yes | - |
| `NEXT_PUBLIC_API_KEY` | API key for authentication | Yes | - |
| `NEXT_PUBLIC_APP_NAME` | Application name | No | Database Backup Manager |
| `NEXT_PUBLIC_APP_VERSION` | Application version | No | 1.0.0 |

---

**Built with ❤️ using Google Cloud Platform**
