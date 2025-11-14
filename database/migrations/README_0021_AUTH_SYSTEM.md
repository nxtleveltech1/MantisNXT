# Migration 0021: Comprehensive Auth System

**AS Team (Auth & Security)** | **Date:** 2025-11-04

## Overview

This migration implements a production-ready, comprehensive role-based authentication system with Neon Auth (Stack Auth) integration for MantisNXT.

## Features

### 1. **Enhanced User Management**
- Extended user profiles with Stack Auth integration
- Support for multiple auth providers (Stack Auth, Google, GitHub, etc.)
- South African compliance fields (BEE, Employment Equity)
- Soft delete support
- Account suspension with audit trail

### 2. **Hierarchical RBAC System**
- Flexible role definitions with hierarchy support
- Atomic permission definitions (resource + action)
- Many-to-many role-permission mapping
- User-specific permission overrides
- Temporal role assignments (effective dates)

### 3. **Session Management**
- Multi-device session tracking
- Device fingerprinting
- Geographic location tracking
- Session status management (active, expired, revoked, suspicious)
- Automatic session cleanup

### 4. **Comprehensive Audit Trail**
- Detailed event logging for all security-relevant actions
- Login history with success/failure tracking
- Change tracking (old values → new values)
- Severity classification
- Compliance reporting support

### 5. **User Preferences & Customization**
- Localization settings (language, timezone, date format)
- Notification preferences (email, SMS, push)
- UI customization (theme, layout, dashboard widgets)
- Privacy settings
- Accessibility options

### 6. **System Configuration**
- Feature flags with gradual rollout support
- Organization-specific configuration
- Encrypted secret storage
- Version control for config changes

## Database Schema

### Core Tables

```
auth.users_extended          - Extended user profiles with Stack Auth integration
auth.roles                   - Role definitions with hierarchy
auth.permissions             - Atomic permission definitions
auth.role_permissions        - Role-permission mapping (M:M)
auth.user_roles              - User-role assignments (M:M with temporal support)
auth.user_permissions        - User-specific permission overrides
auth.user_sessions           - Active session tracking
auth.audit_events            - Comprehensive audit trail
auth.login_history           - Login attempt history
auth.user_preferences        - User preferences and customization
auth.system_config           - System-wide configuration
auth.feature_flags           - Feature flag management
```

### Key Relationships

```
organization (existing)
    ↓ 1:N
auth.users_extended
    ↓ 1:N
auth.user_roles → auth.roles → auth.role_permissions → auth.permissions
    ↓ 1:N
auth.user_sessions
auth.audit_events
auth.login_history
auth.user_preferences
```

## Migration Steps

### Prerequisites

1. **Backup Database**
   ```bash
   npm run db:backup
   ```

2. **Verify Existing Schema**
   ```bash
   npm run db:validate
   ```

3. **Check Dependencies**
   - Migration 0001 (organization, profile tables) must be applied
   - Neon PostgreSQL with auth schema enabled
   - Legacy auth.users table (only if migrating older data)

### Execution

#### Development Environment

```bash
# 1. Review the migration
cat database/migrations/0021_comprehensive_auth_system.sql

# 2. Test migration in dev database
npm run db:migrate -- --file=0021_comprehensive_auth_system.sql --dry-run

# 3. Apply migration
npm run db:migrate -- --file=0021_comprehensive_auth_system.sql

# 4. Verify schema
npm run db:validate:full
```

#### Production Environment

```bash
# 1. Create backup
pg_dump $DATABASE_URL > backup_pre_0021_$(date +%Y%m%d_%H%M%S).sql

# 2. Run in transaction with rollback capability
psql $DATABASE_URL -f database/migrations/0021_comprehensive_auth_system.sql

# 3. Verify tables created
psql $DATABASE_URL -c "\dt auth.*"

# 4. Verify RLS policies
psql $DATABASE_URL -c "SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'auth';"

# 5. Test authentication flow
npm run test:auth
```

### Post-Migration Setup

#### 1. Create Default System Permissions

The migration creates base permissions. You may need to add application-specific permissions:

```sql
INSERT INTO auth.permissions (name, resource, action, description, is_system_permission) VALUES
    ('products:create', 'products', 'create', 'Create new products', FALSE),
    ('products:read', 'products', 'read', 'View product information', FALSE),
    ('products:update', 'products', 'update', 'Update product information', FALSE),
    ('products:delete', 'products', 'delete', 'Delete products', FALSE),
    ('inventory:manage', 'inventory', 'manage', 'Full inventory management', FALSE);
```

#### 2. Create System Roles Per Organization

```sql
-- Example: Create admin role for organization
DO $$
DECLARE
    v_org_id UUID := 'your-org-id-here';
    v_admin_role_id UUID;
BEGIN
    -- Create admin role
    INSERT INTO auth.roles (org_id, name, slug, description, is_system_role, role_level)
    VALUES (v_org_id, 'Administrator', 'admin', 'Full system access', TRUE, 100)
    RETURNING id INTO v_admin_role_id;

    -- Grant all permissions to admin role
    INSERT INTO auth.role_permissions (role_id, permission_id)
    SELECT v_admin_role_id, id FROM auth.permissions;
END $$;
```

#### 3. Migrate Existing Users

```sql
-- Migrate from profile table to auth.users_extended
INSERT INTO auth.users_extended (
    stack_auth_user_id,
    email,
    display_name,
    org_id,
    is_active,
    created_at
)
SELECT
    id,
    (SELECT email FROM auth.users WHERE id = p.id),
    display_name,
    org_id,
    is_active,
    created_at
FROM profile p
ON CONFLICT (stack_auth_user_id) DO NOTHING;
```

#### 4. Configure Environment Variables

Add to `.env.local`:

```bash
# Neon Auth (Stack Auth) Configuration
STACK_AUTH_API_KEY=your_stack_auth_api_key_here
STACK_AUTH_PROJECT_ID=your_project_id_here

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret_here
JWT_EXPIRY=86400  # 24 hours in seconds

# Session Configuration
SESSION_TIMEOUT=3600000  # 1 hour in milliseconds
SESSION_REMEMBER_ME_TIMEOUT=2592000000  # 30 days

# Redis Configuration (for session storage)
REDIS_URL=your_redis_url_here

# Feature Flags
ENABLE_TWO_FACTOR=true
ENABLE_SSO=false
ENABLE_BIOMETRIC_AUTH=false
```

## Security Considerations

### 1. **Row Level Security (RLS)**

All tables have RLS enabled with the following policies:
- Users can read their own data
- Users can read data within their organization
- Admins can manage all data in their organization
- Super admins have unrestricted access

### 2. **Password Security**

- Passwords are hashed using bcrypt (cost factor: 12)
- Password reset tokens expire after 1 hour
- Account lockout after 5 failed login attempts
- Passwords must meet complexity requirements

### 3. **Session Security**

- Sessions expire after configured timeout
- Concurrent session limits enforced
- Device fingerprinting for anomaly detection
- Geographic location tracking
- Automatic cleanup of expired sessions

### 4. **Audit Logging**

All security-relevant events are logged:
- Login attempts (success and failure)
- Password changes
- Role/permission changes
- Session creation and termination
- Suspicious activity

### 5. **Data Protection**

- Sensitive fields (2FA secrets, tokens) should be encrypted at application layer
- PII fields comply with POPIA requirements
- Soft delete for data retention compliance
- Audit trail immutable (no DELETE operations)

## Performance Optimization

### Indexes Created

```sql
-- Users
idx_users_extended_org_id
idx_users_extended_email
idx_users_extended_stack_auth_id
idx_users_extended_active
idx_users_extended_department
idx_users_extended_last_login

-- Roles and Permissions
idx_roles_org_id
idx_roles_slug
idx_role_permissions_role
idx_role_permissions_permission
idx_user_roles_user
idx_user_roles_role
idx_user_permissions_user

-- Sessions
idx_sessions_user_id
idx_sessions_token
idx_sessions_status
idx_sessions_expires

-- Audit
idx_audit_org_id
idx_audit_user_id
idx_audit_event_type
idx_audit_created_at
idx_audit_severity
idx_audit_resource
```

### Query Optimization Tips

1. **Use prepared statements** for authentication queries
2. **Cache user permissions** in Redis (TTL: 5 minutes)
3. **Batch role/permission lookups** when possible
4. **Partition audit tables** by month for large deployments
5. **Archive old sessions** periodically (older than 90 days)

## Rollback Procedure

If you need to rollback this migration:

