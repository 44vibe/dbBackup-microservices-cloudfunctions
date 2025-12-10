/**
 * Centralized API Service Layer
 * Simple functions to call the Express backend API
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

// Helper to get headers with API key for all requests
function getHeaders() {
  return {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
  };
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  error?: string;
}

export interface BackupFile {
  name: string;
  size: number;
  created: string;
  updated: string;
  url: string;
}

export interface ScheduledTask {
  taskName: string;
  taskId: string;
  database: 'postgres' | 'mongodb' | 'unknown';
  scheduledFor: string;
  state: 'pending' | 'dispatched';
  dispatchCount: number;
  responseCount: number;
  createTime: string;
  detailsUrl: string;
  cancelUrl: string;
}

export interface TaskDetails {
  taskName: string;
  taskId: string;
  database: string;
  scheduledFor: string;
  state: string;
  dispatchCount: number;
  responseCount: number;
  createTime: string;
  httpRequest: {
    url: string;
    httpMethod: string;
  };
}

export interface DownloadUrlResponse {
  success: boolean;
  fileName: string;
  signedUrl: string;
  expiresAt: string;
  expiresInMinutes: number;
  message: string;
}

// =============================================================================
// BACKUP FUNCTIONS - Trigger and manage database backups
// =============================================================================

// Trigger an immediate PostgreSQL backup
export async function triggerPostgresBackup(): Promise<ApiResponse> {
  const response = await fetch(`${API_URL}/backup/postgres`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to trigger PostgreSQL backup');
  return response.json();
}

// Trigger an immediate MongoDB backup
export async function triggerMongoDBBackup(): Promise<ApiResponse> {
  const response = await fetch(`${API_URL}/backup/mongodb`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to trigger MongoDB backup');
  return response.json();
}

// Get list of all PostgreSQL backup files
export async function listPostgresBackups(): Promise<ApiResponse<BackupFile[]>> {
  const response = await fetch(`${API_URL}/backup/postgres/list`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to list PostgreSQL backups');
  return response.json();
}

// Get list of all MongoDB backup files
export async function listMongoDBBackups(): Promise<ApiResponse<BackupFile[]>> {
  const response = await fetch(`${API_URL}/backup/mongodb/list`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to list MongoDB backups');
  return response.json();
}

// Schedule a PostgreSQL backup for later (delayMinutes = how many minutes from now)
export async function schedulePostgresBackup(delayMinutes: number): Promise<ApiResponse> {
  const response = await fetch(`${API_URL}/backup/postgres/schedule`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ delayMinutes }),
  });
  if (!response.ok) throw new Error('Failed to schedule PostgreSQL backup');
  return response.json();
}

// Schedule a MongoDB backup for later (delayMinutes = how many minutes from now)
export async function scheduleMongoDBBackup(delayMinutes: number): Promise<ApiResponse> {
  const response = await fetch(`${API_URL}/backup/mongodb/schedule`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ delayMinutes }),
  });
  if (!response.ok) throw new Error('Failed to schedule MongoDB backup');
  return response.json();
}

// Generate a temporary download link for a backup file
export async function generateDownloadUrl(fileName: string, expiresInMinutes = 60): Promise<DownloadUrlResponse> {
  const response = await fetch(
    `${API_URL}/backup/download?fileName=${encodeURIComponent(fileName)}&expiresInMinutes=${expiresInMinutes}`,
    { headers: getHeaders() }
  );
  if (!response.ok) throw new Error('Failed to generate download URL');
  return response.json();
}

// =============================================================================
// TASK FUNCTIONS - Manage scheduled backup tasks
// =============================================================================

// Get list of all scheduled backup tasks
export async function listTasks(): Promise<ApiResponse<ScheduledTask[]>> {
  const response = await fetch(`${API_URL}/backup/tasks`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to list tasks');
  return response.json();
}

// Get detailed information about a specific task
export async function getTaskDetails(taskId: string): Promise<ApiResponse<TaskDetails>> {
  const response = await fetch(`${API_URL}/backup/tasks/${taskId}`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to get task details');
  return response.json();
}

// Cancel a scheduled task (it won't run)
export async function cancelTask(taskId: string): Promise<ApiResponse> {
  const response = await fetch(`${API_URL}/backup/tasks/${taskId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to cancel task');
  return response.json();
}

// =============================================================================
// HEALTH CHECK FUNCTION
// =============================================================================

// Check if the API server is running
export async function healthCheck(): Promise<ApiResponse> {
  const response = await fetch(`${API_URL}/backup/health`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Health check failed');
  return response.json();
}

// =============================================================================
// GROUPED API OBJECT (for backward compatibility with existing code)
// =============================================================================

export const api = {
  backup: {
    triggerPostgresBackup,
    triggerMongoDBBackup,
    listPostgresBackups,
    listMongoDBBackups,
    schedulePostgresBackup,
    scheduleMongoDBBackup,
    generateDownloadUrl,
  },
  task: {
    listTasks,
    getTaskDetails,
    cancelTask,
  },
  health: {
    check: healthCheck,
  },
};

export default api;
