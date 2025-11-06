# MantisNXT Phase 2-6 Architecture Documentation

## Overview

This directory contains comprehensive architecture documentation for the MantisNXT admin panel Phase 2-6 implementation. The documentation covers API design, caching strategies, scalability considerations, performance optimization, and infrastructure deployment.

## Document Index

### 1. [Phase 2-6 Admin Panel Architecture](./phase2-admin-panel-architecture.md)
**Primary architectural document covering:**
- System architecture overview with diagrams
- API architecture and RESTful endpoint design
- Redis caching strategy and implementation
- Database connection pooling and read replicas
- Background job processing with Bull/BullMQ
- Rate limiting strategies
- Real-time updates (WebSocket vs SSE)
- Integration points (Stack Auth, Email, SMS, Analytics)
- Performance optimization recommendations
- Search strategies (PostgreSQL FTS vs Elasticsearch)

**Key Sections:**
- API Architecture (RESTful endpoints, middleware, error handling)
- Caching Strategy (Redis integration, invalidation patterns, warming)
- Scalability (connection pooling, read replicas, auto-scaling)
- Performance (query optimization, pagination, search indexing)
- Integration (Stack Auth, email service, SMS, real-time updates)

### 2. [Implementation Checklist](./implementation-checklist.md)
**Detailed phase-by-phase implementation guide:**
- **Phase 2**: Core User Management (Database, APIs, Caching, Rate Limiting)
- **Phase 3**: Advanced Features (Roles, Permissions, Bulk Operations, Audit Logs)
- **Phase 4**: Real-time & Integration (WebSocket, Stack Auth, Email, SMS, 2FA)
- **Phase 5**: Performance & Scale (Read Replicas, Advanced Caching, Search)
- **Phase 6**: Monitoring & Polish (Metrics, Dashboards, Documentation)

**Includes:**
- Task breakdowns for each phase
- Testing requirements
- Success metrics
- Risk mitigation strategies
- Budget breakdown
- Timeline estimates

### 3. [API Reference](./api-reference.md)
**Complete API documentation:**
- User Management endpoints
- Role & Permission Management endpoints
- Audit Log endpoints
- Activity History endpoints
- Session Management endpoints
- Notification endpoints
- WebSocket events
- Error response formats
- Pagination strategies
- SDK examples (JavaScript, Python)

**Features:**
- Full request/response examples
- Query parameters documentation
- Rate limit information
- Authentication requirements
- Best practices

### 4. [Infrastructure & Deployment](./infrastructure-deployment.md)
**Complete infrastructure guide:**
- Cloud provider comparison (AWS, Azure, GCP)
- Terraform Infrastructure as Code
- AWS services configuration:
  - VPC and networking
  - RDS Aurora PostgreSQL
  - ElastiCache Redis
  - ECS Fargate
  - Application Load Balancer
  - Auto Scaling
  - CloudWatch monitoring
- CI/CD pipeline (GitHub Actions)
- Deployment procedures
- Disaster recovery
- Cost optimization
- Security best practices

---

## Architecture Diagrams

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                          │
│                  (Next.js Admin UI + WebSocket)               │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                        │
│           (Rate Limiting, Auth, Request Validation)          │
└───────────────────────────┬───────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│   REST API     │ │   WebSocket    │ │   Job Queue    │
│   Endpoints    │ │     Server     │ │   (BullMQ)     │
└────────────────┘ └────────────────┘ └────────────────┘
            │               │               │
            └───────────────┼───────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│  Redis Cache   │ │   PostgreSQL   │ │  PostgreSQL    │
│   (Session,    │ │    (Primary)   │ │ (Read Replica) │
│  Permission)   │ │                │ │                │
└────────────────┘ └────────────────┘ └────────────────┘
            │               │               │
            └───────────────┼───────────────┘
                            │
                            ▼
                ┌────────────────────────┐
                │   External Services    │
                │ - Stack Auth           │
                │ - SendGrid/SES (Email) │
                │ - Twilio (SMS)         │
                │ - Analytics            │
                └────────────────────────┘
```

### Request Flow

```
1. User Request
   ↓
2. Load Balancer (SSL Termination)
   ↓
3. Rate Limiter (Redis)
   ↓
4. Authentication Middleware (Stack Auth)
   ↓
5. Authorization Check (Permission Cache)
   ↓
6. Response Cache Check (Redis)
   │
   ├─→ Cache Hit → Return Cached Response
   │
   └─→ Cache Miss
       ↓
       7. Database Query (Primary or Replica)
       ↓
       8. Cache Result (Redis)
       ↓
       9. Return Response
       ↓
       10. Audit Log (Async Queue)
```

### Caching Strategy

```
┌─────────────────────────────────────────────────────┐
│                   Cache Layers                        │
├─────────────────────────────────────────────────────┤
│                                                       │
│  L1: In-Memory Cache (Node.js)                      │
│  └─→ Hot data, 1-2 minute TTL                       │
│                                                       │
│  L2: Redis Cache (Distributed)                      │
│  └─→ User profiles, permissions, 5-10 minute TTL    │
│                                                       │
│  L3: Database Query Cache                            │
│  └─→ Complex aggregations, materialized views       │
│                                                       │
└─────────────────────────────────────────────────────┘

