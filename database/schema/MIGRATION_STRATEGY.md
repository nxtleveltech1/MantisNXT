# MantisNXT Migration Strategy & Implementation Plan

## Executive Summary

This document outlines the comprehensive migration strategy for implementing the MantisNXT enhanced schema while maintaining zero-downtime operations and data integrity. The strategy follows a phased approach with rollback capabilities and comprehensive testing at each stage.

## Migration Philosophy

### Core Principles
1. **Zero Downtime**: All migrations must be deployable without service interruption
2. **Data Integrity**: Comprehensive validation and backup procedures
3. **Rollback Ready**: Every migration must have a tested rollback procedure
4. **Performance Aware**: Monitor and optimize performance impact
5. **Security First**: Maintain security standards throughout migration
6. **Compliance**: Ensure GDPR and audit requirements are met

### Risk Mitigation
- Blue-green deployment strategy
- Comprehensive backup before each phase
- Automated rollback triggers
- Performance monitoring and alerting
- Data validation at each step

## Migration Phases

### Phase 0: Pre-Migration Preparation (Week 1)

#### Objectives
- Establish migration infrastructure
- Create comprehensive backups
- Set up monitoring and alerting
- Validate existing data integrity

#### Tasks
```sql
-- 1. Create migration tracking table
CREATE TABLE schema_migrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version text NOT NULL UNIQUE,
    description text NOT NULL,
    applied_at timestamptz DEFAULT now(),
    rollback_sql text,
    checksum text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rolled_back'))
);

-- 2. Create backup verification table
CREATE TABLE migration_backups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phase text NOT NULL,
    backup_location text NOT NULL,
    backup_size_bytes bigint NOT NULL,
    checksum text NOT NULL,
    created_at timestamptz DEFAULT now(),
    verified_at timestamptz,
    is_valid boolean
);
```

#### Backup Strategy
```bash
#!/bin/bash
# Pre-migration backup script
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/pre-migration-${BACKUP_DATE}"

# Full database backup
pg_dump --format=custom --verbose --file="${BACKUP_DIR}/mantis_full_${BACKUP_DATE}.backup" mantis_db

# Schema-only backup
pg_dump --schema-only --verbose --file="${BACKUP_DIR}/mantis_schema_${BACKUP_DATE}.sql" mantis_db

# Data-only backup (for quick restore testing)
pg_dump --data-only --verbose --file="${BACKUP_DIR}/mantis_data_${BACKUP_DATE}.sql" mantis_db

# Verify backup integrity
pg_restore --list "${BACKUP_DIR}/mantis_full_${BACKUP_DATE}.backup" > "${BACKUP_DIR}/restore_list.txt"
```

#### Pre-Migration Validation
```sql
-- Data integrity checks
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
AND tablename IN (
    'organization', 'profile', 'customer', 'supplier',
    'inventory_item', 'purchase_order', 'ai_conversation'
);

-- Constraint validation
SELECT conname, contype, conrelid::regclass as table_name
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace;

-- Index analysis
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Phase 1: Core Enhancements (Week 2)

#### Objectives
- Add essential enums and extensions
- Enhance user management and authentication
- Implement core CRM functionality

#### Migration Script: `001_core_enhancements.sql`
```sql
-- Migration: Core Enhancements
-- Version: 001
-- Description: Add essential enums, extensions, and core authentication enhancements

BEGIN;

-- Track migration start
INSERT INTO schema_migrations (version, description, status)
VALUES ('001', 'Core Enhancements - Enums and Authentication', 'running');

-- 1. Enable extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "hstore";
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. Add new enums
DO $$
BEGIN
    -- Currency codes
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_code') THEN
        CREATE TYPE currency_code AS ENUM (
            'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL'
        );
    END IF;

    -- Payment status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM (
            'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'disputed'
        );
    END IF;

    -- Add other enums...
END $$;

-- 3. Authentication enhancements
CREATE TABLE IF NOT EXISTS oauth_provider (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    client_id text NOT NULL,
    client_secret_encrypted text NOT NULL,
    authorization_url text NOT NULL,
    token_url text NOT NULL,
    user_info_url text NOT NULL,
    scope text DEFAULT 'email profile',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT oauth_provider_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 50),
    CONSTRAINT oauth_provider_urls_format CHECK (
        authorization_url ~ '^https://.*' AND
        token_url ~ '^https://.*' AND
        user_info_url ~ '^https://.*'
    )
);

-- Enable RLS
ALTER TABLE oauth_provider ENABLE ROW LEVEL SECURITY;

