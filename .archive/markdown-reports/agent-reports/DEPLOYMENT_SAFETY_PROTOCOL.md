# DEPLOYMENT SAFETY PROTOCOL
## MantisNXT Repository Cleanup - Phase 1 Analysis

**Version:** 1.0
**Date:** 2025-10-22
**Agent:** Agent 3 - Deployment Safety
**Status:** ANALYSIS COMPLETE - AWAITING APPROVAL

---

## EXECUTIVE SUMMARY

This protocol ensures ZERO production impact during the comprehensive cleanup of 200+ files. Analysis reveals that while the build currently has TypeScript errors, the deployment pipeline and infrastructure are well-structured and can be safely maintained through the cleanup process.

**CRITICAL FINDING:** Database credentials in `.env.local` must be removed from git tracking before archiving.

---

## 1. BUILD & DEPLOYMENT REQUIREMENTS ANALYSIS

### 1.1 Production Build Dependencies

**Build Command:** `npm run build`
- **Sequence:** `npm run type-check && next build`
- **Current Status:** ⚠️ TypeScript errors present (blocking production builds)
- **Build Output:** `.next/standalone/` (Docker production image)

**Critical Build Files (DO NOT ARCHIVE):**
```
✓ package.json                     # Dependencies & scripts
✓ package-lock.json                # Locked versions
✓ next.config.js                   # Next.js build config
✓ tsconfig.json                    # TypeScript config
✓ tailwind.config.js               # CSS framework
✓ postcss.config.js                # CSS processing
✓ .eslintrc.json                   # Code quality
✓ jest.config.js                   # Testing framework
✓ playwright.config.ts             # E2E testing
✓ babel.config.test.js             # Test transpilation
```

**Deployment-Critical Directories:**
```
✓ src/                             # Application source
✓ lib/                             # Shared libraries
✓ public/                          # Static assets
✓ database/schema/                 # Production schema
✓ migrations/                      # Database migrations
```

### 1.2 CI/CD Pipeline Analysis

#### GitHub Actions (`.github/workflows/`)

**ci-cd.yml** - Full production pipeline:
- **Stages:** security-scan → test → build → deploy-staging → deploy-production
- **Critical dependencies:**
  - PostgreSQL 15 (service container)
  - Redis 7 (service container)
  - Playwright browsers
  - Node.js 18

**Required for deployment:**
- ✓ All test suites passing
- ✓ Type checking clean
- ✓ Security audit passing
- ✓ Docker image builds (3 variants: app, migrations, backup)
- ✓ Trivy security scanning
- ✓ Health checks: `/api/health`
- ✓ Smoke tests with `@smoke` tag

**Deployment targets:**
- **Staging:** `develop` branch → staging environment
- **Production:** `main` branch → production environment (requires staging success)

**testing.yml** - Comprehensive test matrix:
- **Test Suites:** api, components, utils, business-logic
- **Quality Gates:** 80% coverage threshold
- **Performance Tests:** Nightly scheduled + manual trigger
- **Security Tests:** npm audit + ESLint security rules
- **Accessibility Tests:** axe-core WCAG 2.0 AA compliance

#### GitLab CI (`.gitlab-ci.yml`)

**Stages:** install → lint → test → build → validate → e2e → deploy
- **Browser validation:** Chrome DevTools MCP integration
- **Database validation:** Schema verification against Neon
- **Manual deployment gates:** staging & production require approval

### 1.3 Docker Configuration Analysis

**Production Images (DO NOT ARCHIVE):**

1. **Dockerfile.prod** (Main application)
   - Multi-stage build: base → deps → builder → runner
   - Security hardening: non-root user (nextjs:1001)
   - Health check: `/api/health` endpoint
   - Output: `standalone` build with `.next/static`

2. **Dockerfile.migrations** (Database migrations)
   - Referenced in CI/CD pipeline
   - Required for deployment jobs

3. **Dockerfile.backup** (Automated backups)
   - Part of production stack
   - S3 integration for backups

**Docker Compose Files:**

- **docker-compose.prod.yml** (PRODUCTION - DO NOT MODIFY)
  - Full stack: app (2 replicas), postgres, redis, nginx, monitoring
  - **Security features:**
    - Read-only containers
    - Dropped capabilities
    - Secrets management (not in git)
    - Resource limits
    - Health checks on all services

  **Monitoring stack:**
  - Prometheus (metrics)
  - Grafana (visualization)
  - Loki (log aggregation)
  - Promtail (log collection)
  - Node Exporter (system metrics)
  - Cadvisor (container metrics)

