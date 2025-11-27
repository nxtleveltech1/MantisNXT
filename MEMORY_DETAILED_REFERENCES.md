# Memory MCP - Detailed Information References

> **Purpose**: Link memory entities to detailed documentation and implementation files  
> **Status**: Reference guide for agents to access complete information

---

## 📚 Information Architecture

The Memory MCP system stores **summaries and key points** in memory entities, while **detailed information** is stored in markdown documents and source code files.

### Three Levels of Information:

1. **Memory Entities** (MCP Memory)
   - Quick summaries
   - Key rules and patterns
   - Common mistakes
   - File references

2. **Detailed Documentation** (Markdown files)
   - Complete explanations
   - Code examples
   - Step-by-step instructions
   - Full context

3. **Source Code** (Implementation files)
   - Actual implementation
   - Working code patterns
   - Configuration files
   - Type definitions

---

## 🔗 Memory Entity → Detailed Documentation Mapping

### Memory Management Protocol
- **Memory Entity**: Quick reference to protocol rules
- **Detailed Docs**: 
  - `MEMORY_MCP_SETUP.md` - Complete setup and usage guide
  - `CRITICAL_DEVELOPMENT_ASPECTS.md` - Source of all critical aspects
- **Key Files**: All markdown documentation in project root

### Multi-Database Architecture
- **Memory Entity**: Summary of three databases and connection strings
- **Detailed Docs**: 
  - `CRITICAL_DEVELOPMENT_ASPECTS.md` Section 1 - Complete connection details
  - `MULTI_DATABASE_SETUP_ANALYSIS.md` - Full architecture analysis
  - `docs/deployment/neon-mcp.md` - Neon MCP setup details
- **Implementation Files**:
  - `src/lib/database/enterprise-connection-manager.ts` - IS-SOH connections
  - `src/lib/database/spp-connection-manager.ts` - SPP connections
  - `src/lib/database/unified-connection.ts` - Unified interface
  - `src/lib/config/environment.ts` - Environment variable validation

### Single Active Selection Business Rule
- **Memory Entity**: Summary of rule and enforcement points
- **Detailed Docs**: 
  - `CRITICAL_DEVELOPMENT_ASPECTS.md` Section 2 - Complete enforcement details
  - `.archive/docs/0 PLANNING/NXT-SPP-PLATFORM-REALIGNMENT-COMPLETE.md` - Implementation history
- **Implementation Files**:
  - `src/lib/services/InventorySelectionService.ts` (lines 167-186) - Activation logic
  - `src/types/nxt-spp.ts` (lines 253-258) - Type definitions
  - `src/lib/feature-flags.ts` - Feature flag configuration
- **API Endpoints**:
  - `/api/core/selections/[id]/activate` - Activation endpoint

### TypeScript Build Configuration
- **Memory Entity**: Summary of ignored errors
- **Detailed Docs**: 
  - `CRITICAL_DEVELOPMENT_ASPECTS.md` Section 3 - Complete build config
  - `TYPESCRIPT_FIXES_NEEDED.md` - Complete list of excluded files
- **Configuration Files**:
  - `next.config.js` (lines 9-15) - Build configuration
  - `tsconfig.json` (lines 43-77) - Excluded files list
  - `tsconfig.build.json` - Build-specific config

### Zod v4 Peer Dependency Conflict
- **Memory Entity**: Summary of workaround
- **Detailed Docs**: 
  - `CRITICAL_DEVELOPMENT_ASPECTS.md` Section 4 - Complete workaround details
  - `KNOWN_ISSUES.md` Section 1 - Active issue tracking
- **Configuration Files**:
  - `.npmrc` - `legacy-peer-deps=true`
  - `package.json` - `overrides` section

### Environment Variables Configuration
- **Memory Entity**: Summary of required vs optional
- **Detailed Docs**: 
  - `CRITICAL_DEVELOPMENT_ASPECTS.md` Section 5 - Complete env var list
  - `DEPLOYMENT.md` - Production environment setup
  - `DEPLOYMENT_CHECKLIST.md` - Pre-deployment validation
- **Implementation Files**:
  - `src/lib/config/environment.ts` - Zod schema validation
  - `scripts/validate-env-config.ts` - Pre-deployment validation

