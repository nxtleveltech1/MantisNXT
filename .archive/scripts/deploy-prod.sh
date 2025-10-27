#!/bin/bash

# Production deployment script for MantisNXT
set -euo pipefail

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_BEFORE_DEPLOY=${BACKUP_BEFORE_DEPLOY:-true}
RUN_MIGRATIONS=${RUN_MIGRATIONS:-true}
HEALTH_CHECK_TIMEOUT=${HEALTH_CHECK_TIMEOUT:-120}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Error handler
handle_error() {
    local exit_code=$?
    log_error "Deployment failed at line $1"
    log_error "Rolling back changes..."

    # Attempt rollback
    if [ -f ".deployment.backup" ]; then
        docker-compose -f "$COMPOSE_FILE" down
        docker-compose -f "$COMPOSE_FILE" up -d
        log_warning "Rollback attempted. Please verify system status."
    fi

    exit $exit_code
}

trap 'handle_error $LINENO' ERR

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."

    # Check if required files exist
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Docker compose file not found: $COMPOSE_FILE"
        exit 1
    fi

    if [ ! -f ".env" ]; then
        log_error "Environment file not found: .env"
        exit 1
    fi

    # Check if secrets exist
    if [ ! -d "secrets" ] || [ ! -f "secrets/postgres_password.txt" ]; then
        log_error "Secrets not found. Run ./scripts/generate-secrets.sh first"
        exit 1
    fi

    # Check Docker and Docker Compose
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Please install Docker."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose not found. Please install Docker Compose."
        exit 1
    fi

    # Check available disk space (minimum 5GB)
    available_space=$(df / | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 5242880 ]; then  # 5GB in KB
        log_warning "Low disk space detected. Available: $(( available_space / 1024 / 1024 ))GB"
    fi

    log_success "Pre-deployment checks passed"
}

# Create deployment backup
create_deployment_backup() {
    if [ "$BACKUP_BEFORE_DEPLOY" = "true" ]; then
        log_info "Creating pre-deployment backup..."

        # Create backup timestamp
        BACKUP_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

        # Backup database
        docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump \
            -U "${DB_USER:-mantisnxt}" \
            -d mantisnxt \
            > "backup_pre_deploy_${BACKUP_TIMESTAMP}.sql"

        # Backup uploaded files
        docker run --rm \
            -v mantisnxt_uploads_data:/source:ro \
            -v "$(pwd)":/backup \
            alpine:latest \
            tar czf "/backup/uploads_backup_${BACKUP_TIMESTAMP}.tar.gz" -C /source .

        # Create deployment state backup
        echo "BACKUP_TIMESTAMP=${BACKUP_TIMESTAMP}" > .deployment.backup
        echo "PREVIOUS_IMAGES=$(docker-compose -f "$COMPOSE_FILE" images -q | tr '\n' ' ')" >> .deployment.backup

        log_success "Backup created with timestamp: $BACKUP_TIMESTAMP"
    fi
}

# Pull latest images
pull_images() {
    log_info "Pulling latest Docker images..."
    docker-compose -f "$COMPOSE_FILE" pull
    log_success "Images pulled successfully"
}

# Deploy application
deploy_application() {
    log_info "Deploying application..."

    # Stop services gracefully
    docker-compose -f "$COMPOSE_FILE" down --timeout 30

    # Start infrastructure services first
    log_info "Starting infrastructure services..."
    docker-compose -f "$COMPOSE_FILE" up -d postgres redis

    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    timeout 60 bash -c 'until docker-compose -f "$1" exec postgres pg_isready -U "${DB_USER:-mantisnxt}" -d mantisnxt; do sleep 2; done' -- "$COMPOSE_FILE"

    # Run migrations if enabled
    if [ "$RUN_MIGRATIONS" = "true" ]; then
        log_info "Running database migrations..."
        docker-compose -f "$COMPOSE_FILE" run --rm migrations
        log_success "Migrations completed"
    fi

    # Start application services
    log_info "Starting application services..."
    docker-compose -f "$COMPOSE_FILE" up -d

    log_success "Application deployed"
}

# Health check
health_check() {
    log_info "Running health checks..."

    local timeout=$HEALTH_CHECK_TIMEOUT
    local interval=5
    local elapsed=0

    while [ $elapsed -lt $timeout ]; do
        if curl -f -s http://localhost/health > /dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi

        log_info "Health check failed, retrying in ${interval}s... (${elapsed}/${timeout}s)"
        sleep $interval
        elapsed=$((elapsed + interval))
    done

    log_error "Health check failed after ${timeout}s"
    return 1
}

# Post-deployment tasks
post_deployment_tasks() {
    log_info "Running post-deployment tasks..."

    # Clean up old Docker images
    log_info "Cleaning up old Docker images..."
    docker image prune -f

    # Clean up old backups (keep last 7 days)
    find . -name "backup_pre_deploy_*.sql" -mtime +7 -delete 2>/dev/null || true
    find . -name "uploads_backup_*.tar.gz" -mtime +7 -delete 2>/dev/null || true

    # Restart logging services to ensure log rotation
    docker-compose -f "$COMPOSE_FILE" restart promtail

    log_success "Post-deployment tasks completed"
}

# Display deployment summary
deployment_summary() {
    log_info "Deployment Summary"
    echo "=========================="
    echo "Deployment completed at: $(date)"
    echo "Services status:"
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    echo "Application URL: ${APP_URL:-http://localhost}"
    echo "Monitoring URL: ${GRAFANA_URL:-http://localhost:3001}"
    echo ""
    log_success "Deployment completed successfully!"
}

# Main deployment function
main() {
    log_info "Starting MantisNXT production deployment..."

    pre_deployment_checks
    create_deployment_backup
    pull_images
    deploy_application
    health_check
    post_deployment_tasks
    deployment_summary

    # Clean up backup state file
    rm -f .deployment.backup
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --no-backup         Skip pre-deployment backup"
    echo "  --no-migrations     Skip database migrations"
    echo "  --timeout SECONDS   Health check timeout (default: 120)"
    echo "  --help             Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  BACKUP_BEFORE_DEPLOY   Create backup before deploy (default: true)"
    echo "  RUN_MIGRATIONS         Run database migrations (default: true)"
    echo "  HEALTH_CHECK_TIMEOUT   Health check timeout in seconds (default: 120)"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-backup)
            BACKUP_BEFORE_DEPLOY=false
            shift
            ;;
        --no-migrations)
            RUN_MIGRATIONS=false
            shift
            ;;
        --timeout)
            HEALTH_CHECK_TIMEOUT="$2"
            shift 2
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main deployment
main