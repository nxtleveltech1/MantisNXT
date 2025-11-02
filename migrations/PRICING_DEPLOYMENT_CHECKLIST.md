# Pricing & Optimization System - Deployment Checklist

## Pre-Deployment

- [ ] **Backup Database**
  ```bash
  pg_dump -h localhost -U postgres -d mantis_db > backup_pre_pricing_$(date +%Y%m%d_%H%M%S).sql
  ```
  - [ ] Verify backup file size > 0
  - [ ] Store backup in safe location

- [ ] **Verify Prerequisites**
  ```sql
  -- Check PostgreSQL version (need 12+)
  SELECT version();

  -- Check uuid-ossp extension
  SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';

  -- Check required tables exist
  SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  AND tablename IN ('organization', 'inventory_item', 'customer', 'brand', 'supplier');
  -- Should return 5 rows

  -- Check RLS helper functions exist
  SELECT proname FROM pg_proc WHERE proname IN ('user_org_id', 'user_role', 'is_admin', 'has_role');
  -- Should return 4 rows
  ```

- [ ] **Review Migration Files**
  - [ ] Read `0013_pricing_optimization.sql` (1200+ lines)
  - [ ] Read `0014_pricing_rls_policies.sql` (350+ lines)
  - [ ] Review `0013_pricing_optimization_DOCUMENTATION.md`

- [ ] **Schedule Maintenance Window**
  - [ ] Expected downtime: 5-10 minutes
  - [ ] Best time: Low traffic period
  - [ ] Notify users if needed

---

## Deployment Steps

### Step 1: Apply Main Migration (0013)

- [ ] **Run Migration**
  ```bash
  psql -h localhost -U postgres -d mantis_db -f migrations/0013_pricing_optimization.sql
  ```

- [ ] **Verify No Errors**
  - [ ] Check for `ERROR:` in output
  - [ ] Check for `WARNING:` in output (acceptable if minor)

- [ ] **Verify Objects Created**
  ```sql
  -- Count enums (expect 4)
  SELECT COUNT(*) FROM pg_type
  WHERE typname IN ('pricing_strategy', 'price_tier', 'optimization_status', 'recommendation_type');

  -- Count tables (expect 8)
  SELECT COUNT(*) FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN (
    'pricing_rule', 'price_history', 'pricing_optimization', 'pricing_recommendation',
    'competitor_pricing', 'price_elasticity', 'customer_pricing_tier', 'volume_pricing_tier'
  );

  -- Count functions (expect 5)
  SELECT COUNT(*) FROM pg_proc
  WHERE proname IN (
    'calculate_optimal_price', 'get_price_for_customer', 'analyze_price_performance',
    'generate_pricing_recommendations', 'track_price_changes'
  );

  -- Count indexes (expect 12+)
  SELECT COUNT(*) FROM pg_indexes
  WHERE schemaname = 'public'
  AND (tablename LIKE 'pricing%' OR tablename LIKE 'price_%' OR tablename LIKE '%_pricing%');

  -- Count triggers (expect 10+)
  SELECT COUNT(*) FROM pg_trigger
  WHERE tgname LIKE '%pricing%' OR tgname LIKE '%price%';

  -- Verify view created
  SELECT COUNT(*) FROM pg_views
  WHERE schemaname = 'public' AND viewname = 'pricing_performance_summary';
  ```

### Step 2: Apply RLS Policies (0014)

- [ ] **Run RLS Migration**
  ```bash
  psql -h localhost -U postgres -d mantis_db -f migrations/0014_pricing_rls_policies.sql
  ```

- [ ] **Verify RLS Enabled**
  ```sql
  -- All pricing tables should have RLS enabled
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN (
    'pricing_rule', 'price_history', 'pricing_optimization', 'pricing_recommendation',
    'competitor_pricing', 'price_elasticity', 'customer_pricing_tier', 'volume_pricing_tier'
  );
  -- All rows should show rowsecurity = true
  ```

- [ ] **Verify Policies Created**
  ```sql
  -- Count policies (expect 32)
  SELECT COUNT(*) FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN (
    'pricing_rule', 'price_history', 'pricing_optimization', 'pricing_recommendation',
    'competitor_pricing', 'price_elasticity', 'customer_pricing_tier', 'volume_pricing_tier'
  );
  ```

### Step 3: Run Test Suite

- [ ] **Execute Tests**
  ```bash
  psql -h localhost -U postgres -d mantis_db -f migrations/0013_pricing_optimization_TESTS.sql > test_results.log 2>&1
  ```

- [ ] **Review Test Results**
  ```bash
  # Count PASS results
  grep -c "PASS" test_results.log
  # Should be 16

  # Count FAIL results
  grep -c "FAIL" test_results.log
  # Should be 0

  # Check for warnings
  grep "WARNING" test_results.log
  ```

