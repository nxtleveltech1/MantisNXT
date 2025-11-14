Execution Playbook (for any agent) + Auth Schema Reference
0. Environment / Access
Neon project: proud-mud-50346856 (display name “NXT-SPP-Supplier Inventory Portfolio”)
Branch: production → ID br-spring-field-a9v3cjvz
Database: mantis_issoh (all migrations so far use this DB)
Role used: neondb_owner (has full DDL; auth schema ownership already transferred here)
Session variables: RLS policies we add assume calls set app.current_org_id (UUID) and optionally app.current_user_id. If that isn’t done, skip enabling the policies for now.
> Tip: Execute SQL via Neon console or psql. Batch statements to avoid command limits.
1. Remaining Migration Groups
We already applied:
0021 – comprehensive auth system (detailed later)
0022 – critical security fixes
0023 – WooCommerce queue infrastructure
Outstanding:
0024 – Sync preview/progress/activity tables
Pricing/Loyalty suite — 0013 → 0015
Inventory unification — 0200 → 0205
Ecommerce integrations — 0206
Each group below includes the exact SQL adjustments, execution order, and verification checks.
1.1 Migration 0024 – Sync Telemetry Stack
Purpose
Enables integration delta previews, live sync progress tracking, and audit logging. Aligns with existing services (DeltaDetectionService, SyncProgressTracker, SyncOrchestrator).
Adjusted SQL (matches code)
Run the following blocks in order. Copy/paste into SQL editor (DB = mantis_issoh).
A. Enums
BEGIN;DO $$BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='sync_type') THEN  CREATE TYPE sync_type AS ENUM ('woocommerce','odoo','shopify','custom');END IF; END$$;DO $$BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='sync_action') THEN  CREATE TYPE sync_action AS ENUM (    'preview_delta','sync_start','sync_complete','batch_process',    'error_recovery','manual_trigger','scheduled_run','partial_resume'  );END IF; END$$;DO $$BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='sync_entity_type') THEN  CREATE TYPE sync_entity_type AS ENUM (    'customer','product','order','invoice','supplier','inventory','category','attribute'  );END IF; END$$;DO $$BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='sync_status_type') THEN  CREATE TYPE sync_status_type AS ENUM (    'pending','in_progress','completed','completed_with_errors',    'failed','cancelled','paused','timeout'  );END IF; END$$;COMMIT;
B. Tables + Indexes (aligned with actual queries)
BEGIN;DROP TABLE IF EXISTS sync_preview_cache CASCADE;CREATE TABLE sync_preview_cache (  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,  sync_type sync_type NOT NULL,  entity_type sync_entity_type NOT NULL,  sync_id VARCHAR(255),  delta_data JSONB NOT NULL DEFAULT '{}',  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),  computed_by UUID REFERENCES auth.users_extended(id) ON DELETE SET NULL,  cache_key VARCHAR(255),  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  CONSTRAINT sync_preview_unique UNIQUE (org_id, sync_type, entity_type));CREATE INDEX idx_sync_preview_org_type ON sync_preview_cache(org_id, sync_type, entity_type);CREATE INDEX idx_sync_preview_expires ON sync_preview_cache(expires_at);CREATE INDEX idx_sync_preview_key ON sync_preview_cache(cache_key) WHERE cache_key IS NOT NULL;DROP TABLE IF EXISTS sync_progress CASCADE;CREATE TABLE sync_progress (  id UUID PRIMARY KEY,  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,  sync_id VARCHAR(255) NOT NULL,  job_id VARCHAR(255),  entity_type sync_entity_type,  total_items INTEGER NOT NULL DEFAULT 0,  processed_count INTEGER NOT NULL DEFAULT 0,  failed_count INTEGER NOT NULL DEFAULT 0,  status TEXT NOT NULL DEFAULT 'running',  metadata JSONB NOT NULL DEFAULT '{}',  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  completed_at TIMESTAMPTZ,  initiated_by UUID REFERENCES auth.users_extended(id) ON DELETE SET NULL,  CONSTRAINT sync_progress_counts CHECK (processed_count >= 0 AND failed_count >= 0),  CONSTRAINT sync_progress_unique UNIQUE (org_id, sync_id));CREATE INDEX idx_sync_progress_org_job ON sync_progress(org_id, job_id);CREATE INDEX idx_sync_progress_org_sync ON sync_progress(org_id, sync_id);CREATE INDEX idx_sync_progress_org_status ON sync_progress(org_id, status, updated_at DESC);DROP TABLE IF EXISTS sync_activity_log CASCADE;CREATE TABLE sync_activity_log (  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,  sync_id VARCHAR(255),  entity_type sync_entity_type,  activity_type TEXT NOT NULL,  status TEXT NOT NULL,  details JSONB DEFAULT '{}'::JSONB,  user_id UUID REFERENCES auth.users_extended(id) ON DELETE SET NULL,  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());CREATE INDEX idx_sync_activity_org ON sync_activity_log(org_id, created_at DESC);CREATE INDEX idx_sync_activity_sync ON sync_activity_log(sync_id, created_at DESC);COMMIT;
C. Trigger + RLS + Stub
BEGIN;CREATE OR REPLACE FUNCTION sync_preview_touch_updated_at()RETURNS TRIGGER AS $$BEGIN  NEW.updated_at := NOW();  RETURN NEW;END;$$ LANGUAGE plpgsql;DROP TRIGGER IF EXISTS trg_sync_preview_touch ON sync_preview_cache;CREATE TRIGGER trg_sync_preview_touch  BEFORE UPDATE ON sync_preview_cache  FOR EACH ROW EXECUTE FUNCTION sync_preview_touch_updated_at();CREATE SCHEMA IF NOT EXISTS auth;CREATE OR REPLACE FUNCTION auth.uid()RETURNS UUID LANGUAGE sql AS $$  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid$$;ALTER TABLE sync_preview_cache ENABLE ROW LEVEL SECURITY;ALTER TABLE sync_progress ENABLE ROW LEVEL SECURITY;ALTER TABLE sync_activity_log ENABLE ROW LEVEL SECURITY;CREATE POLICY preview_cache_rls ON sync_preview_cache  USING (org_id = current_setting('app.current_org_id', true)::uuid)  WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);CREATE POLICY sync_progress_rls ON sync_progress  USING (org_id = current_setting('app.current_org_id', true)::uuid)  WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);CREATE POLICY sync_activity_rls ON sync_activity_log  USING (org_id = current_setting('app.current_org_id', true)::uuid)  WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);COMMIT;
> If your API doesn’t set app.current_org_id, skip the RLS block for now and reapply later.
D. Record Migration
INSERT INTO schema_migrations (migration_name)VALUES ('0024_sync_preview_progress_logs')ON CONFLICT (migration_name) DO NOTHING;
Verification (Backend + Frontend)
SELECT column_name FROM information_schema.columns WHERE table_name='sync_preview_cache'; – confirm schema.
Hit /api/v1/integrations/sync/preview – ensure it stores and reads cache rows (check Neon data).
Trigger SyncProgressTracker via orchestrator (or call start/update/end methods) and confirm sync_progress row updates.
Confirm sync_activity_log receives entries from logRequest / SyncOrchestrator.logActivity.
Frontend: Integrations preview & activity log UIs render without SQL errors.
1.2 Pricing & Loyalty Suite (0013 → 0015)
Purpose: Create pricing intelligence + loyalty rewards infrastructure.
Dependencies: Requires new auth schema (users_extended), organization tables, products/inventory.
Steps:
Execute each migration in order, ensuring any legacy helper calls (auth.user_org_id() etc.) are replaced with explicit joins to auth.users_extended or current_setting('app.current_org_id').
0013_pricing_optimization.sql
Optional 0013_pricing_optimization_TESTS.sql (if you want to run the test harness).
0014_pricing_rls_policies.sql (ensure RLS policies use the updated auth functions).
0015_loyalty_rewards.sql
Optional 0015_loyalty_rewards_TESTS.sql
0015_soh_pricing_with_ai.sql
After each file, add an entry in schema_migrations.
Verification
API: create pricing rules, run optimization jobs, ensure recommendations populate tables.
Loyalty flows (issue/redeem rewards) succeed.
SOH pricing AI updates new columns on core.stock_on_hand.
Frontend pages (pricing dashboards, loyalty admin) operate without missing-column errors.
1.3 Inventory Unification (0200 → 0205)
Purpose: Normalize inventory schema, add allocations, indexes, constraints.
Steps: Run 0200, 0201, 0202, 0204, 0205 in order. Each script includes IF NOT EXISTS guards. Log each in schema_migrations.
Verification
Inspect inventory_item table for expected columns (stock_qty, reserved_qty, available_qty).
Run API calls that interact with inventory (create movement, check allocations).
Frontend inventory pages display new metrics correctly.
1.4 Ecommerce Integrations (0206_ecommerce_integrations.sql)
Purpose: Adds WooCommerce/Odoo integration schemas (sync state tables, mappings, logs, webhooks).
Steps: Run the migration. Validate column references to auth.users_extended. Record in schema_migrations.
Verification
Trigger WooCommerce/Odoo sync flows to ensure new tables accept data.
Confirm conflict detection triggers fire and log entries appear in sync_log, sync_conflict.
Frontend integration settings use the new tables without errors.
2. Auth Schema Reference (from 0021 + 0022)
This is the full RBAC + security foundation already applied.

