# MantisNXT Deployment Guide

## 📋 Pre-Deployment Checklist

### Environment Setup
- [ ] Configure `.env.production` with production credentials
- [ ] Set up production database (PostgreSQL)
- [ ] Configure environment variables (see below)
- [ ] Verify database connection
- [ ] Test API endpoints

### Build & Validation
- [ ] Run `npm run build` successfully
- [ ] Run `npm run type-check` (no errors)
- [ ] Run `npm run lint` (no critical issues)
- [ ] Verify all tests pass
- [ ] Check bundle size

### Security
- [ ] JWT_SECRET configured
- [ ] Database credentials secured
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Audit logging enabled
- [ ] Security headers configured

## 🚀 Deployment Steps

### 1. Environment Configuration

Create `.env.production` with:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database
NEON_DATABASE_URL=postgresql://user:password@host:5432/database

# Authentication
JWT_SECRET=your-production-secret-key-min-32-chars
JWT_EXPIRES_IN=24h
ALLOW_PUBLIC_GET_ENDPOINTS=/api/suppliers,/api/inventory,/api/health

# Caching
CACHE_TTL_SECONDS=60
# REDIS_URL=redis://user:password@host:6379 (optional)

# API Configuration
API_BASE_URL=https://your-domain.com/api
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Security
ENABLE_RATE_LIMITING=true
ALLOW_PUBLIC_GET_ENDPOINTS=/api/health
CACHE_TTL_SECONDS=60
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000

# File Upload
UPLOAD_DIR=/app/uploads
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

# Environment
NODE_ENV=production
```

### 2. Database Setup

```bash
# Run database migrations
npm run db:migrate

# Verify database schema
npm run db:validate

# Seed initial data (optional)
npm run db:seed
```

### 3. Build Application

```bash
# Install dependencies
npm ci --production

# Build for production
npm run build

# Verify build
npm run type-check
```

### 4. Start Production Server

```bash
# Using PM2 (recommended)
pm2 start npm --name "mantisnxt" -- start

# Or using Node directly
npm start
```

### 5. Verify Deployment

Check these endpoints:
- ✅ https://your-domain.com/api/health
- ✅ https://your-domain.com/api/auth/status
- ✅ https://your-domain.com/api/suppliers
- ✅ https://your-domain.com/api/inventory
- ✅ https://your-domain.com/api/ai/tasks/{taskId}
- ✅ https://your-domain.com

## 🔒 Security Configuration

### Required Environment Variables

```env
# Critical Security Settings
JWT_SECRET=<strong-random-secret>
DATABASE_URL=<production-database-url>
NODE_ENV=production
ENABLE_RATE_LIMITING=true
ALLOW_PUBLIC_GET_ENDPOINTS=/api/health
CACHE_TTL_SECONDS=60
```

### Recommended Security Headers

The application includes security headers for:
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Strict-Transport-Security
- Content-Security-Policy

## 📊 Monitoring & Logging

### Health Check Endpoint

Monitor application health:
```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "MantisNXT API is healthy",
  "timestamp": "2025-10-24T14:48:06.133Z",
  "version": "1.0.0",
  "status": "operational"
}
```

### Audit Logging

Audit logs are automatically generated for:
- User authentication events
- Data access events
- Security events
- System events

Access audit logs via:
```bash
curl https://your-domain.com/api/audit/logs
```

## 🗄️ Database Migration

### Initial Setup

```bash
# Create database
createdb mantisnxt_production

# Run migrations
npm run db:migrate

# Verify schema
npm run db:validate
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Error
**Error:** `Error: connect ECONNREFUSED`
**Solution:** Verify DATABASE_URL is correct and database is accessible

#### 2. JWT Authentication Error
**Error:** `Invalid token`
**Solution:** Verify JWT_SECRET is set and matches across instances

#### 3. Build Errors
**Error:** `Module not found`
**Solution:** Run `npm ci` to ensure dependencies are installed

### Logs

View application logs:
```bash
# PM2 logs
pm2 logs mantisnxt

# System logs
journalctl -u mantisnxt
```

## 🔄 Update Process

### 1. Backup
```bash
# Backup database
pg_dump mantisnxt_production > backup.sql

# Backup uploads
tar -czf uploads_backup.tar.gz /app/uploads
```

### 2. Deploy
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm ci

# Run migrations
npm run db:migrate

# Build
npm run build

# Restart
pm2 restart mantisnxt
```

## 📈 Performance Optimization

### Recommended Settings

```env
# Connection Pooling
DB_POOL_MAX=20
DB_POOL_MIN=5

# Caching
CACHE_ENABLED=true
CACHE_TTL=3600

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000
```

## ✅ Post-Deployment Verification

- [ ] Health check returns 200 OK
- [ ] Authentication working
- [ ] All API endpoints responding
- [ ] Database queries working
- [ ] File uploads working
- [ ] No errors in logs
- [ ] Performance within acceptable limits

---

**Last Updated:** October 24, 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅
