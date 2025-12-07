# WooCommerce Integration Deployment Guide
## Enterprise-Grade Security Implementation

**Version:** 1.0
**Last Updated:** December 2025
**Author:** MantisNXT Security Team

---

## Table of Contents

1. [Overview](#overview)
2. [Security Architecture](#security-architecture)
3. [Prerequisites](#prerequisites)
4. [Installation and Configuration](#installation-and-configuration)
5. [Security Validation Checklist](#security-validation-checklist)
6. [Operational Runbook](#operational-runbook)
7. [Emergency Response Procedures](#emergency-response-procedures)
8. [Security Compliance Documentation](#security-compliance-documentation)
9. [Troubleshooting](#troubleshooting)
10. [Appendix](#appendix)

---

## Overview

This guide provides comprehensive instructions for deploying and maintaining the secure WooCommerce integration for MantisNXT. The integration has been completely overhauled with enterprise-grade security measures including:

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Credential Security**: AES-256-GCM encrypted storage with automatic rotation
- **Input Validation**: Comprehensive input sanitization and validation
- **Database Security**: Tenant isolation, prepared statements, audit logging
- **Rate Limiting**: Per-organization rate limiting with circuit breaker patterns
- **CSRF Protection**: Cross-site request forgery protection
- **Monitoring & Logging**: Comprehensive audit trails and security monitoring

---

## Security Architecture

### 1. Multi-Layer Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  CSRF Protection│  │ Input Validation │  │ Rate Limiting│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Auth Middleware │  │ Secure Routing  │  │ Audit Logging│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Tenant Isolation│  │ Encrypted Storage│  │ Query Logging│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2. Security Components

#### Authentication & Authorization
- **JWT Token Validation**: Secure token-based authentication
- **Role-Based Access Control**: Admin, User, and Read-only permissions
- **Organization Isolation**: Multi-tenant support with org_id validation
- **Session Management**: Secure session handling with expiration

#### Credential Management
- **Encrypted Storage**: AES-256-GCM encryption for all credentials
- **Automatic Rotation**: Scheduled credential rotation with zero downtime
- **Access Control**: Strict access controls with audit logging
- **Secure Retrieval**: On-demand decryption with minimal exposure

#### Input Security
- **XSS Prevention**: Comprehensive input sanitization
- **SQL Injection Protection**: Prepared statements with parameter validation
- **Format Validation**: UUID, email, URL, and format validation
- **Length Restrictions**: Input length limits to prevent buffer overflows

---

## Prerequisites

### System Requirements

#### Minimum Hardware Requirements
- **CPU**: 2 cores (4 recommended)
- **RAM**: 4GB (8GB recommended)
- **Storage**: 50GB SSD (100GB recommended)
- **Network**: 100 Mbps bandwidth

#### Software Requirements
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v13.0 or higher
- **Next.js**: v14.0 or higher
- **WooCommerce**: v6.0 or higher
- **WordPress**: v6.0 or higher

#### Security Requirements
- **TLS/SSL**: Certificate for HTTPS communication
- **Firewall**: Configured for minimal attack surface
- **VPN**: Recommended for internal network access
- **Monitoring**: Security Information and Event Management (SIEM)

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Database Configuration
ENTERPRISE_DATABASE_URL=postgresql://user:password@host:port/database
DB_SSL=true

# Authentication
AUTH_SECRET=your-super-secret-jwt-key-min-32-chars
CSRF_SECRET=your-csrf-secret-key

# Security Settings
NODE_ENV=production
ENABLE_AUDIT_LOGGING=true
STRICT_TENANT_ISOLATION=true

# Rate Limiting
ENTERPRISE_DB_POOL_MAX=10
RATE_LIMIT_REQUESTS=60
RATE_LIMIT_WINDOW=60000

# WooCommerce API
WOO_COMMERCE_TIMEOUT=30000
WOO_COMMERCE_RETRIES=3

# Monitoring
ENABLE_QUERY_LOGGING=true
SLOW_QUERY_THRESHOLD_MS=5000
LOG_RETENTION_DAYS=90
```

### Dependencies

Install required packages:

```bash
npm install @anthropic-ai/claude-agent-sdk
npm install pg
npm install crypto
npm install zod
npm install express-rate-limit
```

---

## Installation and Configuration

### Step 1: Database Setup

#### 1.1 Create Database Schema

```sql
-- Create security audit log table
CREATE TABLE security_audit_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    org_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    details JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_security_audit_log_org_id ON security_audit_log(org_id);
CREATE INDEX idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX idx_security_audit_log_event_type ON security_audit_log(event_type);
CREATE INDEX idx_security_audit_log_created_at ON security_audit_log(created_at);

-- Create woocommerce credentials table with encryption
CREATE TABLE woocommerce_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    connector_id VARCHAR(100) NOT NULL,
    encrypted_consumer_key TEXT NOT NULL,
    encrypted_consumer_secret TEXT NOT NULL,
    key_iv TEXT NOT NULL,
    secret_iv TEXT NOT NULL,
    key_auth_tag TEXT NOT NULL,
    secret_auth_tag TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    last_accessed TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    UNIQUE(org_id, connector_id)
);

-- Create woocommerce credential audit log
CREATE TABLE woocommerce_credential_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    connector_id VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    details JSONB
);

-- Create indexes
CREATE INDEX idx_woocommerce_credentials_org_id ON woocommerce_credentials(org_id);
CREATE INDEX idx_woocommerce_credentials_connector_id ON woocommerce_credentials(connector_id);
CREATE INDEX idx_woocommerce_audit_log_org_id ON woocommerce_credential_audit_log(org_id);
```

#### 1.2 Configure Row Level Security (RLS)

```sql
-- Enable RLS on security tables
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE woocommerce_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE woocommerce_credential_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant isolation
CREATE POLICY "org_isolation_policy" ON woocommerce_credentials
    FOR ALL TO application_role
    USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY "audit_read_policy" ON security_audit_log
    FOR SELECT TO application_role
    USING (org_id = current_setting('app.current_org_id')::UUID OR current_user = 'postgres');
```

### Step 2: Application Configuration

#### 2.1 Configure Authentication Middleware

Create `src/lib/auth/middleware.ts`:

```typescript
import { NextRequest } from 'next/server';
import { createErrorResponse } from '@/lib/utils/neon-error-handler';

export class AuthError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function authenticateRequest(request: NextRequest): Promise<{
  userId: string;
  organizationId: string;
  role: string;
}> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header', 401, 'MISSING_AUTH');
  }

  const token = authHeader.substring(7);

  // Validate JWT token (implement with your JWT library)
  const decoded = validateJWT(token);

  if (!decoded || !decoded.org_id || !decoded.user_id) {
    throw new AuthError('Invalid token', 401, 'INVALID_TOKEN');
  }

  return {
    userId: decoded.user_id,
    organizationId: decoded.org_id,
    role: decoded.role || 'user'
  };
}

export async function authorizeUser(
  authUser: { userId: string; organizationId: string; role: string },
  permission: string
): Promise<void> {
  // Check user permissions (implement based on your permission system)
  const hasPermission = await checkPermission(authUser.userId, permission);

  if (!hasPermission) {
    throw new AuthError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
  }
}

// Helper functions (implement based on your authentication system)
function validateJWT(token: string): any {
  // Implement JWT validation
  // Return decoded payload or null
}

async function checkPermission(userId: string, permission: string): Promise<boolean> {
  // Implement permission checking
  // Return true if user has permission
}
```

#### 2.2 Configure Secure Database Connection

Create `lib/database/secure-connection.ts`:

```typescript
import { Pool, PoolClient } from 'pg';
import { SecureQueryBuilder } from '@/lib/database/secure-db';

export class SecureDatabaseManager {
  private pool: Pool;
  private static instance: SecureDatabaseManager;

  private constructor() {
    this.pool = new Pool({
      connectionString: process.env.ENTERPRISE_DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.ENTERPRISE_DB_POOL_MAX || '10'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 120000,
    });
  }

  public static getInstance(): SecureDatabaseManager {
    if (!SecureDatabaseManager.instance) {
      SecureDatabaseManager.instance = new SecureDatabaseManager();
    }
    return SecureDatabaseManager.instance;
  }

  public async getClient(orgId: string, userId?: string, ipAddress?: string): Promise<SecureQueryBuilder> {
    const client = await this.pool.connect();
    return new SecureQueryBuilder(client, orgId, userId, ipAddress);
  }

  public async query<T>(
    text: string,
    params: any[] = [],
    orgId?: string,
    userId?: string,
    ipAddress?: string
  ): Promise<any> {
    const client = await this.pool.connect();
    try {
      const builder = new SecureQueryBuilder(client, orgId, userId, ipAddress);
      return await builder.executeRawQuery<T>(text, params);
    } finally {
      client.release();
    }
  }

  public async end(): Promise<void> {
    await this.pool.end();
  }
}
```

### Step 3: API Endpoint Configuration

#### 3.1 Configure WooCommerce API Routes

The following secure API endpoints are provided:

1. **Configuration Management**: `/api/v1/integrations/woocommerce`
   - POST: Create new integration
   - PUT: Update existing integration
   - GET: Retrieve integration details

2. **Credential Management**: `/api/v1/integrations/woocommerce/credentials`
   - POST: Store credentials securely
   - GET: Retrieve credential status
   - DELETE: Remove credentials

3. **Customer Sync**: `/api/v1/integrations/woocommerce/sync/customers`
   - POST: Start customer synchronization
   - Supports queue-based processing
   - Real-time progress tracking

4. **Bulk Sync**: `/api/v1/integrations/woocommerce/bulk-sync`
   - POST: Bulk sync all data (products, orders, customers)
   - Asynchronous processing

#### 3.2 Configure Middleware Stack

Create `src/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { CSRFProtection } from '@/lib/utils/secure-storage';

export async function middleware(request: NextRequest) {
  // CSRF Protection
  const csrfToken = request.headers.get('x-csrf-token');
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    if (!csrfToken || !(await CSRFProtection.validateToken(csrfToken))) {
      return NextResponse.json(
        { success: false, error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }
  }

  // Rate limiting (implement with express-rate-limit or similar)
  // Input validation
  // Security headers

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/v1/integrations/woocommerce/:path*'],
};
```

### Step 4: Frontend Configuration

#### 4.1 Configure Authentication Hooks

Create `src/hooks/useSecureAuth.ts`:

```typescript
import { useState, useEffect } from 'react';

interface AuthContext {
  isAuthenticated: boolean;
  isAdmin: boolean;
  orgId: string | null;
  isLoading: boolean;
}

export function useSecureAuth(): AuthContext {
  const [auth, setAuth] = useState<AuthContext>({
    isAuthenticated: false,
    isAdmin: false,
    orgId: null,
    isLoading: true,
  });

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();

        if (data.authenticated) {
          setAuth({
            isAuthenticated: true,
            isAdmin: data.role === 'admin',
            orgId: data.orgId,
            isLoading: false,
          });
        } else {
          setAuth({ ...auth, isLoading: false });
        }
      } catch (error) {
        setAuth({ ...auth, isLoading: false });
      }
    };

    checkAuth();
  }, []);

  return auth;
}
```

#### 4.2 Configure Security Utilities

Ensure CSRF tokens are included in all API requests:

```typescript
// src/lib/utils/api.ts
export async function secureFetch(url: string, options: RequestInit = {}) {
  const csrfToken = await CSRFProtection.getToken();

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      ...options.headers,
    },
  });
}
```

---

## Security Validation Checklist

### Pre-Deployment Checklist

#### ✅ Authentication & Authorization
- [ ] JWT tokens are properly validated
- [ ] Role-based access control is enforced
- [ ] Session timeouts are configured
- [ ] Password policies are enforced
- [ ] Multi-factor authentication is enabled (if applicable)

#### ✅ Credential Security
- [ ] AES-256-GCM encryption is implemented
- [ ] Credentials are never logged or exposed
- [ ] Automatic credential rotation is configured
- [ ] Access to credentials is logged and monitored
- [ ] Encryption keys are stored securely

#### ✅ Input Validation
- [ ] All inputs are sanitized
- [ ] XSS protection is implemented
- [ ] SQL injection protection is active
- [ ] UUID format validation is enforced
- [ ] URL validation prevents SSRF attacks

#### ✅ Database Security
- [ ] Row Level Security (RLS) is enabled
- [ ] Prepared statements are used
- [ ] Tenant isolation is enforced
- [ ] Audit logging is enabled
- [ ] Database connections use SSL

#### ✅ API Security
- [ ] CSRF protection is implemented
- [ ] Rate limiting is configured
- [ ] API versioning is implemented
- [ ] Error messages don't leak sensitive information
- [ ] Request/response logging is secure

#### ✅ Network Security
- [ ] HTTPS is enforced
- [ ] TLS certificates are valid
- [ ] Firewall rules are configured
- [ ] VPN access is configured (if needed)
- [ ] Network segmentation is implemented

#### ✅ Monitoring & Logging
- [ ] Security events are logged
- [ ] Log retention is configured
- [ ] Monitoring alerts are set up
- [ ] SIEM integration is configured
- [ ] Log integrity is protected

### Deployment Validation

#### Environment Verification
- [ ] Production environment is isolated
- [ ] Staging environment mirrors production
- [ ] Database credentials are environment-specific
- [ ] API keys are production-ready
- [ ] SSL certificates are installed

#### Performance Testing
- [ ] Load testing is completed
- [ ] Stress testing is completed
- [ ] Rate limiting thresholds are tested
- [ ] Database connection pooling is optimized
- [ ] Caching is configured

#### Security Testing
- [ ] Penetration testing is completed
- [ ] Vulnerability scanning is completed
- [ ] OWASP Top 10 vulnerabilities are addressed
- [ ] Security configuration is validated
- [ ] Incident response procedures are tested

### Post-Deployment Checklist

#### Monitoring Setup
- [ ] Health checks are configured
- [ ] Performance metrics are collected
- [ ] Security alerts are active
- [ ] Log aggregation is working
- [ ] Backup processes are verified

#### Documentation
- [ ] Runbooks are created
- [ ] Emergency procedures are documented
- [ ] Contact information is updated
- [ ] Training materials are prepared
- [ ] Compliance documentation is complete

---

## Operational Runbook

### Daily Operations

#### 1. Health Monitoring

**Checklist:**
- [ ] Application health check
- [ ] Database connectivity
- [ ] API response times
- [ ] Error rates
- [ ] Security alerts

**Commands:**
```bash
# Check application health
curl -f https://your-domain.com/api/health

