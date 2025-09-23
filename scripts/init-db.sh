#!/bin/bash

set -e

echo "Initializing MantisNXT database..."

# Wait for PostgreSQL to be ready
until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  echo "Waiting for PostgreSQL to start..."
  sleep 2
done

echo "PostgreSQL is ready. Running initialization scripts..."

# Function to execute SQL files safely
execute_sql_file() {
    local file="$1"
    local description="$2"

    if [[ -f "$file" ]]; then
        echo "Executing $description: $(basename "$file")"
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$file"
        echo "✓ $description completed"
    else
        echo "⚠ Warning: $file not found, skipping $description"
    fi
}

# Execute schema files in order
if [[ -d "/docker-entrypoint-initdb.d/schema" ]]; then
    echo "Setting up database schema..."
    for schema_file in /docker-entrypoint-initdb.d/schema/*.sql; do
        if [[ -f "$schema_file" ]]; then
            execute_sql_file "$schema_file" "Schema setup"
        fi
    done
fi

# Execute migration files in order
if [[ -d "/docker-entrypoint-initdb.d/migrations" ]]; then
    echo "Running database migrations..."

    # Sort migration files by name to ensure correct order
    for migration_file in $(ls /docker-entrypoint-initdb.d/migrations/*.sql 2>/dev/null | sort); do
        if [[ -f "$migration_file" ]]; then
            # Skip corrected files that are duplicates
            if [[ "$migration_file" =~ _corrected\.sql$ ]]; then
                echo "Skipping corrected duplicate: $(basename "$migration_file")"
                continue
            fi

            execute_sql_file "$migration_file" "Migration $(basename "$migration_file")"
        fi
    done
fi

# Create additional indexes for performance if not exists
echo "Creating additional performance indexes..."
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" << 'EOF'
-- Performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_item_sku ON inventory_item(sku);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_item_category ON inventory_item(category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_item_status ON inventory_item(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_item_org_id ON inventory_item(org_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supply_order_status ON supply_order(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supply_order_created_at ON supply_order(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_ticket_status ON support_ticket(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_ticket_priority ON support_ticket(priority);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);

-- Full-text search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_item_search
ON inventory_item USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_ticket_search
ON support_ticket USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
EOF

# Set up database maintenance procedures
echo "Setting up database maintenance procedures..."
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" << 'EOF'
-- Auto-vacuum and statistics settings
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.max = 10000;
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;

-- Create maintenance function
CREATE OR REPLACE FUNCTION maintenance_cleanup()
RETURNS void AS $$
BEGIN
    -- Clean up old audit logs (older than 90 days)
    DELETE FROM audit_log WHERE timestamp < NOW() - INTERVAL '90 days';

    -- Clean up old system metrics (older than 30 days)
    DELETE FROM system_metric WHERE timestamp < NOW() - INTERVAL '30 days';

    -- Clean up old notifications (older than 30 days and read)
    DELETE FROM notification
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND is_read = true;

    -- Update table statistics
    ANALYZE;

    -- Log maintenance completion
    INSERT INTO audit_log (table_name, operation, user_id, timestamp, details)
    VALUES ('maintenance', 'cleanup', null, NOW(), 'Automated maintenance cleanup completed');
END;
$$ LANGUAGE plpgsql;

-- Create maintenance schedule (requires pg_cron extension in production)
-- SELECT cron.schedule('maintenance-cleanup', '0 2 * * *', 'SELECT maintenance_cleanup();');
EOF

# Verify database setup
echo "Verifying database setup..."
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" << 'EOF'
-- Verify tables exist
SELECT
    schemaname,
    tablename,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verify functions exist
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
EOF

echo "✓ Database initialization completed successfully!"

# Create a marker file to indicate successful initialization
touch /var/lib/postgresql/data/.mantisnxt_initialized

echo "Database is ready for use."