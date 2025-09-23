#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
PROJECT_NAME="mantisnxt"
BACKUP_DIR="/backups"

# Parse command line arguments
RESTORE_DATABASE=false
RESTORE_UPLOADS=false
RESTORE_CONFIG=false
BACKUP_TIMESTAMP=""

usage() {
    echo "Usage: $0 [OPTIONS] TIMESTAMP"
    echo
    echo "Options:"
    echo "  -d, --database    Restore database"
    echo "  -u, --uploads     Restore uploads"
    echo "  -c, --config      Restore configuration"
    echo "  -a, --all         Restore everything"
    echo "  -h, --help        Show this help message"
    echo
    echo "Examples:"
    echo "  $0 --all 20231215_143022"
    echo "  $0 -d -u 20231215_143022"
    echo "  $0 --database 20231215_143022"
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--database)
            RESTORE_DATABASE=true
            shift
            ;;
        -u|--uploads)
            RESTORE_UPLOADS=true
            shift
            ;;
        -c|--config)
            RESTORE_CONFIG=true
            shift
            ;;
        -a|--all)
            RESTORE_DATABASE=true
            RESTORE_UPLOADS=true
            RESTORE_CONFIG=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            BACKUP_TIMESTAMP="$1"
            shift
            ;;
    esac
done

# Validate arguments
if [[ -z "$BACKUP_TIMESTAMP" ]]; then
    print_error "Backup timestamp is required"
    usage
fi

if [[ "$RESTORE_DATABASE" == false ]] && [[ "$RESTORE_UPLOADS" == false ]] && [[ "$RESTORE_CONFIG" == false ]]; then
    print_error "At least one restore option must be specified"
    usage
fi

