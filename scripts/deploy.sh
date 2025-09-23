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
ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.yml"

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

# Check if required files exist
check_requirements() {
    print_status "Checking deployment requirements..."

    local missing_files=()

    if [[ ! -f ".env" ]]; then
        missing_files+=(".env")
    fi

    if [[ ! -f "$COMPOSE_FILE" ]]; then
        missing_files+=("$COMPOSE_FILE")
    fi

    if [[ ! -d "migrations" ]]; then
        missing_files+=("migrations/")
    fi

    if [[ ${#missing_files[@]} -gt 0 ]]; then
        print_error "Missing required files/directories:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        echo
        print_error "Please ensure all required files exist before deployment."
        exit 1
    fi

    print_success "All required files found"
}

# Generate SSL certificates if they don't exist
setup_ssl() {
    print_status "Setting up SSL certificates..."

    if [[ ! -d "ssl" ]]; then
        mkdir -p ssl
    fi

    if [[ ! -f "ssl/cert.pem" ]] || [[ ! -f "ssl/key.pem" ]]; then
        print_warning "SSL certificates not found. Generating self-signed certificates..."

        openssl req -x509 -newkey rsa:4096 -nodes \
            -keyout ssl/key.pem \
            -out ssl/cert.pem \
            -days 365 \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

        print_success "Self-signed SSL certificates generated"
        print_warning "For production, replace with proper SSL certificates"
    else
        print_success "SSL certificates found"
    fi

    # Generate DH parameters if not exists
    if [[ ! -f "ssl/dhparam.pem" ]]; then
        print_status "Generating DH parameters (this may take a while)..."
        openssl dhparam -out ssl/dhparam.pem 2048
        print_success "DH parameters generated"
    fi
}

# Build and deploy services
deploy_services() {
    print_status "Building and deploying services..."

    # Build images
    docker-compose -f "$COMPOSE_FILE" build --no-cache

    # Start infrastructure services first
    print_status "Starting infrastructure services..."
    docker-compose -f "$COMPOSE_FILE" up -d postgres redis

    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    timeout 60 bash -c 'until docker-compose exec postgres pg_isready -U ${DB_USER:-mantisnxt}; do sleep 2; done'

    # Run migrations
    print_status "Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" run --rm migrations

    # Start remaining services
    print_status "Starting application services..."
    docker-compose -f "$COMPOSE_FILE" up -d

    print_success "All services deployed successfully"
}

# Health check
health_check() {
    print_status "Performing health checks..."

    local services=("postgres" "redis" "app" "nginx")
    local failed_services=()

    for service in "${services[@]}"; do
        print_status "Checking $service..."
        if docker-compose -f "$COMPOSE_FILE" exec -T "$service" echo "Health check" >/dev/null 2>&1; then
            print_success "$service is healthy"
        else
            failed_services+=("$service")
        fi
    done

    if [[ ${#failed_services[@]} -gt 0 ]]; then
        print_error "Health check failed for services:"
        for service in "${failed_services[@]}"; do
            echo "  - $service"
        done
        return 1
    fi

    print_success "All services are healthy"
}

# Main deployment function
main() {
    echo "=================================================="
    echo "  MantisNXT Deployment Script"
    echo "  Environment: $ENVIRONMENT"
    echo "=================================================="
    echo

    check_requirements
    setup_ssl
    deploy_services

    # Wait a bit for services to fully start
    print_status "Waiting for services to fully initialize..."
    sleep 30

    if health_check; then
        print_success "Deployment completed successfully!"
        echo
        echo "Services:"
        echo "  - Application: https://localhost"
        echo "  - Grafana: http://localhost:3001"
        echo "  - Prometheus: http://localhost:9090"
        echo
        print_warning "Don't forget to:"
        echo "  1. Update DNS records if deploying to production"
        echo "  2. Replace self-signed SSL certificates with proper ones"
        echo "  3. Configure backup schedules"
        echo "  4. Set up monitoring alerts"
    else
        print_error "Deployment completed with errors. Check service logs."
        echo
        echo "To check service logs:"
        echo "  docker-compose logs <service-name>"
        exit 1
    fi
}

# Cleanup function for graceful shutdown
cleanup() {
    print_warning "Deployment interrupted. Cleaning up..."
    docker-compose -f "$COMPOSE_FILE" down
    exit 1
}

# Trap interruption signals
trap cleanup INT TERM

# Run main function
main "$@"