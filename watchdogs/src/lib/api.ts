/**
 * Centralized API Service Layer
 * Simple functions to call the Express backend API
 */

// Direct API calls with CORS
// Local: http://localhost:3000 | Production: Set NEXT_PUBLIC_API_URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

// Helper to get headers with API key for all requests
function getHeaders() {
  return {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
  };
}

// API Response Types
export interface ApiResponse<T = unknown> {
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
  database: 'postgres' | 'mongodb' | 'questdb' | 'qdrantdb';
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
  database: 'postgres' | 'mongodb' | 'questdb' | 'qdrantdb';
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

export interface CreateTxtRecordRequest {
  domain: string;
  content: string;
  name?: string; // Default '@'
  ttl?: number;  // Default 120
  zoneId?: string;
}

export interface TxtRecordResponse {
  success: boolean;
  message: string;
  data?: {
    domain: string;
    recordId: string;
    recordName: string;
    recordValue: string;
    recordType: string;
    ttl: number;
    zoneId: string;
    createdAt: string;
  };
}

export interface UpdateTxtRecordRequest {
  domain: string;
  recordId: string;
  content: string;
  ttl?: number;
  zoneId?: string;
}

// Update existing TXT record via Cloudflare API
export async function updateTxtRecord(request: UpdateTxtRecordRequest): Promise<TxtRecordResponse> {
  const response = await fetch(`${API_URL}/backup/domain/txt-record`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update TXT record');
  }
  return response.json();
}

export interface DomainVerificationResult {
  verified: boolean;
  domain: string;
  token: string;
  txtRecordName: string;
  foundRecords: string[];
  verifiedAt?: string;
  reason?: string;
}

export interface CloudflareZone {
  id: string;
  name: string;
  status: string;
  paused: boolean;
  type: string;
  nameServers: string[];
  createdOn: string;
  modifiedOn: string;
  // Expiration fields from RDAP
  expirationDate?: string;
  registrationDate?: string;
  daysUntilExpiration?: number;
  registrar?: string;
}

export interface DnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
  createdOn: string;
  modifiedOn: string;
  comment?: string;
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

// Trigger an immediate QuestDB backup
export async function triggerQuestDBBackup(): Promise<ApiResponse> {
  const response = await fetch(`${API_URL}/backup/questdb`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to trigger QuestDB backup');
  return response.json();
}

// Trigger an immediate QdrantDB backup
export async function triggerQdrantDBBackup(): Promise<ApiResponse> {
  const response = await fetch(`${API_URL}/backup/qdrantdb`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to trigger QdrantDB backup');
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


// Get list of all QuestDB backup files
export async function listQuestDBBackups(): Promise<ApiResponse<BackupFile[]>> {
  const response = await fetch(`${API_URL}/backup/questdb/list`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to list QuestDB backups');
  return response.json();
}


// Get list of all QdrantDB backup files
export async function listQdrantDBBackups(): Promise<ApiResponse<BackupFile[]>> {
  const response = await fetch(`${API_URL}/backup/qdrantdb/list`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to list QdrantDB backups');
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

// Schedule a QuestDB backup for later (delayMinutes = how many minutes from now)
export async function scheduleQuestDBBackup(delayMinutes: number): Promise<ApiResponse> {
  const response = await fetch(`${API_URL}/backup/questdb/schedule`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ delayMinutes }),
  });
  if (!response.ok) throw new Error('Failed to schedule QuestDB backup');
  return response.json();
}

// Schedule a QdrantDB backup for later (delayMinutes = how many minutes from now)
export async function scheduleQdrantDBBackup(delayMinutes: number): Promise<ApiResponse> {
  const response = await fetch(`${API_URL}/backup/qdrantdb/schedule`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ delayMinutes }),
  });
  if (!response.ok) throw new Error('Failed to schedule QdrantDB backup');
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

// Delete a backup file from GCS
export async function deleteBackupFile(fileName: string): Promise<ApiResponse> {
  const response = await fetch(
    `${API_URL}/backup/delete?fileName=${encodeURIComponent(fileName)}`,
    {
      method: 'DELETE',
      headers: getHeaders(),
    }
  );
  if (!response.ok) throw new Error('Failed to delete backup file');
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

// Cancel a scheduled task 
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
// DOMAIN VERIFICATION FUNCTIONS
// =============================================================================

// Create a TXT record via Cloudflare API
export async function createTxtRecord(request: CreateTxtRecordRequest): Promise<TxtRecordResponse> {
  const response = await fetch(`${API_URL}/backup/domain/insert-txt`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create TXT record');
  }
  return response.json();
}

// Remove TXT record from Cloudflare after verification
export async function removeDomainTxtRecord(
  domain: string,
  recordId: string,
  zoneId?: string
): Promise<ApiResponse> {
  const response = await fetch(`${API_URL}/backup/domain/txt-record`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ domain, recordId, zoneId }),
  });
  if (!response.ok) throw new Error('Failed to remove TXT record');
  return response.json();
}

// List all domains in Cloudflare account
export async function listCloudflareZones(): Promise<ApiResponse<CloudflareZone[]>> {
  const response = await fetch(`${API_URL}/backup/domain/list`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to list Cloudflare domains');
  return response.json();
}

// List all DNS records for a specific domain
export async function listDnsRecords(domain: string, zoneId?: string): Promise<ApiResponse<DnsRecord[]>> {
  const url = `${API_URL}/backup/domain/${encodeURIComponent(domain)}/records${zoneId ? `?zoneId=${zoneId}` : ''}`;
  const response = await fetch(url, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to list DNS records');
  return response.json();
}

// =============================================================================
// GROUPED API OBJECT (for backward compatibility with existing code)
// =============================================================================

export const api = {
  backup: {
    triggerPostgresBackup,
    triggerMongoDBBackup,
    triggerQuestDBBackup,
    triggerQdrantDBBackup,
    listPostgresBackups,
    listMongoDBBackups,
    listQuestDBBackups,
    listQdrantDBBackups,
    schedulePostgresBackup,
    scheduleMongoDBBackup,
    scheduleQuestDBBackup,
    scheduleQdrantDBBackup,
    generateDownloadUrl,
    deleteBackupFile,
  },
  task: {
    listTasks,
    getTaskDetails,
    cancelTask,
  },
  domain: {
    list: listCloudflareZones,
    listRecords: listDnsRecords,
    createTxtRecord: createTxtRecord,
    updateTxtRecord: updateTxtRecord,
    removeTxtRecord: removeDomainTxtRecord,
  },
  health: {
    check: healthCheck,
  },
};

export default api;
