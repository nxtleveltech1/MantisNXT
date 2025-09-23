# NXT-Mantis Database Deployment Guide

## Prerequisites

1. **Supabase Project Setup**
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Note your project URL and anon key
   - Ensure you're on PostgreSQL 15 or later

2. **Database Access**
   - Admin access to Supabase SQL Editor
   - Or local psql client with connection string

3. **Environment Setup**
   - Node.js 18+ for any frontend integration
   - Angular 15+ for the NXT-Mantis frontend

## Step-by-Step Deployment

### 1. Execute Migrations in Order

Run each migration file in the exact order specified. Each file is idempotent and includes rollback instructions.

```bash
# Option A: Using Supabase SQL Editor
# Copy and paste each migration file content in order

# Option B: Using psql client
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f migrations/0001_init_core.sql \
  -f migrations/0002_supply_chain.sql \
  -f migrations/0003_ai_workspace.sql \
  -f migrations/0004_customer_ops.sql \
  -f migrations/0005_integrations.sql \
  -f migrations/0006_dashboards.sql \
  -f migrations/0007_rls_policies.sql \
  -f migrations/0008_views_rpc.sql \
  -f migrations/0009_indexes_perf.sql \
  -f migrations/0010_seed.sql
```

### 2. Verify Deployment

Run the test queries to ensure everything is working correctly:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f test_queries.sql
```

Expected output: All tests should pass with "PASSED" messages.

### 3. Configure Supabase Auth

#### Enable Authentication Providers

In your Supabase dashboard:

1. **Go to Authentication > Settings**
2. **Enable email/password authentication**
3. **Configure OAuth providers** (Google, GitHub, etc.) as needed
4. **Set up email templates** for invitations and password resets

#### Create Auth Triggers

Add this trigger to automatically create profiles when users sign up:

```sql
-- Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    org_uuid uuid;
    user_role user_role;