```sql
-- WARNING: This will delete all auth tables and data!
-- Make sure you have a backup before proceeding

BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS audit_users_extended_changes ON auth.users_extended;
DROP TRIGGER IF EXISTS update_system_config_updated_at ON auth.system_config;
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON auth.user_preferences;
DROP TRIGGER IF EXISTS update_roles_updated_at ON auth.roles;
DROP TRIGGER IF EXISTS update_users_extended_updated_at ON auth.users_extended;

-- Drop functions
DROP FUNCTION IF EXISTS auth.audit_user_changes();
DROP FUNCTION IF EXISTS auth.log_audit_event(UUID, UUID, audit_event_type, TEXT, TEXT, UUID, JSONB, JSONB, JSONB);
DROP FUNCTION IF EXISTS auth.get_user_permissions(UUID);
DROP FUNCTION IF EXISTS auth.user_has_permission(UUID, TEXT);
DROP FUNCTION IF EXISTS auth.update_updated_at_column();

-- Drop tables (in dependency order)
DROP TABLE IF EXISTS auth.feature_flags;
DROP TABLE IF EXISTS auth.system_config;
DROP TABLE IF EXISTS auth.user_preferences;
DROP TABLE IF EXISTS auth.login_history;
DROP TABLE IF EXISTS auth.audit_events;
DROP TABLE IF EXISTS auth.user_sessions;
DROP TABLE IF EXISTS auth.user_permissions;
DROP TABLE IF EXISTS auth.user_roles;
DROP TABLE IF EXISTS auth.role_permissions;
DROP TABLE IF EXISTS auth.permissions;
DROP TABLE IF EXISTS auth.roles;
DROP TABLE IF EXISTS auth.users_extended;

-- Drop enums
DROP TYPE IF EXISTS bee_status_type;
DROP TYPE IF EXISTS employment_equity_type;
DROP TYPE IF EXISTS audit_event_type;
DROP TYPE IF EXISTS session_status;
DROP TYPE IF EXISTS permission_action;
DROP TYPE IF EXISTS user_role_type;

COMMIT;
```

## Testing Checklist

- [ ] Schema validation passes
- [ ] RLS policies are enforced
- [ ] Indexes are created correctly
- [ ] Triggers fire as expected
- [ ] Functions execute without errors
- [ ] User creation workflow works
- [ ] Role assignment works
- [ ] Permission checking works
- [ ] Session management works
- [ ] Audit logging works
- [ ] Login history tracking works
- [ ] 2FA flow works (when enabled)
- [ ] Performance benchmarks meet SLA

## Compliance Notes

### POPIA (South African Data Protection)

This schema complies with POPIA requirements:
- ✅ Consent tracking (can be added via metadata)
- ✅ Data subject rights (read, update, delete)
- ✅ Audit trail for data access
- ✅ Secure processing (RLS, encryption)
- ✅ Data retention (soft delete, configurable policies)

### BEE (Broad-Based Black Economic Empowerment)

Fields for BEE compliance:
- `employment_equity` - Employment Equity Act classification
- `bee_status` - BEE level (1-8 or non-compliant)
- Organization-level BEE tracking

## Support and Troubleshooting

### Common Issues

**Issue: Migration fails with "auth schema does not exist"**
```sql
-- Solution: Create auth schema
CREATE SCHEMA IF NOT EXISTS auth;
```

**Issue: "relation auth.users does not exist"**
```sql
-- Solution: Ensure legacy auth schema is present or adjust FK constraints
-- Remove legacy auth references if not required
```

**Issue: RLS policies block all access**
```sql
-- Solution: Check auth.uid() function availability
-- or temporarily disable RLS for testing
ALTER TABLE auth.users_extended DISABLE ROW LEVEL SECURITY;
```

### Contact AS Team

For issues or questions:
- **Database Admin**: @database-admin
- **Cloud Architect**: @cloud-architect
- **Security Specialist**: @security-pro:compliance-specialist
- **Deployment Engineer**: @deployment-engineer

## Next Steps

1. ✅ Apply migration to development environment
2. ⏳ Integrate Neon Auth service in application code
3. ⏳ Create API routes for authentication endpoints
4. ⏳ Build admin panel UI for user/role management
5. ⏳ Implement comprehensive testing suite
6. ⏳ Deploy to staging for UAT
7. ⏳ Production rollout with monitoring

---

**Migration Status:** ✅ Ready for Development Testing
**AS Team Sign-off:** Pending Agent Review (Session limit reached)
**Estimated Rollout:** Pending testing completion
