/**
 * Xero sync API path mapping and safe response handling.
 * API routes use plural/hyphenated segments (e.g. invoices, credit-note).
 */

export type XeroSyncEntityType =
  | 'invoice'
  | 'quote'
  | 'contact'
  | 'payment'
  | 'item'
  | 'purchase-order'
  | 'credit-note'
  | 'manual-journal';

const ENTITY_TYPE_TO_PATH: Record<XeroSyncEntityType, string> = {
  invoice: 'invoices',
  quote: 'quotes',
  contact: 'contacts',
  payment: 'payment',
  item: 'items',
  'purchase-order': 'purchase-orders',
  'credit-note': 'credit-note',
  'manual-journal': 'manual-journal',
};

export function getXeroSyncPathSegment(entityType: XeroSyncEntityType): string {
  return ENTITY_TYPE_TO_PATH[entityType] ?? entityType;
}

/**
 * Parse JSON only when response looks like JSON. Avoids "Unexpected token" when server returns HTML (404, 500, auth redirect).
 */
export async function safeParseJson<T = unknown>(response: Response): Promise<T | null> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  try {
    const text = await response.text();
    if (!text || text.trim().length === 0) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
