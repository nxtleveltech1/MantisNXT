# Zod v4 Quick Reference Card

## Critical Changes for MantisNXT

### 1. z.record() - ALWAYS use explicit key type

```typescript
// ❌ WRONG (Zod v3 syntax)
z.record(z.any())
z.record(z.string())
z.record(z.number())

// ✅ CORRECT (Zod v4 syntax)
z.record(z.string(), z.any())
z.record(z.string(), z.string())
z.record(z.string(), z.number())
```

### 2. ZodError - Use .issues not .errors

```typescript
// ❌ WRONG (Zod v3)
catch (error) {
  if (error instanceof z.ZodError) {
    console.log(error.errors)
  }
}

// ✅ CORRECT (Zod v4)
catch (error) {
  if (error instanceof z.ZodError) {
    console.log(error.issues)
  }
}
```

## Common Patterns in MantisNXT

### Custom Fields / Metadata
```typescript
// ✅ Correct pattern
z.object({
  customFields: z.record(z.string(), z.any()).default({}),
  metadata: z.record(z.string(), z.any()).optional(),
  attrs_json: z.record(z.string(), z.any()).nullable().optional()
})
```

### Error Handling in API Routes
```typescript
// ✅ Correct pattern
export async function POST(request: NextRequest) {
  try {
    // ... your code
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.issues  // ✅ Use .issues
      }, { status: 400 });
    }
  }
}
```

### Detailed Error Mapping
```typescript
// ✅ Correct pattern
error.issues.map(e => ({
  field: e.path.join('.'),
  message: e.message,
  code: e.code
}))

// Or simplified
error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
```

## File Locations

### Core Validation Files:
- `src/types/nxt-spp.ts` - SPP type definitions
- `src/lib/api/validation.ts` - API validation schemas
- `src/lib/utils/api-helpers.ts` - Error handlers

### When Creating New Schemas:
1. Use `z.record(z.string(), <valueType>)` for all record types
2. Use `error.issues` for all ZodError handling
3. Follow existing patterns in validation.ts

## Verification Commands

```bash
# Check for old z.record syntax (should return 0)
grep -r "z\.record(z\." src | grep -v "z\.record(z\.string(),"

# Check for old error.errors (should return 0)  
grep -r "error\.errors" src

# Check TypeScript compilation
npx tsc --noEmit
```

## Quick Fixes

If you find old syntax:
```bash
# Fix z.record
sed -i 's/z\.record(z\.any())/z.record(z.string(), z.any())/g' <file>

# Fix error.errors
sed -i 's/error\.errors/error.issues/g' <file>
```

---
Last Updated: 2025-10-13
Zod Version: v4
Status: ✅ All files compliant
