# MantisNXT Data Cleanup Scripts
**Agent 2: Data Cleanup Specialist**

## ⚠️ CRITICAL WARNING
**DO NOT EXECUTE THESE SCRIPTS WITHOUT EXPLICIT APPROVAL FROM AGENT 1**

These scripts are prepared for the MantisNXT data cleanup operation but require careful review and approval before execution.

## 📋 Script Overview

### 1. `01_supplier_consolidation.sql`
**Purpose**: Safely consolidate duplicate suppliers while preserving data integrity

**Features**:
- ✅ Automatic duplicate detection using normalized name matching
- ✅ Intelligent merging with primary supplier selection
- ✅ Comprehensive backup creation before any changes
- ✅ Referential integrity preservation (inventory items, purchase orders)
- ✅ Performance metrics consolidation
- ✅ Complete rollback capability
- ✅ Production environment safety checks

**Key Functions**:
- `detect_supplier_duplicates()` - Identifies duplicate suppliers
- `merge_suppliers()` - Merges duplicate records into primary supplier
- `execute_supplier_consolidation()` - Full consolidation with safety checks
- `rollback_supplier_consolidation()` - Complete rollback if needed

### 2. `02_transactional_data_cleanup.sql`
**Purpose**: Clear ALL transactional data while preserving system/config data

**Features**:
- ✅ Comprehensive backup of all transactional tables
- ✅ Intelligent table classification (transactional vs master data)
- ✅ Foreign key constraint handling during cleanup
- ✅ Dry run capability for safe testing
- ✅ Sequence reset after cleanup
- ✅ Complete restoration capability

**What Gets Cleaned**:
- Sales orders and line items
- Purchase orders and line items
- Invoices and payments
- Stock movements and price history
- CRM data (leads, opportunities, activities)
- Communications (emails, notifications)
- Documents and workflows
- Reports and dashboards

**What Gets Preserved**:
- Organizations, users, roles, permissions
- Suppliers and customers (master data)
- Inventory items and product catalog
- System configuration
- Reference/lookup data

### 3. `03_sequence_reset.sql`
**Purpose**: Reset auto-increment sequences after cleanup operations

**Features**:
- ✅ Comprehensive sequence analysis
- ✅ Automatic detection of sequences needing reset
- ✅ Safe dry-run testing
- ✅ Individual table sequence reset capability
- ✅ Health check and monitoring
- ✅ Maintenance logging

**Key Functions**:
- `analyze_sequence_states()` - Analyzes current sequence states
- `reset_all_sequences()` - Resets all sequences with dry-run option
- `reset_table_sequence()` - Resets specific table sequence
- `sequence_health_check()` - Provides health status report

### 4. `04_rollback_procedures.sql`
**Purpose**: Complete rollback procedures for emergency recovery

**Features**:
- ✅ Emergency full database rollback capability
- ✅ Selective rollback by operation type
- ✅ Comprehensive state capture before operations
- ✅ Staged rollback with checkpoints
- ✅ Rollback status monitoring
- ✅ Artifact cleanup after successful operations

**Emergency Functions**:
- `emergency_full_rollback()` - Complete system restoration
- `rollback_supplier_consolidation()` - Supplier-specific rollback
- `rollback_transactional_cleanup()` - Data cleanup rollback
- `capture_database_state()` - Full state snapshot

## 🛡️ Safety Features

### Multi-Layer Protection
1. **Production Detection**: Automatic production environment detection
2. **Backup Validation**: Verifies backups exist before proceeding
3. **Dry Run Mode**: Test all operations without making changes
4. **Transaction Safety**: All operations are transaction-safe
5. **Rollback Capability**: Complete rollback for every operation
6. **Constraint Handling**: Proper foreign key constraint management

### Data Integrity Safeguards
- Comprehensive backup creation before any operation
- Referential integrity preservation during merges
- Sequence consistency after operations
- Audit trail for all changes
- State capture for recovery purposes

## 📊 Database Impact Analysis

### Current Database State
Based on schema analysis, the cleanup will affect:

**Core Tables**:
- `supplier` - Master supplier data (preserved, duplicates merged)
- `inventory_item` - Product catalog (preserved, supplier references updated)
- `sales_orders` / `sales_order_items` - Transactional (cleared)
- `purchase_order` / `purchase_order_item` - Transactional (cleared)
- `invoices` / `invoice_items` - Transactional (cleared)
- `quotes` / `quote_items` - Transactional (cleared)
- `payments` - Transactional (cleared)

**Relationship Handling**:
- Supplier → Inventory Items (FK preserved via consolidation)
- Supplier → Purchase Orders (FK preserved via consolidation)
- All transactional data cleared with CASCADE handling
- Master data relationships maintained

## 🚀 Execution Workflow

### Phase 1: Analysis (SAFE)
```sql
-- Analyze duplicate suppliers
SELECT * FROM detect_supplier_duplicates();

-- Analyze transactional data impact
SELECT * FROM identify_transactional_tables();

-- Check sequence states
SELECT * FROM analyze_sequence_states();

-- Capture current database state
SELECT capture_database_state();
```

