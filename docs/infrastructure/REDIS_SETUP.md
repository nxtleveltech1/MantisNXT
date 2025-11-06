# Redis Production Setup Guide

## Overview

MantisNXT requires a production-ready Redis instance for:
- **Session Management**: Distributed session storage with TTL
- **Rate Limiting**: Distributed rate limiting across multiple servers
- **Caching**: High-performance caching for API responses
- **Real-time Features**: Pub/sub for real-time notifications

**Estimated Cost**: $10-50/month depending on traffic
**Setup Time**: 15-30 minutes

---

## Option 1: Upstash Redis (Recommended for Vercel)

### Why Upstash?
- ✅ Serverless Redis with REST API (perfect for serverless Next.js)
- ✅ Global edge network (low latency worldwide)
- ✅ Pay-as-you-go pricing (free tier: 10K commands/day)
- ✅ Native Vercel integration
- ✅ No connection pooling issues
- ✅ Automatic scaling

### Pricing
```
Free Tier:
- 10,000 commands/day
- 256 MB storage
- Global replication

Pro Plan ($10/month):
- 100,000 commands/day
- 1 GB storage
- Global replication
- Priority support

Enterprise:
- Custom pricing
- Unlimited commands
- Dedicated infrastructure
```

### Setup Steps

#### 1. Create Upstash Account
```bash
# Visit https://console.upstash.com
# Sign up with GitHub (recommended)
```

#### 2. Create Redis Database
1. Click **"Create Database"**
2. Configure:
   - **Name**: `mantisnxt-production`
   - **Type**: Global (for multi-region) or Regional (for single region)
   - **Region**: Choose closest to your primary users
   - **Eviction**: `allkeys-lru` (recommended)
   - **TLS**: Enabled (always)

3. Click **"Create"**

#### 3. Get Connection Details
```bash
# From database dashboard, copy:
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXxxxxxxxxxxxxxxxxxxxxxxxxx

# For traditional Redis clients (optional):
REDIS_URL=rediss://default:password@your-db.upstash.io:6379
```

#### 4. Configure Environment Variables
```bash
# Add to Vercel project environment variables:
# Project Settings → Environment Variables → Production

REDIS_URL=rediss://default:password@your-db.upstash.io:6379
REDIS_TLS=true
```

#### 5. Verify Connection
```bash
npm run redis:test
```

### Upstash-Specific Configuration

For REST API (serverless-friendly):
```typescript
// src/lib/cache/upstash-client.ts
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})
```

For traditional Redis client:
```typescript
// Use existing redis-client.ts
// Just set REDIS_URL in environment
```

---

## Option 2: AWS ElastiCache (For AWS Deployments)

### Why ElastiCache?
- ✅ Fully managed Redis on AWS
- ✅ VPC integration for security
- ✅ Auto-scaling and multi-AZ
- ✅ Automated backups
- ✅ CloudWatch monitoring

### Pricing
```
cache.t3.micro:
- 2 vCPU, 0.5 GB RAM
- ~$15/month
- Good for dev/staging

cache.t3.small:
- 2 vCPU, 1.58 GB RAM
- ~$30/month
- Good for small production

cache.m5.large:
- 2 vCPU, 6.38 GB RAM
- ~$100/month
- Good for high-traffic production
```

### Setup Steps

#### 1. Create ElastiCache Cluster
```bash
# Using AWS CLI
aws elasticache create-cache-cluster \
  --cache-cluster-id mantisnxt-prod-redis \
  --cache-node-type cache.t3.small \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --cache-parameter-group default.redis7 \
  --snapshot-retention-limit 7 \
  --preferred-maintenance-window sun:05:00-sun:06:00 \
  --port 6379 \
  --tags Key=Project,Value=MantisNXT Key=Environment,Value=Production
```

Or use AWS Console:
1. Navigate to ElastiCache → Redis
2. Click **"Create"**
3. Configure cluster settings
4. Select VPC and security groups
5. Enable encryption (in-transit and at-rest)

#### 2. Configure Security Group
```bash
# Allow inbound on port 6379 from your app servers
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 6379 \
  --source-group sg-app-servers
```

#### 3. Get Connection Endpoint
```bash
aws elasticache describe-cache-clusters \
  --cache-cluster-id mantisnxt-prod-redis \
  --show-cache-node-info

# Output will include primary endpoint
# Example: mantisnxt-prod-redis.xxxxx.cache.amazonaws.com:6379
```

#### 4. Configure Environment Variables
```bash
REDIS_URL=redis://mantisnxt-prod-redis.xxxxx.cache.amazonaws.com:6379
REDIS_TLS=false  # Enable if using in-transit encryption
```