- **docker-compose.yml** (Base configuration)
- **docker-compose.dev.yml** (Development overrides)
- **docker-compose.staging.yml** (Staging overrides)

---

## 2. ENVIRONMENT CONFIGURATION STRATEGY

### 2.1 Current Environment Files

```
.env.example          ✓ KEEP - Repository template
.env.local            ⚠️ SECURITY RISK - Contains live database credentials
.env.production       ✓ KEEP - Production template (placeholders only)
```

### 2.2 Security Analysis

**CRITICAL SECURITY ISSUE FOUND:**

`.env.local` contains **LIVE PRODUCTION DATABASE CREDENTIALS**:
```bash
# LIVE Neon PostgreSQL credentials (SHOULD NOT BE IN GIT)
DATABASE_URL=postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require

# Live JWT secrets (SHOULD NOT BE IN GIT)
JWT_SECRET=enterprise_jwt_secret_key_2024_production
SESSION_SECRET=enterprise_session_secret_key_2024
```

**IMMEDIATE ACTION REQUIRED BEFORE CLEANUP:**

1. **Remove `.env.local` from git tracking:**
   ```bash
   git rm --cached .env.local
   echo ".env.local" >> .gitignore
   ```

2. **Rotate compromised credentials:**
   - Neon database password
   - JWT secret
   - Session secret

### 2.3 Recommended Environment File Strategy

**Development Workflow:**
```
.env.example          → Committed to repo (template with placeholders)
.env.local            → Gitignored (developer's local config)
.env.production       → Committed to repo (template for deployment)
```

**Production Deployment:**
```
Environment variables → Injected via CI/CD secrets
Docker secrets        → Mounted at runtime (/run/secrets/*)
Secret files          → ./secrets/*.txt (gitignored)
```

**Required secrets directories (create if missing):**
```bash
secrets/
├── postgres_password.txt          # DO NOT COMMIT
├── supabase_service_key.txt       # DO NOT COMMIT
├── jwt_secret.txt                 # DO NOT COMMIT
└── grafana_password.txt           # DO NOT COMMIT
```

### 2.4 Environment Variables Required for Deployment

**Build-time (Docker ARG):**
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_APP_ENV

**Runtime (Container ENV):**
- NODE_ENV=production
- DATABASE_URL (Neon PostgreSQL with SSL)
- REDIS_URL
- JWT_SECRET (via Docker secret)
- UPLOAD_MAX_SIZE
- UPLOAD_DIR

**CI/CD Secrets (GitHub/GitLab):**
- STAGING_SSH_KEY, STAGING_USER, STAGING_HOST, STAGING_URL
- PRODUCTION_SSH_KEY, PRODUCTION_USER, PRODUCTION_HOST, PRODUCTION_URL
- SLACK_WEBHOOK_URL (deployment notifications)
- GITHUB_TOKEN (container registry)

---

## 3. PRE-CLEANUP VALIDATION CHECKLIST

### 3.1 Build Validation

```bash
# These commands MUST pass before archiving any files
[ ] npm ci                          # Clean install
[ ] npm run type-check              # TypeScript validation
[ ] npm run lint                    # ESLint checks
[ ] npm run format:check            # Prettier formatting
[ ] npm run build                   # Production build
[ ] npm run test                    # Unit tests
[ ] npm run test:e2e                # E2E tests (optional for cleanup)
```

**Current Status:**
- ❌ `npm run build` - FAILING (TypeScript errors in v2 API routes and lib/database)
- ⚠️ Must be fixed BEFORE cleanup or exclude problematic files from cleanup

### 3.2 Docker Build Validation

```bash
[ ] docker build -f Dockerfile.prod -t mantisnxt:test .
[ ] docker build -f Dockerfile.migrations -t mantisnxt-migrations:test .
[ ] docker build -f Dockerfile.backup -t mantisnxt-backup:test .
```

### 3.3 CI/CD Pipeline Validation

```bash
[ ] .github/workflows/ci-cd.yml validates
[ ] .github/workflows/testing.yml validates
[ ] .gitlab-ci.yml validates
[ ] All referenced scripts exist
[ ] All referenced secrets documented
```

### 3.4 Database Migration Validation

```bash
[ ] database/schema/ contains valid SQL
[ ] migrations/ directory structure intact
[ ] Migration scripts reference correct paths
```

### 3.5 Environment Configuration Validation

```bash
[ ] .env.example has all required variables
[ ] .env.production has all required variables (with placeholders)
[ ] .env.local removed from git tracking
[ ] secrets/ directory in .gitignore
```

---

## 4. POST-CLEANUP VALIDATION CHECKLIST

### 4.1 Immediate Post-Cleanup Tests

