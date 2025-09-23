#!/bin/bash

# Cache Recovery Script
# Automated recovery from webpack cache corruption

set -e

# Configuration
CACHE_DIR=".next/cache/webpack"
BACKUP_DIR=".next/cache-backup-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="claudedocs/cache-recovery.log"
RECOVERY_LOCKFILE=".next/cache-recovery.lock"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"

    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $message"
            echo "[$timestamp] [INFO] $message" >> "$LOG_FILE"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $message"
            echo "[$timestamp] [WARN] $message" >> "$LOG_FILE"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message"
            echo "[$timestamp] [ERROR] $message" >> "$LOG_FILE"
            ;;
        "DEBUG")
            if [[ "$VERBOSE" == "true" ]]; then
                echo -e "${BLUE}[DEBUG]${NC} $message"
            fi
            echo "[$timestamp] [DEBUG] $message" >> "$LOG_FILE"
            ;;
    esac
}

# Check if recovery is already in progress
check_recovery_lock() {
    if [[ -f "$RECOVERY_LOCKFILE" ]]; then
        local lock_pid=$(cat "$RECOVERY_LOCKFILE" 2>/dev/null || echo "unknown")
        log "ERROR" "Recovery already in progress (PID: $lock_pid)"
        log "ERROR" "If you're sure no recovery is running, remove: $RECOVERY_LOCKFILE"
        exit 1
    fi
}

# Create recovery lock
create_recovery_lock() {
    echo $$ > "$RECOVERY_LOCKFILE"
    log "INFO" "Created recovery lock (PID: $$)"
}

# Remove recovery lock
cleanup_recovery_lock() {
    if [[ -f "$RECOVERY_LOCKFILE" ]]; then
        rm -f "$RECOVERY_LOCKFILE"
        log "INFO" "Removed recovery lock"
    fi
}

# Trap to ensure cleanup on exit
trap cleanup_recovery_lock EXIT

# Check disk space
check_disk_space() {
    local available_space
    if command -v df >/dev/null 2>&1; then
        available_space=$(df "$PWD" | awk 'NR==2 {print $4}')
        local available_gb=$((available_space / 1024 / 1024))

        if [[ $available_gb -lt 5 ]]; then
            log "WARN" "Low disk space: ${available_gb}GB available"
            log "WARN" "Recovery may fail if insufficient space for backup"
        else
            log "INFO" "Disk space check passed: ${available_gb}GB available"
        fi
    else
        log "WARN" "Cannot check disk space (df command not available)"
    fi
}

# Stop running Next.js processes
stop_nextjs_processes() {
    log "INFO" "Checking for running Next.js processes..."

    # Find Next.js processes
    local next_pids
    if command -v pgrep >/dev/null 2>&1; then
        next_pids=$(pgrep -f "next" 2>/dev/null || true)
    else
        # Fallback for Windows/systems without pgrep
        next_pids=$(ps aux 2>/dev/null | grep -i next | grep -v grep | awk '{print $2}' || true)
    fi

    if [[ -n "$next_pids" ]]; then
        log "WARN" "Found running Next.js processes: $next_pids"
        read -p "Stop these processes before recovery? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            for pid in $next_pids; do
                log "INFO" "Stopping process $pid"
                kill "$pid" 2>/dev/null || log "WARN" "Failed to stop process $pid"
            done
            sleep 2
        else
            log "WARN" "Continuing with active processes (may cause issues)"
        fi
    else
        log "INFO" "No running Next.js processes found"
    fi
}

# Create backup of current cache
create_backup() {
    if [[ ! -d "$CACHE_DIR" ]]; then
        log "WARN" "Cache directory does not exist: $CACHE_DIR"
        return 0
    fi

    log "INFO" "Creating backup: $BACKUP_DIR"

    if cp -r "$CACHE_DIR" "$BACKUP_DIR" 2>/dev/null; then
        local backup_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "unknown")
        log "INFO" "Backup created successfully (${backup_size})"
        return 0
    else
        log "ERROR" "Failed to create backup"
        return 1
    fi
}

