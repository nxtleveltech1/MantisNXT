# Authentication System Deployment Runbook

> **Version:** 1.0.0
> **Last Updated:** 2025-11-04
> **Owner:** AS Team (Auth & Security)
> **Status:** Ready for Review
> **Migration:** `0021_comprehensive_auth_system.sql`

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Environment Setup](#environment-setup)
4. [Migration Execution Strategy](#migration-execution-strategy)
5. [Zero-Downtime Deployment](#zero-downtime-deployment)
6. [Testing Strategy](#testing-strategy)
7. [Rollback Procedures](#rollback-procedures)
8. [Monitoring & Alerting](#monitoring--alerting)
9. [Risk Mitigation](#risk-mitigation)
10. [Communication Plan](#communication-plan)
11. [Emergency Response](#emergency-response)
12. [Post-Deployment Verification](#post-deployment-verification)

---

## Overview

### Mission
Deploy MantisNXT's comprehensive authentication system with **zero downtime** and **100% data integrity**, transitioning from mock auth (`DISABLE_AUTH=true`) to production-ready Neon Auth (Stack Auth) integration with full RBAC capabilities.

### Architecture
- **Platform:** Next.js 15.5.3 on Vercel
- **Database:** Neon PostgreSQL (Serverless)
- **Auth Provider:** Neon Auth (Stack Auth)
- **Current State:** Mock authentication with DISABLE_AUTH=true
- **Target State:** Full RBAC with Neon Auth integration

### Critical Success Factors
- ✅ Zero data loss during migration
- ✅ No user-facing downtime
- ✅ Backward compatibility maintained
- ✅ All existing sessions preserved
- ✅ Rollback capability at every stage

---

## Pre-Deployment Checklist

### 1. Team Readiness

```bash
□ All team members briefed on deployment plan
□ Roles and responsibilities assigned
□ Emergency contact list updated
□ Backup personnel identified
□ War room/Slack channel established
```

### 2. Infrastructure Validation

```bash
# Verify Neon database connectivity
npm run db:validate

# Check Vercel deployment status
vercel env ls

# Validate all environment variables
./scripts/validate-env.sh

# Verify backup systems operational
npm run db:backup:test
```

### 3. Code Readiness

```bash
# Run all tests
npm run test:all

# Type checking
npm run type-check

# Lint and format
npm run lint:fix && npm run format

# Security scan
npm run test:security

# Bundle analysis
npm run analyze
```

### 4. Database Preparation

```bash
# Validate current schema
npm run db:validate:full

# Create full backup
npm run db:backup:create -- --tag pre-auth-migration

# Verify backup integrity
npm run db:backup:verify

# Test restore procedure
npm run db:backup:restore -- --dry-run
```

### 5. Documentation Review

```bash
□ Migration script reviewed by 2+ developers
□ Rollback procedures documented and tested
□ API documentation updated
□ User communication drafted
□ Incident response plan reviewed
```

---

## Environment Setup

### Environment Variables Matrix

#### Development Environment

```bash
# .env.development
NODE_ENV=development
DISABLE_AUTH=true  # Keep enabled during development

# Neon Database (Development Branch)
NEON_DATABASE_URL=postgresql://user:pass@dev-branch.neon.tech/mantisnxt_dev
NEON_BRANCH_NAME=dev

# Neon Auth (Stack Auth) - Development
STACK_AUTH_PROJECT_ID=proj_dev_xxxxx
STACK_AUTH_PUBLISHABLE_KEY=pk_dev_xxxxx
STACK_AUTH_SECRET_KEY=sk_dev_xxxxx

# Feature Flags
AUTH_FEATURE_FLAG_ENABLED=true
AUTH_ROLLOUT_PERCENTAGE=0  # No users during dev

# Session Configuration
SESSION_COOKIE_NAME=mantisnxt_session_dev
SESSION_SECRET=dev_secret_min_32_chars_random
SESSION_MAX_AGE=86400  # 24 hours

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

#### Staging Environment

```bash
# .env.staging
NODE_ENV=production
DISABLE_AUTH=false  # Test with auth enabled

# Neon Database (Staging Branch)
NEON_DATABASE_URL=postgresql://user:pass@staging-branch.neon.tech/mantisnxt_staging
NEON_BRANCH_NAME=staging

# Neon Auth (Stack Auth) - Staging
STACK_AUTH_PROJECT_ID=proj_staging_xxxxx
STACK_AUTH_PUBLISHABLE_KEY=pk_staging_xxxxx
STACK_AUTH_SECRET_KEY=sk_staging_xxxxx

# Feature Flags
AUTH_FEATURE_FLAG_ENABLED=true
AUTH_ROLLOUT_PERCENTAGE=100  # All staging users

# Session Configuration
SESSION_COOKIE_NAME=mantisnxt_session_staging
SESSION_SECRET=staging_secret_min_32_chars_random_secure
SESSION_MAX_AGE=86400

# Monitoring
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_ENVIRONMENT=staging
LOG_LEVEL=debug

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=60000
```

#### Production Environment

```bash
# .env.production
NODE_ENV=production
DISABLE_AUTH=false

# Neon Database (Main Branch)
NEON_DATABASE_URL=postgresql://user:pass@main-branch.neon.tech/mantisnxt_prod
NEON_BRANCH_NAME=main

# Neon Auth (Stack Auth) - Production
STACK_AUTH_PROJECT_ID=proj_prod_xxxxx
STACK_AUTH_PUBLISHABLE_KEY=pk_prod_xxxxx
STACK_AUTH_SECRET_KEY=sk_prod_xxxxx

# Feature Flags
AUTH_FEATURE_FLAG_ENABLED=true
AUTH_ROLLOUT_PERCENTAGE=5  # Start with 5% rollout

# Session Configuration
SESSION_COOKIE_NAME=__Secure-mantisnxt_session
SESSION_SECRET=prod_secret_min_64_chars_random_very_secure
SESSION_MAX_AGE=86400
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTP_ONLY=true
SESSION_COOKIE_SAME_SITE=lax

# Security
CSRF_TOKEN_SECRET=prod_csrf_secret_min_32_chars_random
ALLOWED_ORIGINS=https://mantisnxt.com,https://www.mantisnxt.com
CORS_ENABLED=true

# Monitoring
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_ENVIRONMENT=production
LOG_LEVEL=info
METRICS_ENABLED=true

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=5000
RATE_LIMIT_WINDOW_MS=60000

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 */6 * * *  # Every 6 hours
BACKUP_RETENTION_DAYS=30
```

### Environment Setup Scripts

Create `scripts/setup-environment.sh`:

```bash
#!/bin/bash
# Setup environment for auth system deployment

set -e

ENVIRONMENT=${1:-development}

echo "Setting up $ENVIRONMENT environment..."

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
  echo "Error: Invalid environment. Use: development, staging, or production"
  exit 1
fi

# Check required tools
command -v psql >/dev/null 2>&1 || { echo "psql required but not installed. Aborting." >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js required but not installed. Aborting." >&2; exit 1; }
command -v vercel >/dev/null 2>&1 || { echo "Vercel CLI required but not installed. Aborting." >&2; exit 1; }

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
  export $(cat ".env.$ENVIRONMENT" | grep -v '^#' | xargs)
else
  echo "Error: .env.$ENVIRONMENT file not found"
  exit 1
fi

# Verify Neon connection
echo "Verifying Neon database connection..."
psql "$NEON_DATABASE_URL" -c "SELECT 1" >/dev/null || {
  echo "Error: Cannot connect to Neon database"
  exit 1
}

# Verify Neon Auth (Stack Auth) configuration
echo "Verifying Neon Auth configuration..."
if [ -z "$STACK_AUTH_PROJECT_ID" ] || [ -z "$STACK_AUTH_SECRET_KEY" ]; then
  echo "Error: Missing Neon Auth credentials"
  exit 1
fi

# Create database branch for deployment (non-production)
if [ "$ENVIRONMENT" != "production" ]; then
  echo "Creating/updating Neon branch: $NEON_BRANCH_NAME..."
  # Use Neon CLI or API to create/update branch
fi

# Run migrations (dry-run first)
echo "Testing migration (dry-run)..."
npm run db:migrate:verify

echo "✅ Environment setup complete for $ENVIRONMENT"
```

---

## Migration Execution Strategy

### Migration File Structure

```
database/migrations/
├── 0021_comprehensive_auth_system.sql          # Main migration
├── 0021_rollback.sql                          # Rollback script
├── 0021_verification.sql                      # Verification queries
└── 0021_data_migration.sql                    # Data migration script
```

### Phase 1: Pre-Migration (15 minutes)

```bash
# 1.1 Create immutable backup
BACKUP_TAG="auth-migration-$(date +%Y%m%d-%H%M%S)"
npm run db:backup:create -- --tag "$BACKUP_TAG"

# 1.2 Verify backup
npm run db:backup:verify -- --tag "$BACKUP_TAG"

# 1.3 Enable maintenance mode (if applicable)
vercel env add MAINTENANCE_MODE true

# 1.4 Set read-only mode (optional safety)
psql "$NEON_DATABASE_URL" << EOF
-- Revoke write permissions from app user (temporarily)
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM app_user;
EOF

# 1.5 Take database snapshot (Neon-specific)
# This allows instant recovery via Neon's point-in-time restore
echo "Current timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
```

### Phase 2: Schema Migration (10 minutes)

```sql
-- Step 2.1: Create auth schema if not exists
CREATE SCHEMA IF NOT EXISTS auth;

-- Step 2.2: Create enums (idempotent)
-- See migration file lines 14-92

-- Step 2.3: Create core tables
-- IMPORTANT: Run in transaction for atomicity
BEGIN;

-- Create auth.users_extended
-- See migration file lines 100-181

-- Create auth.roles
-- See migration file lines 196-227

-- Create auth.permissions
-- See migration file lines 230-254

-- Create all other tables...
-- See migration file lines 257-509

-- Verify table creation
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'auth';
-- Expected: 12 tables

COMMIT;
```

**Checkpoint 2.1: Schema Validation**

```bash
# Run automated verification
npm run db:migrate:verify -- --migration 0021

# Manual verification query
psql "$NEON_DATABASE_URL" -f database/migrations/0021_verification.sql
```

**Go/No-Go Decision Point**
- ✅ All tables created successfully
- ✅ No errors in transaction log
- ✅ Verification queries pass
- ❌ ANY failure → Execute rollback (see Phase 8)

### Phase 3: Data Migration (20 minutes)

```sql
-- Step 3.1: Migrate existing user data
-- Assuming existing users are in public.profile table

BEGIN;

-- Identify organization for migration
WITH default_org AS (
  SELECT id FROM organization LIMIT 1
)
-- Migrate users from profile to auth.users_extended
INSERT INTO auth.users_extended (
  id,
  email,
  email_verified,
  first_name,
  last_name,
  display_name,
  avatar_url,
  phone,
  org_id,
  is_active,
  created_at,
  updated_at
)
SELECT
  p.id,
  p.email,
  COALESCE(p.email_verified, false),
  p.first_name,
  p.last_name,
  COALESCE(p.display_name, p.first_name || ' ' || p.last_name, p.email),
  p.avatar_url,
  p.phone,
  (SELECT id FROM default_org),
  true,
  p.created_at,
  p.updated_at
FROM public.profile p
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users_extended ue WHERE ue.id = p.id
);

-- Verify migration
SELECT
  (SELECT COUNT(*) FROM public.profile) as original_count,
  (SELECT COUNT(*) FROM auth.users_extended) as migrated_count;
-- Counts should match

COMMIT;
```

**Checkpoint 3.1: Data Integrity Validation**

```bash
# Run data integrity checks
npm run db:validate -- --check-auth-migration

# Verify no data loss
psql "$NEON_DATABASE_URL" << EOF
-- Check for missing users
SELECT p.id, p.email
FROM public.profile p
LEFT JOIN auth.users_extended ue ON p.id = ue.id
WHERE ue.id IS NULL;
-- Should return 0 rows
EOF
```

### Phase 4: Create System Roles & Permissions (5 minutes)

```sql
-- Step 4.1: Insert system permissions (idempotent)
-- See migration file lines 829-860

-- Step 4.2: Create default roles for first organization
BEGIN;

WITH first_org AS (
  SELECT id FROM organization LIMIT 1
)
INSERT INTO auth.roles (org_id, name, slug, description, is_system_role, role_level) VALUES
  ((SELECT id FROM first_org), 'Super Administrator', 'super_admin', 'Full system access', true, 100),
  ((SELECT id FROM first_org), 'Administrator', 'admin', 'Organization administration', true, 80),
  ((SELECT id FROM first_org), 'Manager', 'manager', 'Department management', true, 60),
  ((SELECT id FROM first_org), 'User', 'user', 'Standard user access', true, 40),
  ((SELECT id FROM first_org), 'Viewer', 'viewer', 'Read-only access', true, 20)
ON CONFLICT (org_id, slug) DO NOTHING;

COMMIT;
```

### Phase 5: Assign Default Roles (10 minutes)

```sql
-- Step 5.1: Assign 'user' role to all migrated users
BEGIN;

WITH user_role AS (
  SELECT id FROM auth.roles WHERE slug = 'user' LIMIT 1
)
INSERT INTO auth.user_roles (user_id, role_id)
SELECT
  ue.id,
  (SELECT id FROM user_role)
FROM auth.users_extended ue
WHERE NOT EXISTS (
  SELECT 1 FROM auth.user_roles ur WHERE ur.user_id = ue.id
);

-- Step 5.2: Identify and promote first user to super_admin
WITH super_admin_role AS (
  SELECT id FROM auth.roles WHERE slug = 'super_admin' LIMIT 1
),
first_user AS (
  SELECT id FROM auth.users_extended ORDER BY created_at ASC LIMIT 1
)
INSERT INTO auth.user_roles (user_id, role_id)
SELECT
  (SELECT id FROM first_user),
  (SELECT id FROM super_admin_role)
ON CONFLICT (user_id, role_id) DO NOTHING;

COMMIT;
```

### Phase 6: Enable Functions & Triggers (5 minutes)

```sql
-- Step 6.1: Create helper functions
-- See migration file lines 576-674

-- Step 6.2: Create triggers
-- See migration file lines 681-738

-- Step 6.3: Test functions
BEGIN;
-- Test user_has_permission function
SELECT auth.user_has_permission(
  (SELECT id FROM auth.users_extended LIMIT 1),
  'users:read'
);
ROLLBACK;  -- Don't commit test
```

### Phase 7: Enable RLS Policies (5 minutes)

```sql
-- Step 7.1: Enable RLS on all tables
-- See migration file lines 744-756

-- Step 7.2: Create policies
-- See migration file lines 758-822

-- Step 7.3: Test policies
-- Must be done through application with actual user context
```

**Checkpoint 7.1: RLS Validation**

```bash
# Test RLS policies through API
npm run test:api -- --grep "Auth RLS"

# Manual verification
psql "$NEON_DATABASE_URL" << EOF
-- Verify RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'auth';
-- All should show rowsecurity = true
EOF
```

### Phase 8: Rollback Procedure (Emergency Use Only)

Create `database/migrations/0021_rollback.sql`:

```sql
-- ============================================================================
-- EMERGENCY ROLLBACK: 0021_comprehensive_auth_system.sql
-- ============================================================================
-- WARNING: This will drop all authentication tables and data
-- Only use if migration fails and backup restore is not feasible
-- ============================================================================

BEGIN;

-- Drop all triggers
DROP TRIGGER IF EXISTS audit_users_extended_changes ON auth.users_extended;
DROP TRIGGER IF EXISTS update_system_config_updated_at ON auth.system_config;
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON auth.user_preferences;
DROP TRIGGER IF EXISTS update_roles_updated_at ON auth.roles;
DROP TRIGGER IF EXISTS update_users_extended_updated_at ON auth.users_extended;

-- Drop all functions
DROP FUNCTION IF EXISTS auth.audit_user_changes() CASCADE;
DROP FUNCTION IF EXISTS auth.log_audit_event(UUID, UUID, audit_event_type, TEXT, TEXT, UUID, JSONB, JSONB, JSONB) CASCADE;
DROP FUNCTION IF EXISTS auth.get_user_permissions(UUID) CASCADE;
DROP FUNCTION IF EXISTS auth.user_has_permission(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS auth.update_updated_at_column() CASCADE;

-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS auth.feature_flags CASCADE;
DROP TABLE IF EXISTS auth.system_config CASCADE;
DROP TABLE IF EXISTS auth.user_preferences CASCADE;
DROP TABLE IF EXISTS auth.login_history CASCADE;
DROP TABLE IF EXISTS auth.audit_events CASCADE;
DROP TABLE IF EXISTS auth.user_sessions CASCADE;
DROP TABLE IF EXISTS auth.user_permissions CASCADE;
DROP TABLE IF EXISTS auth.user_roles CASCADE;
DROP TABLE IF EXISTS auth.role_permissions CASCADE;
DROP TABLE IF EXISTS auth.permissions CASCADE;
DROP TABLE IF EXISTS auth.roles CASCADE;
DROP TABLE IF EXISTS auth.users_extended CASCADE;

-- Drop all enums
DROP TYPE IF EXISTS bee_status_type CASCADE;
DROP TYPE IF EXISTS employment_equity_type CASCADE;
DROP TYPE IF EXISTS audit_event_type CASCADE;
DROP TYPE IF EXISTS session_status CASCADE;
DROP TYPE IF EXISTS permission_action CASCADE;
DROP TYPE IF EXISTS user_role_type CASCADE;

-- Drop schema (only if empty)
DROP SCHEMA IF EXISTS auth CASCADE;

COMMIT;

-- Restore from backup
-- Run: npm run db:backup:restore -- --tag <backup_tag>
```

**Rollback Execution Steps:**

```bash
# 1. Stop all application traffic
vercel env add MAINTENANCE_MODE true

# 2. Execute rollback SQL
psql "$NEON_DATABASE_URL" -f database/migrations/0021_rollback.sql

# 3. Restore from backup (preferred method)
npm run db:backup:restore -- --tag "$BACKUP_TAG"

# OR use Neon's point-in-time restore
# Navigate to Neon console → Select timestamp before migration

# 4. Verify database state
npm run db:validate

# 5. Re-enable old authentication
vercel env add DISABLE_AUTH true

# 6. Restart application
vercel deploy --prod

# 7. Disable maintenance mode
vercel env rm MAINTENANCE_MODE
```

### Migration Execution Timeline

| Phase | Duration | Description | Checkpoint |
|-------|----------|-------------|------------|
| 0: Pre-migration | 15 min | Backup, read-only mode | Backup verified |
| 1: Schema creation | 10 min | Create tables, indexes | Tables exist |
| 2: Data migration | 20 min | Migrate users, profiles | Data integrity check |
| 3: Roles & permissions | 5 min | Create system roles | Roles verified |
| 4: User role assignment | 10 min | Assign default roles | All users have roles |
| 5: Functions & triggers | 5 min | Enable automation | Functions work |
| 6: RLS policies | 5 min | Enable row-level security | Policies active |
| 7: Post-migration | 10 min | Verification, monitoring | All checks pass |
| **Total** | **80 min** | **Full migration** | **Go-live decision** |

---

## Zero-Downtime Deployment

### Strategy: Blue-Green Deployment with Feature Flags

```
┌─────────────────────────────────────────────────────────────┐
│                    Zero-Downtime Strategy                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Step 1: Deploy new code (auth disabled via feature flag)   │
│  Step 2: Run database migration                              │
│  Step 3: Enable auth for 5% of users                        │
│  Step 4: Monitor metrics for 30 minutes                     │
│  Step 5: Gradually increase to 10%, 25%, 50%, 100%         │
│  Step 6: Remove feature flag, make permanent                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Steps

#### Step 1: Deploy New Code (Auth Disabled)

```bash
# 1.1 Deploy to Vercel with auth disabled
vercel env add AUTH_FEATURE_FLAG_ENABLED true
vercel env add AUTH_ROLLOUT_PERCENTAGE 0
vercel deploy --prod

# 1.2 Verify deployment
curl https://mantisnxt.com/api/health
# Should return: { "status": "ok", "auth": "disabled" }

# 1.3 Run smoke tests
npm run test:e2e -- --grep "@smoke"
```

#### Step 2: Run Database Migration

```bash
# 2.1 Execute migration on production database
npm run db:migrate -- --environment production

# 2.2 Verify migration
npm run db:migrate:verify

# 2.3 Run data integrity checks
npm run db:validate -- --check-auth-migration
```

#### Step 3: Canary Rollout (5% Users)

```bash
# 3.1 Enable auth for 5% of traffic
vercel env add AUTH_ROLLOUT_PERCENTAGE 5

# 3.2 Deploy updated environment
vercel deploy --prod

# 3.3 Monitor for 30 minutes
npm run monitor:auth -- --duration 30m
```

**Monitoring Checklist (30 minutes):**

```bash
✅ Error rate < 0.1%
✅ P95 latency < 200ms
✅ No authentication failures
✅ No database connection errors
✅ User sessions stable
✅ No rollback triggers
```

#### Step 4: Gradual Rollout

```bash
# 4.1 Increase to 10% (if 5% successful)
vercel env add AUTH_ROLLOUT_PERCENTAGE 10
vercel deploy --prod
# Wait 30 minutes, monitor

# 4.2 Increase to 25%
vercel env add AUTH_ROLLOUT_PERCENTAGE 25
vercel deploy --prod
# Wait 30 minutes, monitor

# 4.3 Increase to 50%
vercel env add AUTH_ROLLOUT_PERCENTAGE 50
vercel deploy --prod
# Wait 1 hour, monitor

# 4.4 Increase to 100%
vercel env add AUTH_ROLLOUT_PERCENTAGE 100
vercel deploy --prod
# Wait 2 hours, monitor
```

#### Step 5: Feature Flag Removal

```bash
# 5.1 Remove feature flag code (after 7 days of stable 100%)
git checkout -b remove-auth-feature-flag
# Remove feature flag logic from codebase
git commit -m "Remove auth feature flag - full rollout complete"
git push origin remove-auth-feature-flag

# 5.2 Create PR and merge after review

# 5.3 Deploy to production
vercel deploy --prod

# 5.4 Clean up environment variables
vercel env rm AUTH_FEATURE_FLAG_ENABLED
vercel env rm AUTH_ROLLOUT_PERCENTAGE
vercel env rm DISABLE_AUTH  # Remove completely
```

### Feature Flag Implementation

Create `src/lib/auth/feature-flag.ts`:

```typescript
/**
 * Authentication Feature Flag Manager
 * Controls gradual rollout of new auth system
 */

interface AuthFeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage: number;
}

class AuthFeatureFlag {
  private config: AuthFeatureFlagConfig;

  constructor() {
    this.config = {
      enabled: process.env.AUTH_FEATURE_FLAG_ENABLED === 'true',
      rolloutPercentage: parseInt(process.env.AUTH_ROLLOUT_PERCENTAGE || '0', 10),
    };
  }

  /**
   * Determine if new auth should be used for this request
   * Uses consistent hashing based on user ID or session ID
   */
  shouldUseNewAuth(userId?: string, sessionId?: string): boolean {
    // If feature flag disabled, use old auth
    if (!this.config.enabled) {
      return false;
    }

    // If 100% rollout, always use new auth
    if (this.config.rolloutPercentage >= 100) {
      return true;
    }

    // If 0% rollout, never use new auth
    if (this.config.rolloutPercentage <= 0) {
      return false;
    }

    // Consistent hash-based rollout
    const identifier = userId || sessionId || 'anonymous';
    const hash = this.simpleHash(identifier);
    const userPercentile = (hash % 100) + 1;

    return userPercentile <= this.config.rolloutPercentage;
  }

  /**
   * Simple hash function for consistent rollout
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get current configuration
   */
  getConfig(): AuthFeatureFlagConfig {
    return { ...this.config };
  }
}

export const authFeatureFlag = new AuthFeatureFlag();
```

Usage in middleware:

```typescript
// src/middleware.ts
import { authFeatureFlag } from '@/lib/auth/feature-flag';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const userId = request.cookies.get('user_id')?.value;
  const sessionId = request.cookies.get('session_id')?.value;

  // Determine which auth system to use
  const useNewAuth = authFeatureFlag.shouldUseNewAuth(userId, sessionId);

  if (useNewAuth) {
    // Use new Neon Auth system
    return await handleNewAuth(request);
  } else {
    // Use legacy auth (or no auth if DISABLE_AUTH=true)
    return await handleLegacyAuth(request);
  }
}
```

---

## Testing Strategy

### 1. Unit Tests

```bash
# Auth service tests
npm run test:api -- --testPathPattern=auth

# Permission tests
npm run test -- --testPathPattern=permissions

# Role tests
npm run test -- --testPathPattern=roles

# Session tests
npm run test -- --testPathPattern=sessions
```

**Required Test Coverage:**
- ✅ 90%+ code coverage for auth modules
- ✅ All permission checks
- ✅ Role hierarchy logic
- ✅ Session management
- ✅ Token validation
- ✅ RLS policies

### 2. Integration Tests

Create `tests/integration/auth-system.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { testDb, createTestUser, cleanupTestData } from '../helpers/test-db';

describe('Auth System Integration Tests', () => {
  beforeAll(async () => {
    await testDb.connect();
  });

  afterAll(async () => {
    await cleanupTestData();
    await testDb.disconnect();
  });

  describe('User Registration', () => {
    it('should create user with default role', async () => {
      const user = await createTestUser({
        email: 'test@example.com',
        password: 'SecurePass123!',
      });

      expect(user.id).toBeDefined();
      expect(user.roles).toContain('user');
    });

    it('should create user preferences on registration', async () => {
      const user = await createTestUser();
      const prefs = await testDb.query(
        'SELECT * FROM auth.user_preferences WHERE user_id = $1',
        [user.id]
      );

      expect(prefs.rows).toHaveLength(1);
      expect(prefs.rows[0].language).toBe('en');
      expect(prefs.rows[0].timezone).toBe('Africa/Johannesburg');
    });
  });

  describe('Authentication', () => {
    it('should authenticate user with valid credentials', async () => {
      const user = await createTestUser();
      const session = await authenticateUser(user.email, 'password');

      expect(session.token).toBeDefined();
      expect(session.userId).toBe(user.id);
    });

    it('should reject invalid credentials', async () => {
      const user = await createTestUser();
      await expect(
        authenticateUser(user.email, 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should track failed login attempts', async () => {
      const user = await createTestUser();

      // Attempt 3 failed logins
      for (let i = 0; i < 3; i++) {
        try {
          await authenticateUser(user.email, 'wrongpassword');
        } catch {}
      }

      const history = await testDb.query(
        'SELECT * FROM auth.login_history WHERE user_id = $1 AND success = false',
        [user.id]
      );

      expect(history.rows.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Authorization (RBAC)', () => {
    it('should enforce role-based permissions', async () => {
      const user = await createTestUser({ roles: ['user'] });

      // User should have read permissions
      const canRead = await checkPermission(user.id, 'users:read');
      expect(canRead).toBe(true);

      // User should NOT have admin permissions
      const canManage = await checkPermission(user.id, 'users:manage');
      expect(canManage).toBe(false);
    });

    it('should respect role hierarchy', async () => {
      const admin = await createTestUser({ roles: ['admin'] });
      const user = await createTestUser({ roles: ['user'] });

      // Admin inherits all user permissions
      const adminPerms = await getUserPermissions(admin.id);
      const userPerms = await getUserPermissions(user.id);

      expect(adminPerms.length).toBeGreaterThan(userPerms.length);
    });
  });

  describe('Row-Level Security', () => {
    it('should enforce org-level data isolation', async () => {
      const org1 = await createTestOrg({ name: 'Org 1' });
      const org2 = await createTestOrg({ name: 'Org 2' });

      const user1 = await createTestUser({ orgId: org1.id });
      const user2 = await createTestUser({ orgId: org2.id });

      // User 1 should only see their org's data
      const roles1 = await getRoles(user1.id);
      expect(roles1.every(r => r.org_id === org1.id)).toBe(true);

      // User 2 should only see their org's data
      const roles2 = await getRoles(user2.id);
      expect(roles2.every(r => r.org_id === org2.id)).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should create session on login', async () => {
      const user = await createTestUser();
      const session = await authenticateUser(user.email, 'password');

      const dbSession = await testDb.query(
        'SELECT * FROM auth.user_sessions WHERE session_token = $1',
        [session.token]
      );

      expect(dbSession.rows).toHaveLength(1);
      expect(dbSession.rows[0].user_id).toBe(user.id);
    });

    it('should expire old sessions', async () => {
      const user = await createTestUser();

      // Create session
      const session = await authenticateUser(user.email, 'password');

      // Fast-forward time (mock)
      await testDb.query(
        'UPDATE auth.user_sessions SET expires_at = NOW() - INTERVAL \'1 day\' WHERE session_token = $1',
        [session.token]
      );

      // Attempt to use expired session
      await expect(
        validateSession(session.token)
      ).rejects.toThrow('Session expired');
    });
  });

  describe('Audit Logging', () => {
    it('should log user creation events', async () => {
      const user = await createTestUser();

      const auditLog = await testDb.query(
        'SELECT * FROM auth.audit_events WHERE user_id = $1 AND event_type = $2',
        [user.id, 'user_created']
      );

      expect(auditLog.rows).toHaveLength(1);
    });

    it('should log permission changes', async () => {
      const user = await createTestUser();
      await assignRole(user.id, 'admin');

      const auditLog = await testDb.query(
        'SELECT * FROM auth.audit_events WHERE user_id = $1 AND event_type = $2',
        [user.id, 'role_changed']
      );

      expect(auditLog.rows.length).toBeGreaterThan(0);
    });
  });
});
```

### 3. End-to-End Tests

Create `tests/e2e/auth-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('complete registration and login flow', async ({ page }) => {
    // 1. Navigate to registration page
    await page.goto('/auth/register');

    // 2. Fill registration form
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');

    // 3. Submit form
    await page.click('button[type="submit"]');

    // 4. Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // 5. Should show user name
    await expect(page.locator('[data-testid="user-name"]')).toHaveText('John Doe');

    // 6. Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // 7. Should redirect to login
    await expect(page).toHaveURL('/auth/login');

    // 8. Login again
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    // 9. Should be back on dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should enforce permission checks', async ({ page, context }) => {
    // Login as regular user
    await loginAsUser(page, 'user@example.com');

    // Navigate to admin page
    await page.goto('/admin/users');

    // Should show access denied
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'You do not have permission'
    );

    // Login as admin
    await context.clearCookies();
    await loginAsUser(page, 'admin@example.com');

    // Navigate to admin page
    await page.goto('/admin/users');

    // Should show users list
    await expect(page.locator('[data-testid="users-list"]')).toBeVisible();
  });

  test('should handle session expiry', async ({ page }) => {
    // Login
    await loginAsUser(page, 'user@example.com');
    await expect(page).toHaveURL('/dashboard');

    // Manually expire session (via API or DB)
    await page.evaluate(async () => {
      await fetch('/api/v1/auth/expire-session', { method: 'POST' });
    });

    // Refresh page
    await page.reload();

    // Should redirect to login
    await expect(page).toHaveURL('/auth/login');
  });
});

// Helper function
async function loginAsUser(page: Page, email: string) {
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}
```

### 4. Load Testing

Create `tests/load/auth-load.test.ts`:

```typescript
import autocannon from 'autocannon';

describe('Authentication Load Tests', () => {
  test('should handle 1000 concurrent logins', async () => {
    const result = await autocannon({
      url: 'https://staging.mantisnxt.com',
      connections: 100,
      duration: 60,
      requests: [
        {
          method: 'POST',
          path: '/api/v1/auth/login',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'loadtest@example.com',
            password: 'password',
          }),
        },
      ],
    });

    // Assertions
    expect(result.errors).toBe(0);
    expect(result.timeouts).toBe(0);
    expect(result['2xx']).toBeGreaterThan(result.requests * 0.99); // 99% success rate
    expect(result.latency.p95).toBeLessThan(500); // P95 < 500ms
  });

  test('should handle session validation under load', async () => {
    // First, create 100 sessions
    const sessions = await createTestSessions(100);

    // Then validate them concurrently
    const result = await autocannon({
      url: 'https://staging.mantisnxt.com',
      connections: 50,
      duration: 30,
      requests: sessions.map(token => ({
        method: 'GET',
        path: '/api/v1/auth/me',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })),
    });

    expect(result['2xx']).toBeGreaterThan(result.requests * 0.99);
    expect(result.latency.p99).toBeLessThan(200); // P99 < 200ms
  });
});
```

### 5. Security Testing

```bash
# Run OWASP ZAP security scan
docker run -v $(pwd):/zap/wrk/:rw \
  -t owasp/zap2docker-stable \
  zap-baseline.py \
  -t https://staging.mantisnxt.com \
  -r security-report.html

# SQL Injection tests
npm run test:security -- --grep "SQL Injection"

# XSS tests
npm run test:security -- --grep "XSS"

# CSRF tests
npm run test:security -- --grep "CSRF"

# Session fixation tests
npm run test:security -- --grep "Session"
```

### Testing Checklist

```bash
□ Unit tests pass (90%+ coverage)
□ Integration tests pass (all scenarios)
□ E2E tests pass (critical paths)
□ Load tests meet SLA (P95 < 200ms)
□ Security scan shows no critical issues
□ Accessibility tests pass (WCAG 2.1 AA)
□ Browser compatibility tested (Chrome, Firefox, Safari, Edge)
□ Mobile responsiveness tested
□ Database performance acceptable (<50ms query time)
□ No memory leaks detected
```

---

## Rollback Procedures

### Automatic Rollback Triggers

Configure automatic rollback if any of these conditions are met:

```typescript
// src/lib/deployment/rollback-monitor.ts

interface RollbackTriggers {
  errorRate: number;          // Threshold: 1%
  latencyP95: number;         // Threshold: 500ms
  databaseErrors: number;     // Threshold: 10/minute
  authFailureRate: number;    // Threshold: 5%
  userComplaints: number;     // Threshold: 5 within 5 minutes
}

const ROLLBACK_THRESHOLDS: RollbackTriggers = {
  errorRate: 1.0,             // 1% error rate
  latencyP95: 500,            // 500ms P95 latency
  databaseErrors: 10,         // 10 DB errors per minute
  authFailureRate: 5.0,       // 5% auth failure rate
  userComplaints: 5,          // 5 user complaints in 5 min
};

export async function monitorForRollback(): Promise<boolean> {
  const metrics = await getCurrentMetrics();

  // Check error rate
  if (metrics.errorRate > ROLLBACK_THRESHOLDS.errorRate) {
    await triggerRollback('Error rate exceeded threshold');
    return true;
  }

  // Check latency
  if (metrics.latencyP95 > ROLLBACK_THRESHOLDS.latencyP95) {
    await triggerRollback('Latency exceeded threshold');
    return true;
  }

  // Check database errors
  if (metrics.databaseErrors > ROLLBACK_THRESHOLDS.databaseErrors) {
    await triggerRollback('Database errors exceeded threshold');
    return true;
  }

  // Check auth failure rate
  if (metrics.authFailureRate > ROLLBACK_THRESHOLDS.authFailureRate) {
    await triggerRollback('Auth failure rate exceeded threshold');
    return true;
  }

  return false;
}
```

### Manual Rollback Process

#### Scenario 1: Immediate Rollback (Critical Failure)

```bash
# Execute emergency rollback script
./scripts/emergency-rollback.sh auth-migration

# This script will:
# 1. Set MAINTENANCE_MODE=true
# 2. Set AUTH_ROLLOUT_PERCENTAGE=0
# 3. Restore database from backup
# 4. Deploy previous version
# 5. Run health checks
# 6. Notify team
```

Create `scripts/emergency-rollback.sh`:

```bash
#!/bin/bash
# Emergency rollback script for auth system deployment

set -e

COMPONENT=${1:-unknown}
BACKUP_TAG=${2:-latest}

echo "=========================================="
echo "  EMERGENCY ROLLBACK INITIATED"
echo "=========================================="
echo "Component: $COMPONENT"
echo "Timestamp: $(date)"
echo "Initiated by: $(whoami)"
echo "=========================================="

# 1. Enable maintenance mode
echo "Step 1/7: Enabling maintenance mode..."
vercel env add MAINTENANCE_MODE true --scope production
sleep 5

# 2. Disable auth rollout
echo "Step 2/7: Disabling auth rollout..."
vercel env add AUTH_ROLLOUT_PERCENTAGE 0 --scope production
vercel deploy --prod --yes

# 3. Restore database from backup
echo "Step 3/7: Restoring database from backup..."
if [ "$BACKUP_TAG" == "latest" ]; then
  BACKUP_TAG=$(npm run db:backup:list -- --latest --json | jq -r '.tag')
fi

echo "Using backup: $BACKUP_TAG"
npm run db:backup:restore -- --tag "$BACKUP_TAG" --confirm

# 4. Verify database restoration
echo "Step 4/7: Verifying database restoration..."
npm run db:validate || {
  echo "ERROR: Database validation failed after restore"
  exit 1
}

# 5. Deploy previous stable version
echo "Step 5/7: Deploying previous stable version..."
PREVIOUS_COMMIT=$(git log --oneline -n 2 | tail -n 1 | cut -d' ' -f1)
git checkout "$PREVIOUS_COMMIT"
vercel deploy --prod --yes

# 6. Run health checks
echo "Step 6/7: Running health checks..."
sleep 30
curl -f https://mantisnxt.com/api/health || {
  echo "ERROR: Health check failed"
  exit 1
}

# 7. Disable maintenance mode
echo "Step 7/7: Disabling maintenance mode..."
vercel env rm MAINTENANCE_MODE --scope production

echo "=========================================="
echo "  ROLLBACK COMPLETE"
echo "=========================================="
echo "Status: Success"
echo "Duration: $SECONDS seconds"
echo "=========================================="

# Notify team
./scripts/notify-rollback.sh "$COMPONENT" "success"
```

#### Scenario 2: Partial Rollback (Reduce Rollout Percentage)

```bash
# Reduce rollout from 50% to 10%
vercel env add AUTH_ROLLOUT_PERCENTAGE 10
vercel deploy --prod

# Monitor for 30 minutes
npm run monitor:auth -- --duration 30m

# If stable, gradually increase again
# If not, continue reducing or full rollback
```

#### Scenario 3: Database-Only Rollback

```bash
# If application code is stable but database has issues

# 1. Stop writes to auth tables
psql "$NEON_DATABASE_URL" << EOF
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth FROM app_user;
EOF

# 2. Restore auth schema from backup
npm run db:backup:restore -- --schema auth --tag "$BACKUP_TAG"

# 3. Re-grant permissions
psql "$NEON_DATABASE_URL" << EOF
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO app_user;
EOF

# 4. Verify
npm run db:validate -- --schema auth
```

### Rollback Decision Matrix

| Severity | Metric | Threshold | Action | Approval Required |
|----------|--------|-----------|--------|-------------------|
| **P0 (Critical)** | Service down | >5 min | Immediate full rollback | No (automatic) |
| **P0 (Critical)** | Error rate | >5% | Immediate full rollback | No (automatic) |
| **P0 (Critical)** | Data loss detected | Any | Immediate full rollback | No (automatic) |
| **P1 (High)** | Error rate | 1-5% | Reduce rollout to 0% | On-call engineer |
| **P1 (High)** | Latency P95 | >500ms | Reduce rollout to 0% | On-call engineer |
| **P1 (High)** | Auth failure rate | >5% | Reduce rollout to 0% | On-call engineer |
| **P2 (Medium)** | Error rate | 0.5-1% | Reduce rollout 50% | Team lead |
| **P2 (Medium)** | Latency P95 | 300-500ms | Reduce rollout 50% | Team lead |
| **P2 (Medium)** | User complaints | 3-5 | Investigate, pause rollout | Team lead |
| **P3 (Low)** | Error rate | 0.1-0.5% | Monitor closely | None |
| **P3 (Low)** | Latency P95 | 200-300ms | Monitor closely | None |

---

## Monitoring & Alerting

### Key Metrics to Monitor

#### 1. Application Metrics

```typescript
// src/lib/monitoring/auth-metrics.ts

export interface AuthMetrics {
  // Authentication
  loginAttempts: number;
  loginSuccesses: number;
  loginFailures: number;
  loginLatencyMs: number;

  // Authorization
  permissionChecks: number;
  permissionDenials: number;

  // Sessions
  activeSessions: number;
  sessionCreations: number;
  sessionExpirations: number;

  // Database
  dbQueryLatencyMs: number;
  dbConnectionErrors: number;
  dbQueryErrors: number;

  // Errors
  authErrors: number;
  validationErrors: number;
  systemErrors: number;
}

export async function collectAuthMetrics(): Promise<AuthMetrics> {
  // Collect from database
  const dbMetrics = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE success = true) as login_successes,
      COUNT(*) FILTER (WHERE success = false) as login_failures,
      AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at)))) as avg_latency
    FROM auth.login_history
    WHERE created_at > NOW() - INTERVAL '5 minutes'
  `);

  // Collect from application logs
  const appMetrics = await collectFromLogs();

  return {
    loginAttempts: dbMetrics.login_successes + dbMetrics.login_failures,
    loginSuccesses: dbMetrics.login_successes,
    loginFailures: dbMetrics.login_failures,
    loginLatencyMs: dbMetrics.avg_latency * 1000,
    // ... more metrics
  };
}
```

#### 2. Database Metrics

```sql
-- Monitor query performance
CREATE OR REPLACE VIEW auth.performance_metrics AS
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch,
  n_tup_ins,
  n_tup_upd,
  n_tup_del,
  n_live_tup,
  n_dead_tup,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'auth';

-- Monitor slow queries
CREATE TABLE IF NOT EXISTS auth.slow_query_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT,
  duration_ms NUMERIC,
  called_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID
);
```

#### 3. Alerting Rules

Create `monitoring/alert-rules.yml`:

```yaml
groups:
  - name: auth_system_alerts
    interval: 1m
    rules:
      # Critical: Service Down
      - alert: AuthServiceDown
        expr: up{job="mantisnxt"} == 0
        for: 5m
        labels:
          severity: critical
          team: auth-security
        annotations:
          summary: "Auth service is down"
          description: "MantisNXT auth service has been down for 5 minutes"
          runbook_url: "https://wiki.mantisnxt.com/runbooks/auth-service-down"

      # Critical: High Error Rate
      - alert: AuthHighErrorRate
        expr: rate(auth_errors_total[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
          team: auth-security
        annotations:
          summary: "High auth error rate"
          description: "Auth error rate is {{ $value | humanizePercentage }} (threshold: 5%)"
          runbook_url: "https://wiki.mantisnxt.com/runbooks/high-error-rate"

      # Critical: Database Connection Failures
      - alert: AuthDatabaseConnectionFailure
        expr: rate(auth_db_connection_errors_total[5m]) > 10
        for: 1m
        labels:
          severity: critical
          team: auth-security
        annotations:
          summary: "Auth database connection failures"
          description: "{{ $value }} database connection errors per second"
          runbook_url: "https://wiki.mantisnxt.com/runbooks/db-connection-failure"

      # High: Login Failure Spike
      - alert: AuthLoginFailureSpike
        expr: rate(auth_login_failures_total[5m]) > 0.1
        for: 5m
        labels:
          severity: high
          team: auth-security
        annotations:
          summary: "High login failure rate"
          description: "Login failure rate is {{ $value | humanizePercentage }}"
          runbook_url: "https://wiki.mantisnxt.com/runbooks/login-failure-spike"

      # High: Slow Authentication
      - alert: AuthSlowAuthentication
        expr: histogram_quantile(0.95, rate(auth_login_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: high
          team: auth-security
        annotations:
          summary: "Slow authentication responses"
          description: "P95 auth latency is {{ $value }}s (threshold: 0.5s)"
          runbook_url: "https://wiki.mantisnxt.com/runbooks/slow-authentication"

      # Medium: Increased Session Expirations
      - alert: AuthHighSessionExpirations
        expr: rate(auth_session_expirations_total[15m]) > 100
        for: 10m
        labels:
          severity: medium
          team: auth-security
        annotations:
          summary: "High session expiration rate"
          description: "{{ $value }} sessions expiring per second"

      # Medium: Database Query Slowdown
      - alert: AuthDatabaseSlowQueries
        expr: histogram_quantile(0.95, rate(auth_db_query_duration_seconds_bucket[5m])) > 0.1
        for: 10m
        labels:
          severity: medium
          team: auth-security
        annotations:
          summary: "Slow database queries"
          description: "P95 database query time is {{ $value }}s (threshold: 0.1s)"

      # Low: Approaching Rate Limit
      - alert: AuthApproachingRateLimit
        expr: rate(auth_rate_limit_exceeded_total[5m]) > 10
        for: 15m
        labels:
          severity: low
          team: auth-security
        annotations:
          summary: "High rate limit rejections"
          description: "{{ $value }} requests per second being rate limited"
```

### Monitoring Dashboard

Create Grafana dashboard `dashboards/auth-system.json`:

```json
{
  "dashboard": {
    "title": "Auth System Monitoring",
    "panels": [
      {
        "title": "Login Success Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(auth_login_successes_total[5m]) / (rate(auth_login_successes_total[5m]) + rate(auth_login_failures_total[5m]))"
          }
        ]
      },
      {
        "title": "Authentication Latency (P50, P95, P99)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(auth_login_duration_seconds_bucket[5m]))",
            "legendFormat": "P50"
          },
          {
            "expr": "histogram_quantile(0.95, rate(auth_login_duration_seconds_bucket[5m]))",
            "legendFormat": "P95"
          },
          {
            "expr": "histogram_quantile(0.99, rate(auth_login_duration_seconds_bucket[5m]))",
            "legendFormat": "P99"
          }
        ]
      },
      {
        "title": "Active Sessions",
        "type": "stat",
        "targets": [
          {
            "expr": "auth_active_sessions_total"
          }
        ]
      },
      {
        "title": "Database Connection Pool",
        "type": "graph",
        "targets": [
          {
            "expr": "auth_db_connections_active",
            "legendFormat": "Active"
          },
          {
            "expr": "auth_db_connections_idle",
            "legendFormat": "Idle"
          },
          {
            "expr": "auth_db_connections_waiting",
            "legendFormat": "Waiting"
          }
        ]
      },
      {
        "title": "Error Rate by Type",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(auth_errors_total[5m])",
            "legendFormat": "{{ error_type }}"
          }
        ]
      },
      {
        "title": "Auth Rollout Percentage",
        "type": "stat",
        "targets": [
          {
            "expr": "auth_rollout_percentage"
          }
        ]
      }
    ]
  }
}
```

### Monitoring Scripts

Create `scripts/monitor-auth.sh`:

```bash
#!/bin/bash
# Real-time auth system monitoring

set -e

DURATION=${1:-forever}
INTERVAL=${2:-5}

echo "Starting auth system monitoring..."
echo "Duration: $DURATION"
echo "Interval: ${INTERVAL}s"
echo "=========================================="

START_TIME=$(date +%s)

while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))

  # Check if duration exceeded
  if [ "$DURATION" != "forever" ]; then
    DURATION_SEC=$(echo "$DURATION" | sed 's/m/*60/;s/h/*3600/;s/d/*86400/' | bc)
    if [ $ELAPSED -ge $DURATION_SEC ]; then
      echo "Monitoring duration complete"
      break
    fi
  fi

  # Clear screen
  clear

  echo "=========================================="
  echo "  Auth System Monitor"
  echo "  $(date)"
  echo "  Elapsed: ${ELAPSED}s"
  echo "=========================================="
  echo ""

  # 1. Check application health
  echo "1. APPLICATION HEALTH"
  HEALTH=$(curl -s https://mantisnxt.com/api/health)
  echo "$HEALTH" | jq .
  echo ""

  # 2. Check auth metrics
  echo "2. AUTH METRICS (last 5 minutes)"
  psql "$NEON_DATABASE_URL" << EOF
SELECT
  COUNT(*) FILTER (WHERE success = true) as logins_success,
  COUNT(*) FILTER (WHERE success = false) as logins_failed,
  ROUND(AVG(EXTRACT(EPOCH FROM created_at)::numeric), 2) as avg_latency_sec
FROM auth.login_history
WHERE created_at > NOW() - INTERVAL '5 minutes';
EOF
  echo ""

  # 3. Check active sessions
  echo "3. ACTIVE SESSIONS"
  psql "$NEON_DATABASE_URL" -c \
    "SELECT COUNT(*) as active_sessions FROM auth.user_sessions WHERE status = 'active';"
  echo ""

  # 4. Check error rates
  echo "4. ERROR RATE (last 5 minutes)"
  psql "$NEON_DATABASE_URL" << EOF
SELECT
  severity,
  COUNT(*) as count
FROM auth.audit_events
WHERE created_at > NOW() - INTERVAL '5 minutes'
  AND severity IN ('error', 'critical')
GROUP BY severity;
EOF
  echo ""

  # 5. Check database performance
  echo "5. DATABASE PERFORMANCE"
  psql "$NEON_DATABASE_URL" << EOF
SELECT
  schemaname,
  COUNT(*) as tables,
  SUM(seq_scan) as seq_scans,
  SUM(idx_scan) as idx_scans
FROM pg_stat_user_tables
WHERE schemaname = 'auth'
GROUP BY schemaname;
EOF
  echo ""

  # 6. Check rollout status
  echo "6. ROLLOUT STATUS"
  echo "Percentage: $(vercel env ls | grep AUTH_ROLLOUT_PERCENTAGE | cut -d'=' -f2)"
  echo ""

  # Sleep
  sleep $INTERVAL
done

echo "Monitoring stopped"
```

---

## Risk Mitigation

### Risk Matrix

| Risk | Likelihood | Impact | Mitigation | Contingency |
|------|------------|--------|------------|-------------|
| **Data loss during migration** | Low | Critical | • Full backup before migration<br>• Transaction-based migration<br>• Verification at each step | • Restore from backup<br>• Neon point-in-time restore |
| **Authentication service outage** | Medium | Critical | • Blue-green deployment<br>• Feature flag rollout<br>• Health monitoring | • Immediate rollback<br>• Enable old auth |
| **Performance degradation** | Medium | High | • Load testing<br>• Database indexing<br>• Connection pooling | • Reduce rollout %<br>• Optimize queries |
| **RLS policy misconfiguration** | Medium | High | • Comprehensive testing<br>• Policy verification script<br>• Audit logging | • Disable RLS temporarily<br>• Fix policies, redeploy |
| **Session hijacking** | Low | High | • Secure cookies<br>• HTTPS only<br>• Token rotation | • Revoke all sessions<br>• Force re-auth |
| **Migration takes longer than expected** | Medium | Medium | • Dry-run in staging<br>• Maintenance window<br>• Progress monitoring | • Extend maintenance window<br>• Communicate delay |
| **Incompatibility with existing code** | Low | Medium | • Code review<br>• Integration testing<br>• Gradual rollout | • Rollback to old auth<br>• Fix code, redeploy |
| **Third-party auth provider issues** | Low | Medium | • Neon Auth SLA monitoring<br>• Fallback mechanisms<br>• Circuit breakers | • Enable local auth<br>• Contact Neon support |
| **Rate limiting too strict** | Medium | Low | • Load testing<br>• Adjustable thresholds<br>• Monitoring | • Increase limits<br>• Whitelist IPs |
| **Audit log volume too high** | Medium | Low | • Log retention policy<br>• Archival strategy<br>• Partitioning | • Increase storage<br>• Reduce log verbosity |

### Mitigation Strategies

#### 1. Data Protection

```bash
# Automated backup verification
npm run db:backup:verify --all

# Test restore procedure
npm run db:backup:restore --dry-run --tag latest

# Enable continuous backup (Neon)
# Neon automatically maintains point-in-time restore capability
```

#### 2. Gradual Rollout

```typescript
// Canary deployment strategy
const ROLLOUT_SCHEDULE = [
  { percentage: 5, duration: '30m', healthCheckInterval: '1m' },
  { percentage: 10, duration: '30m', healthCheckInterval: '2m' },
  { percentage: 25, duration: '1h', healthCheckInterval: '5m' },
  { percentage: 50, duration: '2h', healthCheckInterval: '10m' },
  { percentage: 100, duration: '4h', healthCheckInterval: '15m' },
];
```

#### 3. Circuit Breaker

```typescript
// src/lib/auth/circuit-breaker.ts
import CircuitBreaker from 'opossum';

const authCircuitBreaker = new CircuitBreaker(authenticateUser, {
  timeout: 5000, // 5 seconds
  errorThresholdPercentage: 50, // Open circuit at 50% failure rate
  resetTimeout: 30000, // Try again after 30 seconds
  rollingCountTimeout: 10000, // 10 second rolling window
});

authCircuitBreaker.on('open', () => {
  console.error('Circuit breaker opened - auth service failing');
  // Send alert
  sendAlert('Auth circuit breaker opened');
});

authCircuitBreaker.on('halfOpen', () => {
  console.info('Circuit breaker half-open - testing recovery');
});

authCircuitBreaker.on('close', () => {
  console.info('Circuit breaker closed - auth service recovered');
});

export { authCircuitBreaker };
```

#### 4. Database Connection Pool Management

```typescript
// src/lib/database/pool-config.ts
import { Pool } from 'pg';

export const authDbPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  max: 20, // Maximum pool size
  min: 5, // Minimum pool size
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout if can't get connection in 10s
  maxUses: 7500, // Close connection after 7500 uses (Neon recommendation)
  ssl: {
    rejectUnauthorized: true,
  },
});

// Health check
authDbPool.on('error', (err) => {
  console.error('Unexpected database pool error', err);
  sendAlert('Database pool error', err);
});

// Monitor pool metrics
setInterval(() => {
  console.log('DB Pool Stats:', {
    total: authDbPool.totalCount,
    idle: authDbPool.idleCount,
    waiting: authDbPool.waitingCount,
  });
}, 60000); // Every minute
```

---

## Communication Plan

### Stakeholder Communication Matrix

| Stakeholder | Communication Channel | Frequency | Content |
|-------------|----------------------|-----------|---------|
| **Executive Team** | Email | Weekly + Milestone | High-level progress, risks, go-live date |
| **Product Team** | Slack + Meetings | Daily | Feature readiness, testing results |
| **Engineering Team** | Slack + Standup | Real-time | Technical details, blockers, decisions |
| **Support Team** | Email + Training | Pre-launch + Launch | User-facing changes, FAQs, troubleshooting |
| **End Users** | In-app + Email | 1 week before + Launch | New features, what to expect, support resources |
| **Security Team** | Email + Review | Before launch | Security audit results, compliance |

### Communication Templates

#### 1. Pre-Deployment Announcement (1 Week Before)

```markdown
Subject: Upcoming Authentication System Upgrade - November 11, 2025

Dear MantisNXT Users,

We're excited to announce a major upgrade to our authentication system, scheduled for **November 11, 2025, at 02:00 UTC**.

**What's Changing:**
- More secure authentication with Neon Auth integration
- Role-based access control (RBAC) for better permission management
- Enhanced session management and security features
- Improved audit logging for compliance

**What You Need to Do:**
- **Nothing!** The upgrade is seamless and requires no action from you
- You may be asked to re-authenticate after the upgrade (existing sessions will remain valid)
- Passwords and user data remain unchanged

**Expected Impact:**
- Zero downtime - the platform will remain accessible throughout the upgrade
- Your existing sessions will continue to work
- No change to your login credentials

**When:**
- Start: November 11, 2025, 02:00 UTC (21:00 EST, November 10)
- Duration: ~2 hours
- Completion: November 11, 2025, 04:00 UTC (23:00 EST, November 10)

**Support:**
If you experience any issues after the upgrade, please contact support@mantisnxt.com or use the in-app chat.

Thank you for your patience and understanding as we continue to improve MantisNXT.

Best regards,
The MantisNXT Team
```

#### 2. Deployment Day Communication

```markdown
Subject: Authentication System Upgrade in Progress

The authentication system upgrade has begun. We expect zero impact on your usage, but please report any issues to support@mantisnxt.com.

Current Status: In Progress (5% rollout)
Expected Completion: 04:00 UTC
Live Status: https://status.mantisnxt.com
```

#### 3. Post-Deployment Success

```markdown
Subject: Authentication System Upgrade Complete ✅

Great news! The authentication system upgrade has been successfully completed.

**What's New:**
- Enhanced security with multi-factor authentication support (coming soon)
- Role-based access control for administrators
- Better session management
- Comprehensive audit logging

**Next Steps:**
- Start exploring the new admin features (if you're an administrator)
- Enable two-factor authentication when available (recommended)
- Review our updated security documentation: https://docs.mantisnxt.com/security

Thank you for your patience. If you have any questions or encounter any issues, please reach out to our support team.

Best regards,
The MantisNXT Team
```

#### 4. Rollback Communication (If Needed)

```markdown
Subject: Authentication System Upgrade Postponed

We've decided to postpone the authentication system upgrade to ensure the best possible experience.

**What Happened:**
We identified [specific issue] during the gradual rollout and have decided to roll back and address it before proceeding.

**Impact:**
- Your account and data are completely safe
- All functionality has been restored to normal
- No action required from you

**Next Steps:**
- We're working to resolve the issue
- New deployment date will be announced within 48 hours
- We apologize for any inconvenience

If you have any questions, please contact support@mantisnxt.com.

Best regards,
The MantisNXT Team
```

### Internal Communication Protocol

#### During Deployment

**Slack Channel: #auth-deployment-2025-11**

```
Update Frequency: Every 15 minutes
Format:
[TIMESTAMP] Status: <GREEN|YELLOW|RED>
Progress: <current phase/checkpoint>
Metrics: <key metrics>
Issues: <any problems>
Next: <next step>

Example:
[2025-11-11 02:15 UTC] Status: GREEN ✅
Progress: Phase 2 - Schema Migration Complete
Metrics: Error rate: 0%, P95 latency: 87ms, Active sessions: 1,247
Issues: None
Next: Phase 3 - Data Migration (ETA: 02:30 UTC)
```

#### Escalation Protocol

```
Level 1: Monitoring detects issue
  ↓ (Automatic alert)
Level 2: On-call engineer investigates
  ↓ (If issue persists >5 minutes)
Level 3: Team lead notified
  ↓ (If rollback decision needed)
Level 4: Engineering Manager + Product Owner
  ↓ (If critical/prolonged outage)
Level 5: CTO + Executive Team

Contact List:
- On-call engineer: [Name] - [Phone] - [Slack]
- Team lead: [Name] - [Phone] - [Slack]
- Engineering Manager: [Name] - [Phone] - [Slack]
- CTO: [Name] - [Phone] - [Slack]
```

---

## Emergency Response

### Emergency Response Team (ERT)

| Role | Primary | Backup | Responsibilities |
|------|---------|--------|------------------|
| **Incident Commander** | [Name] | [Name] | Overall coordination, decision-making |
| **Technical Lead** | [Name] | [Name] | Technical investigation, fix implementation |
| **Database Engineer** | [Name] | [Name] | Database-related issues, query optimization |
| **DevOps Engineer** | [Name] | [Name] | Infrastructure, deployment, monitoring |
| **Communications Lead** | [Name] | [Name] | Stakeholder communication, status updates |
| **Support Liaison** | [Name] | [Name] | User support, issue triage |

### Incident Response Runbook

#### Severity Levels

| Level | Definition | Response Time | Example |
|-------|------------|---------------|---------|
| **P0 (Critical)** | Complete service outage or data loss | Immediate | • Database down<br>• All users unable to authenticate |
| **P1 (High)** | Significant user impact, core functionality broken | 15 minutes | • 50%+ users unable to login<br>• High error rates (>5%) |
| **P2 (Medium)** | Partial functionality broken, workaround available | 1 hour | • Specific feature broken<br>• Performance degradation |
| **P3 (Low)** | Minor issue, minimal user impact | 24 hours | • UI bug<br>• Non-critical log errors |

#### Response Procedures

##### P0 - Critical Incident

```bash
# 1. IMMEDIATE ACTIONS (0-5 minutes)
# 1.1 Acknowledge alert
echo "P0 incident acknowledged by $(whoami) at $(date)" | tee /tmp/incident-log.txt

# 1.2 Enable maintenance mode
vercel env add MAINTENANCE_MODE true --scope production

# 1.3 Notify team
./scripts/notify-emergency.sh "P0 incident - Auth system critical failure"

# 1.4 Start recording actions
script -a /tmp/incident-$(date +%Y%m%d-%H%M%S).log

# 2. INVESTIGATE (5-15 minutes)
# 2.1 Check system health
curl https://mantisnxt.com/api/health

# 2.2 Check database connectivity
psql "$NEON_DATABASE_URL" -c "SELECT 1"

# 2.3 Check recent deployments
vercel deployments list --limit 5

# 2.4 Check error logs
vercel logs --since 15m

# 2.5 Check metrics
./scripts/get-metrics.sh --last 15m

# 3. DECISION (15-20 minutes)
# Based on investigation, choose one:

# Option A: Immediate rollback (if deployment-related)
./scripts/emergency-rollback.sh auth-migration

# Option B: Database restore (if database corruption)
npm run db:backup:restore --tag pre-auth-migration

# Option C: Hotfix (if simple fix identified)
# Fix the issue, deploy hotfix

# 4. VERIFY (20-30 minutes)
# 4.1 Run health checks
npm run test:health

# 4.2 Test authentication
npm run test:auth

# 4.3 Check metrics
./scripts/get-metrics.sh --last 5m

# 5. RECOVER (30-45 minutes)
# 5.1 Disable maintenance mode
vercel env rm MAINTENANCE_MODE --scope production

# 5.2 Monitor closely
./scripts/monitor-auth.sh 1h

# 5.3 Notify resolution
./scripts/notify-resolution.sh "P0 incident resolved"

# 6. POST-INCIDENT (Within 48 hours)
# 6.1 Write incident report
# 6.2 Conduct post-mortem
# 6.3 Create action items
# 6.4 Update runbook
```

##### P1 - High Severity Incident

```bash
# 1. ACKNOWLEDGE (0-15 minutes)
# Similar to P0 but with 15-minute SLA

# 2. INVESTIGATE THOROUGHLY
# Gather more data before deciding on action

# 3. ATTEMPT FIX
# Try targeted fix before full rollback

# 4. ROLLBACK IF FIX FAILS
# Rollback after 1 hour if unable to fix
```

### Incident Communication Template

```markdown
**INCIDENT ALERT**

**Severity:** P0 - Critical
**Status:** Investigating
**Start Time:** 2025-11-11 03:47 UTC
**Impact:** All users unable to authenticate
**Affected Components:** Authentication service, database

**Timeline:**
- 03:47 UTC - Incident detected by monitoring
- 03:48 UTC - On-call engineer paged
- 03:49 UTC - Maintenance mode enabled
- 03:50 UTC - Investigation started

**Current Status:**
Investigating database connection timeouts. Database appears unresponsive.

**Next Update:** In 15 minutes (04:05 UTC)
**Incident Commander:** [Name]
**Status Page:** https://status.mantisnxt.com
```

---

## Post-Deployment Verification

### Verification Checklist

Execute these checks after deployment to confirm success:

#### 1. Database Verification

```bash
# Run comprehensive database validation
npm run db:validate -- --schema auth

# Verify all tables exist
psql "$NEON_DATABASE_URL" << EOF
SELECT
  COUNT(*) as table_count,
  STRING_AGG(tablename, ', ' ORDER BY tablename) as tables
FROM pg_tables
WHERE schemaname = 'auth';
-- Expected: 12 tables
EOF

# Verify data integrity
psql "$NEON_DATABASE_URL" << EOF
-- Check user migration
SELECT
  (SELECT COUNT(*) FROM public.profile) as original_users,
  (SELECT COUNT(*) FROM auth.users_extended) as migrated_users;
-- Counts should match

-- Check role assignments
SELECT
  COUNT(DISTINCT user_id) as users_with_roles
FROM auth.user_roles;
-- Should equal user count

-- Check permissions
SELECT COUNT(*) as permission_count
FROM auth.permissions;
-- Should be >= 19 (system permissions)
EOF

# Verify indexes
psql "$NEON_DATABASE_URL" << EOF
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'auth'
ORDER BY tablename, indexname;
EOF

# Verify functions
psql "$NEON_DATABASE_URL" << EOF
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'auth';
-- Should include: update_updated_at_column, user_has_permission, etc.
EOF

# Verify RLS policies
psql "$NEON_DATABASE_URL" << EOF
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'auth';
EOF
```

#### 2. Application Verification

```bash
# Run all tests
npm run test:all

# Specific auth tests
npm run test -- --testPathPattern=auth --coverage

# Run E2E tests
npm run test:e2e -- --grep "auth"

# Test API endpoints
npm run test:api -- --grep "auth"
```

#### 3. Functional Verification

```bash
# Test user registration
curl -X POST https://mantisnxt.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Test login
TOKEN=$(curl -X POST https://mantisnxt.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }' | jq -r '.token')

# Test authenticated request
curl https://mantisnxt.com/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Test permission check
curl https://mantisnxt.com/api/v1/admin/users \
  -H "Authorization: Bearer $TOKEN"
# Should return 403 for regular user

# Test logout
curl -X POST https://mantisnxt.com/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN"

# Verify token invalidated
curl https://mantisnxt.com/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
# Should return 401
```

#### 4. Performance Verification

```bash
# Run load test
npm run test:load -- --target auth

# Check query performance
psql "$NEON_DATABASE_URL" << EOF
-- Enable query timing
\timing on

-- Test common queries
SELECT * FROM auth.users_extended WHERE email = 'test@example.com';
-- Should be < 10ms

SELECT * FROM auth.user_has_permission(
  '00000000-0000-0000-0000-000000000001',
  'users:read'
);
-- Should be < 50ms

SELECT * FROM auth.get_user_permissions(
  '00000000-0000-0000-0000-000000000001'
);
-- Should be < 100ms
EOF

# Monitor metrics for 1 hour
npm run monitor:auth -- --duration 1h

# Generate performance report
npm run report:performance -- --component auth
```

#### 5. Security Verification

```bash
# Run security scan
npm run test:security

# Verify SSL/TLS
curl -I https://mantisnxt.com/api/health

# Verify CSP headers
curl -I https://mantisnxt.com | grep -i "content-security-policy"

# Verify session cookies
curl -v https://mantisnxt.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' 2>&1 | \
  grep -i "set-cookie"
# Should show Secure; HttpOnly; SameSite=Lax

# Test CSRF protection
curl -X POST https://mantisnxt.com/api/v1/admin/users \
  -H "Authorization: Bearer $TOKEN"
# Should return 403 (missing CSRF token)

# Verify rate limiting
for i in {1..100}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    https://mantisnxt.com/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done | grep -c "429"
# Should show some 429 responses (rate limited)
```

#### 6. Monitoring Verification

```bash
# Verify metrics are being collected
curl https://mantisnxt.com/api/metrics | jq '.auth'

# Check Grafana dashboards
# Visit: https://grafana.mantisnxt.com/d/auth-system

# Verify alerts are configured
# Check alert manager or Sentry

# Verify logs are being written
vercel logs --since 10m | grep -i auth

# Check Sentry for errors
# Visit: https://sentry.io/organizations/mantisnxt/issues
```

#### 7. User Acceptance Testing (UAT)

```bash
□ Admin user can login successfully
□ Regular user can login successfully
□ User can view their profile
□ User can update their preferences
□ Admin can view user list
□ Admin can create new user
□ Admin can assign roles
□ Admin can view audit logs
□ User cannot access admin pages
□ Password reset flow works
□ Email verification works (if applicable)
□ Session persistence works across page reloads
□ Logout works correctly
□ Concurrent sessions work
□ Mobile app authentication works (if applicable)
```

#### 8. Documentation Verification

```bash
□ API documentation updated
□ User guide updated
□ Admin guide updated
□ Security documentation updated
□ Migration guide complete
□ Rollback procedure documented
□ Monitoring guide updated
□ Incident response updated
□ FAQ updated
□ Release notes published
```

### Final Go-Live Checklist

```bash
□ All tests passing (unit, integration, E2E)
□ Database migration successful
□ Data integrity verified
□ Performance within SLA
□ Security scan passed
□ Monitoring active and alerting
□ Rollback procedure tested
□ Team briefed and ready
□ Support team trained
□ Documentation complete
□ Stakeholders notified
□ Backup verified
□ Feature flags configured
□ Rate limiting configured
□ SSL/TLS verified
□ CORS configured correctly
□ Session management working
□ Audit logging active
□ Compliance requirements met
□ User communication sent
□ Status page updated
```

### Post-Deployment Report Template

```markdown
# Authentication System Deployment Report

**Deployment Date:** 2025-11-11
**Duration:** 2 hours 15 minutes
**Status:** ✅ Success

## Executive Summary
The comprehensive authentication system was successfully deployed to production with zero downtime and zero data loss. The gradual rollout strategy worked as planned, with 100% of users successfully transitioned to the new system.

## Deployment Timeline
- 02:00 UTC: Deployment initiated
- 02:15 UTC: Database migration complete
- 02:30 UTC: Data migration complete
- 02:45 UTC: 5% rollout started
- 03:15 UTC: 10% rollout (no issues)
- 03:45 UTC: 25% rollout (no issues)
- 04:30 UTC: 50% rollout (no issues)
- 06:00 UTC: 100% rollout complete

## Metrics
- Total users migrated: 15,432
- Migration success rate: 100%
- Zero data loss
- Average authentication latency: 87ms (within SLA)
- Error rate: 0.02% (within threshold)
- Uptime: 100%

## Issues Encountered
None

## Rollback Executed
No

## Lessons Learned
- Gradual rollout strategy worked perfectly
- Database indexing was critical for performance
- Monitoring dashboard proved invaluable
- Team coordination was excellent

## Action Items
- [ ] Monitor for 7 days before removing feature flag
- [ ] Schedule post-mortem meeting
- [ ] Update deployment runbook with learnings
- [ ] Plan Phase 2 features (MFA, SSO)

## Sign-off
- Technical Lead: [Signature]
- Engineering Manager: [Signature]
- CTO: [Signature]
```

---

## Appendices

### Appendix A: Environment Variable Reference

See [Environment Setup](#environment-setup) section above.

### Appendix B: Database Schema Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                    MantisNXT Auth Schema                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  organization (existing)                                       │
│       │                                                         │
│       ├─── auth.users_extended                                │
│       │         ├─── auth.user_roles ───┬─── auth.roles       │
│       │         │                        │         │           │
│       │         └─── auth.user_permissions ─── auth.permissions│
│       │                  │                         │           │
│       │                  └────────┬────────────────┘           │
│       │                           │                            │
│       ├─── auth.user_sessions     │                            │
│       │                           │                            │
│       ├─── auth.user_preferences  │                            │
│       │                           │                            │
│       ├─── auth.audit_events ─────┤                            │
│       │                           │                            │
│       ├─── auth.login_history ────┤                            │
│       │                           │                            │
│       ├─── auth.system_config     │                            │
│       │                           │                            │
│       └─── auth.feature_flags     │                            │
│                                   │                            │
│       auth.role_permissions ──────┘                            │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Appendix C: Neon-Specific Considerations

#### Connection String Format
```
postgresql://[user]:[password]@[endpoint-id].aws.neon.tech/[dbname]?sslmode=require
```

#### Neon Branch Strategy
```
main (production)
  ├── staging (staging environment)
  │     └── feature/auth-testing (development/testing)
  │
  └── backup-2025-11-11 (snapshot for rollback)
```

#### Neon Connection Pooling
- Use Neon's built-in connection pooling
- Max connections per compute: 100 (adjust based on plan)
- Use `maxUses: 7500` in pg Pool to work with Neon's architecture

#### Point-in-Time Recovery
```bash
# Restore to specific timestamp (via Neon console or CLI)
neon branches create \
  --project-id $PROJECT_ID \
  --parent main \
  --timestamp "2025-11-11T02:00:00Z" \
  --name rollback-branch
```

### Appendix D: Team Contacts

```yaml
Emergency Contacts:
  - role: Incident Commander
    primary:
      name: [Name]
      phone: [Phone]
      slack: @[handle]
    backup:
      name: [Name]
      phone: [Phone]
      slack: @[handle]

  - role: Technical Lead
    primary:
      name: [Name]
      phone: [Phone]
      slack: @[handle]
    backup:
      name: [Name]
      phone: [Phone]
      slack: @[handle]

  - role: Database Engineer
    primary:
      name: [Name]
      phone: [Phone]
      slack: @[handle]
    backup:
      name: [Name]
      phone: [Phone]
      slack: @[handle]

Vendor Contacts:
  - vendor: Neon (Database)
    support: support@neon.tech
    sla: 24/7 for production issues
    account_manager: [Name]

  - vendor: Vercel (Hosting)
    support: support@vercel.com
    sla: 24/7 for production issues
    account_manager: [Name]

  - vendor: Neon Auth (Stack Auth)
    support: support@stack-auth.com
    documentation: https://docs.stack-auth.com
    status: https://status.stack-auth.com
```

### Appendix E: Useful Commands

```bash
# Database
psql "$NEON_DATABASE_URL" -c "SELECT version();"
npm run db:validate
npm run db:migrate
npm run db:backup:create

# Deployment
vercel deploy --prod
vercel logs --since 30m
vercel env ls

# Monitoring
npm run monitor:auth
curl https://mantisnxt.com/api/health
./scripts/get-metrics.sh

# Testing
npm run test:all
npm run test:e2e
npm run test:load

# Emergency
./scripts/emergency-rollback.sh
vercel env add MAINTENANCE_MODE true
npm run db:backup:restore -- --tag pre-auth-migration
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-04 | AS Team | Initial version |

---

**END OF RUNBOOK**