2.1 Core Tables (Schema: auth)

2.1.1 auth.users_extended
Primary user profile table backed solely by Stack Auth (single identity source).

Full Column Definitions:
- id UUID PRIMARY KEY (gen_random_uuid())
- stack_auth_user_id TEXT UNIQUE (Stack Auth user ID - PRIMARY identifier for new users)
- stack_auth_provider TEXT (Provider: 'stack', 'google', 'github', etc.)
- email TEXT NOT NULL UNIQUE (with regex validation)
- email_verified BOOLEAN DEFAULT FALSE
- email_verified_at TIMESTAMPTZ
- first_name TEXT, last_name TEXT, display_name TEXT NOT NULL (1-100 chars)
- avatar_url TEXT, phone TEXT, mobile TEXT (phone regex validated)
- org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE
- department TEXT, job_title TEXT, employee_id TEXT
- id_number TEXT (SA ID number - plaintext, hashed in id_number_hash)
- id_number_hash TEXT (SHA-256 hash for encrypted search - indexed)
- employment_equity employment_equity_type (BEE compliance: 'african', 'coloured', 'indian', 'white', 'other', 'prefer_not_to_say')
- bee_status bee_status_type ('level_1' through 'level_8', 'non_compliant')
- address_street, address_suburb, address_city, address_province, address_postal_code, address_country (default 'South Africa')
- is_active BOOLEAN DEFAULT TRUE
- is_suspended BOOLEAN DEFAULT FALSE, suspended_at TIMESTAMPTZ, suspended_by UUID (self-ref, DEFERRABLE), suspension_reason TEXT
- password_hash TEXT (bcrypt, min 60 chars enforced)
- password_changed_at TIMESTAMPTZ, password_expires_at TIMESTAMPTZ
- password_reset_token TEXT, password_reset_expires_at TIMESTAMPTZ
- must_change_password BOOLEAN DEFAULT FALSE
- failed_login_attempts INTEGER DEFAULT 0, locked_until TIMESTAMPTZ
- two_factor_enabled BOOLEAN DEFAULT FALSE
- two_factor_secret TEXT (encrypted, length > 32 enforced)
- two_factor_backup_codes TEXT[]
- two_factor_enabled_at TIMESTAMPTZ
- last_login_at TIMESTAMPTZ, last_login_ip INET, last_activity_at TIMESTAMPTZ
- metadata JSONB DEFAULT '{}', preferences JSONB DEFAULT '{}'
- created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), deleted_at TIMESTAMPTZ (soft delete)

