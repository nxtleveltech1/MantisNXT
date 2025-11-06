# Architecture Diagrams

## 1. High-Level System Architecture

```
╔══════════════════════════════════════════════════════════════════╗
║                         PRESENTATION LAYER                         ║
║                                                                    ║
║  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ║
║  │   Admin UI      │  │  Mobile Apps    │  │  Third-party    │  ║
║  │   (Next.js)     │  │  (React Native) │  │  Integrations   │  ║
║  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  ║
║           │                    │                     │            ║
╚═══════════╪════════════════════╪═════════════════════╪════════════╝
            │                    │                     │
            └────────────────────┴─────────────────────┘
                                 │
╔══════════════════════════════════════════════════════════════════╗
║                         API GATEWAY LAYER                          ║
║                                                                    ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │  CloudFront CDN (SSL/TLS, DDoS Protection)                  │ ║
║  └──────────────────────────┬──────────────────────────────────┘ ║
║                             │                                     ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │  Application Load Balancer                                   │ ║
║  │  - Health Checks                                             │ ║
║  │  - SSL Termination                                           │ ║
║  │  - Path-based Routing                                        │ ║
║  └──────────────────────────┬──────────────────────────────────┘ ║
║                             │                                     ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │  API Gateway Middleware                                      │ ║
║  │  - Rate Limiting (Redis)                                     │ ║
║  │  - Authentication (JWT)                                      │ ║
║  │  - Authorization (RBAC)                                      │ ║
║  │  - Request Validation (Zod)                                  │ ║
║  │  - Response Caching                                          │ ║
║  └──────────────────────────┬──────────────────────────────────┘ ║
║                             │                                     ║
╚═══════════════════════════════╪═════════════════════════════════════╝
                                │
╔══════════════════════════════════════════════════════════════════╗
║                       APPLICATION LAYER                            ║
║                                                                    ║
║  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              ║
║  │  REST API   │  │  WebSocket  │  │  Background │              ║
║  │  Endpoints  │  │   Server    │  │  Job Queue  │              ║
║  │             │  │             │  │   (BullMQ)  │              ║
║  │  - Users    │  │  - Events   │  │             │              ║
║  │  - Roles    │  │  - Realtime │  │  - Imports  │              ║
║  │  - Audit    │  │  - Notify   │  │  - Exports  │              ║
║  │  - Reports  │  │             │  │  - Emails   │              ║
║  └─────────────┘  └─────────────┘  └─────────────┘              ║
║         │                │                 │                      ║
╚═════════╪════════════════╪═════════════════╪══════════════════════╝
          │                │                 │
          └────────────────┴─────────────────┘
                           │
╔══════════════════════════════════════════════════════════════════╗
║                          DATA LAYER                                ║
║                                                                    ║
║  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ║
║  │  Redis Cache    │  │   PostgreSQL    │  │   PostgreSQL    │  ║
║  │                 │  │    (Primary)    │  │  (Read Replica) │  ║
║  │  - Sessions     │  │                 │  │                 │  ║
║  │  - Permissions  │  │  - Users        │  │  - Read Queries │  ║
║  │  - Rate Limits  │  │  - Roles        │  │  - Reports      │  ║
║  │  - Job Queue    │  │  - Audit Logs   │  │  - Analytics    │  ║
║  └─────────────────┘  └─────────────────┘  └─────────────────┘  ║
║                                                                    ║
╚══════════════════════════════════════════════════════════════════╝
                           │
╔══════════════════════════════════════════════════════════════════╗
║                      EXTERNAL SERVICES                             ║
║                                                                    ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           ║
║  │  Stack Auth  │  │   SendGrid   │  │    Twilio    │           ║
║  │ (Auth/Users) │  │   (Email)    │  │    (SMS)     │           ║
║  └──────────────┘  └──────────────┘  └──────────────┘           ║
║                                                                    ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           ║
║  │   DataDog    │  │    Sentry    │  │  CloudWatch  │           ║
║  │ (Monitoring) │  │   (Errors)   │  │   (Logs)     │           ║
║  └──────────────┘  └──────────────┘  └──────────────┘           ║
║                                                                    ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 2. Request Flow Diagram

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ 1. HTTPS Request
       ▼
┌─────────────────────────────────────────────┐
│          CloudFront CDN                      │
│  - SSL/TLS Termination                      │
│  - Static Asset Caching                     │
│  - DDoS Protection                          │
└──────┬──────────────────────────────────────┘
       │ 2. Forward to ALB
       ▼
┌─────────────────────────────────────────────┐
│    Application Load Balancer                │
│  - Health Check Pass?                       │
│  - Route to Target Group                    │
└──────┬──────────────────────────────────────┘
       │ 3. Route to ECS Container
       ▼
┌─────────────────────────────────────────────┐
│         API Gateway Middleware              │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ Step 1: Rate Limiter                 │  │
│  │ - Check Redis counter                │  │
│  │ - Increment counter                  │  │
│  │ - Return 429 if exceeded            │  │
│  └────────────┬─────────────────────────┘  │
│               │ 4. Check rate limit        │
│               ▼                             │
│  ┌──────────────────────────────────────┐  │
│  │ Step 2: Authentication               │  │
│  │ - Verify JWT token                   │  │
│  │ - Check token expiry                 │  │
│  │ - Return 401 if invalid             │  │
│  └────────────┬─────────────────────────┘  │
│               │ 5. Authenticate            │
│               ▼                             │
│  ┌──────────────────────────────────────┐  │
│  │ Step 3: Authorization                │  │
│  │ - Load user permissions (Redis)      │  │
│  │ - Check required permission          │  │
│  │ - Return 403 if unauthorized        │  │
│  └────────────┬─────────────────────────┘  │
│               │ 6. Authorize               │
│               ▼                             │
│  ┌──────────────────────────────────────┐  │
│  │ Step 4: Request Validation           │  │
│  │ - Validate with Zod schema           │  │
│  │ - Sanitize input                     │  │
│  │ - Return 400 if invalid             │  │
│  └────────────┬─────────────────────────┘  │
│               │ 7. Validate                │
│               ▼                             │
│  ┌──────────────────────────────────────┐  │
│  │ Step 5: Cache Check                  │  │
│  │ - Generate cache key                 │  │
│  │ - Check Redis for cached response    │  │
│  │ - Return cached if fresh            │  │
│  └────────────┬─────────────────────────┘  │
│               │ 8. Check cache             │
│               ▼                             │
└───────────────┼─────────────────────────────┘
                │
                │ 9. Process request
                ▼
┌─────────────────────────────────────────────┐
│        Business Logic Layer                 │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ User Service / Role Service / etc    │  │
│  │ - Execute business logic             │  │
│  │ - Prepare database query             │  │
│  └────────────┬─────────────────────────┘  │
│               │ 10. Query database         │
│               ▼                             │
└───────────────┼─────────────────────────────┘
                │
    ┌───────────┴───────────┐
    │                       │
    ▼                       ▼
┌─────────────┐      ┌─────────────┐
│ PostgreSQL  │      │    Redis    │
│  (Primary)  │      │    Cache    │
│             │      │             │
│ - Write ops │      │ - Read ops  │
│ - Read ops  │      │ - Sessions  │
└─────┬───────┘      └─────┬───────┘
      │ 11. Query           │
      │     result          │
      └───────────┬─────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│       Response Processing                   │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ Format response                      │  │
│  │ - Transform data                     │  │
│  │ - Apply projections                  │  │
│  │ - Add metadata                       │  │
│  └────────────┬─────────────────────────┘  │
│               │ 12. Format                 │
│               ▼                             │
│  ┌──────────────────────────────────────┐  │
│  │ Cache response (if applicable)       │  │
│  │ - Store in Redis with TTL            │  │
│  └────────────┬─────────────────────────┘  │
│               │ 13. Cache                  │
│               ▼                             │
│  ┌──────────────────────────────────────┐  │
│  │ Audit log (async)                    │  │
│  │ - Queue audit event                  │  │
│  └────────────┬─────────────────────────┘  │
│               │ 14. Log                    │
│               ▼                             │
└───────────────┼─────────────────────────────┘
                │
                │ 15. Return response
                ▼
         ┌─────────────┐
         │   Client    │
         │  (Browser)  │
         └─────────────┘
```

