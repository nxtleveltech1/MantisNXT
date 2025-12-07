# Operational Runbook
## WooCommerce Integration

**Version:** 1.0
**Last Updated:** December 2025
**Owner:** MantisNXT Operations Team

---

## Table of Contents

1. [Overview](#overview)
2. [Daily Operations](#daily-operations)
3. [Weekly Operations](#weekly-operations)
4. [Monthly Operations](#monthly-operations)
5. [Incident Response](#incident-response)
6. [Maintenance Procedures](#maintenance-procedures)
7. [Monitoring and Alerting](#monitoring-and-alerting)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Escalation Procedures](#escalation-procedures)
10. [Emergency Contacts](#emergency-contacts)

---

## Overview

This runbook provides detailed procedures for the day-to-day operation, monitoring, and maintenance of the secure WooCommerce integration. It includes standard operating procedures, incident response guidelines, and escalation paths.

### System Components

- **Frontend**: Next.js application with secure authentication
- **Backend**: Node.js API with security middleware
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Integration**: WooCommerce REST API connectors
- **Security**: JWT authentication, CSRF protection, rate limiting
- **Monitoring**: Application and infrastructure monitoring

### Key Metrics

- **Uptime**: 99.9% target availability
- **Response Time**: < 2 seconds for API requests
- **Error Rate**: < 1% of total requests
- **Security**: Zero security breaches
- **Sync Success**: > 95% successful sync operations

---

## Daily Operations

### 1. Morning Health Check (08:00 - 09:00)

#### 1.1 Application Health Check

**Command:**
```bash
# Check application health
curl -f https://your-domain.com/api/health

# Expected Response:
# {"status":"ok","timestamp":"2025-12-03T08:00:00Z","version":"1.0.0"}
```

**Verification Steps:**
- [ ] Application responds to health check
- [ ] Response status is "ok"
- [ ] Version matches deployed version
- [ ] Response time < 2 seconds

#### 1.2 Database Health Check

**Command:**
```bash
# Check database connectivity
curl -f https://your-domain.com/api/health/database

# Expected Response:
# {"status":"connected","pool":{"total":10,"idle":8,"waiting":0}}
```

**SQL Check:**
```sql
-- Check database connections
SELECT state, COUNT(*)
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;

-- Check for long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

**Verification Steps:**
- [ ] Database connection successful
- [ ] Connection pool healthy (idle connections available)
- [ ] No long-running queries (>5 minutes)
- [ ] No blocking locks

#### 1.3 Integration Status Check

**Command:**
```bash
# Check WooCommerce integration status
curl -H "Content-Type: application/json" \
     -H "x-org-id: your-org-id" \
     -H "x-csrf-token: $(get-csrf-token)" \
     https://your-domain.com/api/v1/integrations/woocommerce

# Expected Response:
# {"success":true,"data":{"status":"active","store_url":"https://example.com"}}
```

**Verification Steps:**
- [ ] Integration status is "active"
- [ ] Store URL is accessible
- [ ] API credentials are valid
- [ ] No authentication errors

#### 1.4 Security Log Review

**SQL Query:**
```sql
-- Check security events from last 24 hours
SELECT event_type, severity, COUNT(*) as count
FROM security_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type, severity
ORDER BY count DESC;
```

**Expected Results:**
- AUTH_SUCCESS: High count (normal user activity)
- QUERY_EXECUTED: High count (normal operations)
- Any CRITICAL/ERROR events: Investigate immediately

**Verification Steps:**
- [ ] No CRITICAL security events
- [ ] ERROR events are investigated
- [ ] Authentication failures within normal range
- [ ] No unusual patterns detected

### 2. Midday Check (12:00 - 13:00)

#### 2.1 Performance Monitoring

**Metrics to Check:**
- API response times
- Database query performance
- Memory usage
- CPU utilization

**Commands:**
```bash
# Check API performance
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/api/v1/integrations/woocommerce

# Expected output:
#     time_namelookup:  0.002 seconds
#        time_connect:  0.015 seconds
#     time_appconnect:  0.120 seconds
#    time_pretransfer:  0.121 seconds
#       time_redirect:  0.000 seconds
#  time_starttransfer:  0.320 seconds
#                     ----------
#          time_total:  0.321 seconds

# Check system resources
top -p $(pgrep -d',' node)
free -h
df -h
```

**Verification Steps:**
- [ ] API response time < 2 seconds
- [ ] CPU usage < 80%
- [ ] Memory usage < 80%
- [ ] Disk space > 20% free

#### 2.2 Sync Operations Check

**SQL Query:**
```sql
-- Check sync operations from last 6 hours
SELECT
    operation_type,
    status,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (ended_at - started_at))) as avg_duration_seconds
FROM woocommerce_sync
WHERE started_at > NOW() - INTERVAL '6 hours'
GROUP BY operation_type, status
ORDER BY operation_type, status;
```

**Expected Results:**
- Status should be "completed" for most operations
- Failed operations should be < 5%
- Average duration should be reasonable for operation type

**Verification Steps:**
- [ ] Sync operations completing successfully
- [ ] Failed operations investigated
- [ ] Performance within acceptable range
- [ ] No stuck or hanging operations

### 3. End of Day Summary (17:00 - 18:00)

#### 3.1 Daily Metrics Report

**Generate Daily Report:**
```bash
#!/bin/bash
# daily-report.sh

DATE=$(date -d "yesterday" '+%Y-%m-%d')
OUTPUT="/reports/daily-$DATE.txt"

echo "=== MantisNXT WooCommerce Integration Daily Report ===" > $OUTPUT
echo "Date: $DATE" >> $OUTPUT
echo "" >> $OUTPUT

# Application uptime
echo "=== Application Uptime ===" >> $OUTPUT
curl -s -o /dev/null -w "HTTP Code: %{http_code}\nTime: %{time_total}s\n" \
     https://your-domain.com/api/health >> $OUTPUT
echo "" >> $OUTPUT

# Database stats
echo "=== Database Statistics ===" >> $OUTPUT
psql "$DATABASE_URL" << 'EOF' >> $OUTPUT
SELECT
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables
WHERE tablename IN ('woocommerce_sync', 'security_audit_log')
ORDER BY tablename;
EOF
echo "" >> $OUTPUT

# Security events
echo "=== Security Events ===" >> $OUTPUT
psql "$DATABASE_URL" << 'EOF' >> $OUTPUT
SELECT
    event_type,
    severity,
    COUNT(*) as count
FROM security_audit_log
WHERE DATE(created_at) = '$DATE'
GROUP BY event_type, severity
ORDER BY count DESC;
EOF
echo "" >> $OUTPUT

# Sync summary
echo "=== Sync Summary ===" >> $OUTPUT
psql "$DATABASE_URL" << 'EOF' >> $OUTPUT
SELECT
    DATE(started_at) as date,
    operation_type,
    status,
    COUNT(*) as count
FROM woocommerce_sync
WHERE DATE(started_at) = '$DATE'
GROUP BY DATE(started_at), operation_type, status
ORDER BY operation_type, status;
EOF

echo "Report generated: $OUTPUT"
```

**Verification Steps:**
- [ ] Daily report generated successfully
- [ ] Review application uptime
- [ ] Review database statistics
- [ ] Review security events summary
- [ ] Review sync operation summary
- [ ] Escalate any anomalies

---

## Weekly Operations

### 1. Security Review (Monday 09:00 - 10:00)

#### 1.1 Security Audit Log Analysis

**SQL Queries:**
```sql
-- Weekly security summary
SELECT
    DATE(created_at) as date,
    event_type,
    severity,
    COUNT(*) as count
FROM security_audit_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), event_type, severity
ORDER BY date DESC, count DESC;

-- Top IP addresses for security events
SELECT
    ip_address,
    COUNT(*) as event_count,
    ARRAY_AGG(DISTINCT event_type) as event_types
FROM security_audit_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY ip_address
HAVING COUNT(*) > 10
ORDER BY event_count DESC
LIMIT 10;

-- Failed authentication attempts by user
SELECT
    user_id,
    COUNT(*) as failed_attempts,
    MAX(created_at) as last_attempt
FROM security_audit_log
WHERE event_type = 'AUTH_FAILURE'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id
HAVING COUNT(*) > 5
ORDER BY failed_attempts DESC;
```

**Analysis Steps:**
- [ ] Review security event trends
- [ ] Investigate suspicious IP addresses
- [ ] Review failed authentication patterns
- [ ] Check for privilege escalation attempts
- [ ] Document findings and actions

#### 1.2 Access Control Review

**Commands:**
```sql
-- Review user access levels
SELECT
    u.id,
    u.email,
    u.role,
    u.is_active,
    COUNT(DISTINCT ic.id) as integrations_count
FROM users u
LEFT JOIN integration_connector ic ON u.id = ic.created_by
WHERE u.org_id = 'your-org-id'
GROUP BY u.id, u.email, u.role, u.is_active
ORDER BY u.role, u.email;

-- Review integration access
SELECT
    ic.name,
    ic.status,
    ic.created_at,
    u.email as created_by
FROM integration_connector ic
LEFT JOIN users u ON ic.created_by = u.id
WHERE ic.provider = 'woocommerce'
  AND ic.org_id = 'your-org-id'
ORDER BY ic.created_at DESC;
```

**Review Steps:**
- [ ] Verify all active users need access
- [ ] Review integration owners
- [ ] Check for unused accounts
- [ ] Review role assignments
- [ ] Update access as needed

### 2. Performance Analysis (Wednesday 09:00 - 10:00)

#### 2.1 Database Performance

**SQL Queries:**
```sql
-- Slow queries from last week
SELECT
    query,
    calls,
    mean_time,
    total_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE query LIKE '%woocommerce%'
   OR query LIKE '%sync%'
ORDER BY mean_time DESC
LIMIT 20;

-- Table statistics
SELECT
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_dead_tup
FROM pg_stat_user_tables
WHERE tablename IN ('woocommerce_sync', 'woocommerce_credentials', 'security_audit_log')
ORDER BY n_tup_upd DESC;

-- Index usage
SELECT
    t.tablename,
    indexname,
    c.reltuples AS num_rows,
    pg_size_pretty(pg_relation_size(quote_ident(t.tablename)::text)) AS table_size,
    pg_size_pretty(pg_relation_size(quote_ident(indexrelname)::text)) AS index_size,
    CASE WHEN indisunique THEN 'Y' ELSE 'N' END AS unique,
    idx_scan AS number_of_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_tables t
LEFT OUTER JOIN pg_class c ON c.relname = t.tablename
LEFT OUTER JOIN (
    SELECT c.relname AS ctablename, ipg.relname AS indexname, x.indnatts AS number_of_columns,
           idx_scan, idx_tup_read, idx_tup_fetch, indexrelname, indisunique
    FROM pg_index x
    JOIN pg_class c ON c.oid = x.indrelid
    JOIN pg_class ipg ON ipg.oid = x.indexrelid
    JOIN pg_stat_user_indexes psui ON x.indexrelid = psui.indexrelid
) AS foo ON t.tablename = foo.ctablename
WHERE t.tablename IN ('woocommerce_sync', 'woocommerce_credentials', 'security_audit_log')
ORDER BY 1, 2;
```

**Analysis Steps:**
- [ ] Identify slowest queries
- [ ] Check index usage efficiency
- [ ] Review table growth
- [ ] Identify optimization opportunities
- [ ] Plan performance improvements

#### 2.2 Application Performance

**Metrics to Review:**
- API response time percentiles
- Error rates by endpoint
- Memory usage patterns
- CPU utilization trends

**Commands:**
```bash
# Generate performance report
#!/bin/bash
# weekly-performance-report.sh

WEEK_START=$(date -d "7 days ago" '+%Y-%m-%d')
WEEK_END=$(date '+%Y-%m-%d')

echo "=== Weekly Performance Report ==="
echo "Period: $WEEK_START to $WEEK_END"
echo ""

# API performance
echo "=== API Performance ==="
curl -s -w "Avg Response Time: %{time_total}s\n" -o /dev/null \
     "https://your-domain.com/api/v1/integrations/woocommerce?week=$WEEK_START"

# Application logs analysis (if using log analysis tool)
echo "=== Error Analysis ==="
grep "ERROR" /var/log/application.log | \
grep "$(date -d '7 days ago' '+%Y-%m-%d')" -A 1 -B 1

# Resource usage summary
echo "=== Resource Usage ==="
sar -u -f /var/log/sa/sa$(date -d '7 days ago' '+%d') 2>&1 || echo "sar not available"
```

**Review Steps:**
- [ ] Review API performance trends
- [ ] Analyze error patterns
- [ ] Check resource utilization
- [ ] Identify performance bottlenecks
- [ ] Document performance improvements needed

### 3. Backup Verification (Friday 09:00 - 10:00)

#### 3.1 Backup Status Check

**Commands:**
```bash
# Check backup completion
ls -la /backups/daily/

# Verify backup integrity
pg_restore --list /backups/daily/backup_$(date '+%Y%m%d').dump | head -20

# Check backup size
du -sh /backups/daily/backup_$(date '+%Y%m%d').dump

# Verify backup contains expected tables
pg_restore -s /backups/daily/backup_$(date '+%Y%m%d').dump | \
grep -E "(CREATE TABLE|woocommerce|security_audit)" | head -10
```

**Verification Steps:**
- [ ] Daily backup completed successfully
- [ ] Backup file size reasonable
- [ ] Backup contains all required tables
- [ ] Backup is not corrupted
- [ ] Backup retention policy followed

#### 3.2 Restore Test (Monthly)

**Test Restore Procedure:**
```bash
# Create test database
createdb test_restore_$(date '+%Y%m%d')

# Restore backup to test database
pg_restore -d test_restore_$(date '+%Y%m%d') \
          /backups/daily/backup_$(date -d '1 day ago' '+%Y%m%d').dump

# Verify critical tables
psql -d test_restore_$(date '+%Y%m%d') -c "
SELECT
    table_name,
    table_rows
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('woocommerce_sync', 'woocommerce_credentials', 'security_audit_log');
"

# Clean up test database
dropdb test_restore_$(date '+%Y%m%d')
```

**Verification Steps:**
- [ ] Test database created successfully
- [ ] Backup restored without errors
- [ ] Critical tables contain data
- [ ] Test database cleaned up
- [ ] Document restore time and issues

---

## Monthly Operations

### 1. Security Assessment (First Monday of Month)

#### 1.1 Vulnerability Scan

**Scan Commands:**
```bash
# Web application scan
nmap -sV --script http-vuln* your-domain.com

# SSL/TLS assessment
sslscan your-domain.com

# Database security check
# (Use specialized database security scanning tools)

# Dependency vulnerability check
npm audit
# or
yarn audit
```

**Assessment Steps:**
- [ ] Run vulnerability scans
- [ ] Review scan results
- [ ] Prioritize vulnerabilities
- [ ] Plan remediation
- [ ] Document findings

#### 1.2 Security Configuration Review

**Checklist:**
- [ ] Review firewall rules
- [ ] Verify SSL/TLS configuration
- [ ] Check access control lists
- [ ] Review security group settings
- [ ] Validate backup encryption
- [ ] Review monitoring configurations

**Configuration Review:**
```bash
# Check SSL configuration
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check firewall rules
sudo iptables -L -n

# Check running services
sudo netstat -tlnp

# Check file permissions
find /app -type f -name "*.env" -exec ls -la {} \;
```

### 2. Performance Optimization (Second Monday of Month)

#### 2.1 Database Optimization

**Optimization Tasks:**
```sql
-- Update table statistics
ANALYZE;

-- Reindex slow indexes
REINDEX INDEX index_name;

-- Vacuum analyze tables
VACUUM ANALYZE woocommerce_sync;
VACUUM ANALYZE woocommerce_credentials;
VACUUM ANALYZE security_audit_log;

-- Check for bloated tables
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

**Optimization Steps:**
- [ ] Update database statistics
- [ ] Reindex as needed
- [ ] Vacuum tables
- [ ] Review query plans
- [ ] Optimize slow queries

#### 2.2 Application Optimization

**Tasks:**
- [ ] Review application logs for performance issues
- [ ] Analyze memory usage patterns
- [ ] Check for memory leaks
- [ ] Optimize API endpoints
- [ ] Review caching strategies

**Memory Analysis:**
```bash
# Check for memory leaks
# (Use application-specific memory profiling tools)

# Review garbage collection
# (For Node.js applications)
node --inspect --inspect-brk app.js

# Check cache hit rates
# (Review application cache metrics)
```

### 3. Compliance Review (Third Monday of Month)

#### 3.1 Compliance Status Check

**Checklist:**
- [ ] Review SOC 2 compliance status
- [ ] Check GDPR compliance
- [ ] Verify PCI DSS requirements (if applicable)
- [ ] Review audit trail completeness
- [ ] Check access control compliance

**Compliance Reports:**
```sql
-- Generate compliance report
SELECT
    'Security Events' as category,
    COUNT(*) as count
FROM security_audit_log
WHERE created_at > DATE_TRUNC('month', CURRENT_DATE)

UNION ALL

SELECT
    'Active Users' as category,
    COUNT(*) as count
FROM users
WHERE is_active = true

UNION ALL

SELECT
    'Integrations' as category,
    COUNT(*) as count
FROM integration_connector
WHERE provider = 'woocommerce'
  AND status = 'active';
```

### 4. Capacity Planning (Last Monday of Month)

#### 4.1 Resource Utilization Review

**Analysis:**
```bash
# Analyze resource trends
sar -u -f /var/log/sa/sa$(date '+%d') 2>&1

# Check disk space trends
df -h

# Review database growth
SELECT
    pg_size_pretty(pg_database_size('your_database')) as database_size,
    pg_size_pretty(pg_total_relation_size('woocommerce_sync')) as sync_table_size,
    pg_size_pretty(pg_total_relation_size('woocommerce_credentials')) as credentials_table_size,
    pg_size_pretty(pg_total_relation_size('security_audit_log')) as audit_table_size;
```

**Planning Steps:**
- [ ] Analyze resource utilization trends
- [ ] Forecast capacity needs
- [ ] Plan infrastructure upgrades
- [ ] Review cost optimization opportunities
- [ ] Update capacity plan

---

## Incident Response

### Incident Classification

#### Level 1: Minor (Response Time: 4 hours)
**Examples:**
- Single user authentication issue
- Minor performance degradation
- Non-critical API endpoint failure

**Response Team:**
- On-call engineer
- Team lead (as needed)

#### Level 2: Moderate (Response Time: 2 hours)
**Examples:**
- Multiple user authentication failures
- Performance degradation affecting users
- Critical API endpoint failure

**Response Team:**
- On-call engineer
- Team lead
- DevOps engineer
- Security analyst (if security-related)

#### Level 3: Critical (Response Time: 30 minutes)
**Examples:**
- Data breach or suspected compromise
- Complete service outage
- Malicious insider activity
- Regulatory reporting requirement

**Response Team:**
- On-call engineer
- Team lead
- DevOps lead
- Security manager
- CISO
- Legal counsel (if needed)

### Incident Response Procedures

#### Step 1: Detection and Assessment

**Immediate Actions:**
1. **Verify Incident**
   ```bash
   # Check monitoring alerts
   # Verify the issue exists
   # Assess impact scope
   ```

2. **Classify Incident**
   - Determine severity level
   - Identify affected systems
   - Assess business impact
   - Determine response team needed

3. **Initial Notification**
   ```bash
   # Send initial incident notification
   # Include incident ID, severity, affected systems
   # Notify immediate response team
   ```

#### Step 2: Containment and Investigation

**Containment Actions:**
1. **Isolate Affected Systems**
   ```bash
   # Block malicious IP addresses
   sudo iptables -A INPUT -s <malicious-ip> -j DROP

   # Disable compromised accounts
   # (Application-specific commands)

   # Isolate network segments if needed
   ```

2. **Preserve Evidence**
   ```bash
   # Create system snapshots
   sudo dd if=/dev/sda of=/backup/incident-snapshot.img

   # Export logs
   sudo journalctl -b > /backup/incident-logs.txt

   # Document system state
   ps aux > /backup/process-list.txt
   netstat -tlnp > /backup/network-connections.txt
   ```

3. **Investigate Root Cause**
   ```sql
   -- Check security logs
   SELECT * FROM security_audit_log
   WHERE created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;

   -- Check application errors
   SELECT * FROM woocommerce_sync
   WHERE status = 'failed'
     AND ended_at > NOW() - INTERVAL '24 hours';
   ```

#### Step 3: Eradication and Recovery

**Eradication:**
1. **Remove Threats**
   ```bash
   # Remove malware
   # Patch vulnerabilities
   # Reset compromised credentials
   # Clean infected systems
   ```

2. **Verify Cleanup**
   ```bash
   # Run security scans
   # Verify vulnerability patches
   # Test security controls
   # Confirm threat removal
   ```

**Recovery:**
1. **Restore Services**
   ```bash
   # Restore from clean backups if needed
   # Restart services
   # Verify functionality
   # Monitor for stability
   ```

2. **Test and Validate**
   ```bash
   # Run functional tests
   # Verify data integrity
   # Test security controls
   # Confirm service restoration
   ```

#### Step 4: Post-Incident Activities

**Documentation:**
1. **Incident Report**
   ```markdown
   # Incident Report

   ## Incident Details
   - Incident ID: INC-2025-XXX
   - Detection Time: YYYY-MM-DD HH:MM:SS
   - Response Time: YYYY-MM-DD HH:MM:SS
   - Resolution Time: YYYY-MM-DD HH:MM:SS
   - Severity: Level 1/2/3

   ## Impact Assessment
   - Affected Systems:
   - Affected Users:
   - Data Compromised:
   - Business Impact:

   ## Root Cause
   - Primary Cause:
   - Contributing Factors:

   ## Response Actions
   - Detection:
   - Containment:
   - Eradication:
   - Recovery:

   ## Lessons Learned
   - What Worked Well:
   - What Could Be Improved:
   - Preventive Measures:

   ## Follow-up Actions
   - Immediate Actions:
   - Long-term Improvements:
   - Policy/Procedure Updates:
   ```

2. **Metrics Collection**
   ```sql
   -- Calculate incident metrics
   SELECT
       'MTTD' as metric,
       EXTRACT(EPOCH FROM (detection_time - occurrence_time))/60 as value_minutes
   FROM incidents
   WHERE id = 'INC-2025-XXX'

   UNION ALL

   SELECT
       'MTTR' as metric,
       EXTRACT(EPOCH FROM (resolution_time - detection_time))/60 as value_minutes
   FROM incidents
   WHERE id = 'INC-2025-XXX';
   ```

**Improvement Actions:**
1. **Process Improvements**
   - Update runbooks
   - Improve monitoring
   - Enhance training
   - Update procedures

2. **Technical Improvements**
   - Implement security patches
   - Upgrade monitoring tools
   - Enhance detection capabilities
   - Improve response automation

---

## Maintenance Procedures

### Scheduled Maintenance

#### Monthly Maintenance Window
**When:** First Saturday of each month, 02:00 - 06:00
**Duration:** Maximum 4 hours
**Notification:** 7 days, 24 hours, and 2 hours before maintenance

#### Maintenance Tasks

**1. Security Updates (Monthly)**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
npm update
npm audit fix

# Update database
# (Follow vendor-specific update procedures)

# Test updates in staging environment first
```

**2. Database Maintenance (Monthly)**
```sql
-- Full database backup
pg_dump -Fc your_database > /backups/monthly_$(date +%Y%m).dump

-- Reindex all tables
REINDEX DATABASE your_database;

-- Update statistics
ANALYZE;

-- Vacuum full (during maintenance window)
VACUUM FULL;
```

**3. Log Rotation (Weekly)**
```bash
# Configure logrotate for application logs
sudo nano /etc/logrotate.d/mantisnxt

# Example configuration:
/var/log/mantisnxt/*.log {
    weekly
    rotate 52
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
```

**4. Performance Tuning (Quarterly)**
```sql
-- Review query performance
SELECT
    query,
    calls,
    total_time,
    mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 20;

-- Optimize slow queries
-- (Application-specific optimizations)

-- Review index usage
SELECT
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Emergency Maintenance

#### Emergency Patch Deployment

**Procedure:**
1. **Assessment**
   ```bash
   # Assess vulnerability severity
   # Determine patch urgency
   # Plan deployment strategy
   # Prepare rollback plan
   ```

2. **Testing**
   ```bash
   # Test patch in development environment
   # Test in staging environment
   # Verify functionality
   # Prepare deployment scripts
   ```

3. **Deployment**
   ```bash
   # Deploy to production
   # Monitor deployment
   # Verify functionality
   # Monitor for issues
   ```

4. **Validation**
   ```bash
   # Run smoke tests
   # Verify security fix
   # Monitor system performance
   # Confirm successful deployment
   ```

#### Rollback Procedures

**Application Rollback:**
```bash
# Stop current application
sudo systemctl stop mantisnxt

# Deploy previous version
git checkout <previous-commit>
npm install
npm run build

# Start application
sudo systemctl start mantisnxt

# Verify rollback
curl -f https://your-domain.com/api/health
```

**Database Rollback:**
```bash
# Restore from backup
pg_restore -d your_database /backups/backup_$(date -d '1 day ago' '+%Y%m%d').dump

# Verify data integrity
SELECT COUNT(*) FROM woocommerce_sync;
SELECT COUNT(*) FROM woocommerce_credentials;

# Update application configuration if needed
```

---

## Monitoring and Alerting

### Monitoring Tools

#### Application Monitoring
- **Prometheus**: Metrics collection
- **Grafana**: Dashboards and visualization
- **AlertManager**: Alert routing and management
- **Jaeger**: Distributed tracing

#### Infrastructure Monitoring
- **Node Exporter**: System metrics
- **PostgreSQL Exporter**: Database metrics
- **cAdvisor**: Container metrics (if using containers)
- **Blackbox Exporter**: External endpoint monitoring

#### Log Management
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Fluentd**: Log collection
- **Filebeat**: Log shipping

### Alert Configuration

#### Critical Alerts (Page Immediately)

**Application Health:**
```yaml
# Prometheus Alert Rule
- alert: ApplicationDown
  expr: up{job="mantisnxt"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "MantisNXT application is down"
    description: "Application {{ $labels.instance }} has been down for more than 1 minute"

- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High error rate detected"
    description: "Error rate is {{ $value }} errors per second"
```

**Database Health:**
```yaml
# Database connection alert
- alert: DatabaseConnectionFailure
  expr: db_connections_active / db_connections_max > 0.9
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Database connection pool exhausted"
    description: "Database connection pool is 90% full"

# Slow query alert
- alert: SlowQueries
  expr: histogram_quantile(0.95, rate(pg_stat_statements_mean_time_ms_bucket[5m])) > 5000
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Slow database queries detected"
    description: "95th percentile query time is {{ $value }}ms"
```

**Security Alerts:**
```yaml
# Authentication failure alert
- alert: HighAuthFailures
  expr: rate(auth_failures_total[5m]) > 10
  for: 2m
  labels:
    severity: high
  annotations:
    summary: "High authentication failure rate"
    description: "{{ $value }} authentication failures per second"

# Suspicious activity alert
- alert: SuspiciousActivity
  expr: rate(security_events_total{severity="critical"}[5m]) > 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Critical security event detected"
    description: "Critical security event: {{ $labels.event_type }}"
```

#### Warning Alerts (Notify within 1 hour)

**Performance Alerts:**
```yaml
# Response time alert
- alert: HighResponseTime
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High API response time"
    description: "95th percentile response time is {{ $value }}s"

# Memory usage alert
- alert: HighMemoryUsage
  expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.8
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High memory usage"
    description: "Memory usage is {{ $value | humanizePercentage }}"
```

**Capacity Alerts:**
```yaml
# Disk space alert
- alert: LowDiskSpace
  expr: (node_filesystem_size_bytes - node_filesystem_free_bytes) / node_filesystem_size_bytes > 0.8
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Low disk space"
    description: "Disk usage is {{ $value | humanizePercentage }} on {{ $labels.device }}"

# Database size alert
- alert: DatabaseSizeGrowth
  expr: pg_database_size_bytes / 1024 / 1024 / 1024 > 50
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "Database size threshold exceeded"
    description: "Database size is {{ $value }}GB"
```

### Dashboard Configuration

#### Executive Dashboard
**Key Metrics:**
- Overall system uptime
- Number of active users
- Integration success rate
- Security incident count
- Performance summary

#### Operations Dashboard
**Key Metrics:**
- Application response times
- Error rates by component
- Database performance
- Resource utilization
- Queue depths

#### Security Dashboard
**Key Metrics:**
- Authentication success/failure rates
- Security events by type
- Suspicious activity patterns
- Vulnerability scan results
- Compliance status

#### Technical Dashboard
**Key Metrics:**
- Individual service health
- Detailed performance metrics
- Infrastructure status
- Log analysis results
- Alert history

---

## Troubleshooting Guide

### Common Issues and Solutions

#### Authentication Issues

**Problem: JWT token validation fails**
```
Error: Invalid token
Code: INVALID_TOKEN
```

**Diagnosis:**
1. Check token expiration
2. Verify secret key
3. Check token format
4. Review clock synchronization

**Commands:**
```javascript
// Check token details
const decoded = jwt.decode(token, { complete: true });
console.log('Token payload:', decoded.payload);
console.log('Token header:', decoded.header);

// Verify token expiration
const now = Date.now() / 1000;
if (decoded.payload.exp < now) {
    console.log('Token expired at:', new Date(decoded.payload.exp * 1000));
}

// Check secret key
console.log('JWT Secret exists:', !!process.env.JWT_SECRET);
```

**Solution:**
```javascript
// Refresh token
const refreshToken = async () => {
    try {
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include'
        });
        const data = await response.json();
        localStorage.setItem('token', data.token);
        return data.token;
    } catch (error) {
        console.error('Token refresh failed:', error);
        // Redirect to login
        window.location.href = '/login';
    }
};
```

**Prevention:**
- Implement automatic token refresh
- Monitor token expiration
- Use appropriate expiration times
- Implement clock synchronization

#### Database Connection Issues

**Problem: Connection timeout**
```
Error: Connection timeout
Code: DB_TIMEOUT
```

**Diagnosis:**
1. Check database availability
2. Verify connection string
3. Check network connectivity
4. Review connection pool settings

**Commands:**
```bash
# Check database connectivity
telnet database-host 5432

# Check connection pool status
curl https://your-domain.com/api/health/database

# Check database logs
sudo tail -f /var/log/postgresql/postgresql.log

# Check application database configuration
grep -A 5 "database" /app/.env
```

**SQL Queries:**
```sql
-- Check active connections
SELECT
    state,
    COUNT(*) as connection_count
FROM pg_stat_activity
WHERE datname = 'your_database'
GROUP BY state;

-- Check for blocking queries
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;
```

**Solution:**
```javascript
// Adjust connection pool settings
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Increase pool size
    min: 5,  // Maintain minimum connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 120000, // Increase timeout
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idle: 10000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
});

// Implement connection retry logic
const retryConnection = async (maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await pool.query('SELECT 1');
            return result;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
};
```

**Prevention:**
- Monitor database performance
- Implement connection pooling
- Use appropriate timeout values
- Implement retry logic with backoff
- Set up database monitoring

#### Performance Issues

**Problem: Slow API responses**
```
Response time: 5000ms+
```

**Diagnosis:**
1. Check database query performance
2. Review API endpoint logic
3. Check for blocking operations
4. Monitor resource usage

**Commands:**
```sql
-- Identify slow queries
SELECT
    query,
    mean_time,
    calls,
    total_time
FROM pg_stat_statements
WHERE query LIKE '%woocommerce%'
ORDER BY mean_time DESC
LIMIT 10;

-- Check for long-running transactions
SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '30 seconds'
  AND state != 'idle'
ORDER BY duration DESC;

-- Check table locks
SELECT
    blocked_locks.pid AS blocked_pid,
    blocking_locks.pid AS blocking_pid,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;
```

**Performance Analysis:**
```javascript
// Add performance monitoring
const performanceMonitor = {
    timers: new Map(),

    start(label) {
        this.timers.set(label, process.hrtime.bigint());
    },

    end(label) {
        const start = this.timers.get(label);
        if (start) {
            const duration = Number(process.hrtime.bigint() - start) / 1000000;
            console.log(`[PERF] ${label}: ${duration}ms`);
            this.timers.delete(label);
            return duration;
        }
        return 0;
    }
};

// Use in API endpoints
app.get('/api/sync/status', async (req, res) => {
    performanceMonitor.start('sync-status-query');

    try {
        const result = await db.query('SELECT * FROM woocommerce_sync WHERE status = $1', ['processing']);

        const duration = performanceMonitor.end('sync-status-query');

        if (duration > 1000) {
            console.warn(`Slow query detected: ${duration}ms`);
        }

        res.json(result.rows);
    } catch (error) {
        performanceMonitor.end('sync-status-query');
        console.error('Query failed:', error);
        res.status(500).json({ error: error.message });
    }
});
```

**Solution:**
```sql
-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_woocommerce_sync_status
ON woocommerce_sync(status);

CREATE INDEX IF NOT EXISTS idx_woocommerce_sync_org_status
ON woocommerce_sync(org_id, status);

CREATE INDEX IF NOT EXISTS idx_woocommerce_sync_created_at
ON woocommerce_sync(created_at);

-- Optimize query
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM woocommerce_sync
WHERE status = 'processing'
ORDER BY created_at DESC
LIMIT 100;
```

**Caching Strategy:**
```javascript
// Implement caching
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 minute TTL

const getCachedSyncStatus = async (status) => {
    const cacheKey = `sync_status:${status}`;
    const cached = cache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const result = await db.query(
        'SELECT * FROM woocommerce_sync WHERE status = $1 ORDER BY created_at DESC LIMIT 100',
        [status]
    );

    cache.set(cacheKey, result.rows);
    return result.rows;
};
```

**Prevention:**
- Implement query optimization
- Use caching strategies
- Monitor performance metrics
- Scale resources as needed
- Implement load balancing

#### Sync Issues

**Problem: Sync operations failing**
```
Error: Sync failed
Code: SYNC_ERROR
```

**Diagnosis:**
1. Check WooCommerce API connectivity
2. Verify credentials
3. Review rate limiting
4. Check for data validation errors

**Commands:**
```bash
# Test WooCommerce API connectivity
curl -u "consumer_key:consumer_secret" \
     "https://your-store.com/wp-json/wc/v3/products?per_page=1"

# Check API rate limits
curl -I -u "consumer_key:consumer_secret" \
     "https://your-store.com/wp-json/wc/v3/products"

# Check application logs
tail -f /var/log/application.log | grep -i sync
```

**SQL Queries:**
```sql
-- Check failed sync operations
SELECT
    id,
    operation_type,
    status,
    error_message,
    started_at,
    ended_at
FROM woocommerce_sync
WHERE status = 'failed'
  AND started_at > NOW() - INTERVAL '24 hours'
ORDER BY started_at DESC;

-- Check sync frequency
SELECT
    DATE(started_at) as date,
    operation_type,
    status,
    COUNT(*) as count
FROM woocommerce_sync
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(started_at), operation_type, status
ORDER BY date DESC, operation_type;
```

**Solution:**
```javascript
// Improve sync error handling
const syncProducts = async (orgId) => {
    try {
        // Test API connectivity first
        const testResponse = await woocommerce.get('products', { per_page: 1 });

        if (!testResponse.data || testResponse.data.length === 0) {
            throw new Error('WooCommerce API test failed');
        }

        // Proceed with sync
        const products = await woocommerce.get('products', {
            per_page: 100,
            page: 1
        });

        // Process products with error handling
        for (const product of products.data) {
            try {
                await processProduct(orgId, product);
            } catch (error) {
                console.error(`Failed to process product ${product.id}:`, error.message);

                // Log individual product errors
                await logSyncError(orgId, 'product', product.id, error.message);

                // Continue with next product
                continue;
            }
        }

        return { success: true, processed: products.data.length };

    } catch (error) {
        console.error('Sync failed:', error.message);

        // Update sync status
        await updateSyncStatus(syncId, 'failed', error.message);

        // Implement retry logic
        if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
            await scheduleRetry(syncId, 5 * 60 * 1000); // Retry in 5 minutes
        }

        throw error;
    }
};
```

**Rate Limiting:**
```javascript
// Implement rate limiting for WooCommerce API
class WooCommerceRateLimiter {
    constructor(maxRequests = 100, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }

    async waitForCapacity() {
        const now = Date.now();

        // Remove old requests
        this.requests = this.requests.filter(time => time > now - this.windowMs);

        // Check if we can make a request
        if (this.requests.length >= this.maxRequests) {
            const waitTime = this.windowMs - (now - this.requests[0]);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return this.waitForCapacity(); // Recursive check
        }

        // Add current request
        this.requests.push(now);
    }

    async makeRequest(method, endpoint, data = {}) {
        await this.waitForCapacity();

        try {
            return await woocommerce[method](endpoint, data);
        } catch (error) {
            // Handle rate limit errors
            if (error.response?.status === 429) {
                const retryAfter = parseInt(error.response.headers['retry-after']) || 60;
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                return this.makeRequest(method, endpoint, data); // Retry
            }
            throw error;
        }
    }
}
```

**Prevention:**
- Implement robust error handling
- Add retry logic with backoff
- Monitor API rate limits
- Validate data before processing
- Implement circuit breaker pattern

---

## Escalation Procedures

### When to Escalate

#### Level 1 Escalation
**When:** Issues affecting single users or minor functionality
**Response Time:** 4 hours
**Examples:**
- Single user authentication issue
- Minor performance degradation
- Non-critical feature malfunction

**Escalation Path:**
1. On-call engineer
2. Team lead (if not resolved in 2 hours)
3. Engineering manager (if not resolved in 4 hours)

**Contact Information:**
- On-call Engineer: [Phone, Email]
- Team Lead: [Phone, Email]

#### Level 2 Escalation
**When:** Issues affecting multiple users or moderate functionality
**Response Time:** 2 hours
**Examples:**
- Multiple user authentication failures
- Performance degradation affecting users
- Critical API endpoint failure
- Data inconsistency issues

**Escalation Path:**
1. On-call engineer
2. Team lead
3. DevOps engineer
4. Engineering manager (if not resolved in 2 hours)
5. CTO (if not resolved in 4 hours)

**Contact Information:**
- DevOps Engineer: [Phone, Email]
- Engineering Manager: [Phone, Email]

#### Level 3 Escalation
**When:** Critical issues affecting business operations
**Response Time:** 30 minutes
**Examples:**
- Complete service outage
- Data breach or security compromise
- Regulatory reporting requirement
- High-profile customer impact

**Escalation Path:**
1. On-call engineer (immediate)
2. Team lead (immediate)
3. DevOps lead (within 15 minutes)
4. Security manager (if security-related)
5. CTO (within 30 minutes)
6. CEO (if business-critical)

**Contact Information:**
- DevOps Lead: [Phone, Email]
- Security Manager: [Phone, Email]
- CTO: [Phone, Email]

### Escalation Templates

#### Initial Escalation Email

```
Subject: [ESCALATION] [Level 1/2/3] - [Brief Description]

Priority: High/Urgent
Incident ID: [If applicable]

Summary:
[Brief description of the issue]

Current Status:
[What is currently known]
[Impact assessment]
[Affected systems/users]

Actions Taken:
[What has been done so far]
[What has/hasn't worked]

Requested Actions:
[What needs to be done]
[What resources are needed]

Next Update:
[When the next update will be provided]

Contact Information:
[Your contact details]
[Best time to reach you]
```

#### Status Update Template

```
Subject: [UPDATE] [Incident ID] - [Brief Status]

Time of Update: [Timestamp]

Current Status:
[Current state of the issue]

Progress Made:
[What has been accomplished since last update]

Next Steps:
[What will be done next]
[Expected timeline]

ETA for Resolution:
[If available, estimated time to resolution]

Impact Assessment:
[Any changes to impact assessment]

Contact:
[Updated contact information if needed]
```

#### Resolution Notification Template

```
Subject: [RESOLVED] [Incident ID] - [Brief Description]

Incident Resolved: [Timestamp]

Resolution Summary:
[How the issue was resolved]

Root Cause:
[Root cause of the issue]

Actions Taken:
[Summary of actions taken to resolve]

Preventive Measures:
[What will be done to prevent recurrence]

Next Steps:
[Any follow-up actions required]

Post-Incident Review:
[When and who will conduct the post-incident review]

Thank you,
[Your Name]
[Your Position]
```

### Escalation Contacts

#### Primary Contacts

**Engineering Team:**
- On-call Engineer: [Name, Phone, Email]
- Team Lead: [Name, Phone, Email]
- Engineering Manager: [Name, Phone, Email]
- CTO: [Name, Phone, Email]

**Operations Team:**
- DevOps Lead: [Name, Phone, Email]
- System Administrator: [Name, Phone, Email]
- Database Administrator: [Name, Phone, Email]

**Security Team:**
- Security Analyst: [Name, Phone, Email]
- Security Manager: [Name, Phone, Email]
- CISO: [Name, Phone, Email]

#### Secondary Contacts

**Management:**
- VP of Engineering: [Name, Phone, Email]
- VP of Operations: [Name, Phone, Email]
- CEO: [Name, Phone, Email]

**External:**
- Cloud Provider Support: [Phone, Email]
- Security Vendor: [Phone, Email]
- Legal Counsel: [Phone, Email]

### Escalation Decision Tree

```
Issue Detected
    ↓
Is it affecting users?
    ↓
    No → Monitor → Document → Close
    ↓
    Yes
    ↓
How many users affected?
    ↓
    1-2 users → Level 1 Escalation
    ↓
    3-10 users → Level 2 Escalation
    ↓
    10+ users OR critical functionality → Level 3 Escalation
    ↓
Is it a security issue?
    ↓
    Yes → Immediate Level 3 + Security Team
    ↓
    No
    ↓
Is it causing data loss/corruption?
    ↓
    Yes → Immediate Level 3
    ↓
    No
    ↓
Is it affecting revenue/generating complaints?
    ↓
    Yes → Level 2-3 based on severity
    ↓
    No → Level 1-2 based on user count
```

---

## Emergency Contacts

### Emergency Contact Information

#### Internal Emergency Contacts

**24/7 On-Call Schedule:**

**Engineering On-Call:**
- **Primary:** [Name] - [Phone] - [Email]
- **Secondary:** [Name] - [Phone] - [Email]
- **Escalation:** [Engineering Manager] - [Phone] - [Email]

**DevOps On-Call:**
- **Primary:** [Name] - [Phone] - [Email]
- **Secondary:** [Name] - [Phone] - [Email]
- **Escalation:** [DevOps Manager] - [Phone] - [Email]

**Security On-Call:**
- **Primary:** [Name] - [Phone] - [Email]
- **Secondary:** [Name] - [Phone] - [Email]
- **Escalation:** [Security Manager] - [Phone] - [Email]

**Management Escalation:**
- **CTO:** [Name] - [Phone] - [Email] (Available for Level 3 incidents)
- **CEO:** [Name] - [Phone] - [Email] (Available for business-critical incidents)

#### External Emergency Contacts

**Cloud Provider Support:**
- **AWS Support:** 1-800-AWS-SUPPORT (1-800-297-7878)
- **Azure Support:** 1-800-813-2944
- **Google Cloud Support:** 1-800-888-3248

**Security Vendors:**
- **SIEM Provider:** [Phone, Email]
- **Threat Intelligence:** [Phone, Email]
- **Incident Response:** [Phone, Email]

**Infrastructure Vendors:**
- **CDN Provider:** [Phone, Email]
- **DNS Provider:** [Phone, Email]
- **Load Balancer:** [Phone, Email]

**Legal and Compliance:**
- **Legal Counsel:** [Name, Phone, Email]
- **Data Protection Officer:** [Name, Phone, Email]
- **Compliance Officer:** [Name, Phone, Email]

### Emergency Procedures

#### After-Hours Incident Response

**Step 1: Initial Assessment (5 minutes)**
1. Assess the severity and impact
2. Determine if escalation is needed
3. Gather initial information

**Step 2: Notification (10 minutes)**
1. Notify on-call personnel
2. Send initial alert to escalation contacts
3. Document incident details

**Step 3: Response (15 minutes)**
1. Begin incident response procedures
2. Implement containment measures
3. Start investigation

**Step 4: Communication**
1. Provide status updates every 30 minutes
2. Escalate if situation worsens
3. Document all actions taken

#### Weekend and Holiday Procedures

**Weekend On-Call:**
- Same escalation procedures apply
- Response times may be extended
- Management approval may be required for major actions

**Holiday On-Call:**
- Critical incidents only
- Management approval required for any changes
- Document all actions thoroughly
- Provide detailed handoff to next shift

### Emergency Contact Cards

#### Physical Contact Cards

Each team member should carry a physical contact card with:

```
MantisNXT Emergency Contacts

CRITICAL INCIDENTS ONLY

Security Incident: [Phone]
Service Outage: [Phone]
Database Issues: [Phone]
Application Issues: [Phone]

After Hours: [Phone]

Escalation Path:
1. On-call Engineer
2. Team Lead
3. Engineering Manager
4. CTO
5. CEO

Important Notes:
- Always escalate to security team for suspected breaches
- Document all actions taken during incidents
- Preserve evidence for investigation
- Notify management for Level 2+ incidents
```

#### Digital Contact Information

**SMS/Text Alerts:**
- Primary contacts configured in alerting system
- Group messaging for coordination
- Backup contact methods

**Email Distribution Lists:**
- oncall-engineering@mantisnxt.com
- oncall-devops@mantisnxt.com
- security-incident-response@mantisnxt.com
- executive-alerts@mantisnxt.com

**Instant Messaging:**
- Slack: #incident-response
- Teams: Incident Response Channel
- Emergency group chats

### Emergency Contact Maintenance

#### Contact Information Updates

**Monthly Review:**
- Verify all contact information is current
- Test emergency notification systems
- Update on-call schedules
- Review escalation paths

**Quarterly Testing:**
- Test emergency notification system
- Verify contact reachability
- Test escalation procedures
- Update emergency procedures

**Annual Review:**
- Comprehensive contact verification
- Review and update escalation procedures
- Test emergency response capabilities
- Update emergency contact cards

#### Contact Information Sources

**Primary Source:** [Internal Contact Management System]
**Backup Source:** [HR System]
**Emergency Source:** [Physical Contact Cards]

**Update Procedures:**
1. Submit contact changes to HR
2. Update in contact management system
3. Notify team leads of changes
4. Update emergency contact cards
5. Test new contact information

### Emergency Communication Templates

#### Initial Incident Notification

```
[URGENT - EMERGENCY ALERT]

INCIDENT DETECTED

Time: [Timestamp]
Location: [System/Service affected]
Severity: [Level 1/2/3]
Reporter: [Your name]

DESCRIPTION:
[Brief description of the incident]

IMPACT:
[What is affected]
[How many users/systems]
[Any data security concerns]

ACTIONS TAKEN:
[What has been done so far]

NEXT STEPS:
[What needs to be done]
[What help is needed]

CONTACT:
[Your phone number]
[Best time to reach you]
```

#### Status Update Template

```
[INCIDENT STATUS UPDATE]

INCIDENT: [Brief description]
TIME: [Timestamp]
STATUS: [Current status]

PROGRESS:
[What has been accomplished]
[What is in progress]

NEXT UPDATE:
[When next update will be provided]

CONTACT:
[Updated contact information if needed]
```

#### Resolution Notification

```
[INCIDENT RESOLVED]

INCIDENT: [Brief description]
RESOLVED: [Timestamp]
DURATION: [Total incident duration]

RESOLUTION:
[How the incident was resolved]

ROOT CAUSE:
[Root cause of the incident]

FOLLOW-UP:
[Post-incident review scheduled]
[Additional actions needed]
```

---

**Runbook Version:** 1.0
**Last Updated:** December 3, 2025
**Next Review:** March 3, 2026
**Owner:** MantisNXT Operations Team

**For questions or updates to this runbook, contact:**
operations@mantisnxt.com