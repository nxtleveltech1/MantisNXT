# Troubleshooting Guide

This guide covers common issues, their symptoms, causes, and step-by-step solutions for MantisNXT.

## Quick Issue Resolution

### System Status Check

Before troubleshooting, verify system status:

1. **Check System Health**
   ```bash
   curl https://your-domain.com/api/health
   ```

2. **Verify Database Connection**
   ```bash
   pg_isready -h your-db-host -p 5432
   ```

3. **Check Authentication Service**
   ```bash
   curl https://your-project.supabase.co/rest/v1/
   ```

## Authentication Issues

### Issue: Unable to Login

**Symptoms:**
- Login form shows "Invalid credentials"
- Error: "Email not confirmed"
- Redirect loop after login attempt

**Common Causes:**
1. Incorrect email/password
2. Email not verified
3. User account disabled
4. Browser cache issues
5. JWT token expired

**Solutions:**

#### Step 1: Verify User Credentials
```sql
-- Check if user exists
SELECT id, email, email_confirmed_at, last_sign_in_at
FROM auth.users
WHERE email = 'user@example.com';
```

#### Step 2: Check Email Confirmation
```sql
-- Manually confirm email if needed
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'user@example.com';
```

#### Step 3: Reset User Password
```sql
-- Generate password reset
SELECT auth.send_password_reset_email('user@example.com');
```

#### Step 4: Clear Browser Cache
1. Clear browser cookies and local storage
2. Try incognito/private mode
3. Disable browser extensions

### Issue: JWT Token Errors

**Symptoms:**
- Error: "JWT token expired"
- Error: "Invalid JWT signature"
- Automatic logout after short time

**Solutions:**

#### Check Token Validity
```javascript
// Decode JWT token (client-side debugging)
const token = localStorage.getItem('supabase.auth.token')
console.log('Token:', JSON.parse(token))
```

#### Refresh Token
```typescript
// Force token refresh
const { data, error } = await supabase.auth.refreshSession()
if (error) console.error('Refresh failed:', error)
```

#### Configure Token Settings
```sql
-- Check JWT settings in Supabase dashboard
-- JWT expiry: 3600 seconds (1 hour)
-- Refresh token expiry: 604800 seconds (7 days)
```

## Database Issues

### Issue: Connection Timeouts

**Symptoms:**
- Page loading indefinitely
- Error: "Connection timeout"
- Error: "Pool exhausted"

**Solutions:**

#### Check Connection Pool
```sql
-- Monitor active connections
SELECT
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active_connections,
  count(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity;
```

#### Optimize Connection Settings
```typescript
// Supabase client configuration
const supabase = createClient(url, key, {
  db: {
    schema: 'public'
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  global: {
    headers: { 'x-my-custom-header': 'my-app-name' }
  }
})
```

#### Database Maintenance
```sql
-- Analyze tables for performance
ANALYZE supplier;
ANALYZE purchase_order;
ANALYZE inventory_item;

-- Check for locks
SELECT * FROM pg_locks WHERE NOT granted;

-- Kill long-running queries
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
  AND query_start < now() - interval '5 minutes';
```

### Issue: Slow Query Performance

**Symptoms:**
- Pages load slowly
- Timeout errors on large datasets
- High CPU usage on database

**Solutions:**

#### Identify Slow Queries
```sql
-- Find slowest queries
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  stddev_exec_time,
  rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

#### Check Missing Indexes
```sql
-- Find tables without indexes on frequently filtered columns
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
ORDER BY n_distinct DESC;
```

#### Add Performance Indexes
```sql
-- Add indexes for common query patterns
CREATE INDEX CONCURRENTLY idx_supplier_org_status
ON supplier(org_id, status) WHERE status = 'active';

