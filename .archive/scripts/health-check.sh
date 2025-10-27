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
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Configuration
COMPOSE_FILE="docker-compose.yml"
TIMEOUT=30

# Check if service is healthy
check_service_health() {
    local service="$1"
    local description="$2"

    print_status "Checking $description..."

    # Check if container is running
    if ! docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
        print_error "$description container is not running"
        return 1
    fi

    # Check health status
    local health_status=$(docker-compose -f "$COMPOSE_FILE" ps "$service" | grep "$service" | awk '{print $4}')

    if [[ "$health_status" == "Up" ]] || [[ "$health_status" =~ "healthy" ]]; then
        print_success "$description is healthy"
        return 0
    else
        print_error "$description is unhealthy (status: $health_status)"
        return 1
    fi
}

# Check database connectivity
check_database() {
    print_status "Checking database connectivity..."

    if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "${DB_USER:-mantisnxt}" >/dev/null 2>&1; then
        print_success "Database is accessible"

        # Check if we can query the database
        if docker-compose -f "$COMPOSE_FILE" exec -T postgres psql \
            -U "${DB_USER:-mantisnxt}" \
            -d "${DB_NAME:-mantisnxt}" \
            -c "SELECT 1;" >/dev/null 2>&1; then
            print_success "Database queries working"
        else
            print_error "Database queries failing"
            return 1
        fi
    else
        print_error "Database is not accessible"
        return 1
    fi
}

# Check Redis connectivity
check_redis() {
    print_status "Checking Redis connectivity..."

    if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping >/dev/null 2>&1; then
        print_success "Redis is accessible"
    else
        print_error "Redis is not accessible"
        return 1
    fi
}

# Check application endpoints
check_application() {
    print_status "Checking application endpoints..."

    local app_url="http://localhost:${APP_PORT:-3000}"

    # Check health endpoint
    if curl -f -s "$app_url/api/health" >/dev/null 2>&1; then
        print_success "Application health endpoint responding"
    else
        print_error "Application health endpoint not responding"
        return 1
    fi

    # Check main page
    if curl -f -s "$app_url/" >/dev/null 2>&1; then
        print_success "Application main page accessible"
    else
        print_warning "Application main page not accessible (may be expected for API-only)"
    fi
}

# Check nginx proxy
check_nginx() {
    print_status "Checking Nginx proxy..."

    local nginx_url="http://localhost:${NGINX_HTTP_PORT:-80}"

    # Check health endpoint through nginx
    if curl -f -s "$nginx_url/health" >/dev/null 2>&1; then
        print_success "Nginx proxy responding"
    else
        print_error "Nginx proxy not responding"
        return 1
    fi
}

# Check monitoring services
check_monitoring() {
    print_status "Checking monitoring services..."

    # Check Prometheus
    local prometheus_url="http://localhost:${PROMETHEUS_PORT:-9090}"
    if curl -f -s "$prometheus_url/-/ready" >/dev/null 2>&1; then
        print_success "Prometheus is ready"
    else
        print_warning "Prometheus not responding"
    fi

    # Check Grafana
    local grafana_url="http://localhost:${GRAFANA_PORT:-3001}"
    if curl -f -s "$grafana_url/api/health" >/dev/null 2>&1; then
        print_success "Grafana is accessible"
    else
        print_warning "Grafana not responding"
    fi

    # Check Loki
    local loki_url="http://localhost:${LOKI_PORT:-3100}"
    if curl -f -s "$loki_url/ready" >/dev/null 2>&1; then
        print_success "Loki is ready"
    else
        print_warning "Loki not responding"
    fi
}

# Check disk space
check_disk_space() {
    print_status "Checking disk space..."

    # Check host disk space
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ "$disk_usage" -lt 90 ]]; then
        print_success "Host disk space OK ($disk_usage% used)"
    elif [[ "$disk_usage" -lt 95 ]]; then
        print_warning "Host disk space getting low ($disk_usage% used)"
    else
        print_error "Host disk space critically low ($disk_usage% used)"
        return 1
    fi

    # Check Docker volumes
    docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}\t{{.Reclaimable}}"
}