### Database Schema Qualification
- **Memory Entity**: Summary of schema prefixes
- **Detailed Docs**: 
  - `CRITICAL_DEVELOPMENT_ASPECTS.md` Section 6 - Complete qualification rules
- **Implementation Files**:
  - All API routes in `src/app/api/**/route.ts`
  - Service files in `src/lib/services/*.ts`
  - Database queries in `src/lib/database/*.ts`
- **Schema Definitions**:
  - `database/schema/*.sql` - Schema definitions
  - `database/migrations/*.sql` - Migration files

### Bun Package Manager
- **Memory Entity**: Summary of Bun usage
- **Detailed Docs**: 
  - `CRITICAL_DEVELOPMENT_ASPECTS.md` Section 7 - Complete Bun commands
  - `AGENTS.md` Section 2 - Runtime and tooling
- **Configuration Files**:
  - `package.json` (line 5) - `packageManager: bun@latest`
  - `bun.lock` - Bun lockfile

### Project Structure Patterns
- **Memory Entity**: Summary of directory structure
- **Detailed Docs**: 
  - `CRITICAL_DEVELOPMENT_ASPECTS.md` Section 8 - Complete structure guide
  - `AGENTS.md` Section 3 - Project structure details
- **Reference**: Actual `src/` directory structure

### Database Connection Pooling
- **Memory Entity**: Summary of connection manager usage
- **Detailed Docs**: 
  - `CRITICAL_DEVELOPMENT_ASPECTS.md` Section 9 - Complete pooling details
  - `.archive/markdown-reports/miscellaneous/DATABASE-CONNECTION-SOLUTION.md` - Architecture details
- **Implementation Files**:
  - `src/lib/database/enterprise-connection-manager.ts` - IS-SOH pool
  - `src/lib/database/spp-connection-manager.ts` - SPP pool
  - `src/lib/database/unified-connection.ts` - Unified interface
  - `src/lib/database/connection-pool.ts` - Pool implementation

### API Response Format
- **Memory Entity**: Summary of response pattern
- **Detailed Docs**: 
  - `CRITICAL_DEVELOPMENT_ASPECTS.md` Section 10 - Complete format specification
  - `AGENTS.md` Section 7 - API contracts
- **Implementation Files**:
  - All routes in `src/app/api/**/route.ts`
  - `src/lib/api-client.ts` - Client-side handling

### Schema Mismatches
- **Memory Entity**: Summary of known issues
- **Detailed Docs**: 
  - `CRITICAL_DEVELOPMENT_ASPECTS.md` Section 11 - Complete mismatch details
  - `KNOWN_ISSUES.md` Section 2 - Active schema issues
- **Verification**: `SELECT column_name FROM information_schema.columns WHERE table_name = 'supplier'`

### Feature Flags
- **Memory Entity**: Summary of flag checking
- **Detailed Docs**: 
  - `CRITICAL_DEVELOPMENT_ASPECTS.md` Section 12 - Complete flag details
- **Implementation Files**:
  - `src/lib/feature-flags.ts` - All available flags

### Type Safety with Zod
- **Memory Entity**: Summary of validation requirement
- **Detailed Docs**: 
  - `CRITICAL_DEVELOPMENT_ASPECTS.md` Section 13 - Complete validation patterns
  - `AGENTS.md` Section 4 - Types and validation
- **Implementation Files**:
  - `src/types/nxt-spp.ts` - Zod schemas
  - All API routes should validate requests

### Error Handling
- **Memory Entity**: Summary of error patterns
- **Detailed Docs**: 
  - `CRITICAL_DEVELOPMENT_ASPECTS.md` Section 14 - Complete error handling
  - `AGENTS.md` Section 7 - Error handling patterns
- **Implementation Files**:
  - `src/lib/logging/*.ts` - Centralized logging
  - All API routes

### Database Migrations
- **Memory Entity**: Summary of migration process
- **Detailed Docs**: 
  - `CRITICAL_DEVELOPMENT_ASPECTS.md` Section 15 - Complete migration guide
- **Migration Files**:
  - `database/migrations/*.sql`
  - `migrations/*.sql`
- **Scripts**:
  - `scripts/run-migration.ts` - Migration runner

### Security Secrets Management
- **Memory Entity**: Summary of secret handling
- **Detailed Docs**: 
  - `CRITICAL_DEVELOPMENT_ASPECTS.md` Section 17 - Complete security rules
  - `AGENTS.md` Section 6 - Security rules
