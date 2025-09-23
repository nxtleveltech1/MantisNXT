# System Architecture Overview

MantisNXT is a modern, scalable procurement management system built on a robust technology stack designed for South African businesses.

## Architecture Principles

### Design Philosophy
- **Modular Architecture** - Loosely coupled components for flexibility
- **API-First Design** - RESTful APIs with comprehensive documentation
- **Security by Design** - Row-level security and compliance built-in
- **Performance-Optimized** - Efficient queries and caching strategies
- **Scalable Infrastructure** - Cloud-native with horizontal scaling

### Quality Attributes
- **Reliability** - 99.9% uptime with graceful error handling
- **Security** - Enterprise-grade security with South African compliance
- **Performance** - Sub-second response times for core operations
- **Maintainability** - Clean code architecture with comprehensive testing
- **Usability** - Intuitive interfaces optimized for business workflows

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (Supabase)    │◄──►│   (PostgreSQL)  │
│   - React 19    │    │   - REST API    │    │   - RLS Enabled │
│   - TypeScript  │    │   - Auth        │    │   - Optimized   │
│   - Tailwind    │    │   - Storage     │    │   - Backed Up   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN/Edge      │    │   Edge Functions │   │   Monitoring    │
│   - Static      │    │   - Server-side │    │   - Metrics     │
│   - Images      │    │   - Webhooks    │    │   - Alerts      │
│   - Caching     │    │   - Cron Jobs   │    │   - Logging     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Architecture

#### Frontend Layer (Next.js Application)
```
src/
├── app/                    # Next.js 13+ App Router
│   ├── (routes)/          # Route groups
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components (Radix)
│   ├── forms/            # Form components
│   └── charts/           # Data visualization
├── lib/                  # Utility libraries
│   ├── auth/             # Authentication logic
│   ├── supabase/         # Supabase client
│   ├── utils/            # Helper functions
│   └── validations/      # Zod schemas
└── types/                # TypeScript definitions
```

#### Backend Layer (Supabase Services)
```
Database (PostgreSQL)
├── Core Tables           # Organizations, Users, Audit
├── Supply Chain         # Suppliers, Inventory, POs
├── Customer Ops         # Customers, Tickets, Interactions
├── AI Workspace         # Conversations, Datasets
├── Integrations         # Connectors, Imports
└── Analytics           # Dashboards, Metrics

Authentication
├── JWT-based auth       # Secure token system
├── Row Level Security   # Data isolation
├── Role-based access    # Granular permissions
└── Session management   # Secure sessions

Storage
├── File uploads         # XLSX, documents
├── Image processing     # Product images
├── Report generation    # PDF reports
└── Backup storage       # Data backups

Edge Functions
├── XLSX processing      # File parsing
├── Report generation    # PDF creation
├── Webhook handlers     # External integrations
└── Scheduled tasks      # Cron jobs
```

## Technology Stack

### Frontend Technologies

**Core Framework:**
- **Next.js 15** - React framework with App Router
- **React 19** - UI library with latest features
- **TypeScript** - Type-safe development

**UI Components:**
- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Modern icon library

**State Management:**
- **Zustand** - Lightweight state management
- **React Hook Form** - Form state management
- **TanStack Query** - Server state management (optional)

**Data Validation:**
- **Zod** - Schema validation
- **React Hook Form Resolvers** - Form validation

**Charts and Visualization:**
- **Recharts** - React charting library
- **Date-fns** - Date manipulation

### Backend Technologies

**Database:**
- **PostgreSQL 15+** - Primary database
- **Supabase** - Backend-as-a-Service
- **Row Level Security** - Data isolation

**Authentication:**
- **Supabase Auth** - JWT-based authentication
- **OAuth Providers** - Google, Microsoft, etc.
- **Email/Password** - Traditional auth

**API Layer:**
- **REST API** - Auto-generated from schema
- **RPC Functions** - Custom business logic
- **Real-time** - WebSocket subscriptions

**File Processing:**
- **XLSX** - Excel file processing
- **Sharp** - Image processing
- **PDF-lib** - PDF generation

### Infrastructure

**Hosting:**
- **Vercel** - Frontend hosting (recommended)
- **Supabase** - Backend infrastructure
- **CDN** - Global content delivery

**Monitoring:**
- **Supabase Dashboard** - Built-in monitoring
- **Sentry** - Error tracking (optional)
- **Analytics** - Usage tracking (optional)

**Security:**
- **HTTPS/TLS** - Encrypted connections
- **CORS** - Cross-origin security
- **Rate Limiting** - API protection

## Database Architecture

### Entity Relationship Model

```
Organizations (1) ────────────── (*) Users
     │                              │
     │                              │
     └── (*) Suppliers ─────────── (*) Purchase Orders
             │                          │
             │                          │
             └── (*) Inventory Items ── (*) PO Line Items
                     │
                     │
                     └── (*) Stock Movements
```

### Core Entities

