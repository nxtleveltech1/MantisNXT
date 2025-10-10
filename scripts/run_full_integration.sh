#!/bin/bash

# Full Integration Script for NXT-SPP System
# This script orchestrates the complete end-to-end integration process

set -e  # Exit on error
set -u  # Error on undefined variables

# Early error trap for better diagnostics
trap 'log_error "Script failed at line $LINENO"' ERR

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Color output functions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Environment check
log_info "Checking environment..."

# Check required environment variables
if [ -z "${NEON_SPP_DATABASE_URL:-}" ]; then
    log_error "NEON_SPP_DATABASE_URL environment variable is not set"
    exit 1
fi

# Check Node.js and npm
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log_error "npm is not installed"
    exit 1
fi

# Check database connectivity
log_info "Testing database connectivity..."
if ! psql "$NEON_SPP_DATABASE_URL" -c "SELECT 1" &> /dev/null; then
    log_error "Cannot connect to database. Please check NEON_SPP_DATABASE_URL"
    exit 1
fi

log_success "Environment check passed"

# Confirmation prompt
echo ""
log_warning "WARNING: This will DELETE ALL existing inventory data!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log_info "Integration cancelled by user"
    exit 0
fi

# Step 1: Backup current data (optional but recommended)
log_info "Creating backup of current data..."
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

if pg_dump "$NEON_SPP_DATABASE_URL" --schema=spp --schema=core > "$BACKUP_FILE" 2>/dev/null; then
    log_success "Backup created: $BACKUP_FILE"
else
    log_warning "Backup failed, continuing without backup"
fi

# Step 2: Verify schema
log_info "Verifying database schema..."
if psql "$NEON_SPP_DATABASE_URL" -f "$SCRIPT_DIR/../database/scripts/verify_schema_exists.sql" | tee "$SCRIPT_DIR/../backups/verify_schema_$(date +%Y%m%d_%H%M%S).log"; then
    log_success "Schema verification completed"
else
    log_warning "Schema verification failed, creating missing schemas..."
    if psql "$NEON_SPP_DATABASE_URL" -f "$SCRIPT_DIR/../database/scripts/create_missing_schemas.sql" | tee "$SCRIPT_DIR/../backups/create_schemas_$(date +%Y%m%d_%H%M%S).log"; then
        log_success "Missing schemas created"
    else
        log_error "Failed to create missing schemas"
        exit 1
    fi
fi

# Step 3: Purge existing data
log_info "Purging all existing inventory data..."
if psql "$NEON_SPP_DATABASE_URL" -f "$SCRIPT_DIR/../database/scripts/purge_all_inventory_data.sql" | tee "$SCRIPT_DIR/../backups/purge_$(date +%Y%m%d_%H%M%S).log"; then
    log_success "Data purge completed"
else
    log_error "Data purge failed"
    exit 1
fi

# Step 4: Import master dataset
log_info "Importing master consolidated dataset..."
if npx tsx "$SCRIPT_DIR/import_master_dataset.ts" | tee "$SCRIPT_DIR/../backups/import_master_$(date +%Y%m%d_%H%M%S).log"; then
    log_success "Master dataset import completed"
else
    log_error "Master dataset import failed"
    exit 1
fi

# Step 5: Create and activate selection
log_info "Creating default inventory selection..."
if npx tsx "$SCRIPT_DIR/create_default_selection.ts" | tee "$SCRIPT_DIR/../backups/create_selection_$(date +%Y%m%d_%H%M%S).log"; then
    log_success "Default selection created and activated"
else
    log_error "Default selection creation failed"
    exit 1
fi

# Step 6: Seed stock on hand
log_info "Seeding initial stock on hand data..."
if npx tsx "$SCRIPT_DIR/seed_stock_on_hand.ts" | tee "$SCRIPT_DIR/../backups/seed_stock_$(date +%Y%m%d_%H%M%S).log"; then
    log_success "Stock on hand seeding completed"
else
    log_error "Stock on hand seeding failed"
    exit 1
fi

# Step 7: Verification queries
log_info "Running verification queries..."

# Total suppliers
SUPPLIERS=$(psql "$NEON_SPP_DATABASE_URL" -t -c "SELECT COUNT(*) FROM core.supplier" 2>/dev/null | tr -d ' ')
log_info "Total suppliers: $SUPPLIERS"

# Total products
PRODUCTS=$(psql "$NEON_SPP_DATABASE_URL" -t -c "SELECT COUNT(*) FROM core.supplier_product" 2>/dev/null | tr -d ' ')
log_info "Total products: $PRODUCTS"

# Total selected products
SELECTED=$(psql "$NEON_SPP_DATABASE_URL" -t -c "SELECT COUNT(*) FROM core.inventory_selected_item WHERE status = 'selected'" 2>/dev/null | tr -d ' ')
log_info "Total selected products: $SELECTED"

# Active selection name
ACTIVE_SELECTION=$(psql "$NEON_SPP_DATABASE_URL" -t -c "SELECT selection_name FROM core.inventory_selection WHERE status = 'active'" 2>/dev/null | tr -d ' ')
log_info "Active selection: $ACTIVE_SELECTION"

# Total stock records
STOCK_RECORDS=$(psql "$NEON_SPP_DATABASE_URL" -t -c "SELECT COUNT(*) FROM core.stock_on_hand" 2>/dev/null | tr -d ' ')
log_info "Total stock records: $STOCK_RECORDS"

# Total inventory value
INVENTORY_VALUE=$(psql "$NEON_SPP_DATABASE_URL" -t -c "SELECT COALESCE(SUM(total_value), 0) FROM core.stock_on_hand" 2>/dev/null | tr -d ' ')
log_info "Total inventory value: $INVENTORY_VALUE"

# Success summary
echo ""
log_success "🎉 Full integration completed successfully!"
echo "================================================"
echo ""
echo "📊 Integration Summary:"
echo "  • Suppliers: $SUPPLIERS"
echo "  • Products: $PRODUCTS"
echo "  • Selected Products: $SELECTED"
echo "  • Stock Records: $STOCK_RECORDS"
echo "  • Inventory Value: $INVENTORY_VALUE"
echo "  • Active Selection: $ACTIVE_SELECTION"
echo ""
echo "🌐 Access URLs:"
echo "  • NXT-SPP Dashboard: http://localhost:3000/nxt-spp"
echo "  • Inventory Management: http://localhost:3000/inventory"
echo ""
echo "📋 Next Steps:"
echo "  1. Start the dev server: npm run dev"
echo "  2. Navigate to the URLs above"
echo "  3. Run verification: npm run integration:verify"
echo ""
if [ -f "$BACKUP_FILE" ]; then
    echo "💾 Backup available at: $BACKUP_FILE"
fi
echo ""

log_success "Integration script completed successfully!"