---

## 3. Database Schema Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                          USERS                               │
├─────────────────────────────────────────────────────────────┤
│ id                  UUID PRIMARY KEY                        │
│ email               VARCHAR(255) UNIQUE NOT NULL            │
│ name                VARCHAR(255) NOT NULL                   │
│ password_hash       VARCHAR(255)                            │
│ role                VARCHAR(50) NOT NULL                    │
│ department          VARCHAR(100)                            │
│ is_active           BOOLEAN DEFAULT true                    │
│ two_factor_enabled  BOOLEAN DEFAULT false                   │
│ profile_image       TEXT                                    │
│ phone               VARCHAR(20)                             │
│ employment_equity   VARCHAR(50)                             │
│ org_id              UUID REFERENCES organizations(id)       │
│ stack_auth_id       VARCHAR(100)                            │
│ created_at          TIMESTAMP DEFAULT NOW()                 │
│ updated_at          TIMESTAMP DEFAULT NOW()                 │
│ deleted_at          TIMESTAMP                               │
│ last_login          TIMESTAMP                               │
│ metadata            JSONB                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
┌────────────────────────────┐  ┌────────────────────────────┐
│       USER_PERMISSIONS     │  │      USER_SESSIONS         │
├────────────────────────────┤  ├────────────────────────────┤
│ id         UUID PK          │  │ id         UUID PK         │
│ user_id    UUID FK → users │  │ user_id    UUID FK → users │
│ permission_id UUID FK       │  │ token      VARCHAR(500)    │
│ granted_at TIMESTAMP        │  │ ip_address VARCHAR(45)     │
│ granted_by UUID FK → users  │  │ user_agent TEXT            │
└────────────────────────────┘  │ expires_at TIMESTAMP       │
                                │ created_at TIMESTAMP       │
                                │ last_activity TIMESTAMP    │
                                └────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                          ROLES                               │