### Phase 2: Safety Checks (SAFE)
```sql
-- Verify safety conditions
SELECT perform_cleanup_safety_checks();

-- Create comprehensive backups
SELECT create_comprehensive_backups();
```

### Phase 3: Dry Run Testing (SAFE)
```sql
-- Test supplier consolidation
SELECT * FROM detect_supplier_duplicates(); -- Analysis only

-- Test transactional cleanup
SELECT execute_transactional_cleanup(true); -- Dry run

-- Test sequence reset
SELECT reset_all_sequences(true); -- Dry run
```

### Phase 4: Execution (REQUIRES APPROVAL)
```sql
-- Step 1: Consolidate suppliers
SELECT execute_supplier_consolidation();

-- Step 2: Clear transactional data  
SELECT execute_transactional_cleanup(false);

-- Step 3: Reset sequences
SELECT reset_all_sequences(false);
```

### Phase 5: Verification and Cleanup
```sql
-- Verify results
SELECT * FROM check_rollback_status();
SELECT * FROM sequence_health_check();

-- Clean up artifacts (after confirmation)
SELECT cleanup_rollback_artifacts(true);
```

## 🔧 Usage Examples

### Supplier Consolidation
```sql
-- 1. Analyze duplicates
SELECT * FROM detect_supplier_duplicates();

-- 2. Execute consolidation (CAREFUL!)
-- SELECT execute_supplier_consolidation();

-- 3. Rollback if needed
-- SELECT rollback_supplier_consolidation();
```

### Transactional Data Cleanup
```sql
-- 1. Safety check
SELECT perform_cleanup_safety_checks();

-- 2. Create backups
SELECT create_comprehensive_backups();

-- 3. Dry run
SELECT execute_transactional_cleanup(true);

-- 4. Execute cleanup (CAREFUL!)
-- SELECT execute_transactional_cleanup(false);

-- 5. Rollback if needed
-- SELECT rollback_transactional_cleanup();
```

### Emergency Recovery
```sql
-- Emergency full rollback
SELECT emergency_full_rollback();
```

## 📝 Pre-Execution Checklist

Before executing any cleanup scripts:

- [ ] **Database backup completed** (external backup, not just script backups)
- [ ] **Agent 1 approval received** for specific cleanup operations
- [ ] **Production environment verified** (should NOT be production)
- [ ] **All safety checks passed** (`perform_cleanup_safety_checks()`)
- [ ] **Dry run executed successfully** for all operations
- [ ] **Rollback procedures tested** and verified
- [ ] **Stakeholder notification** completed
- [ ] **Maintenance window scheduled** if required
- [ ] **Application downtime coordinated** if needed
- [ ] **Recovery plan documented** and ready

## 📈 Expected Outcomes

### Supplier Consolidation
- Duplicate suppliers merged into primary records
- All inventory items point to consolidated suppliers  
- All purchase orders maintain proper supplier references
- Performance metrics consolidated appropriately
- No data loss, only improved data quality

### Transactional Cleanup
- All transactional data removed (orders, invoices, payments, etc.)
- Master data preserved (suppliers, customers, products)
- System configuration maintained
- Database ready for fresh transactional data
- Significant database size reduction

### Sequence Reset
- All sequences aligned with current max IDs
- No sequence-related insert failures
- Optimal sequence starting points
- Clean numeric progression for new records

## 🚨 Emergency Procedures

If something goes wrong during cleanup:

1. **STOP** all cleanup operations immediately
2. **DO NOT** make additional changes
3. **ASSESS** the situation using status functions
4. **EXECUTE** appropriate rollback:
   - `rollback_supplier_consolidation()` for supplier issues
   - `rollback_transactional_cleanup()` for data cleanup issues  
   - `emergency_full_rollback()` for critical situations
5. **VERIFY** rollback success with health checks
6. **DOCUMENT** the issue and recovery steps
7. **ANALYZE** root cause before attempting again

## 📞 Support and Monitoring

### Status Monitoring
```sql
-- Check rollback status
SELECT * FROM check_rollback_status();

-- Get recommendations  
SELECT * FROM get_rollback_recommendations();

-- Monitor sequence health
SELECT * FROM sequence_health_check();
```

### Logging and Audit
All operations are logged in:
- `rollback_operations_log` - Rollback operation tracking
- `supplier_merge_log` - Supplier consolidation tracking  
- `cleanup_backup_metadata` - Backup operation tracking
- `sequence_maintenance_log` - Sequence reset tracking

## 🎯 Success Criteria

The cleanup operation is successful when:

- [ ] All duplicate suppliers consolidated without data loss
- [ ] All transactional data cleared as planned
- [ ] All master data preserved intact
- [ ] All sequences properly reset and functional
- [ ] All foreign key relationships maintained
- [ ] Database performance improved
- [ ] Application can connect and function normally
- [ ] No orphaned records remain
- [ ] Backup and rollback procedures verified functional

---

**Remember**: These scripts are powerful and will make significant changes to the database. Always follow the safety procedures and never skip the approval process.