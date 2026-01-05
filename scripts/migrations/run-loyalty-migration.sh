#!/bin/bash

# Migration Runner for Loyalty & Rewards System
# Usage: ./scripts/run-loyalty-migration.sh [--test-only] [--skip-tests]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
MIGRATION_FILE="migrations/0015_loyalty_rewards.sql"
TEST_FILE="migrations/0015_loyalty_rewards_TESTS.sql"
DB_NAME="${DATABASE_NAME:-postgres}"
DB_USER="${DATABASE_USER:-postgres}"
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"

# Parse arguments
RUN_TESTS=true
RUN_MIGRATION=true

for arg in "$@"; do
    case $arg in
        --test-only)
            RUN_MIGRATION=false
            ;;
        --skip-tests)
            RUN_TESTS=false
            ;;
        --help)
            echo "Usage: $0 [--test-only] [--skip-tests]"
            echo ""
            echo "Options:"
            echo "  --test-only   Run only the tests without applying migration"
            echo "  --skip-tests  Apply migration without running tests"
            echo "  --help        Show this help message"
            exit 0
            ;;
    esac
done

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if migration has already been applied
check_migration_status() {
    print_info "Checking migration status..."

    # Check if loyalty_program table exists
    RESULT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'loyalty_program');")

    if [ "$RESULT" = "t" ]; then
        print_warn "Migration appears to already be applied (loyalty_program table exists)"
        read -p "Do you want to continue? This will attempt to re-run the migration. (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Migration cancelled"
            exit 0
        fi
    fi
}

# Function to validate database connection
validate_connection() {
    print_info "Validating database connection..."

    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        print_error "Failed to connect to database"
        print_error "Connection details:"
        print_error "  Host: $DB_HOST"
        print_error "  Port: $DB_PORT"
        print_error "  Database: $DB_NAME"
        print_error "  User: $DB_USER"
        exit 1
    fi

    print_info "Database connection successful"
}

# Function to check dependencies
check_dependencies() {
    print_info "Checking migration dependencies..."

    # Check if customer table exists (from 0004_customer_ops.sql)
    RESULT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customer');")

    if [ "$RESULT" = "f" ]; then
        print_error "Dependency not met: customer table does not exist"
        print_error "Please run migration 0004_customer_ops.sql first"
        exit 1
    fi

    # Check if organization table exists
    RESULT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'organization');")

    if [ "$RESULT" = "f" ]; then
        print_error "Dependency not met: organization table does not exist"
        print_error "Please run migration 0001_init_core.sql first"
        exit 1
    fi

    print_info "All dependencies satisfied"
}

# Function to create backup
create_backup() {
    print_info "Creating database backup..."

    BACKUP_DIR="backups"
    mkdir -p "$BACKUP_DIR"

    BACKUP_FILE="$BACKUP_DIR/pre_loyalty_migration_$(date +%Y%m%d_%H%M%S).sql"

    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -t customer -t customer_loyalty -t organization \
        > "$BACKUP_FILE" 2>/dev/null; then
        print_info "Backup created: $BACKUP_FILE"
    else
        print_warn "Backup creation failed or tables don't exist yet"
    fi
}

# Function to apply migration
apply_migration() {
    print_info "Applying migration: $MIGRATION_FILE"

    if [ ! -f "$MIGRATION_FILE" ]; then
        print_error "Migration file not found: $MIGRATION_FILE"
        exit 1
    fi

    # Apply migration
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"; then
        print_info "Migration applied successfully"
    else
        print_error "Migration failed"
        exit 1
    fi
}

# Function to run tests
run_tests() {
    print_info "Running validation tests: $TEST_FILE"

    if [ ! -f "$TEST_FILE" ]; then
        print_error "Test file not found: $TEST_FILE"
        exit 1
    fi

    # Run tests
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$TEST_FILE"; then
        print_info "All tests passed successfully"
    else
        print_error "Tests failed"
        exit 1
    fi
}

# Function to verify migration
verify_migration() {
    print_info "Verifying migration..."

    # Check all tables exist
    TABLES=("loyalty_program" "customer_loyalty" "loyalty_transaction" "reward_catalog" "reward_redemption" "loyalty_rule")

    for table in "${TABLES[@]}"; do
        RESULT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');")

        if [ "$RESULT" = "t" ]; then
            print_info "✓ Table $table exists"
        else
            print_error "✗ Table $table missing"
            exit 1
        fi
    done

    # Check all functions exist
    FUNCTIONS=("calculate_points_for_order" "redeem_reward" "update_customer_tier" "expire_points" "get_customer_rewards_summary")

    for func in "${FUNCTIONS[@]}"; do
        RESULT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
            "SELECT EXISTS (SELECT FROM pg_proc WHERE proname = '$func');")

        if [ "$RESULT" = "t" ]; then
            print_info "✓ Function $func exists"
        else
            print_error "✗ Function $func missing"
            exit 1
        fi
    done

    # Check views exist
    VIEWS=("loyalty_leaderboard" "reward_analytics")

    for view in "${VIEWS[@]}"; do
        RESULT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
            "SELECT EXISTS (SELECT FROM information_schema.views WHERE table_name = '$view');")

        if [ "$RESULT" = "t" ]; then
            print_info "✓ View $view exists"
        else
            print_error "✗ View $view missing"
            exit 1
        fi
    done

    print_info "Migration verification complete"
}

# Function to display migration summary
display_summary() {
    print_info "Migration Summary:"

    # Count records in each table
    for table in loyalty_program customer_loyalty loyalty_transaction reward_catalog reward_redemption loyalty_rule; do
        COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
            "SELECT COUNT(*) FROM $table;")
        print_info "  $table: $COUNT records"
    done
}

# Main execution
main() {
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║         Loyalty & Rewards System Migration Runner             ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    # Validate connection
    validate_connection

    if [ "$RUN_MIGRATION" = true ]; then
        # Check dependencies
        check_dependencies

        # Check migration status
        check_migration_status

        # Create backup
        create_backup

        # Apply migration
        apply_migration

        # Verify migration
        verify_migration
    fi

    if [ "$RUN_TESTS" = true ]; then
        # Run tests
        run_tests
    fi

    # Display summary
    if [ "$RUN_MIGRATION" = true ]; then
        display_summary
    fi

    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                    Migration Complete!                         ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    print_info "Next steps:"
    print_info "1. Review docs/LOYALTY_REWARDS_SYSTEM.md for detailed documentation"
    print_info "2. Review docs/LOYALTY_REWARDS_QUICK_START.md for integration examples"
    print_info "3. Create your first loyalty program and rewards"
    print_info "4. Set up scheduled tasks for points expiry"
    echo ""
}

# Run main function
main