├─────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                            │
│ name            VARCHAR(50) UNIQUE NOT NULL                 │
│ display_name    VARCHAR(100) NOT NULL                       │
│ description     TEXT                                        │
│ is_system       BOOLEAN DEFAULT false                       │
│ org_id          UUID REFERENCES organizations(id)           │
│ created_at      TIMESTAMP DEFAULT NOW()                     │
│ updated_at      TIMESTAMP DEFAULT NOW()                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    ROLE_PERMISSIONS                          │
├─────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                            │
│ role_id         UUID REFERENCES roles(id)                   │
│ permission_id   UUID REFERENCES permissions(id)             │
│ created_at      TIMESTAMP DEFAULT NOW()                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      PERMISSIONS                             │
├─────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                            │
│ name            VARCHAR(100) UNIQUE NOT NULL                │
│ display_name    VARCHAR(100) NOT NULL                       │
│ description     TEXT                                        │
│ category        VARCHAR(50) NOT NULL                        │
│ is_system       BOOLEAN DEFAULT false                       │
│ created_at      TIMESTAMP DEFAULT NOW()                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      AUDIT_LOGS                              │
├─────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                            │
│ user_id         UUID REFERENCES users(id)                   │
│ org_id          UUID REFERENCES organizations(id)           │
│ action          VARCHAR(100) NOT NULL                       │
│ entity_type     VARCHAR(50)                                 │
│ entity_id       UUID                                        │
│ changes         JSONB                                       │
│ ip_address      VARCHAR(45)                                 │
│ user_agent      TEXT                                        │
│ created_at      TIMESTAMP DEFAULT NOW()                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    ACTIVITY_LOGS                             │
├─────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                            │
│ user_id         UUID REFERENCES users(id)                   │
│ org_id          UUID REFERENCES organizations(id)           │
│ type            VARCHAR(50) NOT NULL                        │
│ description     TEXT                                        │
│ ip_address      VARCHAR(45)                                 │
│ user_agent      TEXT                                        │
│ location        VARCHAR(100)                                │
│ metadata        JSONB                                       │
│ created_at      TIMESTAMP DEFAULT NOW()                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     ORGANIZATIONS                            │
├─────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                            │
│ name            VARCHAR(255) NOT NULL                       │
│ slug            VARCHAR(100) UNIQUE NOT NULL                │
│ settings        JSONB                                       │
│ created_at      TIMESTAMP DEFAULT NOW()                     │
│ updated_at      TIMESTAMP DEFAULT NOW()                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Caching Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION SERVER                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            L1: In-Memory Cache                       │  │
│  │         (Node.js Map / LRU Cache)                    │  │
│  │                                                       │  │
│  │  - Hot data (most frequently accessed)               │  │
│  │  - TTL: 30 seconds - 2 minutes                      │  │
│  │  - Size: 100MB per instance                         │  │
│  │  - Eviction: LRU                                    │  │
│  │                                                       │  │
│  │  Examples:                                            │  │
│  │    • Current user session                           │  │
│  │    • Current user permissions                       │  │
│  └──────────────────────────┬───────────────────────────┘  │
│                             │                              │
│                             │ Cache Miss                   │
│                             ▼                              │
└─────────────────────────────┼───────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                 L2: Redis Cache (Distributed)                │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Redis Cluster (Primary + Replica)            │  │
│  │                                                       │  │
│  │  Key Pattern                   TTL      Purpose      │  │
│  │  ────────────────────────────  ──────  ────────────  │  │
│  │  user:profile:{id}             5min    User data    │  │
│  │  user:perms:{id}               10min   Permissions  │  │
│  │  user:sessions:{id}            1hr     Sessions     │  │
│  │  role:perms:{id}               1hr     Role perms   │  │
│  │  org:settings:{id}             30min   Org config   │  │
│  │  org:users:{id}                5min    User list    │  │
│  │  search:{hash}                 5min    Search res   │  │
│  │  ratelimit:{user}:{endpoint}   1min    Rate limit   │  │
│  │                                                       │  │
│  │  Cache Strategies:                                    │  │
│  │    • Write-through for critical data                │  │
│  │    • Read-through for non-critical data             │  │
│  │    • Cache-aside for search results                 │  │
│  └──────────────────────────┬───────────────────────────┘  │
│                             │                              │
│                             │ Cache Miss                   │
│                             ▼                              │
└─────────────────────────────┼───────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│            L3: Database Query Cache / Materialized Views    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          PostgreSQL Materialized Views               │  │
│  │                                                       │  │
│  │  View Name              Refresh     Purpose          │  │
│  │  ──────────────────────  ─────────  ───────────────  │  │
│  │  user_statistics        Hourly      User stats      │  │
│  │  role_analytics         Daily       Role usage      │  │
│  │  audit_summary          Daily       Audit summary   │  │
│  │  activity_trends        Hourly      Activity trends │  │
│  │                                                       │  │
│  │  Query Result Cache:                                  │  │
│  │    • Expensive aggregations                          │  │
│  │    • Report data                                     │  │
│  │    • Analytics queries                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Cache Invalidation Events:
─────────────────────────────
┌────────────────┬─────────────────────────────────────────┐
│ Event          │ Invalidate                              │
├────────────────┼─────────────────────────────────────────┤
│ User created   │ org:users:*, user_statistics           │
│ User updated   │ user:profile:*, user:perms:*, org:users│
│ User deleted   │ user:*, org:users:*, user_statistics   │
│ Role updated   │ role:perms:*, all user:perms:*         │
│ Perm changed   │ role:perms:*, all user:perms:*         │
│ Org updated    │ org:*                                   │
└────────────────┴─────────────────────────────────────────┘

