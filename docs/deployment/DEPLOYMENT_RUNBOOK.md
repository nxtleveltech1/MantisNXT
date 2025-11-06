# MantisNXT Deployment Runbook

## 🎯 Overview

This runbook provides comprehensive procedures for deploying MantisNXT to production, handling emergencies, and performing rollbacks.

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Process](#deployment-process)
3. [Post-Deployment Validation](#post-deployment-validation)
4. [Emergency Procedures](#emergency-procedures)
5. [Rollback Procedures](#rollback-procedures)
6. [Monitoring and Alerts](#monitoring-and-alerts)
7. [Incident Response](#incident-response)

---

## 🔍 Pre-Deployment Checklist

### Automated Checks

Run the automated pre-deployment checklist:

```bash
# For staging
npm run deploy:checklist -- --environment=staging

# For production (strict mode)
npm run deploy:checklist -- --environment=production --strict
```

### Manual Verification

- [ ] All tests passing in CI/CD
- [ ] Code review approved
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Database migrations reviewed
- [ ] Rollback plan prepared
- [ ] Stakeholders notified
- [ ] Maintenance window scheduled (if needed)

### Required Environment Variables

**Critical:**
- `DATABASE_URL` - Production database connection string
- `NEXTAUTH_SECRET` - Authentication secret (min 32 chars)
- `NEXTAUTH_URL` - Production URL
- `JWT_SECRET` - JWT signing key

**Optional but recommended:**
- `ANTHROPIC_API_KEY` - AI features
- `OPENAI_API_KEY` - AI features
- `SLACK_WEBHOOK_URL` - Notifications

---

## 🚀 Deployment Process

### Standard Deployment (Automated)

1. **Trigger Deployment**

   Push to main branch or use GitHub Actions:

   ```bash
   git checkout main
   git pull origin main
   git merge develop
   git push origin main
   ```

   Or manually trigger workflow:
   - Go to GitHub Actions
   - Select "Production Deployment Pipeline"
   - Click "Run workflow"
   - Select environment and options

2. **Monitor Deployment**

   Watch GitHub Actions for progress:
   - Pre-deployment validation
   - Test suite execution
   - Database backup
   - Database migrations
   - Application deployment
   - Post-deployment validation

3. **Deployment Stages**

   The automated pipeline executes these stages:

   **Stage 1: Pre-Deployment Validation** (2-3 min)
   - Check for breaking changes
   - Detect pending migrations
   - Validate configuration

   **Stage 2: Test Suite** (10-15 min)
   - Run linting
   - Type checking
   - Unit tests
   - Integration tests
   - E2E tests

   **Stage 3: Database Backup** (5-10 min)
   - Create compressed backup
   - Upload to artifact storage
   - Upload to S3 (if configured)

   **Stage 4: Database Migration** (5-30 min)
   - Pre-migration validation
   - Execute migrations
   - Verify migration success
   - Automatic rollback on failure

   **Stage 5: Application Deployment** (3-5 min)
   - Build application
   - Deploy to Vercel
   - Update deployment status

   **Stage 6: Post-Deployment Validation** (2-5 min)
   - Health checks
   - Smoke tests
   - Schema validation
   - Log analysis

   **Stage 7: Notifications** (< 1 min)
   - Slack notifications
   - GitHub deployment status
   - Summary report

### Manual Deployment

For emergency deployments or when CI/CD is unavailable:

```bash
# 1. Run pre-deployment checklist
npm run deploy:checklist -- --environment=production --strict

# 2. Create database backup
npm run db:backup:production

# 3. Run migrations
npm run db:migrate:production

# 4. Deploy application
vercel --prod

# 5. Verify deployment
npm run deploy:verify
```

---

## ✅ Post-Deployment Validation

### Automated Health Checks

The pipeline automatically performs:
- API endpoint health checks
- Database connectivity verification
- Schema validation
- Error log analysis

### Manual Verification

```bash
# Check application health
curl https://your-domain.com/api/health

# Check database health
curl https://your-domain.com/api/health/database

# Check authentication
curl https://your-domain.com/api/auth/health

# Run smoke tests
npm run test:smoke -- --url=https://your-domain.com
```

### What to Monitor (First 30 Minutes)

1. **Application Metrics**
   - Response times
   - Error rates
   - Request volumes

2. **Database Metrics**
   - Connection pool usage
   - Query performance
   - Lock contention

3. **User Experience**
   - Login success rate
   - Page load times
   - API response times

4. **Error Logs**
   - Application errors
   - Database errors
   - Authentication failures

---

## 🚨 Emergency Procedures

### Severity Levels

**SEV1 - Critical (Immediate Action)**
- Complete service outage
- Data loss or corruption
- Security breach
- Authentication system down

**SEV2 - High (Action within 1 hour)**
- Partial service degradation
- High error rates (>5%)
- Performance degradation (>2x normal)
- Non-critical feature broken

**SEV3 - Medium (Action within 4 hours)**
- Minor feature issues
- Elevated error rates (1-5%)
- Performance slowdown (<2x normal)

**SEV4 - Low (Action within 24 hours)**
- Cosmetic issues
- Documentation errors
- Minor UX problems

### Emergency Contact Protocol

1. **Assess Severity** - Use severity levels above
2. **Initiate Response** - Follow procedures below
3. **Communicate** - Notify stakeholders immediately
4. **Execute** - Follow emergency procedures
5. **Document** - Record all actions taken

### SEV1: Complete Outage

**Immediate Actions:**

```bash
# 1. Check system status
npm run deploy:status

# 2. Check recent deployments
vercel ls

# 3. Check database connectivity
npm run db:health

# 4. Review error logs
vercel logs --limit=100
```

**If caused by recent deployment:**

```bash
# Emergency rollback (database + application)
npm run deploy:rollback -- --latest --reason="SEV1: Complete outage" --yes
```

**If database issue:**

```bash
# Check database status
npm run db:status

# Restore from backup if needed
npm run deploy:rollback -- --db-only --latest --yes
```

### SEV2: High Error Rates

**Investigation:**

```bash
# Check error rates
npm run monitoring:errors -- --last=30m

# Check recent changes
git log --oneline -10

# Check database health
npm run db:health

# Check API response times
npm run monitoring:performance -- --last=30m
```

**If error rate > 10%:**

Consider immediate rollback:

```bash
npm run deploy:rollback -- --latest --reason="SEV2: High error rate"
```

### SEV3: Performance Degradation

**Investigation:**

```bash
# Check database query performance
npm run db:slow-queries

# Check connection pool
npm run db:connections

# Check application metrics
npm run monitoring:metrics
```

**Mitigation:**

- Enable aggressive caching
- Scale database connections
- Add read replicas (if available)
- Schedule rollback during next maintenance window

---

## 🔄 Rollback Procedures

### When to Rollback

**Immediate Rollback Required:**
- Critical bugs affecting core functionality
- Data corruption or loss
- Security vulnerabilities
- Error rate > 10%
- Complete service outage

**Consider Rollback:**
- Performance degradation > 2x
- Error rate 5-10%
- Multiple user-reported issues
- Failed post-deployment validation

**Monitor Instead of Rollback:**
- Error rate < 5%
- Minor feature issues
- Cosmetic problems
- Performance degradation < 2x

### Rollback Types

#### 1. Full Rollback (Database + Application)

```bash
# Using latest backup
npm run deploy:rollback -- --latest --reason="Description of issue"

# Using specific backup
npm run deploy:rollback -- --backup-id=backup_20250104_120000 --reason="Description"
```

**When to use:**
- Database migration caused issues
- Schema changes broke application
- Data integrity compromised

**Impact:**
- ⚠️ All data since backup will be lost
- Application reverted to previous version
- All migrations after backup undone

#### 2. Application-Only Rollback

```bash
npm run deploy:rollback -- --app-only --reason="Application bug"
```

**When to use:**
- Application bug (no DB changes)
- Frontend issues
- API endpoint problems
- Performance issues

**Impact:**
- Database unchanged (safe)
- Application reverted to previous version
- Recent data preserved

#### 3. Database-Only Rollback

```bash
npm run deploy:rollback -- --db-only --backup-id=<id> --reason="Database issue"
```

**When to use:**
- Database migration failed
- Data corruption
- Schema issues

**Impact:**
- ⚠️ All data since backup will be lost
- Application version unchanged
- May cause application errors if schema incompatible

### Rollback Verification

After rollback, verify:

```bash
# Check application health
curl https://your-domain.com/api/health

# Check database health
npm run db:health

# Run smoke tests
npm run test:smoke -- --url=https://your-domain.com

# Monitor error rates
npm run monitoring:errors -- --last=10m
```

### Post-Rollback Actions

1. **Notify Stakeholders**
   - Deployment team
   - Product team
   - Customer support
   - End users (if appropriate)

2. **Create Incident Report**
   - What went wrong
   - When it was detected
   - Actions taken
   - Current status
   - Timeline for fix

3. **Root Cause Analysis**
   - Identify cause
   - Determine how to prevent
   - Update deployment process
   - Add tests if needed

4. **Plan Forward Fix**
   - Create fix branch
   - Add regression tests
   - Review thoroughly
   - Deploy during maintenance window

---

## 📊 Monitoring and Alerts

### Key Metrics to Monitor

**Application:**
- Response time (p50, p95, p99)
- Error rate
- Request volume
- Active sessions

**Database:**
- Connection pool usage
- Query performance
- Lock contention
- Replication lag

**Infrastructure:**
- CPU usage
- Memory usage
- Disk I/O
- Network traffic

### Alert Thresholds

**Critical Alerts:**
- Error rate > 10%
- Response time p95 > 5s
- Database connections > 90%
- Disk usage > 85%

**Warning Alerts:**
- Error rate > 5%
- Response time p95 > 2s
- Database connections > 75%
- Disk usage > 75%

### Monitoring Tools

- **Vercel Analytics** - Application performance
- **Neon Console** - Database metrics
- **Sentry** - Error tracking (if configured)
- **GitHub Actions** - Deployment status

---

## 🎯 Incident Response

### Incident Response Process

1. **Detection** (0-5 min)
   - Automated alerts
   - User reports
   - Monitoring dashboards

2. **Assessment** (5-10 min)
   - Determine severity
   - Check scope of impact
   - Review recent changes

3. **Communication** (10-15 min)
   - Notify stakeholders
   - Update status page
   - Create incident channel

4. **Mitigation** (15-60 min)
   - Execute rollback if needed
   - Apply hotfix
   - Scale resources

5. **Resolution** (varies)
   - Verify fix deployed
   - Confirm metrics normal
   - Update stakeholders

6. **Post-Mortem** (within 48 hours)
   - Document timeline
   - Root cause analysis
   - Action items
   - Process improvements

### Incident Communication Template

```
🚨 INCIDENT REPORT

Severity: [SEV1/SEV2/SEV3/SEV4]
Status: [Investigating/Identified/Mitigating/Resolved]
Started: [timestamp]
Impact: [description of user impact]

Current Status:
[what's happening now]

Actions Taken:
- [list of actions]

Next Steps:
- [planned actions]

ETA: [estimated resolution time]

Updated: [timestamp]
```

---

## 📝 Deployment Logs

All deployments are logged to:

- **GitHub Actions** - Deployment pipeline logs
- **Vercel** - Deployment and runtime logs
- **Local Logs** - `logs/rollback_*.json` for rollback operations
- **Database Backups** - `database/backups/*.meta.json` for backup metadata

---

## 🆘 Support Contacts

**Escalation Path:**

1. **Level 1:** Development Team Lead
2. **Level 2:** CTO / Technical Director
3. **Level 3:** External Support (Vercel, Neon)

**External Support:**

- **Vercel Support:** support@vercel.com
- **Neon Support:** support@neon.tech
- **GitHub Support:** support@github.com

---

## 📚 Additional Resources

- [Database Migration Guide](./DATABASE_MIGRATIONS.md)
- [Security Incident Response](./SECURITY_INCIDENT_RESPONSE.md)
- [Performance Optimization](./PERFORMANCE_OPTIMIZATION.md)
- [Disaster Recovery](./DISASTER_RECOVERY.md)

---

## ✅ Quick Reference

### Common Commands

```bash
# Pre-deployment
npm run deploy:checklist -- --environment=production --strict

# Deployment
git push origin main  # Automatic deployment

# Emergency rollback
npm run deploy:rollback -- --latest --reason="Emergency"

# Health checks
curl https://your-domain.com/api/health
npm run db:health

# Monitoring
vercel logs --limit=100
npm run monitoring:errors -- --last=30m
```

### Decision Tree

```
Is there an issue? → NO → Monitor normally
                  ↓ YES

What's the severity? → SEV4 → Schedule fix
                     → SEV3 → Investigate, plan fix
                     → SEV2 → Investigate, consider rollback
                     → SEV1 → IMMEDIATE ROLLBACK

After rollback → Verify health → Notify stakeholders → Plan fix → Deploy fix
```

---

**Last Updated:** 2025-01-04
**Version:** 1.0
**Maintained By:** AS Team