# Check database connectivity
curl -f https://your-domain.com/api/health/database

# Check integration status
curl -f https://your-domain.com/api/v1/integrations/woocommerce
```

#### 2. Log Review

**Security Logs to Monitor:**
- Authentication failures
- Unauthorized access attempts
- Suspicious API requests
- Database access patterns
- Credential access logs

**Log Analysis Commands:**
```sql
-- Check recent security events
SELECT event_type, severity, COUNT(*)
FROM security_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type, severity
ORDER BY COUNT(*) DESC;

-- Check credential access patterns
SELECT action, COUNT(*)
FROM woocommerce_credential_audit_log
WHERE accessed_at > NOW() - INTERVAL '24 hours'
GROUP BY action;
```

#### 3. Performance Monitoring

**Metrics to Track:**
- API response times
- Database query performance
- Memory usage
- CPU utilization
- Network traffic

**Performance Review:**
```bash
# Monitor API performance
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/api/v1/integrations/woocommerce

# Check database performance
SELECT query, mean_time, calls
FROM pg_stat_statements
WHERE query LIKE '%woocommerce%'
ORDER BY mean_time DESC
LIMIT 10;
```

### Weekly Operations

#### 1. Security Review

**Tasks:**
- Review security audit logs
- Check for unusual patterns
- Validate access controls
- Update threat intelligence
- Review user permissions

**Security Review Script:**
```bash
#!/bin/bash
# security-review.sh