Cache Warming Strategy:
──────────────────────
On application start:
  1. Load system roles and permissions
  2. Pre-populate common org settings
  3. Load frequently accessed users

On user login:
  1. Load user profile
  2. Load user permissions
  3. Load user's org settings

Periodic warming (every hour):
  1. Refresh materialized views
  2. Pre-load popular search queries
  3. Warm cache for active users
```

---

## 5. Auto-Scaling Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Auto-Scaling Triggers                       │
│                                                             │
│  Metric                Threshold      Action                │
│  ─────────────────────  ───────────   ──────────────────    │
│  CPU Utilization       > 70%          Scale Out (+1)       │
│  Memory Utilization    > 80%          Scale Out (+1)       │
│  Request Count         > 1000/target  Scale Out (+1)       │
│  Response Time (p95)   > 500ms        Scale Out (+1)       │
│                                                             │
│  CPU Utilization       < 30%          Scale In (-1)        │
│  Memory Utilization    < 40%          Scale In (-1)        │
│  Request Count         < 300/target   Scale In (-1)        │
│                                                             │
│  Cooldown Periods:                                          │
│    • Scale Out: 60 seconds                                 │
│    • Scale In: 300 seconds (5 minutes)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  ECS Service Configuration                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Desired Count: Variable (2-6 tasks)               │   │
│  │  Minimum: 2 tasks                                   │   │
│  │  Maximum: 6 tasks                                   │   │
│  │                                                      │   │
│  │  Task Definition:                                    │   │
│  │    • CPU: 2 vCPU (2048 units)                      │   │
│  │    • Memory: 4GB (4096 MB)                         │   │
│  │    • Network: awsvpc                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Scaling Scenarios:                                         │
│  ──────────────────                                         │
│                                                             │
│  Low Traffic (Off-peak):                                    │
│    ┌────────┐  ┌────────┐                                  │
│    │ Task 1 │  │ Task 2 │                                  │
│    └────────┘  └────────┘                                  │
│    Capacity: ~2,000 req/sec                                │
│                                                             │
│  Normal Traffic:                                            │
│    ┌────────┐  ┌────────┐  ┌────────┐                     │
│    │ Task 1 │  │ Task 2 │  │ Task 3 │                     │
│    └────────┘  └────────┘  └────────┘                     │
│    Capacity: ~3,000 req/sec                                │
│                                                             │
│  High Traffic (Peak):                                       │
│    ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐        │
│    │ Task 1 │  │ Task 2 │  │ Task 3 │  │ Task 4 │        │
│    └────────┘  └────────┘  └────────┘  └────────┘        │
│    Capacity: ~4,000 req/sec                                │
│                                                             │
│  Maximum Load:                                              │
│    ┌────────┐  ┌────────┐  ┌────────┐                     │
│    │ Task 1 │  │ Task 2 │  │ Task 3 │                     │
│    └────────┘  └────────┘  └────────┘                     │
│    ┌────────┐  ┌────────┐  ┌────────┐                     │
│    │ Task 4 │  │ Task 5 │  │ Task 6 │                     │
│    └────────┘  └────────┘  └────────┘                     │
│    Capacity: ~6,000 req/sec                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Scheduled Scaling (Optional):
────────────────────────────
┌──────────┬──────────────┬────────────┐
│ Time     │ Desired      │ Reason     │
├──────────┼──────────────┼────────────┤
│ 06:00    │ 3 tasks      │ Morning    │
│ 09:00    │ 4 tasks      │ Peak hours │
│ 18:00    │ 3 tasks      │ Evening    │
│ 22:00    │ 2 tasks      │ Night      │
└──────────┴──────────────┴────────────┘

Database Scaling:
────────────────
Primary + 2 Read Replicas

Write Operations → Primary Only
Read Operations → Round-robin across replicas

Auto-scaling for reads:
  • Add replica if CPU > 80%
  • Remove replica if CPU < 30%
  • Min: 2 replicas
  • Max: 5 replicas
```

