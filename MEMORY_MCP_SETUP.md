# Memory MCP Setup - Critical Development Aspects

> **Created**: 2025-01-27  
> **Purpose**: Memory entities for MCP Memory system to prevent context loss and repeated mistakes  
> **Status**: Active - All 21 entities created with relationships

---

## 📋 Overview

All 20 critical development aspects from `CRITICAL_DEVELOPMENT_ASPECTS.md` have been packaged into Memory MCP entities, plus a top-level **Memory Management Protocol** rule that governs how agents should interact with memories.

---

## 🎯 Top Priority: Memory Management Protocol

**Entity Type**: `Rule`  
**Priority**: **HIGHEST** - Check this first before any action

### Key Instructions:

1. **MANDATORY: At the BEGINNING of every action**
   - Check all relevant memories and rules from the Memory MCP system
   - Search for related entities before starting work
   - Reference existing memories to avoid repeating past mistakes

2. **MANDATORY: At the END of every action**
   - Update memories with detailed information about:
     - What was done
     - Why it was done
     - Any issues encountered
     - Files affected
     - Common mistakes to avoid
     - Verification steps

3. **Capture detailed data and information**
   - Observations should guide and steer following agents
   - Include problem descriptions, solution approaches, file paths, code patterns
   - Document workarounds, known issues, and architectural decisions

4. **Memory updates**
   - When discovering new patterns, problems, or solutions → create new entities or update existing ones
   - Link related memories through entity relationships
   - Keep memories as the single source of truth

---

## 📦 Created Entities (21 Total)

### 1. Memory Management Protocol (Rule)
- **Type**: Rule
- **Purpose**: Governs how all other memories are used
- **Priority**: Check this FIRST before any action

### 2-11. Critical Priority Aspects (10 entities)
1. **Multi-Database Architecture** - Connection string configuration
2. **Single Active Selection Business Rule** - Only one active selection
3. **TypeScript Build Configuration** - Errors are ignored
4. **Zod v4 Peer Dependency Conflict** - Active workaround
5. **Environment Variables Configuration** - Required vs optional
6. **Database Schema Qualification** - Always use schema prefixes
7. **Bun Package Manager** - Use Bun, not npm
8. **Project Structure Patterns** - Follow existing patterns
9. **Database Connection Pooling** - Use Enterprise Connection Manager
10. **API Response Format** - Consistent JSON pattern

### 12-21. High Priority Aspects (10 entities)
11. **Schema Mismatches** - Missing columns
12. **Feature Flags** - Check before using
13. **Type Safety with Zod** - Validate all external data
14. **Error Handling** - Never expose internal details
15. **Database Migrations** - Always use migration scripts
16. **Security Secrets Management** - Never hardcode secrets
17. **Testing Requirements** - Update tests when changing behavior
18. **Code Style Standards** - Prettier + ESLint
19. **Documentation Maintenance** - Keep docs in sync

---

## 🔗 Entity Relationships

Relationships have been created to build a knowledge graph:

### Governance Relationships
- **Memory Management Protocol** → governs → All 20 critical aspects

### Dependency Relationships
- **Multi-Database Architecture** → requires → Database Connection Pooling
- **Multi-Database Architecture** → requires → Database Schema Qualification
- **Multi-Database Architecture** → requires → Environment Variables Configuration
- **Security Secrets Management** → requires → Environment Variables Configuration
- **API Response Format** → requires → Error Handling

### Enforcement Relationships
- **Single Active Selection Business Rule** → enforced_by → Type Safety with Zod
- **Single Active Selection Business Rule** → enforced_by → Error Handling
- **Type Safety with Zod** → enables → API Response Format

### Prevention Relationships
- **Database Schema Qualification** → prevents → Schema Mismatches
- **Database Migrations** → prevents → Schema Mismatches

### Complementary Relationships
- **TypeScript Build Configuration** → complements → Code Style Standards
- **TypeScript Build Configuration** → complements → Testing Requirements
- **Project Structure Patterns** → defines → Code Style Standards
- **Documentation Maintenance** → supports → Memory Management Protocol

---

## 🚀 How Agents Should Use These Memories

### Before Starting Any Task:

1. **Search Memory MCP** for relevant entities:
   ```
   Search for: "database", "selection", "typescript", "migration", etc.
   ```