#### 5. Enable Automatic Failover (Recommended)
```bash
# Create replication group for high availability
aws elasticache create-replication-group \
  --replication-group-id mantisnxt-prod-redis-ha \
  --replication-group-description "MantisNXT Production Redis HA" \
  --cache-node-type cache.t3.small \
  --automatic-failover-enabled \
  --num-cache-clusters 2 \
  --engine redis \
  --engine-version 7.0
```

---

## Option 3: Redis Cloud (Standalone)

### Why Redis Cloud?
- ✅ Managed by Redis Labs (creators of Redis)
- ✅ Multi-cloud support (AWS, GCP, Azure)
- ✅ Advanced Redis features (modules, search, JSON)
- ✅ Enterprise-grade SLA (99.999% uptime)

### Pricing
```
Free Tier:
- 30 MB storage
- Shared cluster
- Good for testing only

Essentials ($7/month):
- 250 MB storage
- 5K ops/sec
- Good for small apps

Standard ($49/month):
- 1 GB storage
- 50K ops/sec
- Multi-AZ
- Good for production
```

### Setup Steps

#### 1. Create Redis Cloud Account
```bash
# Visit https://redis.com/cloud
# Sign up with email or GitHub
```

#### 2. Create Subscription
1. Click **"New Subscription"**
2. Select cloud provider (AWS/GCP/Azure)
3. Select region
4. Choose plan (Essentials or Standard)
5. Click **"Create"**

#### 3. Create Database
1. Click **"New Database"**
2. Configure:
   - **Name**: `mantisnxt-production`
   - **Memory**: 1 GB (recommended)
   - **Modules**: None (standard Redis)
   - **Eviction**: `allkeys-lru`

3. Click **"Activate"**

#### 4. Get Connection Details
```bash
# From database dashboard:
REDIS_URL=redis://default:password@redis-xxxxx.cloud.redislabs.com:12345
```

#### 5. Configure Environment Variables
```bash
REDIS_URL=redis://default:password@redis-xxxxx.cloud.redislabs.com:12345
REDIS_TLS=true  # Redis Cloud uses TLS by default
```

---

## Performance Comparison

| Provider | Latency (p95) | Ops/sec | Uptime SLA | Global | Price/Month |
|----------|---------------|---------|------------|--------|-------------|
| **Upstash** | 10-50ms | 100K+ | 99.9% | ✅ Yes | $10-50 |
| **ElastiCache** | 1-5ms | 200K+ | 99.9% | Regional | $30-100 |
| **Redis Cloud** | 5-20ms | 50K+ | 99.999% | ✅ Yes | $49+ |

**Recommendation**:
- **Vercel/Next.js**: Use Upstash (serverless-friendly)
- **AWS EC2/ECS**: Use ElastiCache (lower latency)
- **Enterprise**: Use Redis Cloud (highest SLA)

---

## Connection Configuration

### Environment Variables
```bash
# Required
REDIS_URL=redis://[user]:[password]@[host]:[port]

# Optional
REDIS_TLS=true                    # Use TLS/SSL
REDIS_MAX_RETRIES=3               # Max reconnection attempts
REDIS_SOCKET_TIMEOUT=5000         # Socket timeout (ms)
REDIS_COMMAND_TIMEOUT=5000        # Command timeout (ms)
REDIS_CONNECT_TIMEOUT=10000       # Connection timeout (ms)
REDIS_DB=0                        # Database number (0-15)

# Session configuration
SESSION_TTL=86400                 # Session TTL (24 hours)
SESSION_PREFIX=mantis:session:    # Redis key prefix

# Rate limiting
RATE_LIMIT_WINDOW=60              # Rate limit window (seconds)
RATE_LIMIT_MAX_REQUESTS=100       # Max requests per window
```

### Connection Pool Settings
```typescript
// src/lib/cache/redis-client.ts already configured with:
{
  socket: {
    connectTimeout: 10000,
    reconnectStrategy: (retries) => Math.min(retries * 50, 500)
  },
  lazyConnect: true,
  maxRetriesPerRequest: 3
}
```

---

## Testing Connection

### 1. Test Basic Connectivity
```bash
npm run redis:test
```

### 2. Test Session Storage
```bash
npm run redis:test:sessions
```

### 3. Test Rate Limiting
```bash
npm run redis:test:ratelimit
```

### 4. Manual Testing (Redis CLI)
```bash
# Install redis-cli
npm install -g redis-cli

# Connect to Redis
redis-cli -u $REDIS_URL

# Test commands
PING
SET test "Hello Redis"
GET test
DEL test
```

---

## Monitoring and Alerts

### Key Metrics to Monitor
```yaml
1. Connection Health:
   - redis.connection.active
   - redis.connection.failed
   - redis.reconnections

2. Performance:
   - redis.command.duration (p50, p95, p99)
   - redis.ops_per_second
   - redis.hit_rate (cache hit ratio)

3. Memory:
   - redis.memory.used
   - redis.memory.fragmentation
   - redis.keys.expired

4. Sessions:
   - redis.sessions.active
   - redis.sessions.created
   - redis.sessions.expired

5. Rate Limiting:
   - redis.ratelimit.blocked
   - redis.ratelimit.allowed
```