CREATE INDEX CONCURRENTLY idx_po_supplier_date
ON purchase_order(supplier_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_inventory_low_stock
ON inventory_item(quantity_on_hand)
WHERE quantity_on_hand <= reorder_level;
```

## File Upload Issues

### Issue: XLSX Upload Failures

**Symptoms:**
- "Invalid file format" error
- Upload progress stalls at 100%
- "File too large" error
- Validation errors for correct data

**Solutions:**

#### Check File Format
```typescript
// Validate XLSX file
const validateXLSX = (file: File) => {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]

  if (!validTypes.includes(file.type)) {
    throw new Error('File must be Excel format (.xlsx)')
  }

  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    throw new Error('File size must be less than 10MB')
  }
}
```

#### Debug Upload Process
```typescript
// Add detailed logging
const uploadFile = async (file: File) => {
  try {
    console.log('File info:', {
      name: file.name,
      size: file.size,
      type: file.type
    })

    const base64 = await convertToBase64(file)
    console.log('Base64 length:', base64.length)

    const result = await supabase.rpc('process_xlsx_upload', {
      file_data: base64,
      import_type: 'suppliers'
    })

    console.log('Upload result:', result)
  } catch (error) {
    console.error('Upload failed:', error)
  }
}
```

#### Common Data Validation Issues
```typescript
// Fix common validation errors
const fixCommonIssues = (data: any[]) => {
  return data.map(row => ({
    ...row,
    // Fix phone number format
    phone: row.phone?.replace(/\D/g, '').replace(/^0/, '+27'),

    // Fix email format
    email: row.email?.toLowerCase().trim(),

    // Fix VAT number format
    vat_number: row.vat_number?.replace(/\D/g, ''),

    // Fix province name
    province: titleCase(row.province)
  }))
}
```

### Issue: Large File Processing

**Symptoms:**
- Browser timeout on large files
- Memory errors during processing
- Partial data import

**Solutions:**

#### Chunk Large Files
```typescript
// Process file in chunks
const processLargeFile = async (file: File) => {
  const chunkSize = 1000 // rows per chunk
  const workbook = XLSX.read(await file.arrayBuffer())
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(worksheet)

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize)

    try {
      await processChunk(chunk, i / chunkSize + 1)
      console.log(`Processed chunk ${i / chunkSize + 1}`)
    } catch (error) {
      console.error(`Chunk ${i / chunkSize + 1} failed:`, error)
    }
  }
}
```

#### Server-Side Processing
```sql
-- Create background job for large imports
CREATE OR REPLACE FUNCTION process_large_import(
  import_id uuid,
  chunk_size integer DEFAULT 1000
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  total_rows integer;
  processed_rows integer := 0;
BEGIN
  -- Update status to processing
  UPDATE data_import
  SET status = 'processing', started_at = now()
  WHERE id = import_id;

  -- Process in chunks
  WHILE processed_rows < total_rows LOOP
    -- Process chunk
    -- Update progress
    UPDATE data_import
    SET progress_percentage = (processed_rows::float / total_rows) * 100
    WHERE id = import_id;

    processed_rows := processed_rows + chunk_size;
  END LOOP;

  -- Mark as completed
  UPDATE data_import
  SET status = 'completed', completed_at = now()
  WHERE id = import_id;
END;
$$;
```

## Performance Issues

### Issue: Slow Page Loading

**Symptoms:**
- Pages take >3 seconds to load
- High time to first byte (TTFB)
- Large bundle sizes

**Solutions:**

#### Optimize React Components
```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  const processedData = useMemo(() => {
    return heavyProcessing(data)
  }, [data])

  return <div>{processedData}</div>
})

// Lazy load components
const LazyComponent = lazy(() => import('./ExpensiveComponent'))
```

#### Implement Caching
```typescript
// API response caching
const getCachedData = async (key: string, fetcher: () => Promise<any>) => {
  const cached = localStorage.getItem(key)
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    if (Date.now() - timestamp < 5 * 60 * 1000) { // 5 minutes
      return data
    }
  }

  const freshData = await fetcher()
  localStorage.setItem(key, JSON.stringify({
    data: freshData,
    timestamp: Date.now()
  }))

  return freshData
}
```

#### Database Query Optimization
```sql
-- Use EXPLAIN ANALYZE for slow queries
EXPLAIN (ANALYZE, BUFFERS)
SELECT s.*, COUNT(po.id) as order_count
FROM supplier s
LEFT JOIN purchase_order po ON s.id = po.supplier_id
WHERE s.org_id = $1
GROUP BY s.id;

-- Add covering indexes
CREATE INDEX idx_supplier_covering
ON supplier(org_id)
INCLUDE (name, email, status, created_at);
```

### Issue: Memory Usage

**Symptoms:**
- Browser tab crashes
- "Out of memory" errors
- Slow rendering of large lists

**Solutions:**

#### Implement Virtualization
```typescript
// Use react-window for large lists
import { FixedSizeList as List } from 'react-window'

const VirtualizedList = ({ items }) => (
  <List
    height={400}
    itemCount={items.length}
    itemSize={50}
    itemData={items}
  >
    {({ index, style, data }) => (
      <div style={style}>
        {data[index].name}
      </div>
    )}
  </List>
)
```

#### Optimize Data Structures
```typescript
// Use Map for fast lookups instead of arrays
const supplierMap = new Map(
  suppliers.map(supplier => [supplier.id, supplier])
)

// Paginate large datasets
const usePaginatedData = (data: any[], pageSize = 50) => {
  const [page, setPage] = useState(1)

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize
    return data.slice(start, start + pageSize)
  }, [data, page, pageSize])

  return { paginatedData, page, setPage }
}
```

## Security Issues

### Issue: Unauthorized Access

**Symptoms:**
- Users accessing other organization's data
- Permission errors in console
- Data appearing for wrong users

**Solutions:**

#### Verify RLS Policies
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Test RLS policy
SET ROLE authenticated;
SET request.jwt.claims.sub = 'user-id';
SELECT * FROM supplier; -- Should only return user's org data
```