-- Add indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_oauth_provider_name ON oauth_provider(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_oauth_provider_active ON oauth_provider(is_active) WHERE is_active = true;

-- Update migration status
UPDATE schema_migrations
SET status = 'completed', applied_at = now()
WHERE version = '001';

COMMIT;
```

#### Rollback Script: `001_core_enhancements_rollback.sql`
```sql
-- Rollback: Core Enhancements
BEGIN;

-- Update migration status
UPDATE schema_migrations
SET status = 'rolled_back'
WHERE version = '001';

-- Drop tables (in reverse order)
DROP TABLE IF EXISTS oauth_provider;

-- Drop enums (check dependencies first)
DROP TYPE IF EXISTS currency_code CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;

-- Note: Extensions are not dropped to avoid affecting other objects

COMMIT;
```

#### Validation Queries
```sql
-- Validate migration success
SELECT
    version,
    description,
    status,
    applied_at
FROM schema_migrations
WHERE version = '001';

-- Validate table creation
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'oauth_provider';

-- Validate enum creation
SELECT typname, typcategory
FROM pg_type
WHERE typname IN ('currency_code', 'payment_status');
```

### Phase 2: CRM & Sales Modules (Week 3)

#### Objectives
- Implement comprehensive CRM functionality
- Add sales quote and order management
- Establish lead-to-customer workflow

#### Migration Script: `002_crm_sales_modules.sql`
```sql
-- Migration: CRM and Sales Modules
-- Version: 002
-- Description: Implement CRM tables and sales management system

BEGIN;

INSERT INTO schema_migrations (version, description, status)
VALUES ('002', 'CRM and Sales Modules', 'running');

-- Customer contacts
CREATE TABLE customer_contact (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    first_name text NOT NULL,
    last_name text NOT NULL,
    title text,
    email text,
    phone text,
    mobile text,
    is_primary boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT contact_name_length CHECK (
        char_length(first_name) >= 1 AND char_length(first_name) <= 100 AND
        char_length(last_name) >= 1 AND char_length(last_name) <= 100
    ),
    CONSTRAINT contact_email_format CHECK (email IS NULL OR email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- Add RLS and indexes
ALTER TABLE customer_contact ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON customer_contact
    USING (
        (SELECT org_id FROM customer WHERE id = customer_contact.customer_id) =
        (SELECT org_id FROM profile WHERE id = auth.uid())
    );

-- Indexes
CREATE INDEX CONCURRENTLY idx_customer_contact_customer ON customer_contact(customer_id);
CREATE INDEX CONCURRENTLY idx_customer_contact_email ON customer_contact(email) WHERE email IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_customer_contact_primary ON customer_contact(customer_id, is_primary) WHERE is_primary = true;

-- Continue with other CRM tables...

UPDATE schema_migrations
SET status = 'completed', applied_at = now()
WHERE version = '002';

COMMIT;
```

### Phase 3: Financial Management (Week 4)

#### Objectives
- Implement comprehensive financial system
- Add invoicing and payment processing
- Establish chart of accounts

#### Migration Considerations
```sql
-- Special handling for financial data migration
-- Ensure all monetary amounts are properly migrated with currency information

-- Migration script will include:
-- 1. Chart of accounts setup
-- 2. Tax rate configuration
-- 3. Invoice and payment tables
-- 4. Journal entry system
-- 5. Currency conversion handling
```

### Phase 4: Advanced Features (Week 5-6)

#### Objectives
- Document management system
- Communication templates and campaigns
- Advanced analytics and reporting
- Performance optimization

#### Special Considerations
- Large table migrations using `pg_repack`
- Partitioned table creation
- Materialized view implementation
- Index optimization

## Migration Tools & Scripts

### Migration Runner Script
```bash
#!/bin/bash
# Migration runner with comprehensive error handling

set -euo pipefail

MIGRATION_DIR="/migrations"
LOG_DIR="/var/log/migrations"
BACKUP_DIR="/backups/migrations"

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-mantis_db}"
DB_USER="${DB_USER:-postgres}"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_DIR}/migration.log"
}

# Backup function
create_backup() {
    local migration_version="$1"
    local backup_file="${BACKUP_DIR}/pre_${migration_version}_$(date +%Y%m%d_%H%M%S).backup"

    log "Creating backup before migration $migration_version"
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --format=custom --verbose --file="$backup_file"

    if [ $? -eq 0 ]; then
        log "Backup created successfully: $backup_file"
        echo "$backup_file"
    else
        log "ERROR: Backup failed"
        exit 1
    fi
}

# Validation function
validate_migration() {
    local migration_version="$1"
    local validation_sql="${MIGRATION_DIR}/${migration_version}_validate.sql"

    if [ -f "$validation_sql" ]; then
        log "Running validation for migration $migration_version"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -f "$validation_sql" || {
            log "ERROR: Validation failed for migration $migration_version"
            return 1
        }
    fi
}