Constraints:
- CHECK: email regex validation
- CHECK: display_name length 1-100
- CHECK: phone format validation (if provided)
- CHECK: must_have_auth_provider (stack_auth_user_id must be set)
- CHECK: password_hash length >= 60 (bcrypt)
- CHECK: two_factor_secret length > 32 (encrypted)
- UNIQUE: email, stack_auth_user_id
- FK: org_id → organization(id) CASCADE
- FK: suspended_by → auth.users_extended(id) DEFERRABLE INITIALLY DEFERRED

Key Indexes:
- idx_users_extended_org_active ON (org_id, is_active) WHERE is_active = TRUE
- idx_users_extended_org_email ON (org_id, email) WHERE is_active = TRUE
- idx_users_extended_org_dept ON (org_id, department) WHERE is_active = TRUE
- idx_users_extended_stack_auth ON (stack_auth_user_id) WHERE stack_auth_user_id IS NOT NULL
- idx_users_extended_last_activity ON (last_activity_at DESC) WHERE is_active = TRUE
- idx_users_extended_locked ON (locked_until) WHERE locked_until IS NOT NULL
- idx_users_extended_suspended ON (is_suspended) WHERE is_suspended = TRUE
- idx_users_extended_id_number_hash ON (id_number_hash)

Service Integration:
- NeonAuthService queries by stack_auth_user_id or email to get user profile
- Password reset flows update password_hash, password_changed_at, trigger password_history insert
- 2FA flows read/write two_factor_secret, two_factor_backup_codes
- Session management updates last_login_at, last_activity_at
- Suspension logic sets is_suspended, suspended_at, suspended_by (self-reference)