#### Organization Management
- **organization** - Multi-tenant organization data
- **profile** - User profiles with role-based access
- **audit_log** - Complete audit trail

#### Supply Chain Management
- **supplier** - Supplier information and compliance
- **inventory_item** - Product catalog and stock levels
- **purchase_order** - Procurement workflow
- **purchase_order_item** - Line items with pricing
- **invoice** - Financial processing
- **payment** - Payment tracking

#### Customer Operations
- **customer** - Customer relationship management
- **support_ticket** - Customer service workflows
- **customer_interaction** - Communication history

#### Analytics and Reporting
- **dashboard** - Custom dashboard configurations
- **widget** - Dashboard components
- **system_metric** - Performance monitoring

### Security Model

#### Row Level Security (RLS)
Every table implements organization-level isolation:

```sql
-- Example RLS policy
CREATE POLICY "org_isolation" ON supplier
FOR ALL USING (org_id = auth.user_org_id());
```

#### Role-Based Access Control
- **admin** - Full system access
- **ops_manager** - Operations and supply chain
- **cs_agent** - Customer service functions
- **ai_team** - AI workspace access
- **exec** - Read-only dashboard access
- **integrations** - API and automation access

#### Data Classification
- **Public** - Non-sensitive reference data
- **Internal** - Organization-specific data
- **Confidential** - Financial and compliance data
- **Restricted** - Personal and sensitive information

## Integration Architecture

### API Integration Patterns

#### RESTful API Design
```
GET    /api/suppliers              # List suppliers
POST   /api/suppliers              # Create supplier
GET    /api/suppliers/:id          # Get supplier
PUT    /api/suppliers/:id          # Update supplier
DELETE /api/suppliers/:id          # Delete supplier
```

#### Bulk Operations
```
POST   /api/suppliers/bulk         # Bulk create/update
POST   /api/suppliers/import       # XLSX import
GET    /api/suppliers/export       # Data export
```

#### Real-time Subscriptions
```typescript
// WebSocket subscriptions
supabase
  .channel('suppliers')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'supplier'
  }, handleChange)
  .subscribe()
```

### External Integrations

#### XLSX Processing Pipeline
```
File Upload → Validation → Parsing → Transformation → Database Insert
     │             │          │            │              │
     ▼             ▼          ▼            ▼              ▼
  Size Check   Schema Val   XLSX Read   Data Clean    Bulk Insert
```

#### Webhook System
```
External Event → Webhook Receiver → Validation → Processing → Response
      │                │               │           │           │
      ▼                ▼               ▼           ▼           ▼
  Third Party      Authentication   Schema     Business    Success/Error
  Service          & Security       Check      Logic       Response
```

## Performance Architecture

### Query Optimization

#### Database Indexes
```sql
-- Performance-critical indexes
CREATE INDEX CONCURRENTLY idx_supplier_org_active
ON supplier(org_id, status) WHERE status = 'active';

CREATE INDEX CONCURRENTLY idx_po_date_status
ON purchase_order(created_at DESC, status);

CREATE INDEX CONCURRENTLY idx_inventory_reorder
ON inventory_item(reorder_level) WHERE quantity_on_hand <= reorder_level;
```

#### Query Patterns
```sql
-- Optimized supplier search
SELECT s.*, COUNT(po.id) as order_count
FROM supplier s
LEFT JOIN purchase_order po ON s.id = po.supplier_id
WHERE s.org_id = $1 AND s.status = 'active'
GROUP BY s.id
ORDER BY s.name
LIMIT 50 OFFSET $2;
```

### Caching Strategy

#### Multi-Level Caching
```
Browser Cache → CDN Cache → Application Cache → Database Cache
     (1 hour)     (1 day)       (15 minutes)      (Query Plan)
```

#### Cache Implementation
```typescript
// Application-level caching
const getCachedSuppliers = async (orgId: string) => {
  const cacheKey = `suppliers:${orgId}`

  // Try cache first
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  // Fetch from database
  const suppliers = await fetchSuppliers(orgId)

  // Cache for 15 minutes
  await redis.setex(cacheKey, 900, JSON.stringify(suppliers))

  return suppliers
}
```

### Scalability Considerations

#### Horizontal Scaling
- **Database Read Replicas** - Distribute read queries
- **CDN Distribution** - Global content delivery
- **Microservices** - Service decomposition (future)

#### Vertical Scaling
- **Connection Pooling** - Efficient database connections
- **Resource Optimization** - Memory and CPU tuning
- **Query Optimization** - Index and query tuning

## Security Architecture

### Authentication Flow
```
User Login → Supabase Auth → JWT Token → API Request → RLS Check → Data Access
     │            │             │           │           │           │
     ▼            ▼             ▼           ▼           ▼           ▼
  Credentials   Validation   Session     Authorized   Permission   Response
  Submit        & MFA        Creation    Request      Check        Data
```

### Data Protection

#### Encryption
- **In Transit** - TLS 1.3 for all connections
- **At Rest** - AES-256 database encryption
- **Application** - Sensitive field encryption

