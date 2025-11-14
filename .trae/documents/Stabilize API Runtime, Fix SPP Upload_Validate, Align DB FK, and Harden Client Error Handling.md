## Objectives
- Eliminate 500s and “__webpack_modules__[moduleId] is not a function” across API routes
- Fix SPP upload/validate flow (404s and FK violations)
- Harden client-side error handling to avoid HTML→JSON parse crashes
- Verify all endpoints and deliver a clean, operational build

## Issues Observed
- Widespread API failures in dev logs with Next.js compiled server assets
- SPP validation attempted to insert `spp.extraction_jobs` referencing legacy `spp.pricelist_uploads` FK, causing server-side errors
- Client Upload UI throws “Unexpected token '<'” when server returns HTML error pages

## Remediation Plan
### A) Force Node Runtime for DB-backed API routes
- Add `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'` to DB-using routes to prevent edge bundling issues with `pg`
- Apply to impacted routes:
  - `src/app/api/suppliers/route.ts`
  - `src/app/api/activities/recent/route.ts`
  - `src/app/api/dashboard_metrics/route.ts`
  - `src/app/api/inventory/route.ts`
  - `src/app/api/dashboard/*/route.ts`
  - `src/app/api/spp/*/route.ts`
  - Any other routes using database access

### B) Normalize supplier API re-export
- Replace re-export with explicit import/re-export to avoid loader weirdness and add runtime flags:
- File: `src/app/api/suppliers/route.ts`
- Changes:
  - `import { GET as V3GET, POST as V3POST, PUT as V3PUT, DELETE as V3DELETE } from './v3/route'`
  - `export const runtime = 'nodejs'`
  - `export const dynamic = 'force-dynamic'`
  - `export { V3GET as GET, V3POST as POST, V3PUT as PUT, V3DELETE as DELETE }`

### C) Align SPP FK and remove compatibility shim
- Apply migration `migrations/0211_fix_spp_upload_fk.sql`:
  - Drop `extraction_jobs_upload_id_fkey` if present
  - Recreate FK: `FOREIGN KEY (upload_id) REFERENCES spp.pricelist_upload(upload_id) ON DELETE CASCADE`
- After DB is aligned, remove temporary backfill logic in `src/app/api/spp/validate/route.ts` that inserts into `spp.pricelist_uploads`

### D) Harden client error handling for upload/merge
- File: `src/hooks/useNeonSpp.ts`
- Ensure both upload and merge:
  - Send `Accept: 'application/json'`
  - On non-OK responses: check `content-type`; if non-JSON, read `response.text()` and raise a generic error without parsing JSON
  - Wrap success `response.json()` in `try/catch` with text fallback

### E) Dev server stabilization
- Stop dev server and clear caches: delete `.next/`
- Restart dev server to recompile cleanly
- If errors persist:
  - `npm ci` to reinstall dependencies
  - Use Node 20.x (recommended for Next 15) if Node 22 shows instability

### F) Verification
- Hit endpoints:
  - `GET /api/suppliers?status=active&limit=10` → 200 JSON
  - `POST /api/spp/upload` with CSV/XLSX → 200 JSON includes `upload_id`
  - `POST /api/spp/validate` with `upload_id` → 200 JSON with validation stats
  - `POST /api/spp/merge` with `upload_id` → 200 JSON with results
  - Dashboard APIs (`/api/dashboard_metrics`, `/api/inventory`, `/api/activities/recent`) → 200 JSON
- UI: Navigate `http://localhost:3005/` → dashboards render without 500s; SPP upload/validate/merge completes

### G) Rollback Plan
- If stabilization changes cause regressions:
  - Revert route runtime flags
  - Revert supplier route re-export to previous form
  - Leave client error hardening in place (non-breaking)
  - FK migration is standard and should remain; if necessary, restore previous FK and re-enable compatibility shim

## Deliverables
- Code updates to specified files (runtime flags, supplier route normalization, client error handling)
- DB migration applied and shim removed
- Clean dev build verified against target endpoints and UI flows

## Notes
- tsconfig is already configured for Next (`module: esnext`, `moduleResolution: bundler`); no changes planned
- Runtime flags target the root cause for DB-backed routes using `pg` under edge bundling

## Request for Confirmation
- Approve the plan to proceed with edits, migration execution, restart, and full verification across endpoints and UI.