### Alerting Thresholds
```yaml
Critical:
  - redis.connection.failed > 5/min → Page on-call
  - redis.memory.used > 90% → Scale up immediately
  - redis.command.duration.p95 > 1000ms → Investigate

Warning:
  - redis.connection.failed > 1/min → Investigate
  - redis.memory.used > 80% → Plan scaling
  - redis.command.duration.p95 > 500ms → Optimize queries
  - redis.hit_rate < 70% → Review caching strategy
```

### Setup Monitoring (Upstash)
Upstash provides built-in monitoring dashboard:
1. Navigate to database dashboard
2. View **"Metrics"** tab
3. Monitor commands, latency, storage

### Setup Monitoring (ElastiCache)
```bash
# CloudWatch metrics are automatically created
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name MantisNXT-Redis \
  --dashboard-body file://cloudwatch-dashboard.json
```

### Setup Monitoring (Redis Cloud)
Redis Cloud provides built-in monitoring:
1. Navigate to database dashboard
2. View **"Metrics"** tab
3. Configure alerts under **"Alerts"** settings

---

## Backup and Disaster Recovery

### Upstash
- Automatic continuous backup
- Point-in-time recovery
- No configuration needed

### ElastiCache
```bash
# Automated daily backups (configured during creation)
# Manual backup
aws elasticache create-snapshot \
  --cache-cluster-id mantisnxt-prod-redis \
  --snapshot-name mantisnxt-manual-backup-$(date +%Y%m%d)

# Restore from backup
aws elasticache create-cache-cluster \
  --cache-cluster-id mantisnxt-prod-redis-restored \
  --snapshot-name mantisnxt-manual-backup-20250104
```

### Redis Cloud
- Automatic continuous backup
- Configurable backup intervals
- Cross-region backup replication

---

## Security Best Practices

### 1. Network Security
```bash
# ✅ Always use TLS/SSL in production
REDIS_TLS=true

# ✅ Use VPC/private network (ElastiCache)
# ✅ Enable IP allowlist (Redis Cloud/Upstash)
# ✅ Use AWS PrivateLink (ElastiCache)
```

### 2. Authentication
```bash
# ✅ Use strong passwords (32+ characters)
# ✅ Rotate passwords every 90 days
# ✅ Store passwords in secrets manager (AWS Secrets Manager, Vercel, etc.)
# ❌ Never hardcode passwords in code
```

### 3. Access Control
```bash
# ✅ Use separate Redis instances for dev/staging/production
# ✅ Use different passwords for each environment
# ✅ Restrict access to minimum required IPs
# ✅ Enable audit logging (Enterprise plans)
```

### 4. Data Protection
```bash
# ✅ Enable encryption at rest (ElastiCache, Redis Cloud)
# ✅ Enable encryption in transit (TLS)
# ✅ Set appropriate TTL on all keys
# ✅ Don't store sensitive PII in Redis (use encrypted database instead)
```

---

## Troubleshooting

### Connection Issues
```typescript
// Error: ECONNREFUSED
// Solution: Check if Redis is running and firewall allows connection

// Error: ETIMEDOUT
// Solution: Check network connectivity and security groups

// Error: Authentication failed
// Solution: Verify REDIS_URL includes correct password

// Error: Too many connections
// Solution: Increase connection pool size or scale Redis
```

### Performance Issues
```typescript
// High latency (>100ms)
// 1. Check network latency between app and Redis
// 2. Monitor Redis CPU/memory usage
// 3. Review slow queries (SLOWLOG GET)
// 4. Consider adding read replicas

// Low hit rate (<70%)
// 1. Review cache TTL settings
// 2. Check if cache keys are well-designed
// 3. Monitor cache evictions
```

### Memory Issues
```typescript
// Memory usage high (>80%)
// 1. Review key TTL settings (set TTL on all keys)
// 2. Check for memory leaks (keys never expiring)
// 3. Optimize data structures (use hashes instead of strings)
// 4. Scale up Redis instance
```

---

## Next Steps

1. ✅ Choose Redis provider (Upstash recommended for Vercel)
2. ✅ Create Redis instance
3. ✅ Configure environment variables
4. ✅ Run connection test: `npm run redis:test`
5. ✅ Set up monitoring and alerts
6. ✅ Configure backup retention
7. ✅ Document connection details in secrets manager

**Related Documentation**:
- [Environment Setup](../deployment/ENVIRONMENT_SETUP.md)
- [Deployment Runbook](../deployment/DEPLOYMENT_RUNBOOK.md)
- [Security Best Practices](../security/SECURITY_BEST_PRACTICES.md)