# Check logs for errors
check_logs() {
    print_status "Checking recent logs for errors..."

    local error_count=0

    # Check application logs for errors
    local app_errors=$(docker-compose -f "$COMPOSE_FILE" logs --tail=100 app 2>/dev/null | grep -i error | wc -l)
    if [[ "$app_errors" -gt 0 ]]; then
        print_warning "Found $app_errors error(s) in application logs"
        error_count=$((error_count + app_errors))
    fi

    # Check database logs for errors
    local db_errors=$(docker-compose -f "$COMPOSE_FILE" logs --tail=100 postgres 2>/dev/null | grep -i error | wc -l)
    if [[ "$db_errors" -gt 0 ]]; then
        print_warning "Found $db_errors error(s) in database logs"
        error_count=$((error_count + db_errors))
    fi

    # Check nginx logs for errors
    local nginx_errors=$(docker-compose -f "$COMPOSE_FILE" logs --tail=100 nginx 2>/dev/null | grep -i error | wc -l)
    if [[ "$nginx_errors" -gt 0 ]]; then
        print_warning "Found $nginx_errors error(s) in nginx logs"
        error_count=$((error_count + nginx_errors))
    fi

    if [[ "$error_count" -eq 0 ]]; then
        print_success "No recent errors found in logs"
    else
        print_warning "Total errors found: $error_count"
    fi
}

# Performance check
check_performance() {
    print_status "Checking system performance..."

    # Check memory usage
    local memory_usage=$(free | awk 'FNR==2{printf "%.0f", $3/$2*100}')
    if [[ "$memory_usage" -lt 80 ]]; then
        print_success "Memory usage OK ($memory_usage%)"
    elif [[ "$memory_usage" -lt 90 ]]; then
        print_warning "Memory usage high ($memory_usage%)"
    else
        print_error "Memory usage critical ($memory_usage%)"
        return 1
    fi

    # Check CPU load
    local cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local cpu_cores=$(nproc)
    local cpu_usage=$(awk "BEGIN {printf \"%.0f\", $cpu_load/$cpu_cores*100}")

    if [[ "$cpu_usage" -lt 80 ]]; then
        print_success "CPU usage OK ($cpu_usage%)"
    elif [[ "$cpu_usage" -lt 90 ]]; then
        print_warning "CPU usage high ($cpu_usage%)"
    else
        print_error "CPU usage critical ($cpu_usage%)"
        return 1
    fi
}

# Generate health report
generate_report() {
    print_status "Generating health report..."

    local report_file="/tmp/mantisnxt_health_$(date +%Y%m%d_%H%M%S).txt"

    {
        echo "MantisNXT Health Check Report"
        echo "Generated: $(date)"
        echo "=============================="
        echo

        echo "Service Status:"
        docker-compose -f "$COMPOSE_FILE" ps

        echo
        echo "Container Resource Usage:"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

        echo
        echo "Recent Application Logs (last 50 lines):"
        docker-compose -f "$COMPOSE_FILE" logs --tail=50 app

        echo
        echo "Recent Error Logs:"
        docker-compose -f "$COMPOSE_FILE" logs --tail=100 2>&1 | grep -i error || echo "No errors found"

    } > "$report_file"

    print_success "Health report generated: $report_file"
}

# Main health check function
main() {
    echo "=================================================="
    echo "  MantisNXT Health Check"
    echo "  Timestamp: $(date)"
    echo "=================================================="
    echo

    local failed_checks=0

    # Core services
    check_service_health "postgres" "PostgreSQL Database" || ((failed_checks++))
    check_service_health "redis" "Redis Cache" || ((failed_checks++))
    check_service_health "app" "Next.js Application" || ((failed_checks++))
    check_service_health "nginx" "Nginx Proxy" || ((failed_checks++))

    # Connectivity checks
    check_database || ((failed_checks++))
    check_redis || ((failed_checks++))
    check_application || ((failed_checks++))
    check_nginx || ((failed_checks++))

    # Monitoring services (warnings only)
    check_monitoring

    # System checks
    check_disk_space || ((failed_checks++))
    check_performance || ((failed_checks++))
    check_logs

    # Generate report
    generate_report

    echo
    echo "=================================================="
    if [[ "$failed_checks" -eq 0 ]]; then
        print_success "All critical health checks passed!"
        echo "System Status: HEALTHY"
        exit 0
    else
        print_error "$failed_checks critical health check(s) failed"
        echo "System Status: UNHEALTHY"
        exit 1
    fi
}

# Parse command line arguments
case "${1:-check}" in
    "check")
        main
        ;;
    "quick")
        print_status "Running quick health check..."
        check_database && check_redis && check_application
        ;;
    "services")
        print_status "Checking service status..."
        docker-compose -f "$COMPOSE_FILE" ps
        ;;
    "logs")
        print_status "Showing recent logs..."
        docker-compose -f "$COMPOSE_FILE" logs --tail=100
        ;;
    *)
        echo "Usage: $0 [check|quick|services|logs]"
        echo "  check    - Full health check (default)"
        echo "  quick    - Quick connectivity check"
        echo "  services - Show service status"
        echo "  logs     - Show recent logs"
        exit 1
        ;;
esac