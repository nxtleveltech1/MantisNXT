# MantisNXT Deployment Guide

This comprehensive guide covers the complete deployment process for MantisNXT, from initial setup to production configuration.

## Prerequisites

### System Requirements

**Development Environment:**
- Node.js 18.0 or higher
- npm 9.0 or higher
- Git for version control
- Code editor (VS Code recommended)

**Production Environment:**
- Supabase account and project
- Domain name and SSL certificate
- CDN service (optional but recommended)
- Monitoring service (optional)

**Database Requirements:**
- PostgreSQL 15 or higher (via Supabase)
- Minimum 4GB RAM
- 100GB storage (initial)
- Automated backups enabled

### Service Dependencies

**Required Services:**
- **Supabase**: Database, Authentication, Storage, Edge Functions
- **Vercel/Netlify**: Frontend hosting (recommended)
- **Email Service**: SMTP for notifications (optional)

**Optional Services:**
- **Redis**: Caching and session storage
- **Cloudinary**: Image processing and storage
- **SendGrid**: Transactional emails
- **Sentry**: Error monitoring

## Quick Deployment

### 1. Clone Repository

```bash
git clone https://github.com/your-org/mantisnxt.git
cd mantisnxt
npm install
```

### 2. Environment Configuration

Create `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_ENVIRONMENT=production

# Optional Services
REDIS_URL=redis://your-redis-instance:6379
SMTP_HOST=smtp.your-provider.com
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

### 3. Database Setup

```bash
# Run migrations in order
npm run db:migrate

# Seed initial data
npm run db:seed

# Verify deployment
npm run db:test
```

### 4. Build and Deploy

```bash
# Build production assets
npm run build

# Start production server
npm run start

# Or deploy to Vercel
vercel --prod
```

## Detailed Setup Process

### Supabase Configuration

#### 1. Create Supabase Project

1. Visit [supabase.com](https://supabase.com)
2. Create new project
3. Note your project URL and API keys
4. Ensure PostgreSQL 15+ is selected

#### 2. Database Migration

Run migrations in exact order:

```bash
# Core schema
psql -f migrations/0001_init_core.sql

# Supply chain tables
psql -f migrations/0002_supply_chain.sql

# AI workspace
psql -f migrations/0003_ai_workspace.sql

# Customer operations
psql -f migrations/0004_customer_ops.sql

# Integrations
psql -f migrations/0005_integrations.sql

# Dashboards
psql -f migrations/0006_dashboards.sql

# Security policies
psql -f migrations/0007_rls_policies.sql

# Views and functions
psql -f migrations/0008_views_rpc.sql

# Performance indexes
psql -f migrations/0009_indexes_perf.sql

# Seed data
psql -f migrations/0010_seed.sql
```

#### 3. Row Level Security Setup

Enable RLS on all tables:

```sql
-- Enable RLS globally
ALTER TABLE organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier ENABLE ROW LEVEL SECURITY;
-- ... (continue for all tables)

-- Create organization context function
CREATE OR REPLACE FUNCTION auth.user_org_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT org_id FROM profile WHERE id = auth.uid();
$$;
```

#### 4. Authentication Configuration

Configure auth in Supabase dashboard:

1. **Email Settings**
   - Enable email/password auth
   - Configure email templates
   - Set redirect URLs

2. **OAuth Providers** (optional)
   - Google OAuth
   - Microsoft OAuth
   - LinkedIn OAuth

3. **Security Settings**
   - JWT expiry: 3600 seconds
   - Refresh token expiry: 604800 seconds
   - Session timeout: 8 hours

### Storage Configuration

#### 1. Create Storage Buckets

```sql
-- Create buckets for file storage
INSERT INTO storage.buckets (id, name, public) VALUES
('supplier-documents', 'supplier-documents', false),
('inventory-images', 'inventory-images', true),
('import-files', 'import-files', false),
('reports', 'reports', false);
```

#### 2. Storage Policies

```sql
-- Allow authenticated users to upload to their org folder
CREATE POLICY "Org upload access" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'supplier-documents' AND
  (storage.foldername(name))[1] = auth.user_org_id()::text
);

-- Allow users to read files from their org
CREATE POLICY "Org read access" ON storage.objects
FOR SELECT USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'supplier-documents' AND
  (storage.foldername(name))[1] = auth.user_org_id()::text
);
```

## Production Configuration

### Environment Variables

#### Essential Variables

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App Configuration (Required)
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_ENVIRONMENT=production
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com

# Database (Required)
DATABASE_URL=postgresql://postgres:password@host:5432/postgres
```

#### Optional Variables

```env
# Caching
REDIS_URL=redis://your-redis:6379
ENABLE_CACHE=true

# Email Service
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
FROM_EMAIL=noreply@your-domain.com

# File Storage
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
ANALYTICS_ID=your-analytics-id
MONITORING_ENDPOINT=https://your-monitoring-service
```

### Security Configuration

#### 1. HTTPS and SSL

```nginx
# Nginx configuration
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 2. Security Headers

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval'"
          }
        ]
      }
    ]
  }
}
```

### Performance Optimization

#### 1. Database Optimization

