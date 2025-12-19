# Code Style Guide
**For GCP + Next.js + Express.js Stack**

> **Learning Philosophy**: This guide helps junior developers grow into production-ready engineers through clear examples, explanations, and progressive learning. Master the basics first, then tackle advanced patterns.

---

## 📚 Table of Contents
1. [Core Principles](#core-principles)
2. [Priority Checklist](#priority-checklist)
3. [TypeScript Best Practices](#typescript-best-practices)
4. [Next.js Guidelines](#nextjs-guidelines)
5. [Express.js Patterns](#expressjs-patterns)
6. [GCP Integration Rules](#gcp-integration-rules)
7. [Security Requirements](#security-requirements)
8. [Testing Standards](#testing-standards)
9. [Common Mistakes to Avoid](#common-mistakes-to-avoid)
10. [Learning Roadmap](#learning-roadmap)

---

## Core Principles

### The 4 Laws of Good Code
1. **Clarity > Cleverness**: Code is read 10x more than written
2. **Working > Perfect**: Ship working code, then improve it
3. **Tested > Trusted**: If it's not tested, it's broken
4. **Simple > Complex**: The simplest solution is usually the best

### Code Review Focus
When Gemini reviews your code, it checks for:
- ✅ **Does it work correctly?**
- ✅ **Is it secure?**
- ✅ **Can others understand it?**
- ✅ **Will it break in production?**

---

## Priority Checklist

### 🚨 MUST HAVE (Blocks Merge)
- [ ] No secrets/API keys in code
- [ ] All user inputs validated
- [ ] Error handling for external calls (GCP, DB)
- [ ] No `eval()` or `Function()` constructor
- [ ] SQL queries use parameterized statements
- [ ] Environment variables properly used

### ⚠️ SHOULD HAVE (Required but Can Merge)
- [ ] Functions under 100 lines
- [ ] Files under 400 lines
- [ ] JSDoc comments for public functions
- [ ] Tests for new business logic
- [ ] Proper error messages (not generic "Error occurred")
- [ ] No duplicate code

### 💡 NICE TO HAVE (Suggestions)
- [ ] Performance optimizations
- [ ] Inline comments for complex logic
- [ ] Alternative approaches considered
- [ ] README updated for new features

---

## TypeScript Best Practices

### 1. Always Use TypeScript in Next.js Frontend
**Why**: Catches 20% of bugs before runtime, improves IDE autocomplete, makes refactoring safer.

```typescript
// ❌ BAD: JavaScript in Next.js project
export default function BackupButton({ onClick }) {
  return <button onClick={onClick}>Backup</button>
}

// ✅ GOOD: TypeScript with proper types
interface BackupButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function BackupButton({ onClick, disabled = false }: BackupButtonProps) {
  return <button onClick={onClick} disabled={disabled}>Backup</button>
}
```

### 2. Never Use `any` Type
**Why**: `any` defeats the purpose of TypeScript. Use `unknown` if you truly don't know the type.

```typescript
// ❌ BAD
function processData(data: any) {
  return data.map(item => item.name)  // No type safety!
}

// ✅ GOOD
interface BackupFile {
  name: string;
  size: number;
  createdAt: string;
}

function processData(data: BackupFile[]) {
  return data.map(item => item.name)  // Type-safe!
}
```

### 3. Use `const` by Default, `let` Only When Needed
**Why**: `const` prevents accidental reassignment and makes code more predictable.

```typescript
// ❌ BAD
let apiUrl = "https://api.example.com"  // Never changes!
let count = 0  // This DOES change

// ✅ GOOD
const apiUrl = "https://api.example.com"  // Can't be reassigned
let count = 0  // OK to use let here
```

### 4. Type Function Returns Explicitly
**Why**: Makes functions self-documenting and catches return type errors early.

```typescript
// ❌ BAD: Return type inferred
async function fetchBackups() {
  const response = await fetch('/api/backups')
  return response.json()
}

// ✅ GOOD: Explicit return type
async function fetchBackups(): Promise<BackupFile[]> {
  const response = await fetch('/api/backups')
  return response.json()
}
```

### 5. Avoid Type Assertions Unless Necessary
**Why**: Type assertions (`as`) bypass type checking. Only use when you know more than TypeScript.

```typescript
// ❌ BAD: Unnecessary assertion
const button = document.querySelector('button') as HTMLButtonElement

// ✅ GOOD: Let TypeScript infer or use proper check
const button = document.querySelector('button')
if (button instanceof HTMLButtonElement) {
  button.disabled = true
}
```

---

## Next.js Guidelines

### 1. Use App Router (Not Pages Router)
**Your Project**: Watchdogs frontend uses Next.js 16 with App Router.

```typescript
// ✅ GOOD: App Router structure
// app/page.tsx
export default function HomePage() {
  return <div>Home</div>
}

// app/backups/page.tsx
export default function BackupsPage() {
  return <div>Backups</div>
}
```

### 2. Server Components by Default, Client Components When Needed
**Why**: Server Components reduce JavaScript bundle size and improve performance.

```typescript
// ✅ GOOD: Server Component (default)
// app/backups/page.tsx
export default async function BackupsPage() {
  const backups = await fetchBackups()  // Runs on server
  return <BackupList data={backups} />
}

// ✅ GOOD: Client Component (when needed)
// components/backup-triggers.tsx
'use client'  // Only use this when you need useState, useEffect, onClick

import { useState } from 'react'

export function BackupTrigger() {
  const [loading, setLoading] = useState(false)
  
  const handleBackup = async () => {
    setLoading(true)
    // ...
  }
  
  return <button onClick={handleBackup}>Backup</button>
}
```

**When to use 'use client':**
- `useState`, `useEffect`, `useContext`
- Event handlers (`onClick`, `onChange`)
- Browser APIs (`window`, `localStorage`)
- Third-party client-side libraries

### 3. Proper Component Organization
**Why**: Consistent structure makes code easier to read and maintain.

```typescript
// ✅ GOOD: Organized component structure
'use client'

import { useState, useEffect } from 'react'      // 1. External imports
import { Button } from '@/components/ui/button'  // 2. Internal imports
import { cn } from '@/lib/utils'                 // 3. Utils

// 4. Types and interfaces
interface BackupProps {
  database: 'postgres' | 'mongodb' | 'questdb' | 'qdrantdb';
  onSuccess?: () => void;
}

// 5. Component definition
export function BackupTrigger({ database, onSuccess }: BackupProps) {
  // 6. State hooks
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 7. Effect hooks
  useEffect(() => {
    // Side effects here
  }, [])
  
  // 8. Event handlers
  const handleBackup = async () => {
    setLoading(true)
    setError(null)
    try {
      await triggerBackup(database)
      onSuccess?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  // 9. Render logic
  return (
    <div>
      <Button onClick={handleBackup} disabled={loading}>
        {loading ? 'Backing up...' : `Backup ${database}`}
      </Button>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  )
}
```

### 4. Use React Query for Data Fetching
**Your Project**: Already uses TanStack React Query v5.

```typescript
// ✅ GOOD: React Query pattern
'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchBackups } from '@/lib/api'

export function BackupList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['backups'],
    queryFn: fetchBackups,
    refetchInterval: 30000,  // Refetch every 30 seconds
  })
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return (
    <ul>
      {data?.map(backup => (
        <li key={backup.name}>{backup.name}</li>
      ))}
    </ul>
  )
}
```

### 5. Centralized API Calls
**Your Project**: All API calls go through `src/lib/api.ts`.

```typescript
// ✅ GOOD: Centralized API client
// src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL
const API_KEY = process.env.NEXT_PUBLIC_API_KEY

async function apiFetch(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...options?.headers,
    },
  })
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }
  
  return response.json()
}

export async function triggerBackup(database: string) {
  return apiFetch(`/backup/${database}`, { method: 'POST' })
}
```

### 6. Environment Variables Must Be `NEXT_PUBLIC_` for Client Access
**Why**: Next.js only exposes variables with `NEXT_PUBLIC_` prefix to the browser.

```bash
# ✅ GOOD: .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000  # Accessible in browser
NEXT_PUBLIC_API_KEY=your-key-here          # Accessible in browser

DATABASE_URL=postgresql://...              # Server-only, NOT accessible in browser
```

---

## Express.js Patterns

### 1. Use Middleware Pattern for Common Logic
**Why**: DRY principle - don't repeat authentication, validation in every route.

```javascript
// ✅ GOOD: Middleware pattern
// src/middleware/auth.middleware.js
function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key']
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  next()  // Continue to next middleware/route
}

// src/routes/backup.routes.js
router.post('/backup/postgres', authenticateApiKey, async (req, res) => {
  // Authentication already handled by middleware!
  try {
    await triggerPostgresBackup()
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

### 2. Always Validate Input with Zod
**Your Project**: Already uses Zod for env validation in `src/config/env.js`.

```javascript
// ✅ GOOD: Input validation
const { z } = require('zod')

const scheduleBackupSchema = z.object({
  delayMinutes: z.number().min(1).max(43200),  // 1 min to 30 days
})

router.post('/backup/postgres/schedule', async (req, res) => {
  try {
    // Validate input
    const { delayMinutes } = scheduleBackupSchema.parse(req.body)
    
    // Use validated data
    await scheduleBackup('postgres', delayMinutes)
    res.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors })
    }
    res.status(500).json({ error: error.message })
  }
})
```

### 3. Proper Error Handling Pattern
**Why**: Consistent error handling improves debugging and user experience.

```javascript
// ✅ GOOD: Consistent error handling
router.post('/backup/:database', authenticateApiKey, async (req, res) => {
  const { database } = req.params
  
  try {
    // Validate database type
    const validDatabases = ['postgres', 'mongodb', 'questdb', 'qdrantdb']
    if (!validDatabases.includes(database)) {
      return res.status(400).json({ 
        error: 'Invalid database type',
        validOptions: validDatabases 
      })
    }
    
    // Perform backup
    await triggerBackup(database)
    
    res.json({ 
      success: true, 
      message: `${database} backup triggered successfully` 
    })
    
  } catch (error) {
    console.error(`Backup failed for ${database}:`, error)
    
    // Don't expose internal errors to client
    res.status(500).json({ 
      error: 'Backup failed',
      requestId: req.id,  // For tracking in logs
    })
  }
})
```

### 4. Use CommonJS (`require`/`module.exports`)
**Your Project**: Express API uses CommonJS, not ES modules.

```javascript
// ✅ GOOD: CommonJS in Express
const express = require('express')
const backupRoutes = require('./routes/backup.routes')

const app = express()
app.use('/api', backupRoutes)

module.exports = app

// ❌ BAD: Don't mix with ES modules
import express from 'express'  // Wrong for this project!
```

### 5. Environment Variables with Validation
**Your Project**: Uses Zod schema in `src/config/env.js`.

```javascript
// ✅ GOOD: Validated environment variables
const { z } = require('zod')

const envSchema = z.object({
  PORT: z.string().default('3000'),
  API_KEY: z.string().min(20, 'API key must be at least 20 characters'),
  GCP_PROJECT_ID: z.string(),
  POSTGRES_TOPIC: z.string(),
  // ... more vars
})

// Validate on startup - app crashes if invalid
const env = envSchema.parse(process.env)

module.exports = { env }
```

---

## GCP Integration Rules

### 1. Conditional Credentials Pattern
**Why**: Works both locally (with key file) and on Cloud Run (with default credentials).

```javascript
// ✅ GOOD: Conditional credentials
const { Storage } = require('@google-cloud/storage')
const { env } = require('./config/env')

const storage = new Storage({
  projectId: env.GCP_PROJECT_ID,
  // Only use keyFilename locally, not on Cloud Run
  ...(env.GOOGLE_APPLICATION_CREDENTIALS && {
    keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS
  })
})

// ❌ BAD: Always requires key file
const storage = new Storage({
  projectId: env.GCP_PROJECT_ID,
  keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS  // Breaks on Cloud Run!
})
```

### 2. Proper Secret Manager Usage
**Your Cloud Functions**: Retrieve secrets, don't hardcode them.

```javascript
// ✅ GOOD: Retrieve secrets at runtime
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager')
const client = new SecretManagerServiceClient()

async function getSecret(secretName) {
  const [version] = await client.accessSecretVersion({
    name: `projects/${projectId}/secrets/${secretName}/versions/latest`
  })
  
  return version.payload.data.toString('utf8')
}

// Usage in Cloud Function
const sshKey = await getSecret('cf-backup-ssh-key')
const vmIp = await getSecret('cf-vm-ip')
```

### 3. Always Clean Up Resources
**Why**: Prevents memory leaks and reduces costs.

```javascript
// ✅ GOOD: Clean up temp files
const fs = require('fs').promises

async function performBackup() {
  const tempFile = `/tmp/backup_${Date.now()}.sql.gz`
  
  try {
    // Create backup
    await createBackupFile(tempFile)
    
    // Upload to GCS
    await uploadToGCS(tempFile)
    
    console.log('Backup successful')
    
  } finally {
    // Always clean up, even if error occurs
    try {
      await fs.unlink(tempFile)
      console.log('Temp file cleaned up')
    } catch (err) {
      console.error('Failed to clean up temp file:', err)
    }
  }
}
```

### 4. Pub/Sub Message Structure
**Your Project**: Consistent message format across all database backups.

```javascript
// ✅ GOOD: Consistent Pub/Sub message
const message = {
  action: 'backup',
  database: 'postgres',
  triggeredBy: 'manual',  // or 'scheduled-task'
  timestamp: new Date().toISOString(),
}

await pubsub.topic(env.POSTGRES_TOPIC).publishMessage({
  json: message
})
```

### 5. Error Logging in Cloud Functions
**Why**: Cloud Logging helps debug production issues.

```javascript
// ✅ GOOD: Structured error logging
exports.postgresBackup = async (event, context) => {
  const messageData = Buffer.from(event.data, 'base64').toString()
  
  try {
    console.log('Backup started:', messageData)
    
    await performBackup()
    
    console.log('Backup completed successfully')
    return { success: true }
    
  } catch (error) {
    // Structured error for Cloud Logging
    console.error('Backup failed:', {
      error: error.message,
      stack: error.stack,
      messageData,
      timestamp: new Date().toISOString(),
    })
    
    // Throw to mark function execution as failed
    throw error
  }
}
```

---

## Security Requirements

### 🚨 CRITICAL: Never Commit Secrets

```bash
# ❌ NEVER DO THIS
const API_KEY = "sk_live_abc123xyz789"  # Hardcoded secret!
const DATABASE_URL = "postgresql://user:password@host/db"  # Exposed!

# ✅ ALWAYS USE ENVIRONMENT VARIABLES
const API_KEY = process.env.API_KEY
const DATABASE_URL = process.env.DATABASE_URL
```

### Input Validation Checklist
- [ ] All user inputs validated (use Zod)
- [ ] File uploads checked (type, size, extension)
- [ ] SQL queries use parameterized statements (no string concatenation)
- [ ] HTML outputs sanitized (prevent XSS)
- [ ] URLs validated before fetching

```javascript
// ❌ BAD: SQL injection vulnerability
const query = `SELECT * FROM backups WHERE name = '${req.query.name}'`

// ✅ GOOD: Parameterized query
const query = 'SELECT * FROM backups WHERE name = $1'
const result = await db.query(query, [req.query.name])
```

### API Key Authentication
**Your Project**: Uses `x-api-key` header for authentication.

```javascript
// ✅ GOOD: Secure API key check
function authenticateApiKey(req, res, next) {
  const providedKey = req.headers['x-api-key']
  const validKey = process.env.API_KEY
  
  // Use constant-time comparison to prevent timing attacks
  if (!providedKey || providedKey.length !== validKey.length) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  let matches = true
  for (let i = 0; i < validKey.length; i++) {
    if (providedKey[i] !== validKey[i]) {
      matches = false
    }
  }
  
  if (!matches) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  next()
}
```

---

## Testing Standards

### 1. Write Tests for Business Logic
**Minimum**: 70% code coverage for new code.

```typescript
// ✅ GOOD: Test critical functions
// __tests__/lib/api.test.ts
import { triggerBackup } from '@/lib/api'

describe('triggerBackup', () => {
  it('should call the correct API endpoint', async () => {
    const mockFetch = jest.fn(() => 
      Promise.resolve({ ok: true, json: () => ({ success: true }) })
    )
    global.fetch = mockFetch
    
    await triggerBackup('postgres')
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/backup/postgres'),
      expect.objectContaining({ method: 'POST' })
    )
  })
  
  it('should throw error on API failure', async () => {
    global.fetch = jest.fn(() => 
      Promise.resolve({ ok: false, statusText: 'Server Error' })
    )
    
    await expect(triggerBackup('postgres')).rejects.toThrow('API error')
  })
})
```

### 2. Test Edge Cases and Error Conditions

```javascript
// ✅ GOOD: Test edge cases
describe('scheduleBackup validation', () => {
  it('should reject delay less than 1 minute', () => {
    expect(() => validateDelay(0)).toThrow('Delay too short')
  })
  
  it('should reject delay more than 30 days', () => {
    expect(() => validateDelay(45000)).toThrow('Delay too long')
  })
  
  it('should accept valid delay', () => {
    expect(validateDelay(60)).toBe(60)
  })
})
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Using `var` Instead of `const`/`let`
```javascript
// ❌ BAD
var count = 0  // Function-scoped, can cause bugs

// ✅ GOOD
const count = 0  // Block-scoped, can't be reassigned
```

### ❌ Mistake 2: Not Handling Async Errors
```javascript
// ❌ BAD: Unhandled promise rejection
async function fetchData() {
  const data = await fetch('/api/data')
  return data.json()
}

// ✅ GOOD: Proper error handling
async function fetchData() {
  try {
    const response = await fetch('/api/data')
    if (!response.ok) throw new Error('Fetch failed')
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch data:', error)
    throw error
  }
}
```

### ❌ Mistake 3: Forgetting to Clean Up Resources
```javascript
// ❌ BAD: Connection leak
async function queryDatabase() {
  const client = await pool.connect()
  const result = await client.query('SELECT * FROM backups')
  return result.rows  // Client never released!
}

// ✅ GOOD: Always release connections
async function queryDatabase() {
  const client = await pool.connect()
  try {
    const result = await client.query('SELECT * FROM backups')
    return result.rows
  } finally {
    client.release()  // Always release, even on error
  }
}
```

### ❌ Mistake 4: Mixing Server and Client Code in Next.js
```typescript
// ❌ BAD: Using server-only code in client component
'use client'

import { db } from '@/lib/database'  // Database import in client component!

export function UserList() {
  const users = db.query('SELECT * FROM users')  // Won't work!
  return <div>{users.map(u => u.name)}</div>
}

// ✅ GOOD: Fetch data on server, pass to client
// app/users/page.tsx (Server Component)
async function fetchUsers() {
  return db.query('SELECT * FROM users')
}

export default async function UsersPage() {
  const users = await fetchUsers()
  return <UserList users={users} />  // Pass as prop
}

// components/user-list.tsx (Client Component)
'use client'

export function UserList({ users }: { users: User[] }) {
  return <div>{users.map(u => u.name)}</div>
}
```

### ❌ Mistake 5: Using `any` Type in TypeScript
```typescript
// ❌ BAD: Loses all type safety
function processBackup(data: any) {
  return data.files.map(f => f.name)  // No autocomplete, no errors!
}

// ✅ GOOD: Proper types
interface BackupData {
  files: Array<{ name: string; size: number }>;
}

function processBackup(data: BackupData) {
  return data.files.map(f => f.name)  // Full type safety!
}
```

---

## Learning Roadmap

### 🎯 Week 1-2: Foundation (Must Master)
Focus: Security and basic code quality
- [ ] Never commit secrets (.env files in .gitignore)
- [ ] Always validate user inputs
- [ ] Use `const` and `let` (never `var`)
- [ ] Write functions under 100 lines
- [ ] Add try-catch for async operations

**Goal**: Code that passes security checks and doesn't crash.

### 🎯 Week 3-4: Code Quality (Level Up)
Focus: Clean, maintainable code
- [ ] Add JSDoc comments to public functions
- [ ] Avoid duplicate code (DRY principle)
- [ ] Use meaningful variable names
- [ ] Keep functions focused (single responsibility)
- [ ] Write basic unit tests

**Goal**: Code that others can understand and maintain.

### 🎯 Week 5-8: Patterns (Professional Level)
Focus: Framework-specific best practices
- [ ] Next.js: Use Server Components by default
- [ ] Express: Middleware pattern for auth
- [ ] GCP: Conditional credentials pattern
- [ ] React Query for data fetching
- [ ] Zod for validation

**Goal**: Code that follows industry standards.

### 🎯 Week 9-12: Advanced (Production Ready)
Focus: Performance, testing, architecture
- [ ] Optimize bundle size and rendering
- [ ] 70%+ test coverage
- [ ] Proper error logging and monitoring
- [ ] Documentation for complex logic
- [ ] Code reviews for team collaboration

**Goal**: Production-ready, scalable applications.

---

## Questions to Ask Yourself Before Committing

1. **Security**: Can I safely show this code to anyone? No secrets?
2. **Testing**: If I change this, how will I know it still works?
3. **Error Handling**: What happens if this API call fails?
4. **Readability**: Will I understand this code in 6 months?
5. **Performance**: Will this slow down the app with 10,000 users?

---

## Resources and Documentation

### Official Docs (Always Check First)
- **Next.js**: https://nextjs.org/docs
- **React**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org/docs
- **Google Cloud**: https://cloud.google.com/docs
- **Express**: https://expressjs.com/en/guide/routing.html

### Your Project Specific
- See `CLAUDE.md` for architecture details
- `express-api/src/config/env.js` for required environment variables
- `watchdogs/src/lib/api.ts` for API client usage

### Code Review Philosophy
- **Google's Code Review Guide**: https://google.github.io/eng-practices/review/
- Focus: Design, functionality, complexity, tests, naming, comments, style
- Balance between perfectionism and progress

---

## Remember

> **"Make it work, make it right, make it fast — in that order."**
> - Kent Beck

Start with working code, then refactor for quality, then optimize for performance. Don't try to write perfect code on the first try — iterate and improve!

Good luck! 🚀