```bash
# Run immediately after archiving files
[ ] npm ci                          # Verify dependencies intact
[ ] npm run type-check              # Verify no broken imports
[ ] npm run lint                    # Verify code quality
[ ] npm run build                   # Verify production build
[ ] npm run test                    # Verify tests pass
```

### 4.2 Import Resolution Check

```bash
# Check for broken imports from archived files
[ ] No import errors from .archive/
[ ] No require() errors from archived scripts
[ ] No missing module errors
```

### 4.3 Script Dependency Check

```bash
# Verify package.json scripts still work
[ ] npm run stabilize               # System stabilizer
[ ] npm run monitor:check           # Resource monitor
[ ] npm run db:validate             # Database validation
[ ] npm run ai:verify               # AI provider verification
```

### 4.4 Docker Build Verification

```bash
[ ] docker-compose -f docker-compose.prod.yml config  # Validate syntax
[ ] docker build -f Dockerfile.prod .                 # Build succeeds
[ ] No COPY errors for archived files
```

### 4.5 CI/CD Pipeline Verification

```bash
[ ] GitHub Actions workflow syntax valid
[ ] GitLab CI pipeline syntax valid
[ ] All referenced paths still exist
[ ] No broken script references
```

---

## 5. ARCHIVE DIRECTORY STRUCTURE

### 5.1 Proposed Structure

```
.archive/
├── README.md                       # Index with archive dates
├── ROLLBACK_INSTRUCTIONS.md        # Recovery procedures
├── ARCHIVE_MANIFEST.md             # File → archive location mapping
│
├── 2025-10-22-comprehensive-cleanup/
│   ├── markdown-reports/           # Agent reports, analysis docs
│   │   ├── analysis/               # .json analysis files
│   │   ├── reports/                # .md report files
│   │   └── documentation/          # Technical docs
│   │
│   ├── scripts/                    # One-time migration scripts
│   │   ├── data-migration/         # Data transformation scripts
│   │   ├── schema-migration/       # Database schema scripts
│   │   ├── analysis/               # Diagnostic scripts
│   │   └── testing/                # Test validation scripts
│   │
│   ├── configs/                    # Superseded configurations
│   │   ├── docker/                 # Old Dockerfiles
│   │   ├── eslint/                 # Old linting configs
│   │   └── testing/                # Old test configs
│   │
│   ├── validation-reports/         # Historical validation results
│   │   ├── performance/            # Performance test results
│   │   ├── coverage/               # Test coverage reports
│   │   └── security/               # Security audit results
│   │
│   └── miscellaneous/              # Uncategorized archival
│       ├── duplicate-files/        # Identified duplicates
│       ├── superseded-code/        # Old implementations
│       └── experimental/           # Proof-of-concept code
│
└── logs/                           # Archive operation logs
    └── 2025-10-22-cleanup.log      # Detailed log of archived files
```

### 5.2 Archive Metadata Requirements

**README.md** must contain:
- Archive date and author
- Reason for archival
- File count and total size
- Cleanup scope summary

**ARCHIVE_MANIFEST.md** must contain:
- Original path → Archive path mapping
- File hash (SHA-256) for integrity
- Archive reason (migration script, duplicate, superseded, etc.)
- Safe-to-delete date (recommendation)

**ROLLBACK_INSTRUCTIONS.md** must contain:
- Step-by-step restoration procedure
- Dependency resolution steps
- Verification checklist
- Emergency contact information

### 5.3 Archive Exclusions (NEVER ARCHIVE)

```
# Critical build files
package.json, package-lock.json, tsconfig.json, next.config.js

# Production configurations
Dockerfile.prod, Dockerfile.migrations, Dockerfile.backup
docker-compose.prod.yml, docker-compose.yml

# CI/CD pipelines
.github/workflows/*
.gitlab-ci.yml

# Environment templates
.env.example, .env.production

# Active source code
src/, lib/, public/

# Active database files
database/schema/, migrations/

# Active scripts (verify in package.json)
scripts/dev-server-manager.js
scripts/system-stabilizer.js
scripts/system-resource-monitor.js
scripts/backup.sh
scripts/run-migration.ts
scripts/verify-migration.ts
scripts/validate-database.ts
```

---

## 6. ROLLBACK PROCEDURE

### 6.1 Full Restoration

If cleanup causes deployment issues:

```bash
# 1. Stop deployment
git revert <cleanup-commit-sha>

# 2. Restore from archive
cp -r .archive/2025-10-22-comprehensive-cleanup/* ./

# 3. Verify restoration
npm ci
npm run build
npm run test

# 4. Redeploy previous working version
git push origin main --force
```