BEGIN
    -- For demo purposes, assign to TechCorp or StartupHub based on email domain
    -- In production, implement proper organization invitation flow
    IF NEW.email LIKE '%@techcorp.%' THEN
        org_uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
        user_role := 'cs_agent';
    ELSIF NEW.email LIKE '%@startuphub.%' THEN
        org_uuid := 'b2c3d4e5-f6g7-8901-bcde-f21234567890';
        user_role := 'cs_agent';
    ELSE
        -- Default to first organization for demo
        SELECT id INTO org_uuid FROM organization LIMIT 1;
        user_role := 'cs_agent';
    END IF;

    INSERT INTO public.profile (id, org_id, role, display_name)
    VALUES (
        NEW.id,
        org_uuid,
        user_role,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 4. Configure Row Level Security (RLS)

RLS is already enabled and configured in migration `0007_rls_policies.sql`. Key points:

- **Organization isolation**: Users can only see data from their organization
- **Role-based permissions**: Different access levels for admin, ops_manager, ai_team, cs_agent, exec, integrations
- **Data segregation**: Private vs public data access patterns

### 5. Set Up Real-time Subscriptions (Optional)

Enable real-time for specific tables that need live updates:

```sql
-- Enable real-time for notifications
ALTER publication supabase_realtime ADD TABLE notification;

-- Enable real-time for support tickets
ALTER publication supabase_realtime ADD TABLE support_ticket;

-- Enable real-time for system metrics
ALTER publication supabase_realtime ADD TABLE system_metric;
```

### 6. Configure Storage (Optional)

If you need file storage for AI datasets, customer documents, etc.:

1. **Go to Storage in Supabase dashboard**
2. **Create buckets**:
   - `ai-datasets` - For AI workspace file uploads
   - `customer-files` - For customer-related documents
   - `reports` - For generated reports and exports

3. **Set up storage policies**:

```sql
-- Allow authenticated users to upload to their org's folders
CREATE POLICY "Allow org uploads" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'ai-datasets' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = (SELECT org_id::text FROM profile WHERE id = auth.uid())
);

-- Allow users to read files from their org
CREATE POLICY "Allow org downloads" ON storage.objects
FOR SELECT USING (
    bucket_id = 'ai-datasets' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = (SELECT org_id::text FROM profile WHERE id = auth.uid())
);
```

## Production Considerations

### 1. Performance Optimization

- **Connection pooling**: Use PgBouncer for high-traffic applications
- **Query optimization**: Monitor slow queries and add indexes as needed
- **Caching**: Implement Redis for frequently accessed data
- **CDN**: Use Supabase Edge Functions with CDN for global performance

### 2. Security Hardening

- **API key rotation**: Regularly rotate Supabase anon and service role keys
- **Environment variables**: Never commit secrets to version control
- **HTTPS only**: Ensure all connections use HTTPS
- **IP allowlisting**: Restrict database access to known IPs in production

### 3. Backup Strategy

- **Automated backups**: Supabase Pro+ includes daily backups
- **Point-in-time recovery**: Available with Supabase Pro+
- **Export procedures**: Regular exports of critical business data
- **Disaster recovery**: Document recovery procedures and test regularly

### 4. Monitoring Setup

Enable monitoring for:

- **Database performance**: Query performance, connection counts
- **API usage**: Request rates, error rates, response times
- **Storage usage**: Database size, file storage usage
- **Authentication**: Login rates, failed attempts, user growth

### 5. Maintenance Procedures

#### Weekly Tasks
- Review slow query logs
- Check disk space and growth trends
- Validate backup completeness
- Review security alerts

#### Monthly Tasks
- Update table statistics: `ANALYZE;`
- Clean up old audit logs and system metrics
- Review and update RLS policies
- Performance benchmark testing

#### Quarterly Tasks
- Review and optimize indexes
- Update database to latest PostgreSQL version
- Security audit of access policies
- Capacity planning review

## Environment-Specific Configuration

### Development Environment

```bash
# .env.development
SUPABASE_URL=https://your-dev-project.supabase.co
SUPABASE_ANON_KEY=your-dev-anon-key
DATABASE_URL=postgresql://postgres:password@localhost:54322/postgres
ENVIRONMENT=development
```

### Staging Environment

```bash
# .env.staging
SUPABASE_URL=https://your-staging-project.supabase.co
SUPABASE_ANON_KEY=your-staging-anon-key
DATABASE_URL=postgresql://postgres:password@staging-db:5432/postgres
ENVIRONMENT=staging
```

### Production Environment

```bash
# .env.production
SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_ANON_KEY=your-prod-anon-key
DATABASE_URL=postgresql://postgres:secure-password@prod-db:5432/postgres
ENVIRONMENT=production
REDIS_URL=redis://your-redis-instance:6379
```

## Frontend Integration

### Angular Supabase Client Setup

```typescript
// src/app/core/supabase.service.ts
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );
  }

  get client() {
    return this.supabase;
  }

  // Example: Get organization overview
  async getOrganizationOverview() {
    const { data, error } = await this.supabase
      .from('v_organization_overview')
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  // Example: Real-time subscription to notifications
  subscribeToNotifications(callback: (payload: any) => void) {
    return this.supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notification'
      }, callback)
      .subscribe();
  }
}
```

### TypeScript Types Generation

Generate TypeScript types from your database:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Generate types
supabase gen types typescript --linked > src/types/database.types.ts
```

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**
   - Check user authentication status
   - Verify user has correct role in profile table
   - Ensure org_id is properly set

2. **Performance Issues**
   - Check for missing indexes on filtered columns
   - Review query execution plans
   - Consider table partitioning for large datasets

3. **Authentication Issues**
   - Verify JWT token validity
   - Check auth.users table for user existence
   - Ensure profile table has matching record

4. **Migration Failures**
   - Run migrations in correct order
   - Check for existing conflicting objects
   - Review error logs for specific issues

### Debug Queries

```sql
-- Check current user context
SELECT
    auth.uid() as user_id,
    auth.user_org_id() as org_id,
    auth.user_role() as role;

-- Check RLS policies on a table
SELECT * FROM pg_policies WHERE tablename = 'your_table_name';

-- Check table statistics
SELECT
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables
ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC;

-- Check slow queries
SELECT
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

## Support and Maintenance

For ongoing support:

1. **Documentation**: Keep this guide updated with any schema changes
2. **Version control**: Track all schema changes in git
3. **Change management**: Use migration files for all schema modifications
4. **Testing**: Run test suite after any changes
5. **Monitoring**: Set up alerts for performance degradation

Remember: This is a production-ready schema designed for scalability and security. Always test changes in a development environment before applying to production.