Example Queries:
```sql
-- Get user by Stack Auth ID
SELECT * FROM auth.users_extended WHERE stack_auth_user_id = $1 AND is_active = TRUE;

-- Get active users in org
SELECT id, email, display_name, department FROM auth.users_extended 
WHERE org_id = $1 AND is_active = TRUE ORDER BY last_activity_at DESC;

-- Check if user is locked
SELECT id, email, locked_until, failed_login_attempts 
FROM auth.users_extended 
WHERE email = $1 AND (locked_until IS NULL OR locked_until > NOW());
```

2.1.2 auth.roles
Hierarchical role definitions (org-scoped). System roles cannot be deleted.

Columns:
- id UUID PRIMARY KEY
- org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE
- name TEXT NOT NULL (2-50 chars), slug TEXT NOT NULL (regex: ^[a-z0-9_-]+$)
- description TEXT
- is_system_role BOOLEAN DEFAULT FALSE (cannot delete if true)
- role_level INTEGER DEFAULT 0 (0-100, higher = more permissions)
- parent_role_id UUID REFERENCES auth.roles(id) DEFERRABLE INITIALLY DEFERRED (hierarchy)
- is_active BOOLEAN DEFAULT TRUE
- metadata JSONB DEFAULT '{}'
- created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
- created_by UUID REFERENCES auth.users_extended(id) DEFERRABLE INITIALLY DEFERRED

Constraints:
- UNIQUE(org_id, slug)
- CHECK: name length 2-50, slug format, role_level 0-100

Indexes:
- idx_roles_org_slug ON (org_id, slug)
- idx_roles_org_active ON (org_id, is_active) WHERE is_active = TRUE
- idx_roles_parent ON (parent_role_id) WHERE parent_role_id IS NOT NULL

2.1.3 auth.permissions
Atomic permission definitions (resource + action). System permissions cannot be deleted.