### 6.2 Partial Restoration

If specific file needed:

```bash
# 1. Locate in manifest
cat .archive/ARCHIVE_MANIFEST.md | grep "filename"

# 2. Copy back to original location
cp .archive/path/to/file ./original/path/

# 3. Verify
npm run build
```

### 6.3 Emergency Rollback

If production is down:

```bash
# 1. Immediate revert to last known good commit
git reset --hard <last-good-commit>
git push origin main --force

# 2. Trigger production deployment
# (via CI/CD or manual SSH deployment)

# 3. Investigate archive impact
# 4. Plan corrective action
```

---

## 7. DEPLOYMENT IMPACT ASSESSMENT

### 7.1 Risk Matrix

| Category | Risk Level | Impact | Mitigation |
|----------|-----------|---------|------------|
| **Build Failure** | 🟨 MEDIUM | Cannot deploy new versions | Pre-cleanup build validation required |
| **Import Resolution** | 🟨 MEDIUM | Runtime errors | Post-cleanup import verification |
| **CI/CD Pipeline** | 🟩 LOW | Pipeline failures | Validate workflow syntax |
| **Docker Build** | 🟩 LOW | Container build failures | Test Docker builds before merge |
| **Database Migrations** | 🟩 LOW | Migration failures | Preserve all migration files |
| **Secret Exposure** | 🟥 HIGH | Security breach | Remove .env.local, rotate credentials |

### 7.2 Zero-Downtime Strategy

**Approach:** Archive → Test → Deploy (No production impact)

1. **Archive Phase** (Day 1)
   - Create archive branch: `cleanup/comprehensive-archive-2025-10-22`
   - Move files to .archive/
   - Commit with detailed manifest
   - Push to GitHub (NOT to main)

2. **Validation Phase** (Day 2)
   - Run full test suite on archive branch
   - Build Docker images
   - Test CI/CD pipeline in staging
   - Fix any broken imports/references

3. **Review Phase** (Day 3)
   - Code review of archival changes
   - Verification of manifest completeness
   - Security review of any exposed configs
   - Approval from project lead

4. **Deployment Phase** (Day 4)
   - Merge to `develop` branch
   - Deploy to staging environment
   - Monitor for 24 hours
   - Merge to `main` (production)

**Production deployment unaffected until final merge to main**

---

## 8. CRITICAL FINDINGS & RECOMMENDATIONS

### 8.1 Immediate Security Actions

🔴 **CRITICAL - MUST FIX BEFORE CLEANUP:**

1. **Remove `.env.local` from git tracking**
   ```bash
   git rm --cached .env.local
   git commit -m "security: Remove .env.local with exposed credentials"
   git push origin main
   ```

2. **Rotate exposed credentials**
   - Neon database password: `npg_84ELeCFbOcGA`
   - JWT secret: `enterprise_jwt_secret_key_2024_production`
   - Session secret: `enterprise_session_secret_key_2024`

3. **Update .gitignore**
   ```
   .env.local
   .env.*.local
   secrets/
   *.pem
   *.key
   ```

### 8.2 Build Issues to Resolve

⚠️ **BLOCKING PRODUCTION BUILDS:**

TypeScript errors in:
- `src/app/api/v2/inventory/*` (Route handler signature mismatch)
- `lib/data-import/BulkPriceListProcessor.ts` (Missing module imports)
- `lib/database/neon-connection.ts` (Type mismatch)

**Recommendation:** Fix these before archiving OR exclude from cleanup scope.

### 8.3 Scripts Classification

**Build-Critical Scripts (DO NOT ARCHIVE):**
```
✓ scripts/dev-server-manager.js
✓ scripts/system-stabilizer.js
✓ scripts/system-resource-monitor.js
✓ scripts/backup.sh
✓ scripts/run-migration.ts
✓ scripts/verify-migration.ts
✓ scripts/validate-database.ts
```

**Safe to Archive (Migration/Analysis Scripts):**
```
→ scripts/*_processor.py                 (One-time data processing)
→ scripts/analyze_*.js                   (Analysis utilities)
→ scripts/check_*.js                     (Diagnostic scripts)
→ scripts/apply_*.js                     (One-time schema migrations)
→ scripts/agent*.js                      (Development phase scripts)
→ scripts/import_*.ts                    (Data import utilities)
```

### 8.4 Monitoring & Observability

✅ **Production stack has excellent monitoring:**
- Prometheus + Grafana (metrics & visualization)
- Loki + Promtail (log aggregation)
- Node Exporter (system metrics)
- Cadvisor (container metrics)
- Health checks on all services