Cache Keys Pattern:
- user:profile:{userId}        (5 min TTL)
- user:perms:{userId}          (10 min TTL)
- user:sessions:{userId}       (1 hour TTL)
- role:perms:{roleId}          (1 hour TTL)
- org:settings:{orgId}         (30 min TTL)
- search:{hash}                (5 min TTL)

Invalidation Events:
- User update → Invalidate user:*, org:users:*
- Role update → Invalidate role:*, all user:perms:*
- Permission change → Invalidate all permission caches
```

### Database Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Write Operations                    │
│                         │                             │
│                         ▼                             │
│              ┌──────────────────┐                    │
│              │  Primary Database │                    │
│              │  (RDS Aurora)     │                    │
│              └──────────────────┘                    │
│                         │                             │
│              ┌──────────┴──────────┐                 │
│              │    Replication      │                 │
│              └──────────┬──────────┘                 │
│                         │                             │
│              ┌──────────┴──────────┐                 │
│              ▼                     ▼                  │
│     ┌────────────────┐    ┌────────────────┐        │
│     │ Read Replica 1 │    │ Read Replica 2 │        │
│     │  (Auto-failover)│    │  (Auto-failover)│        │
│     └────────────────┘    └────────────────┘        │
│              │                     │                  │
│              └─────────┬───────────┘                 │
│                        │                              │
│                        ▼                              │
│              Read-Heavy Operations                    │
│         (User Lists, Reports, Search)                │
└─────────────────────────────────────────────────────┘

Connection Pooling:
- Write Pool: 20 connections (max), 5 (min)
- Read Pool: 15 connections per replica
- Statement Timeout: 30s (write), 10s (read)
- Idle Timeout: 30s
```

---

## Technology Stack

### Backend
- **Framework**: Next.js 15 (API Routes)
- **Runtime**: Node.js 20
- **Language**: TypeScript 5.9
- **Database**: PostgreSQL 15 (via Neon/RDS Aurora)
- **Cache**: Redis 7
- **Queue**: BullMQ
- **ORM**: Raw SQL with prepared statements
- **Validation**: Zod

### Authentication & Authorization
- **Provider**: Stack Auth
- **Strategy**: JWT with refresh tokens
- **Session**: Redis-backed sessions
- **2FA**: SMS via Twilio

### External Services
- **Email**: SendGrid or Amazon SES
- **SMS**: Twilio
- **Monitoring**: DataDog or New Relic
- **Logging**: CloudWatch Logs
- **Error Tracking**: Sentry

### Infrastructure
- **Cloud**: AWS (primary recommendation)
- **Compute**: ECS Fargate
- **Database**: RDS Aurora PostgreSQL
- **Cache**: ElastiCache Redis
- **Load Balancer**: Application Load Balancer
- **CDN**: CloudFront
- **IaC**: Terraform

---

## Key Features

### User Management
- CRUD operations for users
- Bulk import/export (CSV, Excel)
- Advanced search and filtering
- User profile management
- Activity tracking

### Role & Permission Management
- Predefined roles (admin, manager, user, viewer)
- Custom roles with granular permissions
- Permission inheritance
- Role assignment and revocation

### Security
- JWT authentication
- 2FA via SMS
- Session management
- IP-based access control
- Audit logging

### Performance
- Multi-layer caching
- Read replicas for scaling
- Connection pooling
- Query optimization
- Pagination strategies

### Real-time Updates
- WebSocket for live updates
- Server-Sent Events (SSE) alternative
- Notification system
- Activity stream

### Monitoring
- API performance metrics
- Database query monitoring
- Cache hit rates
- Error tracking
- User activity analytics

---

## Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| API Response Time (p95) | <100ms | Caching, query optimization |
| Database Query Time (p95) | <50ms | Indexes, read replicas |
| Cache Hit Rate | >80% | Aggressive caching, warming |
| Background Job Processing | <30s | Concurrency, optimization |
| WebSocket Latency | <50ms | Redis adapter, scaling |
| Uptime | >99.9% | Auto-scaling, health checks |
| Error Rate | <0.1% | Validation, error handling |

---

## Cost Estimates

### Monthly Infrastructure Costs

| Component | Configuration | Monthly Cost |
|-----------|--------------|--------------|
| **Database** | RDS Aurora (Primary + 2 Replicas) | $270 |
| **Cache** | ElastiCache Redis (4GB) | $75 |
| **Compute** | ECS Fargate (2-6 instances) | $300 |
| **Load Balancer** | ALB | $25 |
| **CDN** | CloudFront | $30 |
| **Email** | SendGrid (10k emails/month) | $75 |
| **SMS** | Twilio (500 messages/month) | $50 |
| **Monitoring** | DataDog/New Relic | $100 |
| **Total** | | **$925/month** |

### Development Costs

