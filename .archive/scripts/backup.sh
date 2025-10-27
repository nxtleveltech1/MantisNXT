#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="mantisnxt"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory if it doesn't exist
setup_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        mkdir -p "$BACKUP_DIR"
        print_status "Created backup directory: $BACKUP_DIR"
    fi
}

# Backup PostgreSQL database
backup_database() {
    print_status "Creating database backup..."

    local backup_file="$BACKUP_DIR/database_backup_$TIMESTAMP.sql"

    docker-compose exec -T postgres pg_dump \
        -U "${DB_USER:-mantisnxt}" \
        -d "${DB_NAME:-mantisnxt}" \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists > "$backup_file"

    # Compress the backup
    gzip "$backup_file"
    backup_file="$backup_file.gz"

    if [[ -f "$backup_file" ]]; then
        local size=$(du -h "$backup_file" | cut -f1)
        print_success "Database backup created: $backup_file ($size)"
    else
        print_error "Failed to create database backup"
        return 1
    fi
}

# Backup uploaded files
backup_uploads() {
    print_status "Creating uploads backup..."

    local backup_file="$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz"

    # Create tar archive of uploads directory
    docker run --rm \
        -v mantisnxt_uploads_data:/uploads:ro \
        -v "$BACKUP_DIR:/backup" \
        alpine:latest \
        tar -czf "/backup/uploads_backup_$TIMESTAMP.tar.gz" -C /uploads .

    if [[ -f "$backup_file" ]]; then
        local size=$(du -h "$backup_file" | cut -f1)
        print_success "Uploads backup created: $backup_file ($size)"
    else
        print_error "Failed to create uploads backup"
        return 1
    fi
}

# Backup configuration files
backup_config() {
    print_status "Creating configuration backup..."

    local backup_file="$BACKUP_DIR/config_backup_$TIMESTAMP.tar.gz"

    # Create tar archive of configuration files
    tar -czf "$backup_file" \
        --exclude=".env" \
        --exclude="node_modules" \
        --exclude=".git" \
        --exclude=".next" \
        --exclude="*.log" \
        .env.example \
        docker-compose.yml \
        Dockerfile* \
        nginx/ \
        monitoring/ \
        scripts/ \
        migrations/ 2>/dev/null || true

    if [[ -f "$backup_file" ]]; then
        local size=$(du -h "$backup_file" | cut -f1)
        print_success "Configuration backup created: $backup_file ($size)"
    else
        print_error "Failed to create configuration backup"
        return 1
    fi
}

# Upload backup to S3 (if configured)
upload_to_s3() {
    if [[ -n "$BACKUP_S3_BUCKET" ]] && [[ -n "$AWS_ACCESS_KEY_ID" ]]; then
        print_status "Uploading backups to S3..."

        local s3_path="s3://$BACKUP_S3_BUCKET/mantisnxt/$TIMESTAMP/"

        # Install AWS CLI if not present
        if ! command -v aws &> /dev/null; then
            curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
            unzip awscliv2.zip
            sudo ./aws/install
            rm -rf awscliv2.zip aws/
        fi

        # Upload files
        aws s3 cp "$BACKUP_DIR/" "$s3_path" --recursive --exclude "*" --include "*_$TIMESTAMP.*"

        print_success "Backups uploaded to S3: $s3_path"
    else
        print_status "S3 backup not configured, skipping upload"
    fi
}

# Clean up old backups
cleanup_old_backups() {
    print_status "Cleaning up backups older than $RETENTION_DAYS days..."

    # Local cleanup
    find "$BACKUP_DIR" -name "*_backup_*.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete

    # S3 cleanup (if configured)
    if [[ -n "$BACKUP_S3_BUCKET" ]] && [[ -n "$AWS_ACCESS_KEY_ID" ]]; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
        aws s3 ls "s3://$BACKUP_S3_BUCKET/mantisnxt/" | \
            awk '{print $4}' | \
            while read -r folder; do
                if [[ "${folder%/}" < "$cutoff_date" ]]; then
                    aws s3 rm "s3://$BACKUP_S3_BUCKET/mantisnxt/$folder" --recursive
                    print_status "Removed old S3 backup: $folder"
                fi
            done
    fi

    print_success "Old backups cleaned up"
}

# Verify backup integrity
verify_backup() {
    print_status "Verifying backup integrity..."

    local database_backup="$BACKUP_DIR/database_backup_$TIMESTAMP.sql.gz"
    local uploads_backup="$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz"
    local config_backup="$BACKUP_DIR/config_backup_$TIMESTAMP.tar.gz"

    local failed_checks=()

    # Check database backup
    if [[ -f "$database_backup" ]]; then
        if gzip -t "$database_backup" 2>/dev/null; then
            print_success "Database backup integrity verified"
        else
            failed_checks+=("database")
        fi
    else
        failed_checks+=("database")
    fi

    # Check uploads backup
    if [[ -f "$uploads_backup" ]]; then
        if tar -tzf "$uploads_backup" >/dev/null 2>&1; then
            print_success "Uploads backup integrity verified"
        else
            failed_checks+=("uploads")
        fi
    else
        failed_checks+=("uploads")
    fi

    # Check config backup
    if [[ -f "$config_backup" ]]; then
        if tar -tzf "$config_backup" >/dev/null 2>&1; then
            print_success "Configuration backup integrity verified"
        else
            failed_checks+=("config")
        fi
    else
        failed_checks+=("config")
    fi

    if [[ ${#failed_checks[@]} -gt 0 ]]; then
        print_error "Backup integrity check failed for: ${failed_checks[*]}"
        return 1
    fi

    print_success "All backups verified successfully"
}

# Main backup function
main() {
    echo "=================================================="
    echo "  MantisNXT Backup Script"
    echo "  Timestamp: $TIMESTAMP"
    echo "=================================================="
    echo

    setup_backup_dir
    backup_database
    backup_uploads
    backup_config
    verify_backup
    upload_to_s3
    cleanup_old_backups

    print_success "Backup process completed successfully!"
    echo
    echo "Backup files created:"
    echo "  - Database: $BACKUP_DIR/database_backup_$TIMESTAMP.sql.gz"
    echo "  - Uploads: $BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz"
    echo "  - Config: $BACKUP_DIR/config_backup_$TIMESTAMP.tar.gz"
}

# Run main function
main "$@"