#### Debug Permission Issues
```sql
-- Check user's organization
SELECT
  u.id,
  u.email,
  p.org_id,
  p.role
FROM auth.users u
JOIN profile p ON u.id = p.id
WHERE u.email = 'user@example.com';

-- Verify organization data
SELECT id, name FROM organization WHERE id = 'org-uuid';
```

#### Fix Common RLS Issues
```sql
-- Ensure all tables have org_id filtering
CREATE POLICY "org_isolation" ON supplier
FOR ALL USING (org_id = auth.user_org_id());

-- Update missing org_id values
UPDATE supplier SET org_id = (
  SELECT org_id FROM profile WHERE id = created_by
) WHERE org_id IS NULL;
```

### Issue: CORS Errors

**Symptoms:**
- "Access-Control-Allow-Origin" errors
- API requests blocked by browser
- Cross-origin request failures

**Solutions:**

#### Configure CORS in Supabase
```sql
-- Update CORS settings in Supabase dashboard
-- Allowed origins: https://your-domain.com
-- Allow credentials: true
```

#### Handle CORS in Next.js
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://your-domain.com'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          }
        ]
      }
    ]
  }
}
```

## Currency and Localization Issues

### Issue: Incorrect Currency Display

**Symptoms:**
- Amounts showing in USD instead of ZAR
- Wrong currency symbols ($R instead of R)
- Incorrect number formatting

**Solutions:**

#### Fix Currency Formatting
```typescript
// Correct ZAR formatting
const formatZAR = (amount: number) => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2
  }).format(amount)
}

// Fix existing USD references
const convertDisplayCurrency = (element: HTMLElement) => {
  const text = element.textContent || ''
  const updated = text.replace(/\$([0-9,]+(?:\.[0-9]{2})?)/g, 'R $1')
  element.textContent = updated
}
```

#### Validate VAT Calculations
```typescript
// Ensure 15% VAT rate for South Africa
const calculateVAT = (amount: number, inclusive = false) => {
  const VAT_RATE = 0.15 // 15% for South Africa

  if (inclusive) {
    // Amount includes VAT, extract it
    const vatAmount = amount - (amount / (1 + VAT_RATE))
    return Math.round(vatAmount * 100) / 100
  } else {
    // Amount excludes VAT, add it
    return Math.round(amount * VAT_RATE * 100) / 100
  }
}
```

## Browser Compatibility Issues

### Issue: Features Not Working in Specific Browsers

**Symptoms:**
- JavaScript errors in older browsers
- CSS layout issues
- Missing functionality

**Solutions:**

#### Check Browser Support
```typescript
// Feature detection
const checkBrowserSupport = () => {
  const features = {
    fetch: typeof fetch !== 'undefined',
    localStorage: typeof localStorage !== 'undefined',
    flexbox: CSS.supports('display', 'flex'),
    grid: CSS.supports('display', 'grid')
  }

  const unsupported = Object.entries(features)
    .filter(([, supported]) => !supported)
    .map(([feature]) => feature)

  if (unsupported.length > 0) {
    console.warn('Unsupported features:', unsupported)
  }

  return features
}
```

#### Add Polyfills
```typescript
// Add polyfills for older browsers
if (!window.fetch) {
  import('whatwg-fetch')
}

if (!Array.prototype.includes) {
  Array.prototype.includes = function(searchElement) {
    return this.indexOf(searchElement) !== -1
  }
}
```

## Getting Additional Help

### Debug Mode Activation

Enable debug mode for detailed logging:

```typescript
// Enable debug logging
localStorage.setItem('debug', 'true')

// Check console for detailed logs
console.log('Debug mode enabled')
```

### System Information Collection

Collect system info for support:

```typescript
const collectSystemInfo = () => {
  return {
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    localStorage: Object.keys(localStorage),
    cookies: document.cookie,
    errors: window.lastErrors || []
  }
}
```

### Support Channels

1. **In-App Support**
   - Use the help chat widget
   - Submit support tickets
   - Access knowledge base

2. **Technical Support**
   - Email: support@mantisnxt.com
   - Phone: +27 11 XXX XXXX
   - Emergency: 24/7 support line

3. **Community Resources**
   - User forums
   - Documentation
   - Video tutorials

4. **Developer Support**
   - GitHub issues
   - Developer documentation
   - API support

### Emergency Procedures

For critical issues:

1. **Check System Status**
   - Visit status.mantisnxt.com
   - Check for known issues

2. **Contact Emergency Support**
   - Call emergency hotline
   - Include error codes and steps to reproduce

3. **Temporary Workarounds**
   - Use mobile app if available
   - Export critical data
   - Switch to backup procedures

Remember to always include error messages, steps to reproduce, and system information when reporting issues.