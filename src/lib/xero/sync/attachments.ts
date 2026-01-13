/**
 * Xero Attachments Sync
 *
 * Handles file attachments for invoices, contacts, and other entities.
 */

import { getXeroClient } from '../client';
import { getValidTokenSet } from '../token-manager';
import { callXeroApi } from '../rate-limiter';
import { logSyncSuccess, logSyncError } from '../sync-logger';
import { parseXeroApiError, XeroSyncError } from '../errors';
import type { SyncResult } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface XeroAttachment {
  AttachmentID?: string;
  FileName: string;
  MimeType?: string;
  ContentLength?: number;
  IncludeOnline?: boolean;
  AttachmentData?: string; // Base64 encoded
  Url?: string;
}

// ============================================================================
// UPLOAD ATTACHMENT TO XERO ENTITY
// ============================================================================

/**
 * Upload an attachment to a Xero entity
 */
export async function uploadAttachmentToXero(
  orgId: string,
  entityType: 'invoice' | 'credit_note' | 'quote' | 'contact' | 'bank_transaction' | 'item' | 'purchase_order',
  entityId: string,
  file: {
    name: string;
    content: Buffer | string; // Buffer or base64 string
    mimeType: string;
  }
): Promise<SyncResult<XeroAttachment>> {
  const startTime = Date.now();

  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Validate file size (max 25MB)
    const fileSize = Buffer.isBuffer(file.content) 
      ? file.content.length 
      : Buffer.from(file.content, 'base64').length;
    
    if (fileSize > 25 * 1024 * 1024) {
      throw new XeroSyncError(
        'File size exceeds maximum of 25MB',
        entityType,
        entityId,
        'FILE_TOO_LARGE'
      );
    }

    // Get Xero entity ID
    const { getXeroEntityId } = await import('./helpers');
    const xeroEntityId = await getXeroEntityId(orgId, entityType, entityId);

    if (!xeroEntityId) {
      throw new XeroSyncError(
        `${entityType} not synced to Xero. Sync entity first.`,
        entityType,
        entityId,
        'ENTITY_NOT_SYNCED'
      );
    }

    // Convert content to base64 if needed
    const base64Content = Buffer.isBuffer(file.content)
      ? file.content.toString('base64')
      : file.content;

    // Map entity type to API endpoint
    const endpoint = mapEntityTypeToEndpoint(entityType);

    // Upload attachment
    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.createAttachment(
        tenantId,
        endpoint,
        xeroEntityId,
        file.name,
        Buffer.from(base64Content, 'base64'),
        file.mimeType
      );
    });

    const result = response.body.attachments?.[0] as XeroAttachment;

    if (!result?.AttachmentID) {
      throw new XeroSyncError(
        'No AttachmentID returned from Xero',
        entityType,
        entityId,
        'NO_ATTACHMENT_ID'
      );
    }

    await logSyncSuccess(orgId, entityType, 'create', 'to_xero', {
      nxtEntityId: entityId,
      xeroEntityId,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: result,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);

    await logSyncError(orgId, entityType, 'create', 'to_xero', parsedError, {
      nxtEntityId: entityId,
      durationMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}

/**
 * Fetch attachments for a Xero entity
 */
export async function fetchAttachmentsFromXero(
  orgId: string,
  entityType: 'invoice' | 'credit_note' | 'quote' | 'contact' | 'bank_transaction' | 'item' | 'purchase_order',
  entityId: string
): Promise<SyncResult<XeroAttachment[]>> {
  const startTime = Date.now();

  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Get Xero entity ID
    const { getXeroEntityId } = await import('./helpers');
    const xeroEntityId = await getXeroEntityId(orgId, entityType, entityId);

    if (!xeroEntityId) {
      throw new XeroSyncError(
        `${entityType} not synced to Xero. Sync entity first.`,
        entityType,
        entityId,
        'ENTITY_NOT_SYNCED'
      );
    }

    const endpoint = mapEntityTypeToEndpoint(entityType);

    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getAttachments(tenantId, endpoint, xeroEntityId);
    });

    const attachments = (response.body.attachments || []) as XeroAttachment[];

    await logSyncSuccess(orgId, entityType, 'fetch', 'from_xero', {
      nxtEntityId: entityId,
      recordsProcessed: attachments.length,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: attachments,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);

    await logSyncError(orgId, entityType, 'fetch', 'from_xero', parsedError, {
      nxtEntityId: entityId,
      durationMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}

/**
 * Download an attachment from Xero
 */
export async function downloadAttachmentFromXero(
  orgId: string,
  entityType: 'invoice' | 'credit_note' | 'quote' | 'contact' | 'bank_transaction' | 'item' | 'purchase_order',
  entityId: string,
  attachmentId: string
): Promise<SyncResult<Buffer>> {
  const startTime = Date.now();

  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Get Xero entity ID
    const { getXeroEntityId } = await import('./helpers');
    const xeroEntityId = await getXeroEntityId(orgId, entityType, entityId);

    if (!xeroEntityId) {
      throw new XeroSyncError(
        `${entityType} not synced to Xero. Sync entity first.`,
        entityType,
        entityId,
        'ENTITY_NOT_SYNCED'
      );
    }

    const endpoint = mapEntityTypeToEndpoint(entityType);

    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getAttachment(tenantId, endpoint, xeroEntityId, attachmentId, 'application/octet-stream');
    });

    // Response body should contain the file content
    const fileContent = response.body as unknown as Buffer;

    await logSyncSuccess(orgId, entityType, 'fetch', 'from_xero', {
      nxtEntityId: entityId,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: fileContent,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);

    await logSyncError(orgId, entityType, 'fetch', 'from_xero', parsedError, {
      nxtEntityId: entityId,
      durationMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}

/**
 * Map entity type to Xero API endpoint
 */
function mapEntityTypeToEndpoint(
  entityType: 'invoice' | 'credit_note' | 'quote' | 'contact' | 'bank_transaction' | 'item' | 'purchase_order'
): string {
  const endpointMap: Record<string, string> = {
    invoice: 'Invoices',
    credit_note: 'CreditNotes',
    quote: 'Quotes',
    contact: 'Contacts',
    bank_transaction: 'BankTransactions',
    item: 'Items',
    purchase_order: 'PurchaseOrders',
  };

  return endpointMap[entityType] || 'Invoices';
}