#### Access Control
```typescript
// Role-based access example
const checkPermission = (user: User, resource: string, action: string) => {
  const permissions = ROLE_PERMISSIONS[user.role]
  return permissions[resource]?.includes(action) || false
}
```

#### Audit Trail
```sql
-- Comprehensive audit logging
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  org_id uuid REFERENCES organization(id),
  table_name text NOT NULL,
  operation text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz DEFAULT now()
);
```

## Compliance Architecture

### South African Compliance

#### POPIA (Protection of Personal Information Act)
- **Data Minimization** - Collect only necessary data
- **Consent Management** - User consent tracking
- **Data Subject Rights** - Access, correction, deletion
- **Data Breach Procedures** - Incident response plan

#### BEE (Black Economic Empowerment)
- **Supplier Classification** - BEE level tracking
- **Spend Analysis** - Compliance reporting
- **Scorecard Integration** - Automated calculations
- **Audit Trail** - Historical compliance data

#### VAT Compliance
- **15% VAT Rate** - Automatic calculations
- **VAT Registration** - Number validation
- **Tax Reporting** - Quarterly VAT returns
- **Invoice Requirements** - Compliant formatting

### Regulatory Features
```typescript
// BEE compliance calculation
const calculateBEECompliance = (suppliers: Supplier[]) => {
  const totalSpend = suppliers.reduce((sum, s) => sum + s.annual_spend, 0)
  const beeSpend = suppliers
    .filter(s => s.bee_level <= 4)
    .reduce((sum, s) => sum + s.annual_spend, 0)

  return {
    total_spend: totalSpend,
    bee_spend: beeSpend,
    compliance_percentage: (beeSpend / totalSpend) * 100
  }
}
```

## Development Architecture

### Code Organization

#### Feature-Based Structure
```
src/
├── app/
│   ├── suppliers/          # Supplier management
│   ├── inventory/          # Inventory management
│   ├── purchase-orders/    # Procurement workflows
│   └── analytics/          # Reporting and dashboards
├── components/
│   ├── suppliers/          # Supplier-specific components
│   ├── inventory/          # Inventory components
│   └── shared/             # Shared components
└── lib/
    ├── suppliers/          # Supplier business logic
    ├── inventory/          # Inventory business logic
    └── shared/             # Shared utilities
```

#### Testing Strategy
```
tests/
├── unit/                   # Unit tests (70%)
├── integration/            # Integration tests (20%)
├── e2e/                    # End-to-end tests (10%)
└── performance/            # Performance tests
```

### Development Workflow

#### Git Workflow
```
main ← develop ← feature/supplier-enhancement
  │       │           │
  │       │           └─ Pull Request → Code Review → Merge
  │       │
  │       └─ Release Branch → Production Deploy
  │
  └─ Hotfix Branch → Emergency Deploy
```

#### CI/CD Pipeline
```
Code Push → Tests → Build → Security Scan → Deploy → Monitor
     │        │      │         │            │        │
     ▼        ▼      ▼         ▼            ▼        ▼
  Trigger   Unit    Compile   SAST        Staging   Health
  Build     Tests   Assets    Scan        Deploy    Check
```

## Monitoring and Observability

### Monitoring Stack

#### Application Monitoring
```typescript
// Performance monitoring
const monitor = {
  trackPageLoad: (page: string, duration: number) => {
    analytics.track('page_load', { page, duration })
  },

  trackError: (error: Error, context: any) => {
    errorReporting.captureException(error, { extra: context })
  },

  trackUserAction: (action: string, properties: any) => {
    analytics.track(action, properties)
  }
}
```

#### Database Monitoring
```sql
-- Performance monitoring views
CREATE VIEW v_performance_metrics AS
SELECT
  'total_connections' as metric,
  count(*) as value
FROM pg_stat_activity
UNION ALL
SELECT
  'slow_queries' as metric,
  count(*) as value
FROM pg_stat_statements
WHERE mean_exec_time > 1000;
```

### Alerting System
```yaml
# Alert configuration
alerts:
  - name: high_cpu_usage
    condition: cpu_usage > 80%
    duration: 5m
    action: notify_ops_team

  - name: slow_queries
    condition: query_time > 2s
    action: log_and_optimize

  - name: failed_logins
    condition: failed_attempts > 10
    duration: 1m
    action: security_alert
```

## Future Architecture Considerations

### Scalability Roadmap
1. **Phase 1** - Current architecture (0-1,000 users)
2. **Phase 2** - Read replicas and caching (1,000-10,000 users)
3. **Phase 3** - Microservices decomposition (10,000+ users)
4. **Phase 4** - Multi-region deployment (Global scale)

### Technology Evolution
- **Serverless Functions** - Event-driven processing
- **GraphQL** - Flexible API layer
- **Message Queues** - Asynchronous processing
- **Machine Learning** - Predictive analytics

This architecture provides a solid foundation for MantisNXT's current needs while maintaining flexibility for future growth and evolution.