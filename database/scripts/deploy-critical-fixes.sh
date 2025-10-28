#!/bin/bash
################################################################################
# Critical Database Fixes Deployment Script (Shell)
################################################################################
# Deploys critical migrations to fix:
#   - Analytics sequences (005)
#   - Supplier contact_person column (006)
#
# Usage:
#   ./database/scripts/deploy-critical-fixes.sh
#   bash database/scripts/deploy-critical-fixes.sh
#
# Requirements:
#   - psql (PostgreSQL client)
#   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MIGRATIONS_DIR="${PROJECT_ROOT}/database/migrations"

# Log functions
log_info() {
  echo -e "${BLUE}→${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_header() {
  echo -e "\n${BOLD}${CYAN}$1${NC}"
  echo -e "${CYAN}$(printf '=%.0s' {1..60})${NC}"
}

# Check prerequisites
check_prerequisites() {
  log_header "Checking Prerequisites"

  # Check psql
  if ! command -v psql &> /dev/null; then
    log_error "psql not found. Please install PostgreSQL client."
    exit 1
  fi
  log_success "psql found: $(psql --version | head -n1)"

  # Check database URL
  if [ -z "${DATABASE_URL:-}" ] && [ -z "${NEON_SPP_DATABASE_URL:-}" ]; then
    log_error "DATABASE_URL or NEON_SPP_DATABASE_URL not set"
    exit 1
  fi

  DB_URL="${NEON_SPP_DATABASE_URL:-${DATABASE_URL}}"
  log_success "Database URL configured"

  # Test connection
  if psql "${DB_URL}" -c "SELECT 1" > /dev/null 2>&1; then
    log_success "Database connection verified"
  else
    log_error "Cannot connect to database"
    exit 1
  fi
}

# Deploy single migration file
deploy_migration() {
  local migration_file="$1"
  local migration_path="${MIGRATIONS_DIR}/${migration_file}"

  if [ ! -f "${migration_path}" ]; then
    log_error "Migration file not found: ${migration_file}"
    return 1
  fi

  log_info "Deploying ${migration_file}..."

  if psql "${DB_URL}" -v ON_ERROR_STOP=1 -f "${migration_path}" > /dev/null 2>&1; then
    log_success "${migration_file} deployed successfully"
    return 0
  else
    log_error "${migration_file} deployment failed"
    return 1
  fi
}

# Verify analytics sequences
verify_analytics_sequences() {
  log_info "Verifying analytics sequences..."

  local result
  result=$(psql "${DB_URL}" -t -A -c "
    SELECT COUNT(*)
    FROM information_schema.sequences
    WHERE sequence_schema = 'core'
    AND sequence_name IN (
      'analytics_anomalies_anomaly_id_seq',
      'analytics_predictions_prediction_id_seq'
    )
  ")

  if [ "${result}" -eq 2 ]; then
    log_success "Analytics sequences verified (2/2)"
    return 0
  else
    log_error "Analytics sequences missing (${result}/2)"
    return 1
  fi
}

# Verify contact_person column
verify_contact_person() {
  log_info "Verifying contact_person column..."

  local result
  result=$(psql "${DB_URL}" -t -A -c "
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'supplier'
      AND column_name = 'contact_person'
  ")

  if [ "${result}" -eq 1 ]; then
    log_success "contact_person column verified"

    # Check GIN index
    local idx_result
    idx_result=$(psql "${DB_URL}" -t -A -c "
      SELECT COUNT(*)
      FROM pg_indexes
      WHERE schemaname = 'core'
        AND tablename = 'supplier'
        AND indexname = 'idx_supplier_contact_person_gin'
    ")

    if [ "${idx_result}" -eq 1 ]; then
      log_success "GIN index verified"
    else
      log_warning "GIN index missing (non-critical)"
    fi

    return 0
  else
    log_error "contact_person column missing"
    return 1
  fi
}

# Main deployment function
main() {
  local start_time
  start_time=$(date +%s)

  log_header "CRITICAL DATABASE FIXES DEPLOYMENT"

  # Check prerequisites
  check_prerequisites

  # Deploy migrations
  log_header "Deploying Migrations"

  local migrations=(
    "005_fix_analytics_sequences.sql"
    "006_add_supplier_contact_person.sql"
  )

  local failed=0
  for migration in "${migrations[@]}"; do
    if ! deploy_migration "${migration}"; then
      failed=1
      break
    fi
  done

  if [ ${failed} -eq 1 ]; then
    log_error "Deployment failed"
    exit 1
  fi

  # Verify deployments
  log_header "Verifying Deployments"

  local verify_failed=0
  verify_analytics_sequences || verify_failed=1
  verify_contact_person || verify_failed=1

  # Calculate duration
  local end_time
  end_time=$(date +%s)
  local duration=$((end_time - start_time))

  # Final status
  echo ""
  if [ ${verify_failed} -eq 0 ]; then
    log_header "✓ DEPLOYMENT SUCCESSFUL"
    echo -e "${GREEN}All critical fixes deployed and verified${NC}"
    echo -e "${CYAN}Duration: ${duration}s${NC}"
  else
    log_header "⚠ DEPLOYMENT COMPLETED WITH WARNINGS"
    echo -e "${YELLOW}Some verification checks failed${NC}"
    echo -e "${CYAN}Duration: ${duration}s${NC}"
    exit 1
  fi

  echo ""
}

# Run main function
main "$@"
