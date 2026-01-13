/**
 * Xero Rentals Invoicing
 * 
 * Generate Xero invoices from NXT Rental Reservations.
 */

import { getXeroClient } from '../client';
import { getValidTokenSet } from '../token-manager';
import { callXeroApi } from '../rate-limiter';
import { logSyncSuccess, logSyncError } from '../sync-logger';
import { formatDateForXero, generateSyncHash } from '../mappers';
import { parseXeroApiError, XeroSyncError } from '../errors';
import { query } from '@/lib/database';
import type { XeroInvoice, SyncResult, XeroAccountMappingConfig, XeroLineItem } from '../types';
import type { Reservation, ReservationItem } from '@/types/rentals';

// ============================================================================
// ENTITY MAPPING HELPERS
// ============================================================================

async function getXeroEntityId(
  orgId: string,
  entityType: string,
  nxtEntityId: string
): Promise<string | null> {
  const result = await query<{ xero_entity_id: string }>(
    `SELECT xero_entity_id FROM xero_entity_mappings
     WHERE org_id = $1 AND entity_type = $2 AND nxt_entity_id = $3
     AND sync_status != 'deleted'`,
    [orgId, entityType, nxtEntityId]
  );
  return result.rows[0]?.xero_entity_id || null;
}

async function saveEntityMapping(
  orgId: string,
  entityType: string,
  nxtEntityId: string,
  xeroEntityId: string,
  syncHash?: string
): Promise<void> {
  await query(
    `INSERT INTO xero_entity_mappings (
      org_id, entity_type, nxt_entity_id, xero_entity_id, 
      sync_status, last_synced_at, sync_hash
    ) VALUES ($1, $2, $3, $4, 'synced', NOW(), $5)
    ON CONFLICT (org_id, entity_type, nxt_entity_id)
    DO UPDATE SET
      xero_entity_id = EXCLUDED.xero_entity_id,
      sync_status = 'synced',
      last_synced_at = NOW(),
      sync_hash = EXCLUDED.sync_hash,
      error_message = NULL,
      updated_at = NOW()`,
    [orgId, entityType, nxtEntityId, xeroEntityId, syncHash || null]
  );
}

async function getAccountMappings(orgId: string): Promise<Partial<XeroAccountMappingConfig>> {
  const result = await query<{ mapping_key: string; xero_account_code: string }>(
    `SELECT mapping_key, xero_account_code FROM xero_account_mappings WHERE org_id = $1`,
    [orgId]
  );
  
  const mappings: Partial<XeroAccountMappingConfig> = {};
  for (const row of result.rows) {
    (mappings as Record<string, string>)[row.mapping_key] = row.xero_account_code;
  }
  return mappings;
}

// ============================================================================
// MAP RESERVATION TO XERO INVOICE
// ============================================================================