echo "=== Security Audit Log Review ==="
psql "$DATABASE_URL" << 'EOF'
SELECT event_type, severity, COUNT(*)
FROM security_audit_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type, severity
ORDER BY COUNT(*) DESC;
EOF

echo "=== Credential Access Review ==="
psql "$DATABASE_URL" << 'EOF'
SELECT org_id, action, COUNT(*)
FROM woocommerce_credential_audit_log
WHERE accessed_at > NOW() - INTERVAL '7 days'
GROUP BY org_id, action
ORDER BY COUNT(*) DESC;
EOF
```

#### 2. Performance Analysis

**Tasks:**
- Analyze slow queries
- Review API performance trends
- Check resource utilization
- Optimize database indexes
- Update performance baselines

#### 3. Backup Verification

**Tasks:**
- Verify backup integrity
- Test restore procedures
- Check backup retention
- Validate backup encryption
- Document backup status

### Monthly Operations

#### 1. Security Assessment

**Tasks:**
- Vulnerability scanning
- Penetration testing (if applicable)
- Security configuration review
- Access control audit
- Compliance verification

#### 2. Performance Tuning

**Tasks:**
- Database optimization
- Application tuning
- Infrastructure scaling review
- Cost optimization
- Capacity planning

#### 3. Documentation Update

**Tasks:**
- Update runbooks
- Document incidents
- Update procedures
- Review training materials
- Update contact information

### Incident Response Procedures

#### Level 1: Minor Security Event

**Examples:**
- Single failed authentication attempt
- Minor performance degradation
- Non-critical system error

**Response Time:** 4 hours

**Actions:**
1. Log the incident
2. Investigate the root cause
3. Apply temporary fixes if needed
4. Monitor for recurrence
5. Document the incident

#### Level 2: Moderate Security Event

**Examples:**
- Multiple failed authentication attempts
- Suspicious API activity
- Performance degradation affecting users

**Response Time:** 2 hours

**Actions:**
1. Activate incident response team
2. Implement containment measures
3. Conduct detailed investigation
4. Apply fixes and patches
5. Monitor for resolution
6. Document and report

#### Level 3: Critical Security Event

**Examples:**
- Data breach detected
- System compromise
- Service outage
- Malicious insider activity

**Response Time:** 30 minutes

**Actions:**
1. Immediate escalation to security team
2. Activate emergency response procedures
3. Implement emergency containment
4. Preserve evidence
5. Notify stakeholders
6. Coordinate with law enforcement (if needed)
7. Document and report

---

## Emergency Response Procedures

### Emergency Contact Information

#### Internal Contacts
- **Security Team Lead**: [Name, Phone, Email]
- **DevOps Lead**: [Name, Phone, Email]
- **Database Administrator**: [Name, Phone, Email]
- **System Administrator**: [Name, Phone, Email]

#### External Contacts
- **Cloud Provider Support**: [Phone, Email]
- **Security Vendor**: [Phone, Email]
- **Legal Counsel**: [Phone, Email]
- **PR/Communications**: [Phone, Email]

### Emergency Scenarios

#### Scenario 1: Data Breach

**Immediate Actions:**
1. **Isolate Affected Systems**
   ```bash
   # Disconnect compromised systems
   sudo iptables -A INPUT -s <malicious-ip> -j DROP

   # Isolate database if needed
   sudo -u postgres psql -c "ALTER SYSTEM SET listen_addresses = '';"
   sudo systemctl reload postgresql
   ```

2. **Preserve Evidence**
   ```bash
   # Create system snapshots
   sudo dd if=/dev/sda of=/backup/system-snapshot.img

   # Export logs
   sudo journalctl -b > /backup/system-logs.txt
   ```

3. **Notify Stakeholders**
   - Legal team
   - Management
   - Affected customers (if required)
   - Regulatory bodies (if required)

**Investigation Steps:**
1. Analyze security logs
2. Identify breach scope
3. Determine data affected
4. Assess impact
5. Document findings

**Recovery Steps:**
1. Patch vulnerabilities
2. Reset all credentials
3. Restore from clean backups
4. Implement additional security measures
5. Conduct post-incident review

#### Scenario 2: Service Outage

**Immediate Actions:**
1. **Assess Impact**
   ```bash
   # Check service status
   curl -I https://your-domain.com

   # Check application logs
   tail -f /var/log/application.log

   # Check database status
   sudo systemctl status postgresql
   ```

2. **Implement Workarounds**
   ```bash
   # Restart services
   sudo systemctl restart nginx
   sudo systemctl restart application

   # Scale resources if needed
   # (Cloud-specific commands)
   ```

3. **Communicate Status**
   - Update status page
   - Notify users
   - Provide estimated resolution time

**Recovery Steps:**
1. Identify root cause
2. Apply permanent fixes
3. Test resolution
4. Monitor for stability
5. Document incident

#### Scenario 3: Malicious Insider

**Immediate Actions:**
1. **Revoke Access**
   ```sql
   -- Disable user accounts
   UPDATE users SET is_active = false WHERE id = <user_id>;

   -- Revoke API keys
   DELETE FROM api_keys WHERE user_id = <user_id>;

   -- Invalidate sessions
   DELETE FROM sessions WHERE user_id = <user_id>;
   ```

2. **Secure Systems**
   ```bash
   # Change all administrative passwords
   # Update SSH keys
   # Review access logs
   # Implement additional monitoring
   ```

3. **Investigate**
   - Review access logs
   - Analyze system changes
   - Document suspicious activity
   - Preserve evidence

**Legal Actions:**
1. Contact legal counsel
2. Notify law enforcement
3. Preserve evidence for prosecution
4. Document damages
5. Implement preventive measures

### Emergency Recovery Procedures

#### Database Recovery

**From Backup:**
```bash
# Restore from latest backup
pg_restore -h localhost -U username -d database_name /path/to/backup.dump

