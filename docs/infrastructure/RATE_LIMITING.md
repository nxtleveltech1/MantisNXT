# Rate Limiting Guide

## Overview

MantisNXT uses Redis-based rate limiting with a sliding window algorithm to protect against abuse and ensure fair resource usage.

## Architecture

### Components

1. **Rate Limiter Middleware** (`src/lib/middleware/rate-limiter.ts`)
2. **Redis Backend** (distributed rate limiting)
3. **Sliding Window Algorithm** (accurate request counting)
4. **Configurable Limits** (per endpoint and per user)

### Flow

```
Request → Rate Limiter → Check Redis → Allow/Deny → Response
                            ↓
                    Update Request Count
                            ↓
                    Set/Update Expiration
```

## Configuration

### Environment Variables

```env
# Enable rate limiting
ENABLE_RATE_LIMITING=true

# Default settings
RATE_LIMIT_WINDOW_MS=60000        # 1 minute
RATE_LIMIT_MAX_REQUESTS=60        # 60 requests per minute
RATE_LIMIT_AUTH_MAX=5             # 5 auth attempts per 15 minutes
```

## Preset Rate Limiters

### Authentication Endpoints

```typescript
import { rateLimiters } from '@/lib/middleware/rate-limiter';

// Strict limit: 5 attempts per 15 minutes
const result = await rateLimiters.auth.check(req);
```

**Use for:**
- Login endpoints
- Password reset
- 2FA verification
- Token generation

### Standard API

```typescript
// Standard: 60 requests per minute
const result = await rateLimiters.api.check(req);
```

**Use for:**
- General API endpoints
- Mixed read/write operations

### Read Operations

```typescript
// Lenient: 120 requests per minute
const result = await rateLimiters.read.check(req);
```

**Use for:**
- GET endpoints
- Data retrieval
- Public endpoints

### Write Operations

```typescript
// Strict: 20 requests per minute
const result = await rateLimiters.write.check(req);
```

**Use for:**
- POST/PUT/PATCH/DELETE
- Data mutations
- Resource creation

### Sensitive Operations

```typescript
// Very strict: 3 requests per hour
const result = await rateLimiters.sensitive.check(req);
```

**Use for:**
- Account deletion
- Permission changes
- Security settings
- Export operations

### File Uploads

```typescript
// Moderate: 5 uploads per minute
const result = await rateLimiters.upload.check(req);
```

**Use for:**
- File uploads
- Bulk imports
- Media processing

## Implementation Examples

### Basic Implementation

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters } from '@/lib/middleware/rate-limiter';

export async function POST(req: NextRequest) {
  // Apply rate limit
  const { allowed, info } = await rateLimiters.auth.check(req);

  if (!allowed) {
    return NextResponse.json(
      {
        error: 'Too many attempts',
        retryAfter: info.retryAfter,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': info.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': info.reset.toString(),
          'Retry-After': info.retryAfter.toString(),
        },
      }
    );
  }

  // Process request
  // ...
}
```

### Custom Rate Limiter

```typescript
import { RateLimiter } from '@/lib/middleware/rate-limiter';

// Create custom limiter
const customLimiter = new RateLimiter({
  windowMs: 5 * 60 * 1000,  // 5 minutes
  maxRequests: 10,          // 10 requests
  message: 'Custom rate limit exceeded',
});

// Use in endpoint
export async function POST(req: NextRequest) {
  const { allowed, info } = await customLimiter.check(req);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // ...
}
```

### User-Based Rate Limiting

```typescript
import { createUserRateLimiter } from '@/lib/middleware/rate-limiter';

// Rate limit per user
const userLimiter = createUserRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
});

export async function GET(req: NextRequest) {
  const result = await userLimiter(req);

  if (result) {
    return result; // Rate limit exceeded
  }

  // Process request
  // ...
}
```

### IP-Based Rate Limiting

```typescript
import { createIpRateLimiter } from '@/lib/middleware/rate-limiter';

// Rate limit per IP
const ipLimiter = createIpRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
});

export async function GET(req: NextRequest) {
  const result = await ipLimiter(req);

  if (result) {
    return result; // Rate limit exceeded
  }

  // Process request
  // ...
}
```

### Conditional Rate Limiting

```typescript
export async function POST(req: NextRequest) {
  // Different limits based on user tier
  const userTier = req.headers.get('x-user-tier');

  const limiter = new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: userTier === 'premium' ? 1000 : 60,
  });

  const { allowed, info } = await limiter.check(req);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // ...
}
```

## Response Headers

Rate limit responses include these headers:

```
X-RateLimit-Limit: 60          # Maximum requests allowed
X-RateLimit-Remaining: 45      # Requests remaining
X-RateLimit-Reset: 1641024000  # Unix timestamp when limit resets
Retry-After: 30                # Seconds to wait before retrying
```

## Monitoring

### Check Rate Limit Status

```typescript
import { rateLimiters } from '@/lib/middleware/rate-limiter';

// Get usage info
const usage = await rateLimiters.api.getUsage(req);

console.log({
  limit: usage.limit,
  remaining: usage.remaining,
  reset: new Date(usage.reset),
});
```

### Reset Rate Limit

```typescript
// Reset rate limit for specific identifier
await rateLimiters.api.reset(req);
```

## Best Practices

### 1. Choose Appropriate Limits

```typescript
// Too strict - will frustrate users
maxRequests: 5 per minute for API