# Rollback function
rollback_migration() {
    local migration_version="$1"
    local rollback_sql="${MIGRATION_DIR}/${migration_version}_rollback.sql"

    if [ -f "$rollback_sql" ]; then
        log "Rolling back migration $migration_version"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -f "$rollback_sql" || {
            log "ERROR: Rollback failed for migration $migration_version"
            return 1
        }
    else
        log "ERROR: No rollback script found for migration $migration_version"
        return 1
    fi
}

# Main migration function
run_migration() {
    local migration_file="$1"
    local migration_version=$(basename "$migration_file" .sql)

    log "Starting migration: $migration_version"

    # Check if already applied
    local applied=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -t -c "SELECT COUNT(*) FROM schema_migrations WHERE version = '$migration_version' AND status = 'completed';")

    if [ "$applied" -gt 0 ]; then
        log "Migration $migration_version already applied, skipping"
        return 0
    fi

    # Create backup
    local backup_file=$(create_backup "$migration_version")

    # Run migration
    log "Executing migration $migration_version"
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -f "$migration_file"; then
        log "Migration $migration_version completed successfully"

        # Run validation
        if validate_migration "$migration_version"; then
            log "Validation passed for migration $migration_version"
        else
            log "Validation failed, rolling back migration $migration_version"
            rollback_migration "$migration_version"
            return 1
        fi
    else
        log "ERROR: Migration $migration_version failed"
        log "Rolling back migration $migration_version"
        rollback_migration "$migration_version"
        return 1
    fi
}