# Verify data integrity
SELECT COUNT(*) FROM woocommerce_credentials;
SELECT COUNT(*) FROM security_audit_log;
```

**Point-in-Time Recovery:**
```bash
# Restore to specific timestamp
pg_ctl -D /var/lib/postgresql/data -l logfile restart
pg_restore --to-time="2025-12-03 10:00:00" /path/to/backup.dump
```

#### Application Recovery

**Clean Installation:**
```bash
# Stop services
sudo systemctl stop nginx
sudo systemctl stop application

# Clean installation
rm -rf /app/node_modules
npm install --production

# Restore configuration
cp /backup/.env /app/.env

# Start services
sudo systemctl start application
sudo systemctl start nginx
```

**Rollback to Previous Version:**
```bash
# Deploy previous version
git checkout <previous-commit>
npm install
npm run build
npm start
```

### Communication Templates

#### Incident Notification Template

```
Subject: [URGENT] Security Incident Notification - [Incident ID]

Dear [Recipient],

We have detected a potential security incident affecting our systems.

**Incident Details:**
- Incident ID: [ID]
- Detection Time: [Time]
- Incident Type: [Type]
- Affected Systems: [Systems]

**Immediate Actions Taken:**
1. [Action 1]
2. [Action 2]
3. [Action 3]

