/**
 * Document Generation Hooks
 * 
 * Event-driven document generation for automatic PDF creation when entities are created/updated.
 */

import { DocumentGenerator } from './document-generator';
import { DOCUMENT_TYPES } from './document-types';
import type { DocumentGenerationInput } from './document-generator';
import { generatePOSReceiptHtml, type POSReceiptData } from './templates/pos-receipt';

/**
 * Event listener for entity creation events
 * Auto-generates PDF documents and stores them in DocuStore
 */
export class DocumentGenerationHooks {
  /**
   * Handle quotation creation event
   */
  static async onQuotationCreated(
    quotationId: string,
    orgId: string,
    userId?: string
  ): Promise<void> {
    try {
      await DocumentGenerator.generate({
        documentType: DOCUMENT_TYPES.SALES_QUOTATION,
        entityType: 'quotation',
        entityId: quotationId,
        orgId,
        userId,
        metadata: {
          auto_generated: true,
          source: 'quotation_created_event',
        },
      });
    } catch (error) {
      console.error('Error auto-generating quotation PDF:', error);
      // Don't throw - auto-generation failures shouldn't block entity creation
    }
  }

  /**
   * Handle invoice creation event
   */
  static async onInvoiceCreated(
    invoiceId: string,
    orgId: string,
    userId?: string
  ): Promise<void> {
    try {
      await DocumentGenerator.generate({
        documentType: DOCUMENT_TYPES.SALES_INVOICE,
        entityType: 'invoice',
        entityId: invoiceId,
        orgId,
        userId,
        metadata: {
          auto_generated: true,
          source: 'invoice_created_event',
        },
      });
    } catch (error) {
      console.error('Error auto-generating invoice PDF:', error);
    }
  }

  /**
   * Handle sales order creation event
   */
  static async onSalesOrderCreated(
    salesOrderId: string,
    orgId: string,
    userId?: string
  ): Promise<void> {
    try {
      await DocumentGenerator.generate({
        documentType: DOCUMENT_TYPES.SALES_ORDER,
        entityType: 'sales_order',
        entityId: salesOrderId,
        orgId,
        userId,
        metadata: {
          auto_generated: true,
          source: 'sales_order_created_event',
        },
      });
    } catch (error) {
      console.error('Error auto-generating sales order PDF:', error);
    }
  }

  /**
   * Handle rental reservation creation event
   */
  static async onRentalReservationCreated(
    reservationId: string,
    orgId: string,
    userId?: string
  ): Promise<void> {
    try {
      await DocumentGenerator.generate({
        documentType: DOCUMENT_TYPES.RENTAL_AGREEMENT,
        entityType: 'rental_reservation',
        entityId: reservationId,
        orgId,
        userId,
        metadata: {
          auto_generated: true,
          source: 'rental_reservation_created_event',
        },
      });
    } catch (error) {
      console.error('Error auto-generating rental agreement PDF:', error);
    }
  }

  /**
   * Handle repair order creation event
   */
  static async onRepairOrderCreated(
    repairOrderId: string,
    orgId: string,
    userId?: string
  ): Promise<void> {
    try {
      await DocumentGenerator.generate({
        documentType: DOCUMENT_TYPES.REPAIR_ORDER,
        entityType: 'repair_order',
        entityId: repairOrderId,
        orgId,
        userId,
        metadata: {
          auto_generated: true,
          source: 'repair_order_created_event',
        },
      });
    } catch (error) {
      console.error('Error auto-generating repair order PDF:', error);
    }
  }

  /**
   * Handle purchase order creation event
   */
  static async onPurchaseOrderCreated(
    purchaseOrderId: string,
    orgId: string,
    userId?: string
  ): Promise<void> {
    try {
      await DocumentGenerator.generate({
        documentType: DOCUMENT_TYPES.PURCHASE_ORDER,
        entityType: 'purchase_order',
        entityId: purchaseOrderId,
        orgId,
        userId,
        metadata: {
          auto_generated: true,
          source: 'purchase_order_created_event',
        },
      });
    } catch (error) {
      console.error('Error auto-generating purchase order PDF:', error);
    }
  }

  /**
   * Handle journal entry creation event
   */
  static async onJournalEntryCreated(
    journalEntryId: string,
    orgId: string,
    userId?: string
  ): Promise<void> {
    try {
      await DocumentGenerator.generate({
        documentType: DOCUMENT_TYPES.JOURNAL_ENTRY,
        entityType: 'journal_entry',
        entityId: journalEntryId,
        orgId,
        userId,
        metadata: {
          auto_generated: true,
          source: 'journal_entry_created_event',
        },
      });
    } catch (error) {
      console.error('Error auto-generating journal entry PDF:', error);
    }
  }

  /**
   * Handle delivery creation event
   */
  static async onDeliveryCreated(
    deliveryId: string,
    orgId: string,
    userId?: string
  ): Promise<void> {
    try {
      await DocumentGenerator.generate({
        documentType: DOCUMENT_TYPES.DELIVERY_NOTE,
        entityType: 'delivery',
        entityId: deliveryId,
        orgId,
        userId,
        metadata: {
          auto_generated: true,
          source: 'delivery_created_event',
        },
      });
    } catch (error) {
      console.error('Error auto-generating delivery note PDF:', error);
    }
  }

  /**
   * Handle stock adjustment creation event
   */
  static async onStockAdjustmentCreated(
    adjustmentId: string,
    orgId: string,
    userId?: string
  ): Promise<void> {
    try {
      await DocumentGenerator.generate({
        documentType: DOCUMENT_TYPES.STOCK_ADJUSTMENT,
        entityType: 'stock_adjustment',
        entityId: adjustmentId,
        orgId,
        userId,
        metadata: {
          auto_generated: true,
          source: 'stock_adjustment_created_event',
        },
      });
    } catch (error) {
      console.error('Error auto-generating stock adjustment PDF:', error);
    }
  }

  /**
   * Handle POS sale completed event
   * Generates receipt for the POS transaction
   */
  static async onPOSSaleCompleted(
    transactionId: string,
    salesOrderId: string,
    invoiceId: string,
    orgId: string,
    userId?: string
  ): Promise<{ receiptHtml?: string; receiptUrl?: string } | void> {
    try {
      // Generate the POS receipt as HTML
      // Note: The actual receipt data would need to be fetched from the database
      // For now, we generate the sales order and invoice PDFs
      // The receipt HTML can be used for thermal printing on the POS terminal
      
      // Generate sales order PDF
      await DocumentGenerator.generate({
        documentType: DOCUMENT_TYPES.SALES_ORDER,
        entityType: 'sales_order',
        entityId: salesOrderId,
        orgId,
        userId,
        metadata: {
          auto_generated: true,
          source: 'pos_sale_completed_event',
          pos_transaction: true,
          transaction_id: transactionId,
        },
      });

      // Generate invoice PDF  
      await DocumentGenerator.generate({
        documentType: DOCUMENT_TYPES.SALES_INVOICE,
        entityType: 'invoice',
        entityId: invoiceId,
        orgId,
        userId,
        metadata: {
          auto_generated: true,
          source: 'pos_sale_completed_event',
          pos_transaction: true,
          transaction_id: transactionId,
        },
      });

      // Note: POS receipt HTML is generated separately and returned to the POS terminal
      // for thermal printing. The generatePOSReceiptHtml function can be called
      // directly with the transaction data.
      
      console.log(`POS documents generated for transaction ${transactionId}`);
    } catch (error) {
      console.error('Error generating POS documents:', error);
      // Don't throw - document generation failures shouldn't block the sale
    }
  }
}

