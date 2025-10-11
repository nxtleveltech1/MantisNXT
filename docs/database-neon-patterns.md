# Neon Database Patterns Guide

## Overview

This document outlines the correct patterns for working with Neon PostgreSQL (`@neondatabase/serverless`) in the MantisNXT application.

## Table of Contents

1. [Connection Setup](#connection-setup)
2. [Query Patterns](#query-patterns)
3. [Dynamic Query Construction](#dynamic-query-construction)
4. [Security Best Practices](#security-best-practices)
5. [Common Pitfalls](#common-pitfalls)
6. [Migration Guide](#migration-guide)

---

## Connection Setup

### Correct Neon Import and Usage

```typescript
// ✅ CORRECT: Import from the project wrapper
import { neonDb } from "@/lib/database/neon-connection";

// ❌ WRONG: Don't import sql directly unless you're in the connection module
import { sql } from "@neondatabase/serverless";
```

### Connection Module Structure

The Neon connection is configured in `lib/database/neon-connection.ts`:

```typescript
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.NEON_SPP_DATABASE_URL;
const sql = neon(connectionString);

// Wrapper provides both template literal and .query() methods
export const neonDb = /* proxy wrapper */;
```

---

## Query Patterns

### 1. Template Literal Queries (Recommended for Simple Queries)

```typescript
// ✅ CORRECT: Template literal with automatic parameterization
const userId = "123e4567-e89b-12d3-a456-426614174000";
const result = await neonDb`
  SELECT * FROM users
  WHERE user_id = ${userId}
`;

// The library automatically handles escaping and parameterization
```

### 2. Traditional Parameterized Queries (Recommended for Dynamic Queries)

```typescript
// ✅ CORRECT: Use .query() method with $1, $2, etc. placeholders
const query = `
  SELECT * FROM users
  WHERE user_id = $1
  AND status = $2
`;
const params = [userId, status];
const result = await neonDb.query(query, params);

// Access rows
const users = result.rows;
```

---

## Dynamic Query Construction

### Building Dynamic WHERE Clauses

```typescript
// ✅ CORRECT: Build parameterized queries dynamically
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const whereConditions: string[] = ['1=1'];
  const queryParams: any[] = [];
  let paramIndex = 1;

  // Add conditions dynamically
  const userId = searchParams.get("user_id");
  if (userId) {
    whereConditions.push(`user_id = $${paramIndex++}`);
    queryParams.push(userId);
  }

  const search = searchParams.get("search");
  if (search) {
    const searchPattern = `%${search}%`;
    whereConditions.push(`name ILIKE $${paramIndex++}`);
    queryParams.push(searchPattern);
  }

  const whereClause = whereConditions.join(" AND ");

  // Execute query
  const query = `
    SELECT * FROM users
    WHERE ${whereClause}
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
  `;
  queryParams.push(limit, offset);

  const result = await neonDb.query(query, queryParams);
  return result.rows;
}
```

### Dynamic ORDER BY with Whitelisting

```typescript
// ✅ CORRECT: Whitelist allowed sort fields
const validSortFields: Record<string, string> = {
  name: "u.name",
  email: "u.email",
  created: "u.created_at",
};

const sortBy = searchParams.get("sort_by") || "name";
const sortField = validSortFields[sortBy] || "u.name";
const direction = searchParams.get("direction")?.toUpperCase() === "DESC" ? "DESC" : "ASC";

// Safe to use string interpolation for whitelisted values
const query = `
  SELECT * FROM users u
  WHERE ${whereClause}
  ORDER BY ${sortField} ${direction}
  LIMIT $1 OFFSET $2
`;
```

### Working with Array Parameters

```typescript
// ✅ CORRECT: Use ANY() for array parameters
const statuses = ["active", "pending"];
const query = `
  SELECT * FROM users
  WHERE status = ANY($1)
`;
const result = await neonDb.query(query, [statuses]);
```

---

## Security Best Practices

### 1. Always Validate Input with Zod

```typescript
import { z } from "zod";

const QuerySchema = z.object({
  user_id: z.string().uuid(),
  page: z.number().int().min(1).max(10000),
  search: z.string().min(1).max(200).optional(),
});

// Validate before building queries
const validated = QuerySchema.parse(queryParams);
```

### 2. Use Parameterized Queries for ALL User Input

```typescript
// ✅ CORRECT: Parameterized
const query = `SELECT * FROM users WHERE email = $1`;
const result = await neonDb.query(query, [userEmail]);

// ❌ WRONG: String interpolation of user input
const query = `SELECT * FROM users WHERE email = '${userEmail}'`;
```

### 3. Whitelist Dynamic SQL Fragments

```typescript
// ✅ CORRECT: Whitelist for ORDER BY, column names, table names
const allowedTables = {
  users: "core.users",
  products: "core.products",
};

const table = allowedTables[userInput] || "core.users";

// ❌ WRONG: Direct use of user input in SQL structure
const query = `SELECT * FROM ${userInput}`;
```

### 4. Limit Result Set Sizes

```typescript
// ✅ CORRECT: Enforce maximum limits
const MAX_LIMIT = 500;
const limit = Math.min(requestedLimit, MAX_LIMIT);
```

### 5. Rate Limiting and Query Timeouts

```typescript
// Set query timeout in connection wrapper
const result = await neonDb.query(query, params, {
  timeout: 10000, // 10 seconds
  maxRetries: 0,
});
```

---

## Common Pitfalls

### ❌ PITFALL 1: Using `sql.unsafe()`

```typescript
// ❌ WRONG: This doesn't exist in @neondatabase/serverless
import { sql } from "@neondatabase/serverless";
const query = await sql`SELECT * WHERE ${sql.unsafe(userInput)}`;
```

**Why it fails**: `@neondatabase/serverless` doesn't export an `unsafe()` method. This pattern is from `postgres.js`.

**Solution**: Use parameterized queries with `.query()` method.

### ❌ PITFALL 2: String Concatenation in WHERE Clauses

```typescript
// ❌ WRONG: SQL injection vulnerability
const whereClause = `user_id = '${userId}'`;
const query = `SELECT * FROM users WHERE ${whereClause}`;
```

**Why it's dangerous**: Allows SQL injection attacks.

**Solution**: Use parameter placeholders (`$1`, `$2`, etc.).

### ❌ PITFALL 3: Forgetting to Access .rows

```typescript
// ❌ WRONG: Trying to use result directly
const result = await neonDb.query(query, params);
return NextResponse.json({ data: result }); // Wrong structure

// ✅ CORRECT: Access the rows property
const result = await neonDb.query(query, params);
return NextResponse.json({ data: result.rows });
```

### ❌ PITFALL 4: Not Handling Zod Validation Errors

```typescript
// ✅ CORRECT: Handle validation errors separately
try {
  const validated = Schema.parse(input);
  // ... query logic
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({
      error: "Validation failed",
      details: error.errors,
    }, { status: 400 });
  }
  // Handle other errors
}
```

---

## Migration Guide

### From Template Literals with `sql.unsafe()` to Parameterized Queries

**Before:**
```typescript
import { sql } from "@neondatabase/serverless";

const whereClause = `status = '${status}'`;
const result = await neonDb`
  SELECT * FROM users
  WHERE ${sql.unsafe(whereClause)}
`;
```

**After:**
```typescript
const whereConditions: string[] = ['1=1'];
const params: any[] = [];
let paramIndex = 1;

if (status) {
  whereConditions.push(`status = $${paramIndex++}`);
  params.push(status);
}

const whereClause = whereConditions.join(" AND ");
const query = `
  SELECT * FROM users
  WHERE ${whereClause}
`;

const result = await neonDb.query(query, params);
return result.rows;
```

---

## Reference Examples

### Complete API Route Example

See `src/app/api/supplier-products/route.ts` for a production-ready example with:
- Zod validation
- Dynamic WHERE clause construction
- Parameterized queries
- Proper error handling
- Type safety

### Other Good Examples

- `src/app/api/inventory/route.ts` - Advanced filtering with cursor pagination
- `src/app/api/purchase-orders/route.ts` - Complex queries with joins
- `src/app/api/suppliers/enhanced/route.ts` - Comprehensive Zod validation

---

## Performance Tips

### 1. Use Indexes

Ensure database indexes exist for frequently filtered columns:
```sql
CREATE INDEX idx_supplier_product_supplier_id ON core.supplier_product(supplier_id);
CREATE INDEX idx_supplier_product_sku ON core.supplier_product(supplier_sku);
```

### 2. Avoid N+1 Queries

Use JOINs or batch queries instead of querying in loops.

### 3. Monitor Slow Queries

```typescript
const start = Date.now();
const result = await neonDb.query(query, params);
const duration = Date.now() - start;

if (duration > 1000) {
  console.warn(`Slow query (${duration}ms):`, query.substring(0, 100));
}
```

### 4. Use Connection Pooling

Neon serverless handles this automatically, but be aware of connection limits.

---

## Troubleshooting

### Error: "sql.unsafe is not a function"

**Cause**: Attempting to use `postgres.js` API with `@neondatabase/serverless`.

**Solution**: Remove `sql.unsafe()` calls and use parameterized queries.

### Error: "Cannot read property 'rows' of undefined"

**Cause**: Template literal query returns array directly, not `{ rows: [] }`.

**Solution**: Use `.query()` method or handle array result appropriately.

### Error: "Invalid UUID"

**Cause**: User input not validated before use in queries.

**Solution**: Add Zod UUID validation: `z.string().uuid()`.

---

## Additional Resources

- [Neon Serverless Documentation](https://neon.tech/docs/serverless/serverless-driver)
- [PostgreSQL Parameterized Queries](https://node-postgres.com/features/queries)
- [Zod Documentation](https://zod.dev/)
- [SQL Injection Prevention](https://owasp.org/www-community/attacks/SQL_Injection)

---

**Last Updated**: 2025-10-11
**Maintainer**: MantisNXT Architecture Team