**Next Steps:**
- Investigation in progress
- Regular updates will be provided
- Contact [Emergency Contact] for questions

**Status:** [Investigating/Monitoring/Resolved]

Best regards,
[Security Team]
```

#### Customer Notification Template

```
Subject: Important Notice: Service Update

Dear [Customer],

We are writing to inform you of an issue affecting our services.

**Current Status:**
[Description of the issue and impact]

**What We're Doing:**
[Actions being taken to resolve the issue]

**Expected Resolution:**
[Timeline if available]

**What You Should Do:**
[Any actions customers need to take]

We apologize for any inconvenience and appreciate your patience.

Sincerely,
[Customer Support Team]
```

---

## Security Compliance Documentation

### Compliance Frameworks

#### SOC 2 Type II Compliance

**Security Principles Addressed:**

1. **Security**
   - Access controls implemented
   - Authentication and authorization enforced
   - Monitoring and logging active

2. **Availability**
   - System monitoring in place
   - Backup and recovery procedures
   - Incident response capabilities

3. **Confidentiality**
   - Data encryption at rest and in transit
   - Access restrictions enforced
   - Secure disposal procedures

**SOC 2 Controls Implemented:**
- CC6.1: Logical and physical access controls
- CC6.2: Identity management
- CC6.3: Authentication
- CC6.6: Network security
- CC7.1: System monitoring
- CC7.2: Response and resolution

#### GDPR Compliance

**Data Protection Measures:**
- Data minimization implemented
- Purpose limitation enforced
- Storage limitation applied
- Encryption and pseudonymization used
- Rights management procedures

**GDPR Articles Addressed:**
- Article 5: Principles of data processing
- Article 6: Lawfulness of processing
- Article 25: Data protection by design and by default
- Article 32: Security of processing
- Article 33: Notification of data breaches

#### PCI DSS Compliance (if applicable)

**Requirements Addressed:**
- Requirement 1: Install and maintain firewall
- Requirement 2: Don't use vendor defaults
- Requirement 3: Protect stored data
- Requirement 4: Encrypt transmission
- Requirement 6: Secure systems and software
- Requirement 8: Identify and authenticate access
- Requirement 10: Track and monitor access
- Requirement 11: Test security systems
- Requirement 12: Maintain information security policy

### Security Policies

#### Access Control Policy

**Purpose:**
To ensure that access to systems and data is granted based on business need and security requirements.

**Scope:**
All users, systems, and data within the MantisNXT platform.

**Principles:**
1. **Least Privilege**: Users receive minimum access necessary
2. **Need to Know**: Access granted based on job requirements
3. **Separation of Duties**: Critical functions separated
4. **Regular Review**: Access reviewed quarterly

**Implementation:**
- Role-based access control (RBAC)
- Multi-factor authentication (MFA)
- Regular access reviews
- Automated provisioning/deprovisioning
- Audit logging of access changes

#### Data Protection Policy

**Purpose:**
To protect sensitive data throughout its lifecycle.

**Data Classification:**
1. **Public**: Information safe for public release
2. **Internal**: Information for internal use only
3. **Confidential**: Sensitive business information
4. **Restricted**: Highly sensitive information

**Protection Measures:**
- Encryption at rest and in transit
- Access controls and monitoring
- Data loss prevention (DLP)
- Secure disposal procedures
- Regular backups

#### Incident Response Policy

**Purpose:**
To establish procedures for responding to security incidents.

**Incident Categories:**
1. **Data Breach**: Unauthorized data access
2. **Malware**: Malicious software detection
3. **Denial of Service**: Service availability impact
4. **Insider Threat**: Malicious internal activity
5. **Physical Security**: Physical security compromise

**Response Levels:**
- **Level 1**: Minor impact, local response
- **Level 2**: Moderate impact, coordinated response
- **Level 3**: Major impact, emergency response

### Risk Assessment

#### Risk Identification

**Likelihood and Impact Matrix:**

| Threat | Likelihood | Impact | Risk Level |
|--------|------------|--------|------------|
| Data Breach | Medium | High | High |
| Service Outage | Low | High | Medium |
| Malware Attack | Medium | Medium | Medium |
| Insider Threat | Low | High | Medium |
| DDoS Attack | Medium | Medium | Medium |

#### Risk Mitigation

**High-Risk Threats:**
1. **Data Breach**
   - Mitigation: Encryption, access controls, monitoring
   - Residual Risk: Low

2. **Service Outage**
   - Mitigation: Redundancy, backup, monitoring
   - Residual Risk: Low

**Medium-Risk Threats:**
1. **Malware Attack**
   - Mitigation: Antivirus, patching, user training
   - Residual Risk: Low

2. **Insider Threat**
   - Mitigation: Background checks, monitoring, segregation
   - Residual Risk: Low

### Audit Trail Requirements

#### Security Event Logging

**Events to Log:**
- Authentication attempts (success/failure)
- Authorization changes
- Data access (read/write/delete)
- Configuration changes
- System errors and exceptions

**Log Format:**
```json
{
  "timestamp": "2025-12-03T10:00:00Z",
  "event_type": "AUTH_SUCCESS",
  "severity": "INFO",
  "user_id": "user-123",
  "org_id": "org-456",
  "ip_address": "192.168.1.1",
  "details": {
    "action": "login",
    "method": "jwt"
  }
}
```

#### Log Retention

**Retention Periods:**
- Security logs: 1 year
- Audit logs: 7 years
- Application logs: 90 days
- Performance logs: 30 days

**Storage Requirements:**
- Immutable storage for audit logs
- Encrypted storage for sensitive logs
- Geographic compliance for data residency
- Backup and recovery procedures

#### Log Analysis

**Analysis Tools:**
- SIEM (Security Information and Event Management)
- Log aggregation tools
- Real-time alerting
- Compliance reporting

**Analysis Procedures:**
- Real-time monitoring for critical events
- Daily review of security events
- Weekly analysis of trends
- Monthly compliance reporting

---

## Troubleshooting

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
4. Review clock skew

**Solution:**
```javascript
// Check token expiration
const decoded = jwt.decode(token);
console.log('Token expires:', decoded.exp);

