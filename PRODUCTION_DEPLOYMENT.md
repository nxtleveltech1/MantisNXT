# MantisNXT Production Deployment Guide

Complete production deployment infrastructure for the MantisNXT inventory management system with enterprise-grade security, monitoring, and scalability.

## 🏗️ Infrastructure Overview

This deployment provides:
- **High Security**: SSL/TLS, rate limiting, secrets management, container security
- **Monitoring**: Prometheus, Grafana, Loki, alerting with business metrics
- **Scalability**: Load balancing, horizontal scaling, resource optimization
- **Reliability**: Health checks, automated backups, disaster recovery
- **CI/CD**: Automated testing, security scanning, multi-environment deployment

## 📋 Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: Minimum 50GB SSD
- **CPU**: 4 cores minimum (8 cores recommended)
- **Network**: Static IP with firewall configured

### Required Software
```bash
# Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Additional tools
sudo apt-get update
sudo apt-get install -y curl wget git openssl certbot
```

## 🚀 Quick Start Deployment

### 1. Clone and Setup
```bash
# Clone repository
git clone <your-repo-url> /opt/mantisnxt
cd /opt/mantisnxt

# Generate secrets
./scripts/generate-secrets.sh

# Update Supabase service key
echo "your_actual_supabase_service_role_key" > secrets/supabase_service_key.txt
```

### 2. Environment Configuration
```bash
# Copy and customize environment file
cp .env.production .env

# Edit the following variables:
# - DOMAIN_NAME=your-domain.com
# - NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# - NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
# - Email SMTP settings
# - AWS backup credentials (optional)
```

### 3. SSL Certificate Setup
```bash
# For production with Let's Encrypt
./scripts/ssl-setup.sh --letsencrypt --domain your-domain.com --email admin@your-domain.com

# For development/testing
./scripts/ssl-setup.sh --self-signed --domain localhost
```

### 4. Deploy Application
```bash
# Production deployment
./scripts/deploy-prod.sh

# Monitor deployment
docker-compose -f docker-compose.prod.yml logs -f
```

## 🔧 Detailed Configuration

### Container Architecture

```
Internet --> Nginx Reverse Proxy --> Next.js Application
                                         |
                                         ├── PostgreSQL Database
                                         ├── Redis Cache
                                         ├── Prometheus Metrics
                                         └── Loki Logs
```

### Security Features

#### Network Security
- **Firewall Configuration**: Only essential ports exposed
- **Container Isolation**: Private Docker networks
- **Rate Limiting**: API, login, and upload protection
- **DDoS Protection**: Connection limiting and request throttling

#### Application Security
- **Non-root Containers**: All services run as non-privileged users
- **Read-only Filesystems**: Containers with minimal write access
- **Secret Management**: External secret files, not environment variables
- **Security Headers**: HSTS, CSP, XSS protection, frame options

#### SSL/TLS Configuration
- **Modern Ciphers**: TLS 1.2/1.3 only with secure cipher suites
- **HSTS**: HTTP Strict Transport Security enabled
- **Certificate Management**: Automated Let's Encrypt with renewal

### Monitoring and Alerting

#### Metrics Collection
- **Application Metrics**: Response time, error rates, active sessions
- **Infrastructure Metrics**: CPU, memory, disk, network usage
- **Business Metrics**: Upload success rate, inventory updates
- **Security Metrics**: Failed logins, rate limit violations

#### Alerting Rules
- **Critical**: Application down, database unavailable
- **Warning**: High resource usage, long response times
- **Info**: Container restarts, certificate expiry
- **Security**: Failed login attempts, rate limit exceeded

#### Dashboards
- **Application**: Performance, errors, user activity
- **Infrastructure**: System resources, container health
- **Security**: Security events, access patterns
- **Business**: Inventory metrics, upload statistics

### Backup and Recovery

#### Automated Backups
- **Database**: Daily PostgreSQL dumps with retention
- **Files**: Upload directory backups
- **Configuration**: Container configurations and secrets
- **Storage**: AWS S3 with encryption and versioning

#### Recovery Procedures
```bash
# Database recovery
./scripts/restore.sh --database backup_20231201_020000.sql

# File recovery
./scripts/restore.sh --files uploads_backup_20231201_020000.tar.gz

# Full system recovery
./scripts/restore.sh --full backup_20231201_020000
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline includes:

1. **Security Scanning**: Dependency check, vulnerability assessment
2. **Testing**: Unit tests, integration tests, E2E tests
3. **Quality Gates**: Type checking, linting, coverage requirements
4. **Image Building**: Multi-platform Docker images with security scanning
5. **Deployment**: Automated staging and production deployment
6. **Monitoring**: Health checks and smoke tests post-deployment

### Environment Promotion

```bash
# Development → Staging (automatic on develop branch)
git push origin develop