Columns:
- id UUID PRIMARY KEY
- name TEXT NOT NULL UNIQUE (format: ^[a-z0-9_:]+$, e.g., 'users:read', 'orders:create')
- resource TEXT NOT NULL (e.g., 'users', 'orders', 'inventory')
- action permission_action NOT NULL (enum: 'create', 'read', 'update', 'delete', 'manage', 'execute')
- description TEXT
- conditions JSONB DEFAULT '[]' (ABAC conditions array)
- is_system_permission BOOLEAN DEFAULT FALSE
- metadata JSONB DEFAULT '{}'
- created_at TIMESTAMPTZ DEFAULT NOW()
- created_by UUID REFERENCES auth.users_extended(id) DEFERRABLE INITIALLY DEFERRED

Constraints:
- UNIQUE(resource, action)
- CHECK: name format validation

Indexes:
- idx_permissions_resource_action ON (resource, action)

2.1.4 auth.role_permissions
Junction table: roles → permissions (many-to-many).

Columns:
- id UUID PRIMARY KEY
- role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE
- permission_id UUID NOT NULL REFERENCES auth.permissions(id) ON DELETE CASCADE
- constraints JSONB DEFAULT '{}' (optional conditions for this assignment)
- created_at TIMESTAMPTZ DEFAULT NOW()
- granted_by UUID REFERENCES auth.users_extended(id) DEFERRABLE INITIALLY DEFERRED

Constraints:
- UNIQUE(role_id, permission_id)

Indexes:
- idx_role_perms_role ON (role_id)
- idx_role_perms_perm ON (permission_id)

2.1.5 auth.user_roles
Junction table: users → roles (many-to-many) with effective date ranges.

Columns:
- id UUID PRIMARY KEY
- user_id UUID NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE
- role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE
- effective_from TIMESTAMPTZ DEFAULT NOW()
- effective_until TIMESTAMPTZ (NULL = permanent)
- created_at TIMESTAMPTZ DEFAULT NOW()
- assigned_by UUID REFERENCES auth.users_extended(id) DEFERRABLE INITIALLY DEFERRED

Constraints:
- UNIQUE(user_id, role_id)
- CHECK: effective_until IS NULL OR effective_until > effective_from

Indexes:
- idx_user_roles_user_active ON (user_id) WHERE effective_until IS NULL OR effective_until > NOW()
- idx_user_roles_role ON (role_id)

2.1.6 auth.user_permissions
User-specific permission overrides (granular control, allows explicit denials).

Columns:
- id UUID PRIMARY KEY
- user_id UUID NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE
- permission_id UUID NOT NULL REFERENCES auth.permissions(id) ON DELETE CASCADE
- is_granted BOOLEAN NOT NULL DEFAULT TRUE (false = explicit denial)
- constraints JSONB DEFAULT '{}'
- effective_from TIMESTAMPTZ DEFAULT NOW()
- effective_until TIMESTAMPTZ
- created_at TIMESTAMPTZ DEFAULT NOW()
- granted_by UUID REFERENCES auth.users_extended(id) DEFERRABLE INITIALLY DEFERRED

Constraints:
- UNIQUE(user_id, permission_id)

Indexes:
- idx_user_perms_user_granted ON (user_id, is_granted) WHERE effective_until IS NULL OR effective_until > NOW()

2.1.7 auth.user_sessions
Active session tracking with device/location info.

Columns:
- id UUID PRIMARY KEY
- user_id UUID NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE
- session_token TEXT NOT NULL UNIQUE
- refresh_token TEXT UNIQUE
- device_name TEXT, device_type TEXT ('desktop', 'mobile', 'tablet')
- device_fingerprint TEXT, user_agent TEXT
- ip_address INET NOT NULL, country TEXT, city TEXT
- status session_status DEFAULT 'active' (enum: 'active', 'expired', 'revoked', 'suspicious')
- created_at TIMESTAMPTZ DEFAULT NOW(), last_activity_at TIMESTAMPTZ DEFAULT NOW()
- expires_at TIMESTAMPTZ NOT NULL
- revoked_at TIMESTAMPTZ, revoked_by UUID REFERENCES auth.users_extended(id) DEFERRABLE INITIALLY DEFERRED
- revocation_reason TEXT
- metadata JSONB DEFAULT '{}'