// Too lenient - won't prevent abuse
maxRequests: 10000 per minute for auth

// Appropriate
maxRequests: 60 per minute for API
maxRequests: 5 per 15 minutes for auth
```

### 2. Use Different Limits by Endpoint Type

```typescript
// Read endpoints - more lenient
GET /api/products → 120 req/min

// Write endpoints - more strict
POST /api/products → 20 req/min

// Auth endpoints - very strict
POST /api/auth/login → 5 req/15min
```

### 3. Provide Clear Error Messages

```typescript
return NextResponse.json(
  {
    error: 'Rate limit exceeded',
    message: 'Too many login attempts. Please try again in 15 minutes.',
    retryAfter: info.retryAfter,
    limit: info.limit,
  },
  { status: 429 }
);
```

### 4. Implement Tiered Limits

```typescript
const limits = {
  free: { maxRequests: 60 },
  basic: { maxRequests: 300 },
  premium: { maxRequests: 1000 },
  enterprise: { maxRequests: 10000 },
};

const userTier = getUserTier(req);
const limiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: limits[userTier].maxRequests,
});
```

### 5. Log Rate Limit Violations

```typescript
if (!allowed) {
  console.warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.nextUrl.pathname,
    limit: info.limit,
    timestamp: new Date().toISOString(),
  });

  // Send to monitoring service
  // sentry.captureMessage('Rate limit exceeded');
}
```

## Troubleshooting

### Redis Connection Issues

If Redis is unavailable, the rate limiter will **fail open** (allow requests) to prevent service disruption:

```typescript
// Automatic fallback on Redis error
return {
  allowed: true,
  info: { /* default values */ }
};
```

### Rate Limit Too Strict

```typescript
// Temporarily increase limit
const limiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120, // Increased from 60
});

// Or disable for specific IPs
if (TRUSTED_IPS.includes(req.ip)) {
  return; // Skip rate limiting
}
```

### False Positives

```typescript
// Use more granular keys
keyGenerator: (req) => {
  const userId = req.headers.get('x-user-id');
  const path = req.nextUrl.pathname;
  return `${userId}:${path}`; // Per-user, per-endpoint
}
```

## Security Considerations

### 1. Trust Proxy Headers Carefully

```typescript
// Validate X-Forwarded-For
const ip = req.ip || req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

// In production, ensure your load balancer sets this correctly
```

### 2. Prevent Bypasses

```typescript
// Don't allow resetting limits via API
// Admin-only endpoint for rate limit management

// Use signed tokens for user identification
const userId = verifyToken(req.headers.get('authorization'));
```

### 3. Monitor for Abuse

```bash
# Check for patterns in rate limit violations
curl http://localhost:3000/api/metrics | jq '.redis.rate_limit_violations'

# Alert on suspicious activity
if (violations > threshold) {
  alertSecurityTeam();
}
```

### 4. Implement Gradual Backoff

```typescript
// Increase penalty for repeat offenders
const violations = await getViolationCount(req.ip);

const backoffMultiplier = Math.min(violations, 10);
const retryAfter = baseRetryAfter * backoffMultiplier;
```

## Testing

### Unit Tests

```typescript
import { RateLimiter } from '@/lib/middleware/rate-limiter';

describe('RateLimiter', () => {
  it('should allow requests within limit', async () => {
    const limiter = new RateLimiter({
      windowMs: 60000,
      maxRequests: 5,
    });

    for (let i = 0; i < 5; i++) {
      const { allowed } = await limiter.check(req);
      expect(allowed).toBe(true);
    }
  });

  it('should block requests exceeding limit', async () => {
    const limiter = new RateLimiter({
      windowMs: 60000,
      maxRequests: 5,
    });

    // Make 5 allowed requests
    for (let i = 0; i < 5; i++) {
      await limiter.check(req);
    }

    // 6th request should be blocked
    const { allowed } = await limiter.check(req);
    expect(allowed).toBe(false);
  });
});
```

### Integration Tests

```bash
# Test rate limiting
for i in {1..70}; do
  curl http://localhost:3000/api/test
done

# Expected: First 60 succeed, remaining fail with 429
```

## Performance Impact

### Redis Overhead

- **Latency**: ~1-5ms per request
- **Memory**: ~100 bytes per active identifier
- **Network**: Minimal (2 Redis commands per request)

### Optimization Tips

1. **Use connection pooling** (already implemented)
2. **Batch cleanup operations**
3. **Set appropriate TTLs** to auto-expire old entries
4. **Monitor Redis memory usage**

## Migration Guide

### From No Rate Limiting

```typescript
// Before
export async function POST(req: NextRequest) {
  // Process request immediately
}

// After
import { rateLimiters } from '@/lib/middleware/rate-limiter';

export async function POST(req: NextRequest) {
  const { allowed, info } = await rateLimiters.write.check(req);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  // Process request
}
```

### From In-Memory Rate Limiting

Replace in-memory rate limiter with Redis-based for distributed systems.

## Support

For issues or questions:
- Review Redis connection status
- Check rate limit configuration
- Monitor metrics endpoint
- Review application logs
