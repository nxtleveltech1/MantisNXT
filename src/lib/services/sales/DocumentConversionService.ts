/**
 * Document Conversion Service
 *
 * Handles conversion between document types:
 * - Quotation → Sales Order
 * - Sales Order → Proforma Invoice
 * - Proforma Invoice → Invoice
 */

import { query } from '@/lib/database/unified-connection';

export class DocumentConversionService {
  /**
   * Convert a quotation to a sales order
   * @param quotationId Quotation ID
   * @param createdBy User ID who is creating the conversion
   * @returns Sales order ID
   */
  static async convertQuotationToSalesOrder(
    quotationId: string,
    createdBy: string
  ): Promise<string> {
    try {
      const result = await query<{ id: string }>(
        'SELECT convert_quotation_to_sales_order($1, $2) as id',
        [quotationId, createdBy]
      );

      if (!result.rows[0]?.id) {
        throw new Error('Failed to convert quotation to sales order');
      }

      return result.rows[0].id;
    } catch (error) {
      console.error('Error converting quotation to sales order:', error);
      throw error;
    }
  }

  /**
   * Convert a sales order to a proforma invoice
   * @param salesOrderId Sales order ID
   * @param createdBy User ID who is creating the conversion
   * @returns Proforma invoice ID
   */
  static async convertSalesOrderToProformaInvoice(
    salesOrderId: string,
    createdBy: string
  ): Promise<string> {
    try {
      const result = await query<{ id: string }>(
        'SELECT convert_sales_order_to_proforma_invoice($1, $2) as id',
        [salesOrderId, createdBy]
      );

      if (!result.rows[0]?.id) {
        throw new Error('Failed to convert sales order to proforma invoice');
      }

      return result.rows[0].id;
    } catch (error) {
      console.error('Error converting sales order to proforma invoice:', error);
      throw error;
    }
  }

  /**
   * Convert a proforma invoice to an invoice
   * @param proformaInvoiceId Proforma invoice ID
   * @param createdBy User ID who is creating the conversion
   * @param dueDate Optional due date (defaults to 30 days from now)
   * @returns Invoice ID
   */
  static async convertProformaInvoiceToInvoice(
    proformaInvoiceId: string,
    createdBy: string,
    dueDate?: string
  ): Promise<string> {
    try {
      const result = await query<{ id: string }>(
        'SELECT convert_proforma_invoice_to_invoice($1, $2, $3) as id',
        [proformaInvoiceId, createdBy, dueDate || null]
      );

      if (!result.rows[0]?.id) {
        throw new Error('Failed to convert proforma invoice to invoice');
      }

      return result.rows[0].id;
    } catch (error) {
      console.error('Error converting proforma invoice to invoice:', error);
      throw error;
    }
  }
}