# Analyze cache corruption
analyze_corruption() {
    log "INFO" "Analyzing cache corruption..."

    local corruption_found=false
    local corrupted_dirs=()

    # Check for temporary files (corruption indicators)
    local temp_files
    temp_files=$(find "$CACHE_DIR" -name "*_" -o -name "*.tmp" -o -name "*.lock" 2>/dev/null || true)

    if [[ -n "$temp_files" ]]; then
        log "WARN" "Found temporary files (corruption indicators):"
        echo "$temp_files" | while read -r file; do
            log "WARN" "  - $file"
            corrupted_dirs+=($(dirname "$file"))
        done
        corruption_found=true
    fi

    # Check for .old files
    local old_files
    old_files=$(find "$CACHE_DIR" -name "*.old" 2>/dev/null || true)

    if [[ -n "$old_files" ]]; then
        log "WARN" "Found .old files (previous corruption recovery):"
        echo "$old_files" | while read -r file; do
            log "WARN" "  - $file"
            corrupted_dirs+=($(dirname "$file"))
        done
        corruption_found=true
    fi

    # Check pack file integrity
    local pack_files
    pack_files=$(find "$CACHE_DIR" -name "*.pack.gz" 2>/dev/null || true)

    if [[ -n "$pack_files" ]]; then
        log "INFO" "Validating pack file integrity..."
        echo "$pack_files" | while read -r file; do
            if ! gzip -t "$file" 2>/dev/null; then
                log "ERROR" "Corrupted pack file: $file"
                corrupted_dirs+=($(dirname "$file"))
                corruption_found=true
            fi
        done
    fi

    # Remove duplicates from corrupted_dirs
    if [[ ${#corrupted_dirs[@]} -gt 0 ]]; then
        printf '%s\n' "${corrupted_dirs[@]}" | sort -u > "/tmp/corrupted_dirs_$$"
        log "INFO" "Corrupted directories identified:"
        while read -r dir; do
            log "INFO" "  - $dir"
        done < "/tmp/corrupted_dirs_$$"
        rm -f "/tmp/corrupted_dirs_$$"
    fi

    if [[ "$corruption_found" == "true" ]]; then
        return 1
    else
        log "INFO" "No corruption detected"
        return 0
    fi
}

# Clean corrupted cache directories
clean_corrupted_cache() {
    log "INFO" "Cleaning corrupted cache..."

    # Remove temporary files
    local temp_files
    temp_files=$(find "$CACHE_DIR" -name "*_" -o -name "*.tmp" -o -name "*.lock" -o -name "*.old" 2>/dev/null || true)

    if [[ -n "$temp_files" ]]; then
        log "INFO" "Removing temporary files..."
        echo "$temp_files" | while read -r file; do
            log "DEBUG" "Removing: $file"
            rm -f "$file"
        done
    fi

    # Identify and clean directories with corrupted pack files
    local corrupted_dirs=()
    local pack_files
    pack_files=$(find "$CACHE_DIR" -name "*.pack.gz" 2>/dev/null || true)

    if [[ -n "$pack_files" ]]; then
        echo "$pack_files" | while read -r file; do
            if ! gzip -t "$file" 2>/dev/null; then
                local dir=$(dirname "$file")
                if [[ ! " ${corrupted_dirs[*]} " =~ " $dir " ]]; then
                    corrupted_dirs+=("$dir")
                fi
            fi
        done

        # Clean corrupted directories
        for dir in "${corrupted_dirs[@]}"; do
            log "INFO" "Cleaning corrupted directory: $dir"
            rm -rf "$dir"/*
        done
    fi

    log "INFO" "Cache cleaning completed"
}

# Validate cache after recovery
validate_recovery() {
    log "INFO" "Validating cache recovery..."

    # Check if cache monitor script exists
    if [[ -f "scripts/cache-monitor.js" ]]; then
        log "INFO" "Running cache health check..."
        if node scripts/cache-monitor.js --validate 2>/dev/null; then
            log "INFO" "Cache validation passed"
            return 0
        else
            log "WARN" "Cache validation failed (may be normal for empty cache)"
            return 1
        fi
    else
        log "INFO" "Cache monitor not available, performing basic validation"

        # Basic validation - check if cache directory is accessible
        if [[ -d "$CACHE_DIR" && -r "$CACHE_DIR" ]]; then
            log "INFO" "Basic cache validation passed"
            return 0
        else
            log "ERROR" "Cache directory validation failed"
            return 1
        fi
    fi
}

# Restore from backup if needed
restore_from_backup() {
    local backup_dir=$1

    if [[ ! -d "$backup_dir" ]]; then
        log "ERROR" "Backup directory not found: $backup_dir"
        return 1
    fi

    log "WARN" "Restoring cache from backup: $backup_dir"

    # Remove current cache
    if [[ -d "$CACHE_DIR" ]]; then
        rm -rf "$CACHE_DIR"
    fi

    # Restore from backup
    if cp -r "$backup_dir" "$CACHE_DIR"; then
        log "INFO" "Cache restored from backup"
        return 0
    else
        log "ERROR" "Failed to restore from backup"
        return 1
    fi
}

# Main recovery function
perform_recovery() {
    log "INFO" "Starting cache recovery process..."

    # Pre-recovery checks
    check_disk_space
    stop_nextjs_processes

    # Create backup
    if ! create_backup; then
        log "ERROR" "Backup creation failed, aborting recovery"
        return 1
    fi

    # Analyze corruption
    if analyze_corruption; then
        log "INFO" "No corruption detected, recovery not needed"
        return 0
    fi

    # Clean corrupted cache
    clean_corrupted_cache

    # Validate recovery
    if validate_recovery; then
        log "INFO" "Recovery completed successfully"

        # Cleanup old backups (keep last 5)
        log "INFO" "Cleaning up old backups..."
        ls -t .next/cache-backup-* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true

        return 0
    else
        log "ERROR" "Recovery validation failed"

        # Attempt restore from backup
        if restore_from_backup "$BACKUP_DIR"; then
            log "INFO" "Successfully restored from backup"
            return 0
        else
            log "ERROR" "Recovery failed completely"
            return 1
        fi
    fi
}

# Force recovery mode - clears entire cache
force_recovery() {
    log "WARN" "Performing FORCE recovery - clearing entire cache"

    read -p "This will delete the entire cache. Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "INFO" "Force recovery cancelled"
        return 1
    fi

    # Create backup first
    if ! create_backup; then
        log "ERROR" "Backup creation failed, aborting force recovery"
        return 1
    fi

    # Remove entire cache
    log "INFO" "Removing entire cache directory..."
    rm -rf "$CACHE_DIR"/*

    log "INFO" "Force recovery completed - cache cleared"
    return 0
}

# Show usage information
show_usage() {
    cat << EOF
Cache Recovery Script - Next.js Webpack Cache Recovery Tool

Usage: $0 [options]

Options:
    --analyze       Only analyze corruption, don't perform recovery
    --force         Force complete cache clearing (destructive)
    --verbose       Enable verbose logging
    --backup-only   Create backup without recovery
    --help          Show this help message

Examples:
    $0                    # Perform automatic recovery
    $0 --analyze          # Just check for corruption
    $0 --force            # Force clear entire cache
    $0 --verbose          # Verbose recovery
    $0 --backup-only      # Create backup only

The script will:
1. Stop running Next.js processes (with confirmation)
2. Create backup of current cache
3. Analyze and identify corruption
4. Clean corrupted files/directories
5. Validate recovery success
6. Restore from backup if recovery fails

Log file: $LOG_FILE
EOF
}

# Parse command line arguments
VERBOSE=false
ANALYZE_ONLY=false
FORCE_RECOVERY=false
BACKUP_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --analyze)
            ANALYZE_ONLY=true
            shift
            ;;
        --force)
            FORCE_RECOVERY=true
            shift
            ;;
        --backup-only)
            BACKUP_ONLY=true
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    log "INFO" "Cache Recovery Script Started"
    log "INFO" "Working directory: $(pwd)"
    log "INFO" "Cache directory: $CACHE_DIR"

    # Check if we're in a Next.js project
    if [[ ! -f "next.config.js" && ! -f "next.config.mjs" && ! -f "next.config.ts" ]]; then
        log "ERROR" "Not in a Next.js project directory"
        exit 1
    fi

    # Check for recovery lock
    check_recovery_lock
    create_recovery_lock

    # Execute based on options
    if [[ "$BACKUP_ONLY" == "true" ]]; then
        create_backup
    elif [[ "$ANALYZE_ONLY" == "true" ]]; then
        analyze_corruption
    elif [[ "$FORCE_RECOVERY" == "true" ]]; then
        force_recovery
    else
        perform_recovery
    fi

    local exit_code=$?

    if [[ $exit_code -eq 0 ]]; then
        log "INFO" "Cache recovery completed successfully"
    else
        log "ERROR" "Cache recovery failed"
    fi

    log "INFO" "Recovery log saved to: $LOG_FILE"
    exit $exit_code
}

# Run main function
main "$@"