**Ensure monitoring continues post-cleanup:**
- `/api/health` endpoint functional
- Prometheus scrape configs intact
- Log collection paths valid

---

## 9. APPROVAL GATES

### 9.1 Pre-Cleanup Approval Requirements

- [ ] Security review completed (credentials rotated)
- [ ] Build validation passed (all tests green)
- [ ] Docker build validation passed
- [ ] Archive manifest reviewed and approved
- [ ] Rollback procedure tested in staging
- [ ] Project lead sign-off

### 9.2 Post-Cleanup Verification

- [ ] All validation tests passed
- [ ] Staging deployment successful
- [ ] No production incidents for 24h
- [ ] Monitoring confirms no errors
- [ ] Team has reviewed changes

---

## 10. CONTACTS & ESCALATION

**For deployment issues:**
- Primary: Project Lead
- Secondary: DevOps Team
- Emergency: Revert to last known good commit

**For security issues:**
- Immediate: Rotate credentials
- Notify: Security team
- Document: Incident report

---

## APPENDIX A: ENVIRONMENT VARIABLE REFERENCE

### Required for Production Build

```bash
# Build-time variables (Docker ARG)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_ENV=production

# Runtime variables (Container ENV)
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
REDIS_URL=redis://:password@redis:6379
JWT_SECRET=<32+ characters>
SESSION_SECRET=<32+ characters>
UPLOAD_MAX_SIZE=10485760
UPLOAD_DIR=/app/uploads

# Optional features
ENABLE_ANALYTICS=true
ENABLE_AUDIT_LOGGING=true
ENABLE_RATE_LIMITING=true
LOG_LEVEL=info
METRICS_ENABLED=true
```

### Required for CI/CD

```bash
# GitHub Actions Secrets
STAGING_SSH_KEY
STAGING_USER
STAGING_HOST
STAGING_URL
PRODUCTION_SSH_KEY
PRODUCTION_USER
PRODUCTION_HOST
PRODUCTION_URL
SLACK_WEBHOOK_URL
GITHUB_TOKEN (auto-provided)

# GitLab CI Variables
Same as GitHub + any GitLab-specific vars
```

---

## APPENDIX B: DOCKER SECRETS SETUP

**Production deployment requires these secret files:**

```bash
# Create secrets directory (gitignored)
mkdir -p secrets/

# Generate strong secrets
openssl rand -base64 32 > secrets/postgres_password.txt
openssl rand -base64 32 > secrets/jwt_secret.txt
openssl rand -base64 32 > secrets/grafana_password.txt

# Supabase service key (from Supabase dashboard)
echo "your_supabase_service_key" > secrets/supabase_service_key.txt

# Secure permissions
chmod 600 secrets/*.txt
```

**Deploy to production server:**
```bash
# Copy secrets to production server
scp -r secrets/ user@production-server:/opt/mantisnxt/secrets/

# Ensure correct ownership
ssh user@production-server "chown -R root:docker /opt/mantisnxt/secrets/"
```

---

## APPENDIX C: VALIDATION SCRIPT

Save as `scripts/validate-deployment-safety.sh`:

```bash
#!/bin/bash
# Deployment Safety Validation Script
# Run before and after cleanup

set -e

echo "🔍 Deployment Safety Validation"
echo "================================"

# Check 1: Build passes
echo "✓ Testing production build..."
npm run build || { echo "❌ Build failed"; exit 1; }

# Check 2: Tests pass
echo "✓ Running test suite..."
npm run test || { echo "❌ Tests failed"; exit 1; }

# Check 3: Docker builds
echo "✓ Testing Docker builds..."
docker build -f Dockerfile.prod -t test:prod . || { echo "❌ Docker build failed"; exit 1; }

# Check 4: CI/CD syntax
echo "✓ Validating CI/CD configs..."
yamllint .github/workflows/*.yml || { echo "❌ GitHub Actions invalid"; exit 1; }
yamllint .gitlab-ci.yml || { echo "❌ GitLab CI invalid"; exit 1; }

# Check 5: Environment files
echo "✓ Checking environment configs..."
test -f .env.example || { echo "❌ .env.example missing"; exit 1; }
test -f .env.production || { echo "❌ .env.production missing"; exit 1; }

# Check 6: Secrets not in git
echo "✓ Checking for exposed secrets..."
git ls-files | grep -q ".env.local" && { echo "❌ .env.local in git"; exit 1; } || true

echo ""
echo "✅ All validation checks passed!"
echo "Safe to proceed with cleanup."
```

---

## REVISION HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-22 | Agent 3 | Initial analysis and protocol |

---

**END OF DEPLOYMENT SAFETY PROTOCOL**