# Verify backup files exist
verify_backup_files() {
    print_status "Verifying backup files for timestamp: $BACKUP_TIMESTAMP"

    local missing_files=()

    if [[ "$RESTORE_DATABASE" == true ]]; then
        local db_backup="$BACKUP_DIR/database_backup_$BACKUP_TIMESTAMP.sql.gz"
        if [[ ! -f "$db_backup" ]]; then
            missing_files+=("$db_backup")
        fi
    fi

    if [[ "$RESTORE_UPLOADS" == true ]]; then
        local uploads_backup="$BACKUP_DIR/uploads_backup_$BACKUP_TIMESTAMP.tar.gz"
        if [[ ! -f "$uploads_backup" ]]; then
            missing_files+=("$uploads_backup")
        fi
    fi

    if [[ "$RESTORE_CONFIG" == true ]]; then
        local config_backup="$BACKUP_DIR/config_backup_$BACKUP_TIMESTAMP.tar.gz"
        if [[ ! -f "$config_backup" ]]; then
            missing_files+=("$config_backup")
        fi
    fi

    if [[ ${#missing_files[@]} -gt 0 ]]; then
        print_error "Missing backup files:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        exit 1
    fi

    print_success "All required backup files found"
}

# Confirm restore operation
confirm_restore() {
    print_warning "This operation will overwrite existing data!"
    echo
    echo "Restore operations to perform:"
    [[ "$RESTORE_DATABASE" == true ]] && echo "  - Database restore"
    [[ "$RESTORE_UPLOADS" == true ]] && echo "  - Uploads restore"
    [[ "$RESTORE_CONFIG" == true ]] && echo "  - Configuration restore"
    echo
    read -p "Are you sure you want to continue? (yes/no): " confirmation

    if [[ "$confirmation" != "yes" ]]; then
        print_status "Restore operation cancelled"
        exit 0
    fi
}

# Restore database
restore_database() {
    print_status "Restoring database from backup..."

    local db_backup="$BACKUP_DIR/database_backup_$BACKUP_TIMESTAMP.sql.gz"

    # Stop application to ensure no connections
    print_status "Stopping application services..."
    docker-compose stop app

    # Create temporary SQL file
    local temp_sql="/tmp/restore_$BACKUP_TIMESTAMP.sql"
    gunzip -c "$db_backup" > "$temp_sql"

    # Restore database
    print_status "Restoring database content..."
    docker-compose exec -T postgres psql \
        -U "${DB_USER:-mantisnxt}" \
        -d "${DB_NAME:-mantisnxt}" \
        -f "/tmp/restore_$BACKUP_TIMESTAMP.sql"

    # Clean up temporary file
    rm -f "$temp_sql"

    # Restart application
    print_status "Restarting application services..."
    docker-compose start app

    print_success "Database restored successfully"
}

# Restore uploads
restore_uploads() {
    print_status "Restoring uploads from backup..."

    local uploads_backup="$BACKUP_DIR/uploads_backup_$BACKUP_TIMESTAMP.tar.gz"

    # Stop application to ensure no file access
    print_status "Stopping application services..."
    docker-compose stop app

    # Clear existing uploads
    print_warning "Clearing existing uploads..."
    docker run --rm \
        -v mantisnxt_uploads_data:/uploads \
        alpine:latest \
        sh -c "rm -rf /uploads/* && rm -rf /uploads/.*" 2>/dev/null || true

    # Restore uploads
    print_status "Restoring uploads content..."
    docker run --rm \
        -v mantisnxt_uploads_data:/uploads \
        -v "$BACKUP_DIR:/backup:ro" \
        alpine:latest \
        tar -xzf "/backup/uploads_backup_$BACKUP_TIMESTAMP.tar.gz" -C /uploads

    # Restart application
    print_status "Restarting application services..."
    docker-compose start app

    print_success "Uploads restored successfully"
}

# Restore configuration
restore_config() {
    print_status "Restoring configuration from backup..."

    local config_backup="$BACKUP_DIR/config_backup_$BACKUP_TIMESTAMP.tar.gz"
    local restore_dir="/tmp/config_restore_$BACKUP_TIMESTAMP"

    # Create temporary directory
    mkdir -p "$restore_dir"

    # Extract configuration backup
    tar -xzf "$config_backup" -C "$restore_dir"

    print_warning "Configuration files extracted to: $restore_dir"
    print_warning "Please manually review and apply configuration changes as needed"
    print_warning "Automatic configuration restore is not performed for safety"

    # List extracted files
    echo
    echo "Extracted configuration files:"
    find "$restore_dir" -type f | sort

    print_success "Configuration backup extracted for manual review"
}

# Verify restore integrity
verify_restore() {
    print_status "Verifying restore integrity..."

    local failed_checks=()

    if [[ "$RESTORE_DATABASE" == true ]]; then
        # Check database connection and basic query
        if docker-compose exec -T postgres psql \
            -U "${DB_USER:-mantisnxt}" \
            -d "${DB_NAME:-mantisnxt}" \
            -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" >/dev/null 2>&1; then
            print_success "Database restore verified"
        else
            failed_checks+=("database")
        fi
    fi

    if [[ "$RESTORE_UPLOADS" == true ]]; then
        # Check if uploads volume is accessible
        if docker run --rm \
            -v mantisnxt_uploads_data:/uploads:ro \
            alpine:latest \
            test -d /uploads >/dev/null 2>&1; then
            print_success "Uploads restore verified"
        else
            failed_checks+=("uploads")
        fi
    fi

    if [[ ${#failed_checks[@]} -gt 0 ]]; then
        print_error "Restore verification failed for: ${failed_checks[*]}"
        return 1
    fi

    print_success "All restores verified successfully"
}

# List available backups
list_backups() {
    print_status "Available backups:"
    echo

    if [[ ! -d "$BACKUP_DIR" ]]; then
        print_warning "No backup directory found"
        return
    fi

    # Find unique timestamps
    local timestamps=$(ls "$BACKUP_DIR"/*_backup_*.* 2>/dev/null | \
        sed -E 's/.*_backup_([0-9]+_[0-9]+)\..*/\1/' | \
        sort -u)

    if [[ -z "$timestamps" ]]; then
        print_warning "No backups found"
        return
    fi

    for timestamp in $timestamps; do
        echo "Timestamp: $timestamp"

        local db_backup="$BACKUP_DIR/database_backup_$timestamp.sql.gz"
        local uploads_backup="$BACKUP_DIR/uploads_backup_$timestamp.tar.gz"
        local config_backup="$BACKUP_DIR/config_backup_$timestamp.tar.gz"

        [[ -f "$db_backup" ]] && echo "  - Database: $(du -h "$db_backup" | cut -f1)"
        [[ -f "$uploads_backup" ]] && echo "  - Uploads: $(du -h "$uploads_backup" | cut -f1)"
        [[ -f "$config_backup" ]] && echo "  - Config: $(du -h "$config_backup" | cut -f1)"
        echo
    done
}

# Main restore function
main() {
    echo "=================================================="
    echo "  MantisNXT Restore Script"
    echo "  Timestamp: $BACKUP_TIMESTAMP"
    echo "=================================================="
    echo

    # If no timestamp provided, list available backups
    if [[ -z "$BACKUP_TIMESTAMP" ]]; then
        list_backups
        exit 0
    fi

    verify_backup_files
    confirm_restore

    # Perform restore operations
    [[ "$RESTORE_DATABASE" == true ]] && restore_database
    [[ "$RESTORE_UPLOADS" == true ]] && restore_uploads
    [[ "$RESTORE_CONFIG" == true ]] && restore_config

    verify_restore

    print_success "Restore process completed successfully!"
    echo
    echo "Post-restore checklist:"
    echo "  1. Verify application functionality"
    echo "  2. Check data integrity"
    echo "  3. Review logs for any errors"
    echo "  4. Update configuration if needed"
}

# Run main function
main "$@"