function mapReservationToXeroInvoice(
  reservation: Reservation,
  items: ReservationItem[],
  xeroContactId: string,
  accountMappings: Partial<XeroAccountMappingConfig>
): XeroInvoice {
  const rentalAccountCode = accountMappings.rentalRevenue || accountMappings.salesRevenue || '200';
  const shippingAccountCode = accountMappings.shippingRevenue || '260';
  
  const lineItems: XeroLineItem[] = [];

  // Add rental items
  for (const item of items) {
    const days = item.rental_period_days || 1;
    lineItems.push({
      Description: `Rental: Equipment (${days} days)`,
      Quantity: item.quantity,
      UnitAmount: item.rental_rate * days,
      AccountCode: rentalAccountCode,
      TaxType: 'OUTPUT',
    });
  }

  // Add delivery cost
  if (reservation.delivery_required && reservation.delivery_cost > 0) {
    lineItems.push({
      Description: 'Delivery Service',
      Quantity: 1,
      UnitAmount: reservation.delivery_cost,
      AccountCode: shippingAccountCode,
      TaxType: 'OUTPUT',
    });
  }

  // Add setup cost
  if (reservation.setup_required && reservation.setup_cost > 0) {
    lineItems.push({
      Description: 'Setup & Installation',
      Quantity: 1,
      UnitAmount: reservation.setup_cost,
      AccountCode: rentalAccountCode,
      TaxType: 'OUTPUT',
    });
  }

  // Add cleaning fee
  if (reservation.cleaning_fee > 0) {
    lineItems.push({
      Description: 'Cleaning Fee',
      Quantity: 1,
      UnitAmount: reservation.cleaning_fee,
      AccountCode: rentalAccountCode,
      TaxType: 'OUTPUT',
    });
  }

  // Add late return fee
  if (reservation.late_return_fee > 0) {
    lineItems.push({
      Description: 'Late Return Fee',
      Quantity: 1,
      UnitAmount: reservation.late_return_fee,
      AccountCode: rentalAccountCode,
      TaxType: 'OUTPUT',
    });
  }

  // Add other charges
  if (reservation.other_charges > 0) {
    lineItems.push({
      Description: reservation.other_charges_description || 'Additional Charges',
      Quantity: 1,
      UnitAmount: reservation.other_charges,
      AccountCode: rentalAccountCode,
      TaxType: 'OUTPUT',
    });
  }

  return {
    Type: 'ACCREC',
    Contact: { ContactID: xeroContactId },
    InvoiceNumber: `RNT-${reservation.reservation_number}`,
    Reference: reservation.event_name || reservation.reservation_number,
    Date: formatDateForXero(reservation.rental_start_date),
    DueDate: formatDateForXero(reservation.due_date || reservation.rental_end_date),
    LineAmountTypes: 'Exclusive',
    Status: reservation.payment_status === 'paid' ? 'PAID' : 'AUTHORISED',
    CurrencyCode: reservation.currency || 'ZAR',
    LineItems: lineItems,
  };
}

// ============================================================================
// SYNC RESERVATION INVOICE TO XERO
// ============================================================================

/**
 * Create a Xero invoice from a rental reservation
 */
export async function syncReservationInvoiceToXero(
  orgId: string,
  reservation: Reservation,
  items: ReservationItem[]
): Promise<SyncResult<XeroInvoice>> {
  const startTime = Date.now();
  
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Get Xero contact ID for customer
    const xeroContactId = await getXeroEntityId(orgId, 'contact', reservation.customer_id);
    if (!xeroContactId) {
      throw new XeroSyncError(
        'Customer not synced to Xero. Sync customer first.',
        'invoice',
        reservation.reservation_id,
        'CUSTOMER_NOT_SYNCED'
      );
    }

    // Get account mappings
    const accountMappings = await getAccountMappings(orgId);

    // Check if already synced
    const existingXeroId = await getXeroEntityId(orgId, 'invoice', reservation.reservation_id);
    
    // Map to Xero format
    const xeroInvoice = mapReservationToXeroInvoice(reservation, items, xeroContactId, accountMappings);
    
    if (existingXeroId) {
      xeroInvoice.InvoiceID = existingXeroId;
    }
    
    const syncHash = generateSyncHash(xeroInvoice);

    let result: XeroInvoice;
    let action: 'create' | 'update';

    if (existingXeroId) {
      action = 'update';
      const response = await callXeroApi(tenantId, async () => {
        return xero.accountingApi.updateInvoice(tenantId, existingXeroId, { invoices: [xeroInvoice] });
      });
      result = response.body.invoices?.[0] as XeroInvoice;
    } else {
      action = 'create';
      const response = await callXeroApi(tenantId, async () => {
        return xero.accountingApi.createInvoices(tenantId, { invoices: [xeroInvoice] });
      });
      result = response.body.invoices?.[0] as XeroInvoice;
    }

    if (!result?.InvoiceID) {
      throw new XeroSyncError(
        'No InvoiceID returned from Xero',
        'invoice',
        reservation.reservation_id,
        'NO_INVOICE_ID'
      );
    }

    await saveEntityMapping(orgId, 'invoice', reservation.reservation_id, result.InvoiceID, syncHash);

    // Also link back to the reservation
    await query(
      `UPDATE reservations SET ar_invoice_id = $1 WHERE reservation_id = $2`,
      [result.InvoiceID, reservation.reservation_id]
    );

    await logSyncSuccess(orgId, 'invoice', action, 'to_xero', {
      nxtEntityId: reservation.reservation_id,
      xeroEntityId: result.InvoiceID,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: result,
      xeroEntityId: result.InvoiceID,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'invoice', 'create', 'to_xero', parsedError, {
      nxtEntityId: reservation.reservation_id,
      durationMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}