// Verify secret key
process.env.AUTH_SECRET = 'your-new-secret-key';

// Refresh token
await fetch('/api/auth/refresh', { method: 'POST' });
```

**Prevention:**
- Implement token refresh logic
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

**Solution:**
```javascript
// Check database status
const result = await db.query('SELECT 1');
console.log('Database connected:', result.rows[0]);

// Adjust connection pool settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Increase pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 120000, // Increase timeout
});
```

**Prevention:**
- Monitor database performance
- Implement connection pooling
- Use appropriate timeout values
- Implement retry logic

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

**Solution:**
```sql
-- Identify slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Optimize query
EXPLAIN ANALYZE SELECT * FROM woocommerce_credentials WHERE org_id = '...';
```

**Prevention:**
- Implement query optimization
- Use caching strategies
- Monitor performance metrics
- Scale resources as needed

#### Security Issues

**Problem: CSRF token validation fails**
```
Error: Invalid CSRF token
Code: CSRF_INVALID
```

**Diagnosis:**
1. Check token generation
2. Verify token storage
3. Review middleware configuration
4. Check token expiration

**Solution:**
```javascript
// Regenerate CSRF token
const newToken = await CSRFProtection.generateToken();

// Check token validation
const isValid = await CSRFProtection.validateToken(token);

// Clear expired tokens
CSRFProtection.clearTokens();
```

**Prevention:**
- Implement proper token lifecycle
- Monitor token usage
- Use appropriate expiration times
- Implement token refresh

### Advanced Troubleshooting

#### Debug Mode Configuration

Enable debug mode for detailed logging:

```javascript
// src/lib/utils/debug.ts
export const debug = {
  enabled: process.env.NODE_ENV === 'development',

  log: (module: string, message: string, data?: any) => {
    if (debug.enabled) {
      console.log(`[${module}] ${message}`, data || '');
    }
  },

  error: (module: string, error: Error, context?: any) => {
    console.error(`[${module}] ERROR: ${error.message}`, {
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
  },
};
```

#### Performance Profiling

Use performance profiling tools:

```javascript
// src/lib/utils/profiler.ts
export class PerformanceProfiler {
  private static timers = new Map<string, number>();

  static start(label: string) {
    this.timers.set(label, Date.now());
  }

  static end(label: string) {
    const start = this.timers.get(label);
    if (start) {
      const duration = Date.now() - start;
      console.log(`[PERF] ${label}: ${duration}ms`);
      this.timers.delete(label);
    }
  }

  static async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }
}
```

#### Memory Leak Detection

Monitor memory usage:

```javascript
// src/lib/utils/memory.ts
export class MemoryMonitor {
  static startMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage();
      console.log('[MEMORY]', {
        rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB',
      });
    }, 60000); // Log every minute
  }
}
```

### Escalation Procedures

#### When to Escalate

**Level 1 Escalation:**
- Issue affects single user
- Workaround available
- Low business impact
- Response time: 4 hours

**Level 2 Escalation:**
- Issue affects multiple users
- No immediate workaround
- Moderate business impact
- Response time: 2 hours

**Level 3 Escalation:**
- Issue affects critical systems
- Security breach suspected
- High business impact
- Response time: 30 minutes

#### Escalation Contacts

**Technical Escalation:**
1. On-call engineer
2. Team lead
3. Engineering manager
4. CTO

**Security Escalation:**
1. Security analyst
2. Security manager
3. CISO
4. Executive team

**Business Escalation:**
1. Product manager
2. Department head
3. VP Operations
4. CEO

---

## Appendix

### A. Security Configuration Templates

#### Database Security Configuration

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create security functions
CREATE OR REPLACE FUNCTION set_current_org_id(org_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_org_id', org_id::text, false);
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger function
CREATE OR REPLACE FUNCTION log_security_event()
RETURNS trigger AS $$
BEGIN
  INSERT INTO security_audit_log (
    event_type, severity, org_id, user_id, ip_address, details, created_at
  ) VALUES (
    TG_ARGV[0], -- event type
    TG_ARGV[1], -- severity
    NEW.org_id,
    NEW.user_id,
    NEW.ip_address,
    row_to_json(NEW),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### Application Security Configuration

```typescript
// Security configuration constants
export const SECURITY_CONFIG = {
  // Authentication
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRY: '24h',
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes

  // Rate limiting
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,

  // Input validation
  MAX_INPUT_LENGTH: 1000,
  ALLOWED_FILE_TYPES: ['jpg', 'png', 'pdf'],
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB

  // Encryption
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  ENCRYPTION_KEY_LENGTH: 32,
  ENCRYPTION_IV_LENGTH: 16,

  // CSRF Protection
  CSRF_SECRET: process.env.CSRF_SECRET!,
  CSRF_TIMEOUT: 60 * 60 * 1000, // 1 hour

  // Database
  DB_TIMEOUT: 30000,
  DB_POOL_MAX: 10,
  DB_IDLE_TIMEOUT: 30000,
};
```

### B. Monitoring Dashboard Queries

#### Security Metrics

```sql
-- Authentication success rate
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN details->>'success' = 'true' THEN 1 ELSE 0 END) as successful,
  ROUND(
    (SUM(CASE WHEN details->>'success' = 'true' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)),
    2
  ) as success_rate
