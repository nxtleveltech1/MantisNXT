# ROLLBACK INSTRUCTIONS
## Archive Recovery Procedures - MantisNXT

**Version:** 1.0
**Date:** 2025-10-22
**Archive:** 2025-10-22-comprehensive-cleanup

---

## TABLE OF CONTENTS

1. [Emergency Quick Rollback](#1-emergency-quick-rollback)
2. [Partial File Restoration](#2-partial-file-restoration)
3. [Category Restoration](#3-category-restoration)
4. [Full Archive Restoration](#4-full-archive-restoration)
5. [Verification Procedures](#5-verification-procedures)
6. [Troubleshooting](#6-troubleshooting)
7. [Emergency Contacts](#7-emergency-contacts)

---

## 1. EMERGENCY QUICK ROLLBACK

**Use Case:** Production is down, immediate revert needed.

**Time to Recovery:** ~5 minutes

### Step-by-Step

```bash
# 1. Stop any running deployments
# (In CI/CD dashboard or via SSH)

# 2. Identify last known good commit
git log --oneline -10
# Look for commit BEFORE cleanup

# 3. Hard reset to that commit
git reset --hard <last-good-commit-sha>

# 4. Force push to main (ONLY in emergency)
git push origin main --force

# 5. Trigger deployment via CI/CD or manual deployment
# GitHub Actions: Will auto-deploy on push to main
# Manual: SSH to server and pull/restart

# 6. Verify production health
curl https://your-domain.com/api/health
```

**Expected Output:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-22T...",
  "database": "connected",
  "version": "1.0.0"
}
```

### Notification

```bash
# Notify team via Slack (if webhook configured)
curl -X POST ${SLACK_WEBHOOK_URL} \
  -H 'Content-Type: application/json' \
  -d '{"text":"🚨 EMERGENCY ROLLBACK: Reverted to <commit-sha> due to production issues"}'
```

---

## 2. PARTIAL FILE RESTORATION

**Use Case:** Specific file(s) needed from archive.

**Time to Recovery:** ~2 minutes per file

### Step-by-Step

```bash
# 1. Locate file in archive manifest
cat .archive/ARCHIVE_MANIFEST.md | grep "filename.js"

# Example output:
# scripts/analyze_data.js → .archive/2025-10-22-comprehensive-cleanup/scripts/analysis/analyze_data.js | hash... | reason | date

# 2. Copy file to original location
cp .archive/2025-10-22-comprehensive-cleanup/scripts/analysis/analyze_data.js \
   scripts/analyze_data.js

# 3. Verify file integrity (optional)
sha256sum scripts/analyze_data.js
# Compare with hash in ARCHIVE_MANIFEST.md

# 4. Test build
npm run build

# 5. Test functionality
npm run test

# 6. Commit restoration
git add scripts/analyze_data.js
git commit -m "restore: Restore analyze_data.js from archive"
git push origin main
```

### Multiple Files

```bash
# Create a list of files to restore
cat > restore-list.txt <<EOF
scripts/file1.js
scripts/file2.js
lib/old-module.ts
EOF

# Restore all files in list
while IFS= read -r file; do
  archive_path=$(grep "$file" .archive/ARCHIVE_MANIFEST.md | awk -F'→' '{print $2}' | awk '{print $1}')
  cp "$archive_path" "$file"
  echo "Restored: $file"
done < restore-list.txt

# Verify and commit
npm run build
git add -A
git commit -m "restore: Restore multiple files from archive"
git push origin main
```

---

## 3. CATEGORY RESTORATION

**Use Case:** Restore entire category (e.g., all analysis scripts).

**Time to Recovery:** ~5-10 minutes

### Available Categories

- `markdown-reports/` - Agent reports and analysis
- `scripts/data-migration/` - Data import scripts
- `scripts/schema-migration/` - Database schema scripts
- `scripts/analysis/` - Diagnostic and analysis tools
- `scripts/testing/` - Test validation scripts
- `configs/` - Old configuration files
- `validation-reports/` - Historical test results
- `database/` - Superseded database files
- `miscellaneous/` - Uncategorized files

### Step-by-Step

```bash
# 1. Choose category to restore
CATEGORY="scripts/analysis"

# 2. List files in category
ls -la .archive/2025-10-22-comprehensive-cleanup/$CATEGORY/

# 3. Restore entire category
cp -r .archive/2025-10-22-comprehensive-cleanup/$CATEGORY/* scripts/

# 4. Verify restoration
ls -la scripts/
npm run build

# 5. Check for broken imports
npm run type-check

# 6. Run tests
npm run test

# 7. Commit if successful
git add scripts/
git commit -m "restore: Restore $CATEGORY from archive"
git push origin main
```

### Selective Category Restoration

```bash
# Restore only specific files from category
CATEGORY="scripts/analysis"

# List files
ls .archive/2025-10-22-comprehensive-cleanup/$CATEGORY/

# Restore specific files
cp .archive/2025-10-22-comprehensive-cleanup/$CATEGORY/analyze_suppliers.js scripts/
cp .archive/2025-10-22-comprehensive-cleanup/$CATEGORY/analyze_inventory.js scripts/

# Verify and commit
npm run build
git add scripts/analyze_*.js
git commit -m "restore: Restore analysis scripts from archive"
```

---

## 4. FULL ARCHIVE RESTORATION

**Use Case:** Complete rollback of cleanup (all archived files).

**Time to Recovery:** ~15-30 minutes

### Step-by-Step

```bash
# 1. Create backup of current state (safety measure)
git checkout -b backup-before-restore
git push origin backup-before-restore

# 2. Return to cleanup branch or main
git checkout cleanup/comprehensive-archive-2025-10-22
# OR
git checkout main

# 3. Restore all archived files to original locations
# This requires careful directory mapping

# Restore scripts
cp -r .archive/2025-10-22-comprehensive-cleanup/scripts/data-migration/* scripts/ 2>/dev/null || true
cp -r .archive/2025-10-22-comprehensive-cleanup/scripts/schema-migration/* scripts/ 2>/dev/null || true
cp -r .archive/2025-10-22-comprehensive-cleanup/scripts/analysis/* scripts/ 2>/dev/null || true
cp -r .archive/2025-10-22-comprehensive-cleanup/scripts/testing/* scripts/ 2>/dev/null || true

# Restore markdown reports
cp -r .archive/2025-10-22-comprehensive-cleanup/markdown-reports/* claudedocs/ 2>/dev/null || true

# Restore configs
cp -r .archive/2025-10-22-comprehensive-cleanup/configs/* ./ 2>/dev/null || true

# Restore validation reports
cp -r .archive/2025-10-22-comprehensive-cleanup/validation-reports/* test-results/ 2>/dev/null || true

# Restore database files
cp -r .archive/2025-10-22-comprehensive-cleanup/database/* database/ 2>/dev/null || true

# Restore miscellaneous
cp -r .archive/2025-10-22-comprehensive-cleanup/miscellaneous/* ./ 2>/dev/null || true

# 4. Verify restoration
npm ci
npm run build
npm run test

# 5. Check for conflicts or duplicates
git status

# 6. Review changes
git diff

# 7. Commit if successful
git add -A
git commit -m "restore: Full restoration from archive 2025-10-22"
git push origin main

# 8. Deploy to staging first
# Test in staging before production

# 9. If successful, deploy to production
```

### Automated Full Restoration Script

Save as `scripts/restore-from-archive.sh`:

```bash
#!/bin/bash
set -e

ARCHIVE_DIR=".archive/2025-10-22-comprehensive-cleanup"

echo "🔄 Full Archive Restoration"
echo "============================"
echo ""

# Safety check
read -p "This will restore ALL archived files. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Restoration cancelled."
  exit 0
fi

# Create backup
echo "📦 Creating safety backup..."
git checkout -b "restore-backup-$(date +%Y%m%d-%H%M%S)"
git push origin HEAD

# Restore files
echo "📂 Restoring files..."

categories=(
  "scripts/data-migration:scripts"
  "scripts/schema-migration:scripts"
  "scripts/analysis:scripts"
  "scripts/testing:scripts"
  "markdown-reports:claudedocs"
  "configs:."
  "validation-reports:test-results"
  "database:database"
  "miscellaneous:."
)

for mapping in "${categories[@]}"; do
  source_dir="${mapping%%:*}"
  target_dir="${mapping##*:}"

  if [ -d "$ARCHIVE_DIR/$source_dir" ]; then
    echo "  Restoring $source_dir → $target_dir"
    cp -r "$ARCHIVE_DIR/$source_dir/"* "$target_dir/" 2>/dev/null || true
  fi
done

# Verify
echo "✅ Verifying restoration..."
npm ci
npm run build

echo ""
echo "✅ Full restoration complete!"
echo "   Review changes with: git status"
echo "   Commit with: git add -A && git commit -m 'restore: Full archive restoration'"
```

---

## 5. VERIFICATION PROCEDURES

### Post-Restoration Checks

```bash
# 1. Dependency integrity
npm ci

# 2. TypeScript compilation
npm run type-check

# 3. Linting
npm run lint

# 4. Unit tests
npm run test

# 5. Build process
npm run build

# 6. Docker build
docker build -f Dockerfile.prod -t test:restore .

# 7. Docker compose validation
docker-compose -f docker-compose.prod.yml config

# 8. Import resolution check
# Look for any missing module errors
grep -r "Cannot find module" .next/ 2>/dev/null || echo "No import errors"
```

### Staging Deployment Test

```bash
# 1. Deploy to staging
git checkout develop
git merge --no-ff restore-branch
git push origin develop

# 2. Monitor staging deployment
# (via CI/CD dashboard)

# 3. Run smoke tests
npm run test:e2e -- --grep="@smoke"

# 4. Check health endpoint
curl https://staging.yourdomain.com/api/health

# 5. Monitor for 24 hours before production
```

### Production Deployment (if staging successful)

```bash
# 1. Merge to main
git checkout main
git merge --no-ff develop
git push origin main

# 2. Monitor production deployment
# (via CI/CD dashboard)

# 3. Check health endpoint
curl https://yourdomain.com/api/health

# 4. Monitor error rates
# (via Grafana/Prometheus)

# 5. Check logs
# (via Loki/Promtail)
```

---

## 6. TROUBLESHOOTING

### Issue: Build Fails After Restoration

**Symptoms:**
```
npm run build fails with module not found errors
```

**Solution:**
```bash
# 1. Clean build cache
rm -rf .next/
rm -rf node_modules/

# 2. Reinstall dependencies
npm ci

# 3. Rebuild
npm run build

# 4. Check for missing files in archive manifest
cat .archive/ARCHIVE_MANIFEST.md | grep "missing-file.ts"

# 5. If file was not archived, check git history
git log --all --full-history -- path/to/missing-file.ts
```

### Issue: Tests Fail After Restoration

**Symptoms:**
```
Test suite fails with unexpected errors
```

**Solution:**
```bash
# 1. Check test database
npm run db:setup:test

# 2. Clear test cache
npm run test -- --clearCache

# 3. Run tests with verbose output
npm run test -- --verbose

# 4. Check for environmental differences
diff .env.example .env.local

# 5. Restore test fixtures if needed
cp -r .archive/.../test-fixtures/ __tests__/fixtures/
```

### Issue: Docker Build Fails

**Symptoms:**
```
Docker build fails with COPY errors
```

**Solution:**
```bash
# 1. Check Dockerfile COPY commands
cat Dockerfile.prod | grep COPY

# 2. Verify files exist
ls -la public/
ls -la .next/standalone/

# 3. Rebuild with no cache
docker build --no-cache -f Dockerfile.prod -t test:debug .

# 4. Check .dockerignore
cat .dockerignore

# 5. Ensure archive not being copied
echo ".archive/" >> .dockerignore
```

### Issue: Import Errors After Restoration

**Symptoms:**
```
Cannot find module '@/lib/...' errors
```

**Solution:**
```bash
# 1. Check TypeScript path mappings
cat tsconfig.json | grep "paths"

# 2. Verify files exist at expected locations
ls -la lib/

# 3. Check for circular dependencies
npx madge --circular src/

# 4. Rebuild TypeScript references
npm run type-check

# 5. Clear TypeScript build info
rm -rf .next/types/
```

### Issue: CI/CD Pipeline Fails

**Symptoms:**
```
GitHub Actions or GitLab CI fails
```

**Solution:**
```bash
# 1. Validate workflow syntax
yamllint .github/workflows/ci-cd.yml

# 2. Check for missing scripts
cat package.json | grep "scripts"

# 3. Test locally with act (GitHub Actions simulator)
act -n  # Dry run

# 4. Check secrets are configured
# (In GitHub/GitLab settings)

# 5. Review pipeline logs
# (In CI/CD dashboard)
```

---

## 7. EMERGENCY CONTACTS

### Deployment Issues

**Primary Contact:**
- Name: Project Lead
- Email: [TO BE FILLED]
- Phone: [TO BE FILLED]
- Slack: @project-lead

**Secondary Contact:**
- Name: DevOps Engineer
- Email: [TO BE FILLED]
- Phone: [TO BE FILLED]
- Slack: @devops-team

### Database Issues

**Database Administrator:**
- Name: [TO BE FILLED]
- Email: [TO BE FILLED]
- Phone: [TO BE FILLED]
- Neon Support: https://neon.tech/support

### Security Issues

**Security Team:**
- Email: security@yourdomain.com
- Phone: [TO BE FILLED]
- Incident Response: [TO BE FILLED]

### Infrastructure Issues

**Infrastructure Team:**
- Email: infrastructure@yourdomain.com
- Phone: [TO BE FILLED]
- On-call: [TO BE FILLED]

---

## ESCALATION PROCEDURE

1. **Level 1:** Attempt self-service restoration following this guide
2. **Level 2:** Contact DevOps team if restoration unsuccessful after 30 minutes
3. **Level 3:** Escalate to Project Lead if production impacted
4. **Level 4:** Emergency rollback to last known good commit

**Production Outage SLA:**
- Detection: < 5 minutes
- Response: < 10 minutes
- Resolution: < 30 minutes
- Communication: Immediate via Slack + email

---

## REVISION HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-22 | Agent 3 | Initial rollback procedures |

---

**END OF ROLLBACK INSTRUCTIONS**