- [ ] **Verify Test Rollback**
  ```sql
  -- Test data should be gone (rolled back)
  SELECT COUNT(*) FROM pricing_rule WHERE org_id = 'a0000000-0000-0000-0000-000000000001';
  -- Should be 0
  ```

### Step 4: Functional Verification

- [ ] **Test Basic Functions**
  ```sql
  -- Test calculate_optimal_price
  SELECT calculate_optimal_price(
    (SELECT id FROM inventory_item WHERE is_active = true AND cost_price > 0 LIMIT 1),
    'cost_plus'
  );
  -- Should return a numeric price > 0

  -- Test get_price_for_customer (if customers exist)
  SELECT get_price_for_customer(
    (SELECT id FROM inventory_item WHERE is_active = true LIMIT 1),
    (SELECT id FROM customer WHERE status = 'active' LIMIT 1),
    1
  );
  -- Should return a numeric price > 0
  ```

- [ ] **Test Price History Trigger**
  ```sql
  BEGIN;

  -- Update a product price
  UPDATE inventory_item
  SET price = price * 1.05
  WHERE id = (SELECT id FROM inventory_item WHERE is_active = true LIMIT 1)
  RETURNING id, price;

  -- Verify history created
  SELECT COUNT(*) FROM price_history
  WHERE inventory_item_id = (SELECT id FROM inventory_item WHERE is_active = true LIMIT 1)
  AND new_price = (SELECT price FROM inventory_item WHERE is_active = true LIMIT 1);
  -- Should be 1

  ROLLBACK;
  ```

- [ ] **Test RLS Isolation**
  ```sql
  -- Create test user (if not exists)
  -- INSERT INTO auth.users (id, email) VALUES ('test-user-id', 'test@example.com');
  -- INSERT INTO profile (id, org_id, role, display_name) VALUES ('test-user-id', 'other-org-id', 'admin', 'Test User');

  -- Set user context
  SET ROLE test_user;

  -- Try to access another org's data (should return 0)
  SELECT COUNT(*) FROM pricing_rule WHERE org_id != auth.user_org_id();

  -- Reset
  RESET ROLE;
  ```

### Step 5: Performance Check

- [ ] **Run Performance Queries**
  ```sql
  -- Time function execution
  EXPLAIN ANALYZE
  SELECT calculate_optimal_price(
    (SELECT id FROM inventory_item WHERE is_active = true LIMIT 1),
    'cost_plus'
  );
  -- Execution time should be < 10ms

  -- Time view query
  EXPLAIN ANALYZE
  SELECT * FROM pricing_performance_summary
  WHERE org_id = (SELECT id FROM organization LIMIT 1);
  -- Execution time should be < 500ms for 1000 products

  -- Check index usage
  SELECT schemaname, tablename, indexname, idx_scan
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
  AND tablename LIKE '%pricing%'
  ORDER BY idx_scan DESC;
  -- All indexes should eventually show usage
  ```

---

## Post-Deployment

### Step 6: Documentation

- [ ] **Update Deployment Log**
  - [ ] Record deployment date/time
  - [ ] Record deployer name
  - [ ] Record migration version (0013, 0014)
  - [ ] Note any warnings or issues

- [ ] **Notify Stakeholders**
  - [ ] Pricing team
  - [ ] Operations managers
  - [ ] Development team
  - [ ] Support team

### Step 7: Monitoring Setup

- [ ] **Add Monitoring Queries**
  ```sql
  -- Save these as scheduled reports/alerts

  -- Daily: Optimization runs status
  SELECT id, name, status, created_at, completed_at
  FROM pricing_optimization
  WHERE status IN ('pending', 'analyzing')
  ORDER BY created_at DESC;

  -- Daily: Failed recommendations
  SELECT COUNT(*) FROM pricing_recommendation
  WHERE created_at > now() - interval '24 hours'
  AND status = 'rejected';

  -- Weekly: Table sizes
  SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename LIKE '%pricing%'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
  ```

- [ ] **Setup Alerts**
  - [ ] Slow query alerts (> 1 second)
  - [ ] Failed optimization runs
  - [ ] Large table growth (> 10GB)

### Step 8: User Training

- [ ] **Prepare Training Materials**
  - [ ] Link to `PRICING_SYSTEM_README.md`
  - [ ] Link to `0013_pricing_optimization_DOCUMENTATION.md`
  - [ ] Create example SQL queries for common tasks

- [ ] **Schedule Training Sessions**
  - [ ] Pricing team: Advanced features
  - [ ] Ops managers: Approval workflow
  - [ ] CS agents: Read-only access

### Step 9: Initial Data Setup (Optional)