Constraints:
- CHECK: expires_at > created_at

Indexes:
- idx_sessions_user_status ON (user_id, status)
- idx_sessions_token ON (session_token) WHERE status = 'active'
- idx_sessions_active ON (status, expires_at) WHERE status = 'active'
- idx_sessions_expired ON (expires_at) WHERE status = 'active' AND expires_at < NOW()

2.1.8 auth.login_history
Login attempt audit trail (success/failure tracking).

Columns:
- id UUID PRIMARY KEY
- user_id UUID REFERENCES auth.users_extended(id) ON DELETE SET NULL
- email TEXT (captured even if user doesn't exist)
- success BOOLEAN NOT NULL
- failure_reason TEXT (if success = false)
- ip_address INET, user_agent TEXT
- device_fingerprint TEXT, session_id UUID REFERENCES auth.user_sessions(id)
- location TEXT (geographic)
- created_at TIMESTAMPTZ DEFAULT NOW()

Indexes:
- idx_login_history_user_id ON (user_id)
- idx_login_history_email ON (email)
- idx_login_history_created_at ON (created_at DESC)
- idx_login_history_device ON (device_fingerprint)
- idx_login_history_session ON (session_id)

2.1.9 auth.audit_events
Comprehensive compliance audit log (all security-relevant events).

Columns:
- id UUID PRIMARY KEY
- org_id UUID REFERENCES organization(id) ON DELETE CASCADE
- user_id UUID REFERENCES auth.users_extended(id) ON DELETE SET NULL
- session_id UUID REFERENCES auth.user_sessions(id) ON DELETE SET NULL
- event_type audit_event_type NOT NULL (enum: 'login', 'logout', 'login_failed', 'password_changed', 'password_reset_requested', 'password_reset_completed', 'two_factor_enabled', 'two_factor_disabled', 'two_factor_verified', 'role_changed', 'permission_granted', 'permission_revoked', 'user_created', 'user_updated', 'user_deleted', 'user_suspended', 'user_activated', 'session_created', 'session_terminated', 'security_event', 'data_export', 'data_import', 'settings_changed')
- event_category TEXT ('authentication', 'authorization', 'data_access', etc.)
- severity TEXT DEFAULT 'info' ('debug', 'info', 'warning', 'error', 'critical')
- resource_type TEXT, resource_id UUID, resource_name TEXT
- action TEXT, metadata JSONB DEFAULT '{}'
- ip_address INET, user_agent TEXT
- created_at TIMESTAMPTZ DEFAULT NOW()

Indexes:
- idx_audit_events_org_id ON (org_id)
- idx_audit_events_user_id ON (user_id)
- idx_audit_events_event_type ON (event_type)
- idx_audit_events_created_at ON (created_at DESC)
- idx_audit_events_org_time ON (org_id, created_at DESC)

2.1.10 auth.user_preferences
User notification/UI preferences.

Columns:
- id UUID PRIMARY KEY
- user_id UUID NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE UNIQUE
- language TEXT DEFAULT 'en', timezone TEXT DEFAULT 'UTC'
- notifications JSONB DEFAULT '{}' (notification preferences bundle)
- ui_preferences JSONB DEFAULT '{}'
- created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()

2.1.11 auth.password_history
Password history to prevent reuse (keeps last 10 per user).

Columns:
- id UUID PRIMARY KEY
- user_id UUID NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE
- password_hash TEXT NOT NULL
- created_at TIMESTAMPTZ DEFAULT NOW()

Constraints:
- UNIQUE(user_id, created_at)

Indexes:
- idx_password_history_user_id ON (user_id)
- idx_password_history_created_at ON (created_at DESC)

Cleanup: Function auth.cleanup_password_history() trims to last 10 per user (run periodically).

2.1.12 auth.security_events
Security alerts and compliance events.

Columns:
- id UUID PRIMARY KEY
- org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE
- user_id UUID REFERENCES auth.users_extended(id) ON DELETE SET NULL
- event_type TEXT NOT NULL (max 100 chars)
- severity security_severity DEFAULT 'medium' (enum: 'low', 'medium', 'high', 'critical')
- details JSONB DEFAULT '{}'
- ip_address INET, user_agent TEXT, location TEXT
- created_at TIMESTAMPTZ DEFAULT NOW()

Indexes:
- idx_security_events_org_id ON (org_id)
- idx_security_events_user_id ON (user_id)
- idx_security_events_type ON (event_type)
- idx_security_events_severity ON (severity)
- idx_security_events_created_at ON (created_at DESC)
- idx_security_events_org_time ON (org_id, created_at DESC)
- idx_security_events_user_time ON (user_id, created_at DESC)

2.2 Supporting Functions (namespace auth)

auth.cleanup_password_history()
Trims password history to last 10 entries per user. Run periodically (e.g., daily cron).

Usage:
```sql
SELECT auth.cleanup_password_history();
```

auth.cleanup_security_events()
Purges security events older than 2 years. Run periodically.

Usage:
```sql
SELECT auth.cleanup_security_events();
```

auth.has_recent_security_events(user_id UUID, event_type TEXT, hours INTEGER)
Returns BOOLEAN indicating if user has security events of given type within last N hours. Used for rate-limiting.

Usage:
```sql
SELECT auth.has_recent_security_events('user-uuid', 'failed_login', 24);
```

auth.calculate_security_score(user_id UUID)
Returns INTEGER 0-100 based on:
- 2FA enabled (+30 points)
- No failed logins in last 30 days (+20 points)
- No critical security events in last 90 days (+30 points)
- Password changed in last 90 days (+20 points)

Usage:
```sql
SELECT auth.calculate_security_score('user-uuid');
```

auth.update_id_number_hash()
Trigger function that automatically hashes id_number (SHA-256) and stores in id_number_hash column. Enables encrypted search without exposing plaintext.

auth.uid()
Stub function that returns current_setting('app.current_user_id', true)::uuid. Used by RLS policies. If session variable is not set, returns NULL.

Usage in RLS:
```sql
CREATE POLICY user_policy ON some_table
  USING (user_id = auth.uid());
```

2.3 Enums Introduced

- user_role_type: 'super_admin', 'admin', 'manager', 'user', 'viewer'
- permission_action: 'create', 'read', 'update', 'delete', 'manage', 'execute'
- session_status: 'active', 'expired', 'revoked', 'suspicious'
- audit_event_type: 'login', 'logout', 'login_failed', 'password_changed', 'password_reset_requested', 'password_reset_completed', 'two_factor_enabled', 'two_factor_disabled', 'two_factor_verified', 'role_changed', 'permission_granted', 'permission_revoked', 'user_created', 'user_updated', 'user_deleted', 'user_suspended', 'user_activated', 'session_created', 'session_terminated', 'security_event', 'data_export', 'data_import', 'settings_changed'
- employment_equity_type: 'african', 'coloured', 'indian', 'white', 'other', 'prefer_not_to_say'
- bee_status_type: 'level_1', 'level_2', 'level_3', 'level_4', 'level_5', 'level_6', 'level_7', 'level_8', 'non_compliant'
- security_severity: 'low', 'medium', 'high', 'critical'

2.4 Triggers

- auth.users_extended: set_updated_at (BEFORE UPDATE), update_id_number_hash (BEFORE INSERT/UPDATE on id_number)
- auth.user_preferences: set_updated_at (BEFORE UPDATE)
- auth.roles: set_updated_at (BEFORE UPDATE)
- Other tables may have updated_at triggers if defined in migrations

2.5 RLS (Row Level Security) Policies

Current Status: Policies in 0021/0022 assume working auth.uid() or session variables. For production:

Option 1: Use session variables (recommended if middleware sets them)
```sql
-- Example policy using session variable
CREATE POLICY user_data_policy ON some_table
  USING (org_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);
```

Option 2: Use auth.uid() stub (requires app.current_user_id to be set)
```sql
CREATE POLICY user_data_policy ON some_table
  USING (user_id = auth.uid());
```

Option 3: Disable RLS temporarily until auth middleware is ready
```sql
ALTER TABLE some_table DISABLE ROW LEVEL SECURITY;
```

Important: If your API doesn't set app.current_org_id or app.current_user_id, either:
- Skip enabling RLS for now (run migrations but don't enable policies)
- Or modify policies to use explicit joins to auth.users_extended instead of session variables

2.6 Service Integration Patterns

NeonAuthService (src/lib/auth/neon-auth-service.ts):
- Queries auth.users_extended by stack_auth_user_id or email
- Creates/updates user records on Stack Auth user creation
- Manages sessions via auth.user_sessions
- Logs login attempts to auth.login_history
- Records audit events to auth.audit_events

Password Management:
- Password changes: Update password_hash, password_changed_at, insert into auth.password_history
- Password reset: Set password_reset_token, password_reset_expires_at
- Password validation: Check auth.password_history for last 10 hashes (prevent reuse)

2FA Management:
- Enable: Set two_factor_enabled = TRUE, store encrypted two_factor_secret, generate backup codes
- Verify: Check two_factor_secret against TOTP code
- Disable: Clear two_factor_secret, two_factor_backup_codes, set two_factor_enabled = FALSE

Role/Permission Checks:
```sql
-- Get all permissions for a user (via roles + direct grants)
WITH user_role_perms AS (
  SELECT DISTINCT p.id, p.name, p.resource, p.action
  FROM auth.user_roles ur
  JOIN auth.role_permissions rp ON ur.role_id = rp.role_id
  JOIN auth.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = $1
    AND (ur.effective_until IS NULL OR ur.effective_until > NOW())
),
user_direct_perms AS (
  SELECT DISTINCT p.id, p.name, p.resource, p.action, up.is_granted
  FROM auth.user_permissions up
  JOIN auth.permissions p ON up.permission_id = p.id
  WHERE up.user_id = $1
    AND (up.effective_until IS NULL OR up.effective_until > NOW())
)
SELECT * FROM user_role_perms
UNION
SELECT id, name, resource, action FROM user_direct_perms WHERE is_granted = TRUE
EXCEPT
SELECT id, name, resource, action FROM user_direct_perms WHERE is_granted = FALSE;
```

Session Management:
- Create session: INSERT into auth.user_sessions, return session_token
- Validate session: SELECT from auth.user_sessions WHERE session_token = $1 AND status = 'active' AND expires_at > NOW()
- Revoke session: UPDATE auth.user_sessions SET status = 'revoked', revoked_at = NOW() WHERE id = $1
- Cleanup expired: DELETE from auth.user_sessions WHERE expires_at < NOW() AND status = 'active'
3. Execution Workflow for Another Agent
Confirm auth schema: SELECT from auth.users_extended to verify tables exist.
Apply 0024 as detailed above; verify services.
Apply pricing suite (0013–0015) step-by-step; run relevant APIs/UX.
Apply inventory suite (0200–0205); test inventory flows.
Apply ecommerce suite (0206); test integration flows.
After each migration, add an entry to schema_migrations.
For each suite, run targeted backend service checks and frontend pages to confirm no regressions.
If RLS is enabled, ensure API requests set the required session parameters, otherwise defer RLS blocks.
With this plan and the SQL snippets, any agent can execute the migrations while keeping backend/frontend behavior aligned.
