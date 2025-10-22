# QUICK SPAWN COMMAND FOR REPOSITORY CLEANUP

## Current Situation
- **362 items** in root directory
- **197 markdown files** cluttering workspace
- Project is MantisNXT (Next.js inventory management + AI)
- Developer experience severely degraded

## Goal
Archive all non-essential files to `.archive/` while keeping production-critical code intact.

---

## SPAWN COMMAND

Copy and paste this entire block into Claude Code:

```
/spawn

Execute comprehensive repository cleanup with 6 agents in parallel. Current state: 362 items in root, 197 markdown files creating chaos. Goal: Archive non-essential content to .archive/ directory.

AGENT 1 (@aster-fullstack-architect):
- Analyze Next.js architecture (package.json, configs)
- Identify CRITICAL files/dirs that MUST stay: /src, /pages, /public, /lib, /scripts, /database, /migrations, /tests, configs, .git, .github, .claude
- Categorize 197 root markdown files (AI_*.md, ADR_*.md, AGENT_*.md, *_REPORT.md)
- Create classification: KEEP (critical) vs ARCHIVE (historical) vs REVIEW (uncertain)
- Deliverable: ARCHITECTURE_CLASSIFICATION_REPORT.md

AGENT 2 (@code-reviewer):
- Scan for duplicate configs (.env.* files, .eslintrc variants)
- Find orphaned code in /docs, /claudedocs, venv/ directories
- Security audit: /secrets should NOT be in git, check .env.* for credentials
- Identify unused dependencies
- Deliverable: CODE_AUDIT_CLEANUP_RECOMMENDATIONS.md

AGENT 3 (@deployment-engineer):
- Verify build/deployment requirements (npm run build, CI/CD)
- Environment strategy: keep .env.example + .env.local, archive .env.production
- Create deployment validation checklist
- Design .archive/ directory structure with rollback plan
- Deliverable: DEPLOYMENT_SAFETY_PROTOCOL.md

AGENT 4 (@data-engineer):
- Audit /database, /migrations, /sql - ensure no migration files archived
- Review /validation-reports - likely archivable
- Check for CSV/Excel data files
- Verify database versioning intact
- Deliverable: DATABASE_FILES_AUDIT.md

AGENT 5 (@documentation-generator):
- Analyze 197 markdown files by pattern (AI_*, AGENT_*, ADR_*, *_SUMMARY.md)
- Create consolidated /docs structure: /docs/active vs /docs/archive
- Map historical reports to archive locations
- Identify which docs are current vs outdated
- Deliverable: DOCUMENTATION_CONSOLIDATION_PLAN.md

AGENT 6 (@frontend-developer):
- Audit /public assets, /pages routes, /src/components for unused files
- Review editor configs (.cursor, .windsurfrules, .devcontainer)
- Clean up build artifacts (.next, /playwright-report, /validation-reports)
- Consolidate duplicate frontend tooling configs
- Deliverable: FRONTEND_CLEANUP_INVENTORY.md

COORDINATION PROTOCOL:
1. PHASE 1 (ANALYSIS): All agents work in parallel, generate reports
2. PHASE 2 (CONSOLIDATION): @aster-fullstack-architect creates MASTER_CLEANUP_PLAN.md consolidating all findings
3. ⚠️ STOP FOR USER APPROVAL - Present MASTER_CLEANUP_PLAN before executing
4. PHASE 3 (EXECUTION): After approval, archive files to .archive/ structure
5. PHASE 4 (VALIDATION): Run npm build, tests, type-check to verify nothing broke

SAFETY MEASURES:
- NO deletions, archive only
- Create git branch snapshot before execution
- Rollback plan in .archive/ROLLBACK_INSTRUCTIONS.md
- Validation gates: builds pass, tests pass, no broken imports

ARCHIVE STRUCTURE:
.archive/
├── markdown-reports/ (AI_*.md, AGENT_*.md, ADR_*.md)
├── configs/ (duplicate .env, .eslintrc, editor configs)
├── documentation/ (docs/, claudedocs/)
├── validation-reports/
└── miscellaneous/ (venv/, orphaned dirs)

SUCCESS: Root reduced from 362 to ~30-40 essential items, all builds passing, zero production impact.
```

---

## After Agents Complete Phase 1

The agents will present 6 reports + 1 consolidated MASTER_CLEANUP_PLAN.

**YOU MUST REVIEW AND APPROVE** before they proceed with archiving files.

Look for:
- ✅ Are all critical production files marked as KEEP?
- ✅ Are there any files in ARCHIVE that you actually need?
- ✅ Does the archive structure make sense?
- ✅ Is the rollback plan clear?

**Then say:** "Approved, proceed with Phase 3 execution"

---

## Validation After Cleanup

After archiving, verify:
```bash
npm run build         # Should succeed
npm run type-check    # Should pass
npm run test          # Should pass
```

If anything fails, rollback is available in `.archive/`

---

## Expected Outcome

**Before:**
```
root/
├── 197 markdown files (AI_*, AGENT_*, ADR_*, etc.)
├── Multiple .env.* files
├── Duplicate configs
├── venv/ (Python, why in Node project?)
├── secrets/ (shouldn't be in git!)
├── validation-reports/
├── docs/, claudedocs/ (duplicates?)
└── ... 362 total items
```

**After:**
```
root/
├── src/              # Source code
├── pages/            # Next.js routes
├── public/           # Assets
├── scripts/          # Build scripts
├── database/         # DB schemas
├── migrations/       # DB migrations
├── tests/            # Testing
├── .claude/          # Claude Code
├── .github/          # CI/CD
├── package.json      # Config
├── README.md         # Main docs
├── .archive/         # ALL non-essential content here
└── ... ~30-40 essential items
```

Clean, navigable, maintainable. 🎯