- [ ] **Create Default Pricing Rules**
  ```sql
  -- Example: Cost-plus rule for all products
  INSERT INTO pricing_rule (
    org_id, name, strategy, category_id, markup_percentage,
    tier, is_active, priority, created_by
  ) VALUES (
    '{{org_id}}',
    'Default Cost Plus 30%',
    'cost_plus',
    NULL,  -- Applies to all categories
    30.00,
    'standard',
    true,
    50,
    auth.uid()
  );
  ```

- [ ] **Import Competitor Pricing (if available)**
  ```sql
  -- Import from CSV or external API
  -- See documentation for examples
  ```

- [ ] **Calculate Initial Elasticity (if historical data available)**
  ```sql
  -- Requires sales/orders data
  -- See documentation for analysis procedures
  ```

---

## Rollback Plan (If Needed)

### Critical Issues Encountered

- [ ] **Assess Impact**
  - [ ] Can issue be fixed with hotfix?
  - [ ] Does issue affect production traffic?
  - [ ] Is data corrupted?

### Rollback Steps

- [ ] **Step 1: Disable RLS Policies**
  ```bash
  psql -h localhost -U postgres -d mantis_db <<EOF
  -- Run "down" section from 0014_pricing_rls_policies.sql
  EOF
  ```

- [ ] **Step 2: Drop Migration Objects**
  ```bash
  psql -h localhost -U postgres -d mantis_db <<EOF
  -- Run "down" section from 0013_pricing_optimization.sql
  EOF
  ```

- [ ] **Step 3: Verify Rollback**
  ```sql
  -- Verify tables dropped
  SELECT COUNT(*) FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename LIKE '%pricing%';
  -- Should be 0

  -- Verify functions dropped
  SELECT COUNT(*) FROM pg_proc
  WHERE proname LIKE '%pric%';
  -- Should be 0
  ```

- [ ] **Step 4: Restore from Backup (if needed)**
  ```bash
  # Stop application
  # Restore backup
  psql -h localhost -U postgres -d mantis_db < backup_pre_pricing_YYYYMMDD_HHMMSS.sql
  # Start application
  ```

- [ ] **Step 5: Post-Rollback Verification**
  ```sql
  -- Verify database integrity
  SELECT * FROM inventory_item LIMIT 1;
  SELECT * FROM customer LIMIT 1;
  SELECT * FROM organization LIMIT 1;
  ```

- [ ] **Step 6: Notify Stakeholders**
  - [ ] Explain issue
  - [ ] Provide timeline for fix
  - [ ] Document root cause

---

## Success Criteria

### Deployment Successful If:

- [x] All migration objects created (8 tables, 4 functions, 1 view, 12+ indexes, 10+ triggers)
- [x] All RLS policies created (32 policies)
- [x] All tests passing (16/16 PASS, 0 FAIL)
- [x] Basic functions working (calculate_optimal_price, get_price_for_customer)
- [x] Price history trigger working
- [x] RLS isolation working
- [x] No errors in production logs
- [x] Performance within expected ranges (< 10ms for calculations)

### Ready for Production Use If:

- [ ] All deployment steps completed
- [ ] All post-deployment steps completed
- [ ] Monitoring setup
- [ ] Team trained
- [ ] Documentation published
- [ ] Backup strategy confirmed

---

## Deployment Sign-Off

**Deployed By:** ___________________________
**Date/Time:** ___________________________
**Migration Version:** 0013, 0014
**Database:** ___________________________
**Environment:** ___________________________

**Pre-Deployment Backup:** ___________________________
**Backup Location:** ___________________________
**Backup Size:** ___________________________

**Issues Encountered:**
- [ ] None
- [ ] Minor (list below)
- [ ] Major (rollback performed)

**Issue Details:**
```
___________________________________________________________
___________________________________________________________
___________________________________________________________
```

**Sign-Off:**
- [ ] Database Admin: ___________________________
- [ ] Tech Lead: ___________________________
- [ ] Product Owner: ___________________________

---

## Quick Reference

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `0013_pricing_optimization.sql` | Main migration | 1200+ |
| `0014_pricing_rls_policies.sql` | RLS policies | 350+ |
| `0013_pricing_optimization_DOCUMENTATION.md` | Complete docs | 2800+ |
| `0013_pricing_optimization_TESTS.sql` | Test suite | 700+ |
| `PRICING_SYSTEM_README.md` | User guide | 1000+ |
| `PRICING_DEPLOYMENT_CHECKLIST.md` | This file | - |

### Emergency Contacts

- **Database Team Lead:** ___________________________
- **On-Call DBA:** ___________________________
- **Tech Support:** ___________________________
- **Escalation:** ___________________________

---

**Document Version:** 1.0.0
**Last Updated:** 2025-01-15
**Next Review:** After first production deployment