| Phase | Duration | Team | Cost (@$100/hr) |
|-------|----------|------|-----------------|
| Phase 2 | 2 weeks | 2 devs | $16,000 |
| Phase 3 | 2 weeks | 2 devs | $16,000 |
| Phase 4 | 2 weeks | 2 devs | $16,000 |
| Phase 5 | 2 weeks | 2 devs | $16,000 |
| Phase 6 | 2 weeks | 2 devs | $16,000 |
| **Total** | **10 weeks** | | **$80,000** |

---

## Security Considerations

### Authentication
- JWT tokens with 1-hour expiry
- Refresh tokens with 7-day expiry
- Token rotation on refresh
- Secure HTTP-only cookies

### Authorization
- Role-based access control (RBAC)
- Permission-based access control
- Resource-level permissions
- Permission caching

### Data Protection
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- PII masking in logs
- Data retention policies

### Network Security
- VPC isolation
- Security groups
- Private subnets for databases
- WAF for DDoS protection

### Audit & Compliance
- Complete audit trail
- Activity logging
- Change tracking
- Compliance reports

---

## Scalability Strategy

### Horizontal Scaling
- Auto-scaling ECS services (2-6 instances)
- Read replicas for database
- Redis cluster for caching
- Load balancing across instances

### Vertical Scaling
- Database instance sizing
- Redis memory allocation
- ECS task CPU/memory

### Performance Scaling
- Query optimization
- Index optimization
- Materialized views
- Connection pooling

### Cost Optimization
- Spot instances for non-critical workloads
- Auto-scaling to match demand
- Reserved instances for predictable load
- S3 Intelligent-Tiering for backups

---

## Monitoring & Alerting

### Key Metrics
- API response times (p50, p95, p99)
- Database query performance
- Cache hit rates
- Error rates by endpoint
- Background job metrics
- WebSocket connections

### Alert Thresholds
- API response time >500ms (p95)
- Database CPU >80%
- Cache miss rate >30%
- Error rate >1%
- Failed job rate >5%

### Monitoring Tools
- **APM**: DataDog or New Relic
- **Logging**: CloudWatch Logs
- **Error Tracking**: Sentry
- **Uptime**: Pingdom or UptimeRobot

---

## Timeline

### Phase 2: Core User Management (Week 1-2)
- Database setup with migrations
- User CRUD APIs
- Redis caching layer
- Rate limiting
- Basic testing

### Phase 3: Advanced Features (Week 3-4)
- Role & permission management
- Bulk operations (import/export)
- Background job processing
- Audit logging
- Activity history

### Phase 4: Real-time & Integration (Week 5-6)
- WebSocket server setup
- Stack Auth integration
- Email service integration
- SMS service for 2FA
- Notification system

### Phase 5: Performance & Scale (Week 7-8)
- Read replica setup
- Advanced caching strategies
- Search optimization
- Performance testing
- Load testing

### Phase 6: Monitoring & Polish (Week 9-10)
- Monitoring setup
- Alert configuration
- Analytics integration
- Documentation
- Training materials

**Total Duration**: 10 weeks

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- AWS account (for deployment)
- Terraform installed

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/mantisnxt/admin-panel.git
   cd admin-panel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Run tests**
   ```bash
   npm test
   npm run test:e2e
   ```

### Deployment

1. **Configure Terraform variables**
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars
   ```

2. **Initialize Terraform**
   ```bash
   terraform init
   ```

3. **Plan infrastructure changes**
   ```bash
   terraform plan -var-file="environments/production.tfvars"
   ```

4. **Apply infrastructure changes**
   ```bash
   terraform apply -var-file="environments/production.tfvars"
   ```

5. **Deploy application**
   ```bash
   # Push to main branch triggers CI/CD
   git push origin main
   ```

---

## Support & Resources

### Documentation
- [Architecture Overview](./phase2-admin-panel-architecture.md)
- [API Reference](./api-reference.md)
- [Implementation Guide](./implementation-checklist.md)
- [Infrastructure Guide](./infrastructure-deployment.md)

### Code Examples
- [User Service Implementation](../../src/lib/services/user.service.ts)
- [Cache Manager](../../src/lib/cache/manager.ts)
- [Rate Limiter](../../src/lib/api/rate-limiter.ts)

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/docs/)
- [AWS Documentation](https://docs.aws.amazon.com/)
- [Terraform Documentation](https://www.terraform.io/docs)

### Team Contacts
- **Project Lead**: [Name] - [email]
- **Tech Lead**: [Name] - [email]
- **DevOps Lead**: [Name] - [email]

### Support Channels
- **Slack**: #admin-panel-dev
- **Email**: dev@mantisnxt.com
- **Issues**: https://github.com/mantisnxt/admin-panel/issues

---

## License

Copyright 2025 MantisNXT. All rights reserved.

---

## Changelog

### Version 1.0 (Phase 2-6 Architecture)
- Initial architecture design
- API specifications
- Infrastructure design
- Implementation roadmap
- Cost estimates
- Security considerations

### Next Steps
- Begin Phase 2 implementation
- Set up development environment
- Configure CI/CD pipeline
- Start user management APIs