---

## 6. Monitoring & Alerting Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Monitoring Stack                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Application Metrics                     │   │
│  │  ────────────────────────────────────────           │   │
│  │                                                      │   │
│  │  • API Response Times (p50, p95, p99)              │   │
│  │  • Request Rate (req/sec)                          │   │
│  │  • Error Rate (errors/sec, %)                      │   │
│  │  • Active Users / Sessions                         │   │
│  │  • WebSocket Connections                           │   │
│  │  • Background Job Metrics                          │   │
│  │                                                      │   │
│  │  Tool: DataDog / New Relic                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Infrastructure Metrics                     │   │
│  │  ────────────────────────────────────────           │   │
│  │                                                      │   │
│  │  • CPU Utilization (%)                             │   │
│  │  • Memory Utilization (%)                          │   │
│  │  • Network I/O (MB/s)                              │   │
│  │  • Disk I/O (IOPS)                                 │   │
│  │  • ECS Task Count                                  │   │
│  │                                                      │   │
│  │  Tool: CloudWatch                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             Database Metrics                         │   │
│  │  ────────────────────────────────────────           │   │
│  │                                                      │   │
│  │  • Query Execution Time (ms)                       │   │
│  │  • Connection Pool Usage (%)                       │   │
│  │  • Replication Lag (ms)                            │   │
│  │  • Database CPU/Memory (%)                         │   │
│  │  • Slow Query Count                                │   │
│  │                                                      │   │
│  │  Tool: RDS Performance Insights                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Cache Metrics                           │   │
│  │  ────────────────────────────────────────           │   │
│  │                                                      │   │
│  │  • Cache Hit Rate (%)                              │   │
│  │  • Cache Miss Rate (%)                             │   │
│  │  • Eviction Rate (evictions/sec)                   │   │
│  │  • Memory Usage (%)                                │   │
│  │  • Command Rate (ops/sec)                          │   │
│  │                                                      │   │
│  │  Tool: CloudWatch + Redis INFO                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Error Tracking                          │   │
│  │  ────────────────────────────────────────           │   │
│  │                                                      │   │
│  │  • Exception Stack Traces                          │   │
│  │  • Error Frequency & Trends                        │   │
│  │  • User Impact Analysis                            │   │
│  │  • Release Health                                  │   │
│  │                                                      │   │
│  │  Tool: Sentry                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               Logging                                │   │
│  │  ────────────────────────────────────────           │   │
│  │                                                      │   │
│  │  • Application Logs                                │   │
│  │  • Access Logs                                     │   │
│  │  • Error Logs                                      │   │
│  │  • Audit Logs                                      │   │
│  │                                                      │   │
│  │  Tool: CloudWatch Logs                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Alert Configuration                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Critical Alerts (PagerDuty)                        │   │
│  │  ──────────────────────────────────────             │   │
│  │                                                      │   │
│  │  • Error Rate > 1% for 5 minutes                   │   │
│  │  • API Response Time (p95) > 1s for 5 minutes      │   │
│  │  • Database CPU > 90% for 5 minutes                │   │
│  │  • All instances unhealthy                         │   │
│  │  • Database connection pool exhausted              │   │
│  │                                                      │   │
│  │  Response Time: 5 minutes                           │   │
│  │  Escalation: On-call engineer → CTO (30 min)      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Warning Alerts (Slack)                             │   │
│  │  ──────────────────────────────────────             │   │
│  │                                                      │   │
│  │  • API Response Time (p95) > 500ms for 10 min      │   │
│  │  • Database CPU > 80% for 10 minutes               │   │
│  │  • Cache Hit Rate < 70% for 15 minutes             │   │
│  │  • Memory Usage > 85% for 10 minutes               │   │
│  │  • Failed Job Rate > 5% for 10 minutes             │   │
│  │                                                      │   │
│  │  Response Time: 30 minutes                          │   │
│  │  Channel: #ops-alerts                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Info Alerts (Email)                                │   │
│  │  ──────────────────────────────────────             │   │
│  │                                                      │   │
│  │  • Deployment completed                            │   │
│  │  • Scaling event occurred                          │   │
│  │  • Backup completed                                │   │
│  │  • Certificate expiring in 30 days                 │   │
│  │  • Cost anomaly detected                           │   │
│  │                                                      │   │
│  │  Response Time: Next business day                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Security Layers                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Layer 1: Network Security                          │   │
│  │  ──────────────────────────────────────             │   │
│  │                                                      │   │
│  │  • WAF (Web Application Firewall)                   │   │
│  │    - DDoS Protection                               │   │
│  │    - SQL Injection Prevention                      │   │
│  │    - XSS Protection                                │   │
│  │    - Rate Limiting (IP-based)                      │   │
│  │                                                      │   │
│  │  • VPC Isolation                                    │   │
│  │    - Private Subnets for Databases                 │   │
│  │    - Security Groups                               │   │
│  │    - NACLs                                         │   │
│  │                                                      │   │
│  │  • SSL/TLS Encryption                               │   │
│  │    - TLS 1.3 for all connections                   │   │
│  │    - Certificate Management (ACM)                  │   │
│  │    - HSTS Headers                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Layer 2: Application Security                      │   │
│  │  ──────────────────────────────────────             │   │
│  │                                                      │   │
│  │  • Authentication                                    │   │
│  │    - JWT Tokens (1-hour expiry)                    │   │
│  │    - Refresh Tokens (7-day expiry)                 │   │
│  │    - Token Rotation                                │   │
│  │    - Stack Auth Integration                        │   │
│  │                                                      │   │
│  │  • Authorization                                     │   │
│  │    - Role-Based Access Control (RBAC)              │   │
│  │    - Permission-Based Access Control               │   │
│  │    - Resource-Level Permissions                    │   │
│  │                                                      │   │
│  │  • Input Validation                                 │   │
│  │    - Zod Schema Validation                         │   │
│  │    - XSS Prevention                                │   │
│  │    - SQL Injection Prevention                      │   │
│  │    - CSRF Protection                               │   │
│  │                                                      │   │
│  │  • Rate Limiting                                    │   │
│  │    - Per-user limits                               │   │
│  │    - Per-endpoint limits                           │   │
│  │    - Adaptive rate limiting                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Layer 3: Data Security                             │   │
│  │  ──────────────────────────────────────             │   │
│  │                                                      │   │
│  │  • Encryption at Rest                               │   │
│  │    - RDS Encryption (AES-256)                      │   │
│  │    - Redis Encryption                              │   │
│  │    - S3 Encryption                                 │   │
│  │                                                      │   │
│  │  • Encryption in Transit                            │   │
│  │    - SSL/TLS for all connections                   │   │
│  │    - Database SSL connections                      │   │
│  │    - Redis TLS connections                         │   │
│  │                                                      │   │
│  │  • Data Masking                                     │   │
│  │    - PII masking in logs                           │   │
│  │    - Email obfuscation in UI                       │   │
│  │    - Credit card masking                           │   │
│  │                                                      │   │
│  │  • Backup Security                                  │   │
│  │    - Encrypted backups                             │   │
│  │    - Cross-region replication                      │   │
│  │    - Point-in-time recovery                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Layer 4: Secrets Management                        │   │
│  │  ──────────────────────────────────────             │   │
│  │                                                      │   │
│  │  • AWS Secrets Manager                              │   │
│  │    - Database credentials                          │   │
│  │    - API keys                                      │   │
│  │    - OAuth secrets                                 │   │
│  │    - Automatic rotation                            │   │
│  │                                                      │   │
│  │  • Environment Variables                            │   │
│  │    - No secrets in code                            │   │
│  │    - No secrets in Git                             │   │
│  │    - Encrypted in transit                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Layer 5: Audit & Compliance                        │   │
│  │  ──────────────────────────────────────             │   │
│  │                                                      │   │
│  │  • Audit Logging                                    │   │
│  │    - All user actions logged                       │   │
│  │    - All admin actions logged                      │   │
│  │    - All permission changes logged                 │   │
│  │    - Immutable audit trail                         │   │
│  │                                                      │   │
│  │  • Compliance                                       │   │
│  │    - GDPR compliance                               │   │
│  │    - SOC 2 Type II                                 │   │
│  │    - Data retention policies                       │   │
│  │    - Right to be forgotten                         │   │
│  │                                                      │   │
│  │  • Security Monitoring                              │   │
│  │    - Failed login attempts                         │   │
│  │    - Unusual access patterns                       │   │
│  │    - Privilege escalation attempts                 │   │
│  │    - Data exfiltration detection                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

These diagrams provide a visual reference for:
1. **System Architecture**: Overall system components and data flow
2. **Request Flow**: Detailed request processing pipeline
3. **Database Schema**: Data model and relationships
4. **Caching Architecture**: Multi-layer caching strategy
5. **Auto-Scaling**: Dynamic resource allocation
6. **Monitoring & Alerting**: Observability stack
7. **Security Architecture**: Multi-layer security approach

Use these diagrams in conjunction with the detailed documentation:
- [Architecture Overview](./phase2-admin-panel-architecture.md)
- [API Reference](./api-reference.md)
- [Implementation Guide](./implementation-checklist.md)
- [Infrastructure Guide](./infrastructure-deployment.md)