# Wire UI Buttons — WooCommerce Integrations

## Preview — Refresh Button
- Endpoint: `POST /api/v1/integrations/woocommerce/preview/refresh`
- Headers: `x-org-id: <UUID>`
- Body: `{ entities: ["customers"|"products"|"orders"|"categories"] }` (optional; defaults to all)
- Response: `{ success: boolean, data: { [entity]: count } }`
- UI requirements:
  - Loading state (`aria-busy`, disabled)
  - Error notification using `useToast`
  - Positioned in preview card header

## Table — Multi-Select
- Endpoint 1: `POST /api/v1/integrations/woocommerce/select`
  - Headers: `x-org-id: <UUID>`
  - Body: `{ entity: string, ids: string[], selected: boolean }`
  - Response: `{ success: boolean, data: { entity, selectedCount } }`
- Endpoint 2 (unified): `POST /api/v1/integrations/woocommerce/sync/selected`
  - Body: `{ org_id: <UUID>, entity: 'customers'|'products'|'orders', ids: number[] }`
  - Response: `{ success: boolean, data: { created, updated, failed } }`
- UI requirements:
  - Validate ≥1 item selected; show errors via `useToast`
  - Visual selection state (checkboxes), progress toasts on start

## Admin — Schedule Full Sync
- Endpoint: `POST /api/v1/integrations/woocommerce/schedule/customers`
  - Headers: `x-org-id: <UUID>`, `x-admin: true`
  - Body: `{}` (server resolves connector config)
  - Response: `{ success: boolean, data: SyncProgress }`
- UI requirements:
  - Confirmation dialog before execution
  - Status tracking toast on success
- Restricted visibility to admin role (client gating + server header check)
- Production: integrate with auth/middleware (e.g. `withAuth`) to enforce admin role and allow privileged `x-admin: true` requests

## Error Handling
- All endpoints return standardized error JSON via `createErrorResponse`.
- Client should display destructive toasts on non-2xx responses.

## Accessibility
- Buttons must include `aria-label`, `aria-busy` during async operations, and disabled states to prevent duplicate submissions.

## Tests
- Run `npm run test:woo-buttons` to validate endpoint interactions end-to-end.