- **Implementation Files**:
  - `src/lib/config/environment.ts` - Centralized env access

### Testing Requirements
- **Memory Entity**: Summary of test structure
- **Detailed Docs**: 
  - `CRITICAL_DEVELOPMENT_ASPECTS.md` Section 18 - Complete testing guide
  - `AGENTS.md` Section 5 - Testing rules
- **Test Files**:
  - `__tests__/` - Test suites
  - `__tests__/fixtures/` - Test fixtures

### Code Style Standards
- **Memory Entity**: Summary of formatting rules
- **Detailed Docs**: 
  - `CRITICAL_DEVELOPMENT_ASPECTS.md` Section 19 - Complete style guide
  - `AGENTS.md` Section 4 - Coding style
- **Configuration Files**:
  - `.prettierrc` or `package.json` - Prettier config
  - `eslint.config.js` - ESLint config

### Documentation Maintenance
- **Memory Entity**: Summary of doc requirements
- **Detailed Docs**: 
  - `CRITICAL_DEVELOPMENT_ASPECTS.md` Section 20 - Complete doc guide
- **Key Documents**:
  - `CLAUDE.md` - Agent operating manual
  - `AGENTS.md` - Codex agent guide
  - `KNOWN_ISSUES.md` - Active issues
  - `README.md` - Project overview
  - `DEPLOYMENT.md` - Deployment guide

---

## 🔍 How to Access Detailed Information

### Step 1: Check Memory Entity
```bash
# Search for relevant memory
Search: "database", "selection", "typescript"
```

### Step 2: Read Memory Observations
- Get quick summary
- Note file references
- Identify related entities

### Step 3: Access Detailed Documentation
```bash
# Read the detailed markdown document
Read: CRITICAL_DEVELOPMENT_ASPECTS.md
# Navigate to relevant section
```

### Step 4: Check Implementation Files
```bash
# Read actual source code
Read: src/lib/database/enterprise-connection-manager.ts
# Check specific lines mentioned in memory
```

### Step 5: Verify Configuration
```bash
# Check config files
Read: next.config.js
Read: tsconfig.json
Read: package.json
```

---

## 📝 Information Completeness

### Memory Entities Contain:
- ✅ Quick summaries
- ✅ Key rules
- ✅ Common mistakes
- ✅ File references
- ✅ Code patterns (brief)
- ✅ Verification steps

### Detailed Documentation Contains:
- ✅ Complete explanations
- ✅ Full code examples
- ✅ Step-by-step instructions
- ✅ SQL queries
- ✅ Configuration examples
- ✅ Troubleshooting guides
- ✅ Historical context

### Source Code Contains:
- ✅ Actual implementation
- ✅ Working patterns
- ✅ Type definitions
- ✅ Configuration values
- ✅ Real examples

---

## 🎯 Best Practice Workflow

1. **Start with Memory**: Search memory entities for quick overview
2. **Read Detailed Docs**: Access `CRITICAL_DEVELOPMENT_ASPECTS.md` for complete information
3. **Check Implementation**: Review actual source files for working patterns
4. **Verify Configuration**: Check config files for current settings
5. **Update Memory**: After completing work, update memory with new findings

---

## 🔄 Keeping Information in Sync

### When Updating:
1. **Update Memory Entity**: Add new observations
2. **Update Detailed Docs**: Update `CRITICAL_DEVELOPMENT_ASPECTS.md`
3. **Update Source Code**: Fix implementation if needed
4. **Update This Reference**: Add new mappings if needed

### When Discovering New Information:
1. **Add to Memory**: Create new observations
2. **Document in Detail**: Add to `CRITICAL_DEVELOPMENT_ASPECTS.md`
3. **Link Together**: Update this reference document

---

## ✅ Verification Checklist

Before starting work:
- [ ] Searched memory entities for relevant aspects
- [ ] Read detailed documentation section
- [ ] Checked implementation files mentioned
- [ ] Verified configuration files
- [ ] Understood complete context

After completing work:
- [ ] Updated memory with new findings
- [ ] Updated detailed documentation if needed
- [ ] Updated this reference if new mappings created

---

**Remember**: Memory entities are the **quick reference**, detailed docs are the **complete guide**, and source code is the **truth**. Use all three levels for complete understanding.

