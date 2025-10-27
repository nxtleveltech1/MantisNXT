---
name: database-operations
description: Expert at Neon PostgreSQL database operations, migrations, schema validation, and query optimization. Use when working with database schemas, migrations, SQL queries, Neon connections, or diagnosing database issues.
allowed-tools: Read, Grep, Glob, Bash, mcp__neon__list_projects, mcp__postgres__query
---

# Database Operations

Expert assistance for Neon PostgreSQL database operations in the MantisNXT project.

## Capabilities

- **Schema Management**: Create, modify, and validate database schemas
- **Migration Management**: Generate and apply database migrations safely
- **Query Optimization**: Analyze and optimize SQL queries for performance
- **Connection Troubleshooting**: Diagnose and fix database connection issues
- **Data Validation**: Verify data integrity and relationships

## Common Tasks

### Check Database Schema

```bash
# View current schema
cat database/scripts/*.sql

# Check migration status
npm run db:migrate:status
```

### Run Migrations

```bash
# Apply pending migrations
npm run db:migrate

# Rollback last migration
npm run db:migrate:rollback
```

### Query Optimization

When analyzing slow queries:
1. Use EXPLAIN ANALYZE to understand query execution
2. Check for missing indexes
3. Validate join strategies
4. Consider query rewriting for better performance

### Validate Data Integrity

```typescript
// Check for orphaned records
// Check foreign key constraints
// Validate data types and constraints
```

## Database Architecture

The project uses a two-tier architecture:
- **Core/ISSOH Database**: Inventory Stock on Hand management
- **SPP Database**: Supplier Pricelist Processing

Both databases use Neon PostgreSQL with Foreign Data Wrappers (FDW) for cross-database queries.

## MCP Tools Available

- `mcp__neon__list_projects`: List Neon database projects
- `mcp__postgres__query`: Execute read-only SQL queries

## Best Practices

1. **Always use migrations** for schema changes
2. **Test queries** on development data first
3. **Use transactions** for multi-step operations
4. **Index appropriately** but don't over-index
5. **Validate data types** match application expectations
6. **Check foreign keys** before deleting records

## Common Issues

### Connection Errors
- Verify DATABASE_URL environment variable
- Check Neon project status
- Validate SSL/TLS settings

### Migration Failures
- Check for conflicting migrations
- Verify schema matches expected state
- Review migration order

### Performance Issues
- Add indexes for frequently queried columns
- Use EXPLAIN ANALYZE for slow queries
- Consider materialized views for complex aggregations

## File Locations

- Migrations: `database/migrations/`
- Schema Scripts: `database/scripts/`
- Migration Runner: `scripts/bootstrap-neon-two-dbs.ts`