# Main execution
main() {
    log "Starting migration process"

    # Ensure directories exist
    mkdir -p "$LOG_DIR" "$BACKUP_DIR"

    # Run migrations in order
    for migration_file in "${MIGRATION_DIR}"/*.sql; do
        if [[ "$migration_file" != *"_rollback.sql" ]] && [[ "$migration_file" != *"_validate.sql" ]]; then
            run_migration "$migration_file" || {
                log "Migration process failed"
                exit 1
            }
        fi
    done

    log "All migrations completed successfully"
}

# Execute main function
main "$@"
```

### Performance Monitoring Script
```sql
-- Performance monitoring during migration
CREATE OR REPLACE FUNCTION monitor_migration_performance()
RETURNS TABLE (
    timestamp timestamptz,
    active_connections integer,
    waiting_queries integer,
    avg_query_time interval,
    cache_hit_ratio numeric,
    disk_usage_gb numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        now() as timestamp,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active')::integer as active_connections,
        (SELECT count(*) FROM pg_stat_activity WHERE waiting = true)::integer as waiting_queries,
        (SELECT avg(now() - query_start) FROM pg_stat_activity WHERE state = 'active') as avg_query_time,
        (SELECT round(100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2)
         FROM pg_stat_database WHERE datname = current_database()) as cache_hit_ratio,
        (SELECT round(pg_database_size(current_database()) / 1024.0 / 1024.0 / 1024.0, 2)) as disk_usage_gb;
END;
$$ LANGUAGE plpgsql;
```

## Testing Strategy

### Test Environments
1. **Development**: Local PostgreSQL instance
2. **Staging**: Production-like environment with synthetic data
3. **Production**: Live environment with rolling deployment

### Test Categories

#### Unit Tests
```sql
-- Test individual migration scripts
-- Example: Test enum creation
DO $$
BEGIN
    ASSERT (SELECT COUNT(*) FROM pg_type WHERE typname = 'currency_code') = 1,
        'currency_code enum should exist';

    ASSERT (SELECT COUNT(*) FROM pg_enum WHERE enumlabel = 'USD'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'currency_code')) = 1,
        'USD should be a valid currency_code';
END $$;
```

#### Integration Tests
```sql
-- Test cross-table relationships and constraints
-- Example: Test CRM workflow
DO $$
DECLARE
    test_org_id uuid;
    test_customer_id uuid;
    test_lead_id uuid;
    test_opportunity_id uuid;
BEGIN
    -- Create test organization
    INSERT INTO organization (name, slug)
    VALUES ('Test Org', 'test-org')
    RETURNING id INTO test_org_id;

    -- Test complete lead-to-customer workflow
    -- ... (detailed test scenarios)

    -- Cleanup
    DELETE FROM organization WHERE id = test_org_id;
END $$;
```

#### Performance Tests
```bash
#!/bin/bash
# Load testing script using pgbench

# Test concurrent user scenarios
pgbench -c 50 -j 4 -T 300 -P 30 \
    -f test_scenarios/customer_crud.sql \
    -f test_scenarios/order_processing.sql \
    -f test_scenarios/analytics_queries.sql \
    mantis_db
```

#### Data Integrity Tests
```sql
-- Validate data relationships after migration
SELECT
    'customers_without_org' as test_case,
    COUNT(*) as failure_count
FROM customer c
LEFT JOIN organization o ON c.org_id = o.id
WHERE o.id IS NULL

UNION ALL

SELECT
    'orphaned_customer_contacts' as test_case,
    COUNT(*) as failure_count
FROM customer_contact cc
LEFT JOIN customer c ON cc.customer_id = c.id
WHERE c.id IS NULL;
```

## Rollback Procedures

### Automatic Rollback Triggers
```sql
-- Automatic rollback on constraint violations
CREATE OR REPLACE FUNCTION migration_error_handler()
RETURNS void AS $$
BEGIN
    -- Check for recent errors
    IF EXISTS (
        SELECT 1 FROM pg_stat_database_conflicts
        WHERE datname = current_database()
        AND deadlocks > 0
    ) THEN
        RAISE EXCEPTION 'Database conflicts detected, triggering rollback';
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### Manual Rollback Process
```bash
#!/bin/bash
# Manual rollback script

MIGRATION_VERSION="$1"

if [ -z "$MIGRATION_VERSION" ]; then
    echo "Usage: $0 <migration_version>"
    exit 1
fi

# Confirm rollback
read -p "Are you sure you want to rollback migration $MIGRATION_VERSION? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

# Execute rollback
./migration_runner.sh rollback "$MIGRATION_VERSION"
```

## Post-Migration Validation

### Comprehensive Validation Suite
```sql
-- Post-migration validation script
CREATE OR REPLACE FUNCTION validate_schema_integrity()
RETURNS TABLE (
    check_name text,
    status text,
    details text
) AS $$
BEGIN
    -- Table count validation
    RETURN QUERY
    SELECT
        'table_count' as check_name,
        CASE WHEN COUNT(*) >= 50 THEN 'PASS' ELSE 'FAIL' END as status,
        'Expected minimum 50 tables, found: ' || COUNT(*)::text as details
    FROM information_schema.tables
    WHERE table_schema = 'public';

    -- RLS policy validation
    RETURN QUERY
    SELECT
        'rls_policies' as check_name,
        CASE WHEN COUNT(*) >= 30 THEN 'PASS' ELSE 'FAIL' END as status,
        'Expected minimum 30 RLS policies, found: ' || COUNT(*)::text as details
    FROM pg_policies
    WHERE schemaname = 'public';

    -- Index validation
    RETURN QUERY
    SELECT
        'performance_indexes' as check_name,
        CASE WHEN COUNT(*) >= 100 THEN 'PASS' ELSE 'FAIL' END as status,
        'Expected minimum 100 indexes, found: ' || COUNT(*)::text as details
    FROM pg_indexes
    WHERE schemaname = 'public';

    -- Constraint validation
    RETURN QUERY
    SELECT
        'constraints' as check_name,
        CASE WHEN COUNT(*) >= 150 THEN 'PASS' ELSE 'FAIL' END as status,
        'Expected minimum 150 constraints, found: ' || COUNT(*)::text as details
    FROM information_schema.table_constraints
    WHERE table_schema = 'public';
END;
$$ LANGUAGE plpgsql;

-- Run validation
SELECT * FROM validate_schema_integrity();
```

## Timeline & Resources

### Migration Schedule
- **Week 1**: Pre-migration preparation and testing
- **Week 2**: Phase 1 - Core enhancements
- **Week 3**: Phase 2 - CRM and sales modules
- **Week 4**: Phase 3 - Financial management
- **Week 5**: Phase 4 - Advanced features
- **Week 6**: Performance optimization and final validation

### Resource Requirements
- **Database Administrator**: Full-time for 6 weeks
- **Backend Developer**: Full-time for 4 weeks
- **DevOps Engineer**: Part-time for monitoring and deployment
- **QA Engineer**: Full-time for testing and validation

### Risk Assessment
- **High Risk**: Financial data migration (Phase 3)
- **Medium Risk**: Large table restructuring (Phase 4)
- **Low Risk**: Enum and function additions (Phase 1-2)

## Success Criteria

### Technical Metrics
- Zero data loss during migration
- < 1 minute downtime per phase
- Performance degradation < 5%
- All validation tests pass
- Rollback procedures tested and verified

### Business Metrics
- All existing functionality preserved
- New features operational
- User experience unchanged
- API compatibility maintained
- Audit trails complete

## Conclusion

This migration strategy provides a comprehensive, phased approach to implementing the MantisNXT enhanced schema while maintaining system stability and data integrity. The strategy emphasizes safety through extensive testing, monitoring, and rollback capabilities.

The success of this migration depends on careful execution of each phase, thorough testing at every step, and maintaining constant communication between development, operations, and business teams.

**Key Success Factors**:
1. Comprehensive backup and restore procedures
2. Extensive testing in staging environment
3. Real-time monitoring during migration
4. Immediate rollback capability
5. Clear communication and documentation
6. Post-migration validation and optimization

This strategy ensures that the MantisNXT platform can evolve to its full enterprise-grade capability while maintaining the trust and reliability that users depend on.