# Staging → Production (automatic on main branch)
git checkout main
git merge develop
git push origin main
```

## 📊 Operations

### Daily Operations

#### Health Monitoring
```bash
# Check all services
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs app

# Monitor resources
docker stats
```

#### Maintenance Tasks
```bash
# Update application
git pull origin main
./scripts/deploy-prod.sh

# Manual backup
./scripts/backup.sh

# Certificate renewal (automatic via cron)
./scripts/ssl-setup.sh --renew
```

### Scaling Operations

#### Horizontal Scaling
```bash
# Scale application instances
docker-compose -f docker-compose.prod.yml up -d --scale app=3

# Scale database read replicas (requires additional configuration)
docker-compose -f docker-compose.prod.yml up -d --scale postgres-replica=2
```

#### Resource Optimization
```bash
# Monitor resource usage
docker stats --no-stream

# Adjust resource limits in docker-compose.prod.yml
# Restart services with new limits
docker-compose -f docker-compose.prod.yml up -d
```

## 🚨 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs app

# Check database connection
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Verify secrets
ls -la secrets/
```

#### SSL Certificate Issues
```bash
# Verify certificate
./scripts/ssl-setup.sh --verify

# Regenerate certificate
./scripts/ssl-setup.sh --letsencrypt --domain your-domain.com
```

#### Performance Issues
```bash
# Check metrics in Grafana
open http://localhost:3001

# Monitor database performance
docker-compose -f docker-compose.prod.yml exec postgres psql -U mantisnxt -c "SELECT * FROM pg_stat_activity;"

# Check application logs
docker-compose -f docker-compose.prod.yml logs app | grep ERROR
```

### Emergency Procedures

#### Database Emergency
```bash
# Emergency database backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U mantisnxt mantisnxt > emergency_backup.sql

# Restart database service
docker-compose -f docker-compose.prod.yml restart postgres
```

#### Security Incident
```bash
# Block suspicious IPs (add to nginx config)
# Check security logs
docker-compose -f docker-compose.prod.yml logs nginx | grep -E "(401|403|429)"

# Review failed authentication attempts
docker-compose -f docker-compose.prod.yml logs app | grep "auth failed"
```

## 📈 Performance Tuning

### Database Optimization
```sql
-- Enable query optimization
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET track_activity_query_size = 2048;

-- Monitor slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Application Optimization
```bash
# Enable production optimizations in .env
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS=--max-old-space-size=2048

# Configure Redis for optimal caching
REDIS_MAXMEMORY=256mb
REDIS_MAXMEMORY_POLICY=allkeys-lru
```

### Nginx Optimization
```nginx
# Already configured in nginx.prod.conf:
# - Gzip compression
# - HTTP/2 support
# - Connection keep-alive
# - Static file caching
# - Rate limiting
```

## 📚 Additional Resources

### Monitoring URLs
- **Application**: https://your-domain.com
- **Grafana**: https://your-domain.com:3001
- **Prometheus**: http://localhost:9090 (internal only)

### Useful Commands
```bash
# View all containers
docker-compose -f docker-compose.prod.yml ps

# Follow logs
docker-compose -f docker-compose.prod.yml logs -f app

# Execute database commands
docker-compose -f docker-compose.prod.yml exec postgres psql -U mantisnxt

# Generate new secrets
./scripts/generate-secrets.sh

# Deploy with specific options
./scripts/deploy-prod.sh --no-backup --timeout 300
```

### Security Contacts
- **Security Issues**: security@your-domain.com
- **Emergency Contact**: +1-XXX-XXX-XXXX
- **Status Page**: https://status.your-domain.com

---

## 🎯 Next Steps

After successful deployment:

1. **Configure monitoring alerts** for your team communication channels
2. **Setup automated backups** to your preferred cloud storage
3. **Configure domain DNS** to point to your server
4. **Test disaster recovery procedures** with your team
5. **Review security logs** regularly and set up automated reporting
6. **Plan capacity scaling** based on usage patterns
7. **Document runbooks** specific to your operational procedures

For support and questions, refer to the project documentation or contact the development team.