FROM security_audit_log
WHERE event_type = 'AUTH_SUCCESS'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Top security events
SELECT
  event_type,
  severity,
  COUNT(*) as count
FROM security_audit_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type, severity
ORDER BY count DESC;

-- Credential access patterns
SELECT
  DATE(accessed_at) as date,
  action,
  COUNT(*) as count
FROM woocommerce_credential_audit_log
WHERE accessed_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(accessed_at), action
ORDER BY date DESC, count DESC;
```

#### Performance Metrics

```sql
-- Slow queries
SELECT
  query,
  mean_time,
  calls,
  total_time
FROM pg_stat_statements
WHERE query LIKE '%woocommerce%'
ORDER BY mean_time DESC
LIMIT 10;

-- Database connections
SELECT
  state,
  COUNT(*) as count
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;

-- Table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
```

### C. Compliance Checklists

#### SOC 2 Compliance Checklist

**Security (CC Series):**
- [ ] CC6.1: Logical access controls
- [ ] CC6.2: Identity management
- [ ] CC6.3: Authentication
- [ ] CC6.6: Network security
- [ ] CC7.1: System monitoring
- [ ] CC7.2: Response and resolution

**Availability (A Series):**
- [ ] A1.1: Environmental protections
- [ ] A1.2: Capacity monitoring
- [ ] A1.3: Monitoring performance
- [ ] A1.4: Operational procedures

**Confidentiality (C Series):**
- [ ] C1.1: Confidentiality protections
- [ ] C1.2: Data handling procedures
- [ ] C1.3: Data disposal procedures

#### ISO 27001 Compliance Checklist

**Annex A Controls:**
- [ ] A.5: Information security policies
- [ ] A.6: Organization of information security
- [ ] A.7: Human resource security
- [ ] A.8: Asset management
- [ ] A.9: Access control
- [ ] A.10: Cryptography
- [ ] A.11: Physical and environmental security
- [ ] A.12: Operations security
- [ ] A.13: Communications security
- [ ] A.14: System acquisition, development and maintenance
- [ ] A.15: Supplier relationships
- [ ] A.16: Information security incident management
- [ ] A.17: Information security aspects of business continuity management
- [ ] A.18: Compliance

### D. Emergency Contact Templates

#### On-Call Schedule Template

| Day | Primary | Secondary | Escalation |
|-----|---------|-----------|------------|
| Mon | [Name] | [Name] | [Name] |
| Tue | [Name] | [Name] | [Name] |
| Wed | [Name] | [Name] | [Name] |
| Thu | [Name] | [Name] | [Name] |
| Fri | [Name] | [Name] | [Name] |
| Sat | [Name] | [Name] | [Name] |
| Sun | [Name] | [Name] | [Name] |

#### Emergency Contact Card

```
MantisNXT Emergency Contacts

Security Incident: [Phone]
Service Outage: [Phone]
Database Issues: [Phone]
Application Issues: [Phone]

After Hours: [Phone]

Website: [URL]
Status Page: [URL]
Documentation: [URL]

Important Notes:
- Always escalate to security team for suspected breaches
- Document all actions taken during incidents
- Preserve evidence for investigation
- Notify management for Level 2+ incidents
```

### E. Glossary

**API**: Application Programming Interface
**CSRF**: Cross-Site Request Forgery
**DB**: Database
**DDoS**: Distributed Denial of Service
**GDPR**: General Data Protection Regulation
**HTTP**: HyperText Transfer Protocol
**HTTPS**: HTTP Secure
**IP**: Internet Protocol
**JWT**: JSON Web Token
**PCI DSS**: Payment Card Industry Data Security Standard
**RDS**: Relational Database Service
**RLS**: Row Level Security
**SAML**: Security Assertion Markup Language
**SIEM**: Security Information and Event Management
**SOC**: System and Organization Controls
**SSO**: Single Sign-On
**TLS**: Transport Layer Security
**URL**: Uniform Resource Locator
**UUID**: Universally Unique Identifier
**VPN**: Virtual Private Network
**WooCommerce**: E-commerce platform for WordPress

---

**Document Version:** 1.0
**Last Updated:** December 3, 2025
**Next Review:** March 3, 2026

For questions or updates to this document, contact the MantisNXT Security Team at [security@mantisnxt.com](mailto:security@mantisnxt.com).