# Database Backup Microservices & Cloud Functions

This project implements a microservices architecture for managing database backups using Google Cloud Functions, Cloud Pub/Sub, Cloud Tasks, and Cloud Storage. It consists of an Express API for triggering/scheduling backups and Cloud Functions that perform the actual backup operations.

## Architecture
```mermaid
flowchart TB
    User["👤 User"] -->|"Immediate Backup<br/>POST /backup/postgres"| API["Express API"]
    User -->|"Scheduled Backup<br/>POST /backup/schedule"| API
    
    API -->|"Option 1:<br/>Immediate"| PubSub["Pub/Sub Topics"]
    API -->|"Option 2:<br/>Delayed"| CloudTasks["Cloud Tasks<br/>(Schedule for later)"]
    
    CloudTasks -.->|"After delay"| PubSub
    
    PubSub -->|"Trigger"| CloudFunction["Cloud Functions<br/>(postgres or mongodb)"]
    
    CloudFunction -->|"1. Get credentials"| SecretManager["Secret Manager"]
    CloudFunction -->|"2. SSH + backup"| VM["VM<br/>(Databases)"]
    CloudFunction -->|"3. Upload"| GCS["GCS Bucket"]
    
    style User fill:#ea4335,stroke:#c5221f,color:#fff
    style API fill:#ea4335,stroke:#c5221f,color:#fff
    style CloudTasks fill:#fbbc04,stroke:#f29900,color:#000
    style PubSub fill:#4285f4,stroke:#1a73e8,color:#fff
    style CloudFunction fill:#34a853,stroke:#0f9d58,color:#fff
    style SecretManager fill:#9334e6,stroke:#7c2ec9,color:#fff
    style VM fill:#fbbc04,stroke:#f29900,color:#000
    style GCS fill:#ff6d00,stroke:#e65100,color:#fff
```

## Project Structure

```
.
├── cloud-functions/              # Google Cloud Functions
│   ├── mongodb-backup/           # Function to backup MongoDB
│   │   ├── index.js
│   │   └── package.json
│   └── postgresql-backup/        # Function to backup PostgreSQL
│       ├── index.js
│       └── package.json
│
└── express-api/                  # Express.js API Service
    ├── src/
    │   ├── config/               # Configuration (Env, Pub/Sub, Storage, Cloud Tasks)
    │   ├── middleware/           # Middleware (Auth, Error Handling, Validation)
    │   ├── routes/               # API Routes
    │   ├── services/             # Business Logic (Backup, Bucket, Task services)
    │   ├── utils/                # Utilities (Logger, etc.)
    │   └── index.js              # API Entry Point
    ├── package.json
    └── ...
```

## API Endpoints

All endpoints (except health checks) require an API key passed in the `x-api-key` header.

### General
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/` | API Information | No |
| `GET` | `/backup/health` | Health Check | No |

### Backup Triggers
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/backup/postgres` | Trigger an immediate PostgreSQL backup | Yes |
| `POST` | `/backup/mongodb` | Trigger an immediate MongoDB backup | Yes |

### Scheduled Backups
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/backup/postgres/schedule` | Schedule PostgreSQL backup. Body: `{ "delayMinutes": 60 }` | Yes |
| `POST` | `/backup/mongodb/schedule` | Schedule MongoDB backup. Body: `{ "delayMinutes": 60 }` | Yes |
| `GET` | `/backup/tasks` | List all scheduled backup tasks | Yes |
| `GET` | `/backup/tasks/:taskId` | Get details of a specific task | Yes |
| `DELETE` | `/backup/tasks/:taskId` | Cancel a scheduled task | Yes |

### Backup Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/backup/postgres/list` | List stored PostgreSQL backups | Yes |
| `GET` | `/backup/mongodb/list` | List stored MongoDB backups | Yes |
| `GET` | `/backup/download` | Get signed download URL. Query: `?fileName=...&expiresInMinutes=...` | Yes |

## Prerequisites

- Node.js
- Google Cloud Platform Project with:
  - Cloud Functions enabled
  - Cloud Pub/Sub enabled
  - Cloud Tasks enabled
  - Cloud Storage enabled
- Service Account credentials

## Setup

1. **Install dependencies:**
   ```bash
   cd express-api
   npm install
   
   cd ../cloud-functions/postgresql-backup
   npm install
   
   cd ../mongodb-backup
   npm install
   ```

2. **Environment Variables:**
   Configure `.env` in `express-api` with necessary GCP credentials and project details.

3. **Run API:**
   ```bash
   cd express-api
   npm start
   ```