2. **Read Memory Management Protocol** first:
   - Understand the protocol for checking and updating memories
   - Know what information to capture

3. **Check Related Critical Aspects**:
   - Multi-Database Architecture (if working with databases)
   - Single Active Selection (if working with selections)
   - TypeScript Build Configuration (if building/deploying)
   - etc.

4. **Review Entity Relationships**:
   - Understand how aspects relate to each other
   - Check dependent aspects (e.g., Database requires Connection Pooling)

### During Task Execution:

1. **Reference Memories**:
   - Check observations for common mistakes
   - Follow patterns documented in memories
   - Verify against "Files to Check" lists

2. **Capture Information**:
   - Document what you're doing
   - Note any issues encountered
   - Record decisions made

### After Task Completion:

1. **Update Memories**:
   - Add observations about what was done
   - Document new patterns or issues discovered
   - Update "Files to Check" if new files are relevant
   - Note any workarounds or solutions

2. **Create New Entities** (if needed):
   - If discovering new critical aspects
   - If finding new patterns or problems
   - Link to existing entities via relationships

3. **Update Relationships**:
   - Add new relationships if aspects are connected
   - Update existing relationships if they change

---

## 📝 Memory Observation Format

When updating memories, include:

1. **Problem Description**: What issue or pattern was encountered
2. **Solution Approach**: How it was solved or handled
3. **Files Affected**: Specific file paths and line numbers
4. **Common Mistakes**: What to avoid
5. **Verification Steps**: How to verify the solution works
6. **Code Patterns**: Example code or SQL patterns
7. **Configuration**: Environment variables, settings, etc.
8. **Dependencies**: Related aspects or requirements

---

## 🔍 Example: Using Memories for Database Work

### Before Starting:
1. Search for: "database", "connection", "schema"
2. Read: **Multi-Database Architecture**, **Database Connection Pooling**, **Database Schema Qualification**
3. Check: **Environment Variables Configuration** (for connection strings)
4. Review: **Schema Mismatches** (to avoid common mistakes)

### During Work:
1. Verify connection string points to correct database (`mantis_issoh`)
2. Use schema prefixes (`core.*`, `spp.*`, `serve.*`)
3. Use Enterprise Connection Manager, not raw connections
4. Check for schema mismatches before querying

### After Work:
1. Update **Multi-Database Architecture** if connection patterns change
2. Update **Schema Mismatches** if new issues found
3. Document any new database-related patterns
4. Link to related entities if new relationships discovered

---

## ✅ Verification

To verify memories are working:

1. **Search for entities**:
   ```bash
   # Use MCP Memory search_nodes tool
   Search: "database", "selection", "typescript"
   ```

2. **Read specific entities**:
   ```bash
   # Use MCP Memory open_nodes tool
   Open: "Memory Management Protocol", "Multi-Database Architecture"
   ```

3. **View relationships**:
   ```bash
   # Use MCP Memory read_graph tool
   View full knowledge graph
   ```

---

## 🔄 Maintenance

### When to Update Memories:

- ✅ Discovering new critical aspects
- ✅ Finding new workarounds or solutions
- ✅ Encountering repeated mistakes
- ✅ Changing architectural patterns
- ✅ Adding new files or patterns
- ✅ Resolving known issues

### How to Update:

1. Use `mcp_Memory_add_observations` to add new observations
2. Use `mcp_Memory_create_entities` to create new entities
3. Use `mcp_Memory_create_relations` to add relationships
4. Update `CRITICAL_DEVELOPMENT_ASPECTS.md` to keep in sync

---

## 📚 Related Documents

- `CRITICAL_DEVELOPMENT_ASPECTS.md` - Source document for these memories
- `KNOWN_ISSUES.md` - Active issues and workarounds
- `CLAUDE.md` - Agent operating manual
- `AGENTS.md` - Codex agent guide

---

## 🎯 Success Criteria

Memories are working correctly when:

1. ✅ Agents check memories before starting tasks
2. ✅ Agents update memories after completing tasks
3. ✅ Context is preserved across sessions
4. ✅ Mistakes are not repeated
5. ✅ Knowledge graph grows with new patterns
6. ✅ Related aspects are discovered through relationships

---

**Remember**: These memories exist because context was lost and mistakes were repeated. Use them actively, update them frequently, and let them guide development decisions.