```sql
-- Create performance indexes
CREATE INDEX CONCURRENTLY idx_supplier_org_status
ON supplier(org_id, status) WHERE status = 'active';

CREATE INDEX CONCURRENTLY idx_purchase_order_date
ON purchase_order(created_at DESC);

CREATE INDEX CONCURRENTLY idx_inventory_low_stock
ON inventory_item(quantity_on_hand) WHERE quantity_on_hand <= reorder_level;

-- Analyze tables for query optimization
ANALYZE supplier;
ANALYZE purchase_order;
ANALYZE inventory_item;
```

#### 2. Caching Strategy

```typescript
// lib/cache.ts
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export const cache = {
  async get(key: string) {
    try {
      const value = await redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  },

  async set(key: string, value: any, ttl = 3600) {
    try {
      await redis.setex(key, ttl, JSON.stringify(value))
    } catch (error) {
      console.error('Cache set error:', error)
    }
  },

  async del(key: string) {
    try {
      await redis.del(key)
    } catch (error) {
      console.error('Cache delete error:', error)
    }
  }
}
```

#### 3. CDN Configuration

```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['res.cloudinary.com', 'your-cdn.com'],
    loader: 'cloudinary',
    path: 'https://res.cloudinary.com/your-cloud/'
  },

  async rewrites() {
    return [
      {
        source: '/static/:path*',
        destination: 'https://your-cdn.com/static/:path*'
      }
    ]
  }
}
```

## Monitoring and Logging

### 1. Application Monitoring

```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
  tracesSampleRate: 0.1,

  beforeSend(event) {
    // Filter sensitive data
    if (event.user) {
      delete event.user.email
    }
    return event
  }
})

export const trackEvent = (name: string, properties?: any) => {
  Sentry.addBreadcrumb({
    message: name,
    data: properties,
    timestamp: Date.now() / 1000
  })
}
```

### 2. Database Monitoring

```sql
-- Create monitoring views
CREATE VIEW v_system_health AS
SELECT
  'database_size' as metric,
  pg_size_pretty(pg_database_size(current_database())) as value,
  now() as timestamp
UNION ALL
SELECT
  'active_connections' as metric,
  count(*)::text as value,
  now() as timestamp
FROM pg_stat_activity
WHERE state = 'active';

-- Monitor slow queries
CREATE VIEW v_slow_queries AS
SELECT
  query,
  mean_exec_time,
  calls,
  total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC;
```

### 3. Health Checks

```typescript
// pages/api/health.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check database connection
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase
      .from('organization')
      .select('count')
      .limit(1)

    if (error) throw error

    // Check cache connection (if enabled)
    if (process.env.REDIS_URL) {
      // Redis health check
    }

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'ok',
        cache: 'ok',
        storage: 'ok'
      }
    })
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    })
  }
}
```

## Backup and Recovery

### 1. Database Backups

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_URL="postgresql://user:pass@host:5432/db"

# Create backup
pg_dump $DB_URL > $BACKUP_DIR/mantisnxt_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/mantisnxt_$DATE.sql

# Upload to cloud storage
aws s3 cp $BACKUP_DIR/mantisnxt_$DATE.sql.gz s3://backups/database/

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "mantisnxt_*.sql.gz" -mtime +30 -delete
```

### 2. Automated Backups

```bash
# Crontab entry for daily backups at 2 AM
0 2 * * * /path/to/backup.sh > /var/log/backup.log 2>&1
```

### 3. Recovery Procedures

```bash
# Restore from backup
gunzip mantisnxt_20240922_020000.sql.gz
psql $DATABASE_URL < mantisnxt_20240922_020000.sql

# Verify restoration
psql $DATABASE_URL -c "SELECT COUNT(*) FROM organization;"
```

## Deployment Checklist

### Pre-Deployment

- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] SSL certificates installed
- [ ] Security headers configured
- [ ] Monitoring tools setup
- [ ] Backup procedures tested

### Deployment

- [ ] Code deployed to production
- [ ] Database connection verified
- [ ] Health checks passing
- [ ] Performance metrics baseline
- [ ] Error monitoring active

### Post-Deployment

- [ ] Smoke tests completed
- [ ] User access verified
- [ ] Performance monitoring active
- [ ] Backup verification
- [ ] Documentation updated
- [ ] Team notifications sent

## Troubleshooting

### Common Issues

**Database Connection Errors:**
```bash
# Check connection
pg_isready -h host -p 5432 -U user

# Test query
psql $DATABASE_URL -c "SELECT 1;"
```

**Authentication Issues:**
```bash
# Verify JWT token
echo $JWT_TOKEN | jwt decode -

# Check user permissions
SELECT * FROM auth.users WHERE email = 'user@example.com';
```

**Performance Issues:**
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

-- Check locks
SELECT * FROM pg_locks WHERE NOT granted;
```

### Support Contacts

- **Technical Issues**: tech-support@your-company.com
- **Emergency**: +27 11 XXX XXXX
- **Documentation**: docs.mantisnxt.com
- **Status Page**: status.mantisnxt.com

Ready for deployment? Follow this guide step-by-step for a successful MantisNXT installation.