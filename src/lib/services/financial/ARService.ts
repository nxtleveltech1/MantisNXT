/**
 * Accounts Receivable Service
 * Handles customer invoices, receipts, collections, and AR operations
 * Integrates with Sales Services invoices
 */

import { query } from '@/lib/database';

export interface ARCustomerInvoice {
  id: string;
  org_id: string;
  customer_id: string;
  sales_invoice_id?: string | null;
  sales_order_id?: string | null;
  quotation_id?: string | null;
  invoice_number: string;
  source_type: 'sales_invoice' | 'direct_ar' | 'manual';
  invoice_date: string;
  due_date: string;
  payment_terms: string;
  currency: string;
  exchange_rate: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  shipping_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled' | 'refunded';
  sent_at?: string | null;
  viewed_at?: string | null;
  first_payment_at?: string | null;
  notes?: string | null;
  billing_address?: Record<string, unknown> | null;
  shipping_address?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ARInvoiceLineItem {
  id: string;
  ar_invoice_id: string;
  sales_order_item_id?: string | null;
  product_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  line_number: number;
  account_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ARReceipt {
  id: string;
  org_id: string;
  customer_id: string;
  receipt_number: string;
  receipt_date: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  payment_method: 'bank_transfer' | 'credit_card' | 'cheque' | 'cash' | 'eft' | 'stop_order' | 'debit_order';
  status: 'pending' | 'scheduled' | 'processing' | 'paid' | 'partially_paid' | 'failed' | 'cancelled' | 'overdue' | 'refunded';
  bank_account_id?: string | null;
  reference_number?: string | null;
  transaction_id?: string | null;
  gateway_transaction_id?: string | null;
  gateway_response?: Record<string, unknown> | null;
  notes?: string | null;
  processed_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ARReceiptAllocation {
  id: string;
  ar_receipt_id: string;
  ar_invoice_id: string;
  allocated_amount: number;
  discount_taken: number;
  created_at: string;
}

export interface ARCreditNote {
  id: string;
  org_id: string;
  customer_id: string;
  ar_invoice_id?: string | null;
  credit_note_number: string;
  credit_note_date: string;
  reason: string;
  currency: string;
  total_amount: number;
  applied_amount: number;
  status: 'draft' | 'applied' | 'cancelled';
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export class ARService {
  /**
   * Create customer invoice (standalone AR invoice)
   */
  static async createCustomerInvoice(data: {
    org_id: string;
    customer_id: string;
    invoice_number?: string;
    invoice_date?: string;
    due_date: string;
    payment_terms?: string;
    currency?: string;
    items: Omit<ARInvoiceLineItem, 'id' | 'ar_invoice_id' | 'created_at'>[];
    notes?: string;
    billing_address?: Record<string, unknown>;
    shipping_address?: Record<string, unknown>;
    created_by?: string;
  }): Promise<ARCustomerInvoice> {
    try {
      // Generate invoice number if not provided
      let invoiceNumber = data.invoice_number;
      if (!invoiceNumber) {
        const year = new Date().getFullYear();
        const result = await query<{ max_num: string | null }>(
          `SELECT MAX(CAST(substring(invoice_number FROM '\\d+$') AS integer)) as max_num
           FROM ar_customer_invoices
           WHERE org_id = $1 AND invoice_number LIKE $2`,
          [data.org_id, `AR-INV-${year}-%`]
        );
        const nextNum = parseInt(result.rows[0]?.max_num || '0', 10) + 1;
        invoiceNumber = `AR-INV-${year}-${nextNum.toString().padStart(6, '0')}`;
      }

      // Calculate totals
      let subtotal = 0;
      let taxAmount = 0;
      let discountAmount = 0;

      for (const item of data.items) {
        const lineSubtotal = item.quantity * item.unit_price;
        const lineDiscount = (lineSubtotal * item.discount_percent) / 100;
        const lineTax = ((lineSubtotal - lineDiscount) * item.tax_rate) / 100;
        subtotal += lineSubtotal;
        discountAmount += lineDiscount;
        taxAmount += lineTax;
      }

      const totalAmount = subtotal - discountAmount + taxAmount;

      // Insert invoice
      const invoiceResult = await query<ARCustomerInvoice>(
        `INSERT INTO ar_customer_invoices (
          org_id, customer_id, invoice_number, source_type, invoice_date,
          due_date, payment_terms, currency, subtotal, tax_amount,
          discount_amount, total_amount, notes, billing_address,
          shipping_address, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          data.org_id,
          data.customer_id,
          invoiceNumber,
          'direct_ar',
          data.invoice_date || new Date().toISOString().split('T')[0],
          data.due_date,
          data.payment_terms || 'Net 30',
          data.currency || 'ZAR',
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          data.notes || null,
          data.billing_address ? JSON.stringify(data.billing_address) : null,
          data.shipping_address ? JSON.stringify(data.shipping_address) : null,
          data.created_by || null,
        ]
      );

      const invoice = invoiceResult.rows[0];

      // Insert line items
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const lineSubtotal = item.quantity * item.unit_price;
        const lineDiscount = (lineSubtotal * item.discount_percent) / 100;
        const lineTax = ((lineSubtotal - lineDiscount) * item.tax_rate) / 100;
        const lineTotal = lineSubtotal - lineDiscount + lineTax;

        await query(
          `INSERT INTO ar_invoice_line_items (
            ar_invoice_id, sales_order_item_id, product_id, description,
            quantity, unit_price, discount_percent, discount_amount,
            tax_rate, tax_amount, line_total, line_number, account_id, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            invoice.id,
            item.sales_order_item_id || null,
            item.product_id || null,
            item.description,
            item.quantity,
            item.unit_price,
            item.discount_percent || 0,
            lineDiscount,
            item.tax_rate || 0,
            lineTax,
            lineTotal,
            item.line_number || i + 1,
            item.account_id || null,
            item.metadata ? JSON.stringify(item.metadata) : '{}',
          ]
        );
      }

      // Sync to Xero if connected (fire and forget - don't block invoice creation)
      try {
        const { hasActiveConnection } = await import('@/lib/xero/token-manager');
        const { syncSalesInvoiceToXero } = await import('@/lib/xero/sync/invoices');
        
        const isConnected = await hasActiveConnection(data.org_id);
        if (isConnected) {
          // Get line items for sync
          const lineItemsResult = await query<{
            description: string;
            quantity: number;
            unit_price: number;
            tax_rate: number;
            tax_amount: number;
            line_total: number;
            account_id: string | null;
          }>(
            'SELECT description, quantity, unit_price, tax_rate, tax_amount, line_total, account_id FROM ar_invoice_line_items WHERE ar_invoice_id = $1 ORDER BY line_number',
            [invoice.id]
          );

          const nxtInvoice = {
            id: invoice.id,
            customerId: invoice.customer_id,
            customerName: undefined,
            invoiceNumber: invoice.invoice_number,
            invoiceDate: invoice.invoice_date,
            dueDate: invoice.due_date,
            currency: invoice.currency,
            reference: invoice.notes || undefined,
            subtotal: invoice.subtotal,
            taxAmount: invoice.tax_amount,
            totalAmount: invoice.total_amount,
            status: invoice.status,
            lineItems: lineItemsResult.rows.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              taxRate: item.tax_rate,
              taxAmount: item.tax_amount,
              lineTotal: item.line_total,
              accountCode: item.account_id || undefined,
            })),
          };

          // Sync asynchronously - don't await to avoid blocking
          syncSalesInvoiceToXero(data.org_id, nxtInvoice).catch((syncError) => {
            console.error('[Xero Sync] Failed to sync invoice after creation:', syncError);
            // Log error but don't throw - invoice creation succeeded
          });
        }
      } catch (xeroError) {
        // Xero sync failure should not block invoice creation
        console.error('[Xero Sync] Error checking Xero connection:', xeroError);
      }

      return invoice;
    } catch (error) {
      console.error('Error creating customer invoice:', error);
      throw error;
    }
  }

  /**
   * Sync Sales Invoice to AR (create AR invoice from Sales Services invoice)
   */
  static async syncSalesInvoiceToAR(salesInvoiceId: string): Promise<ARCustomerInvoice> {
    try {
      const result = await query<ARCustomerInvoice>(
        'SELECT create_ar_invoice_from_sales_invoice($1) as id',
        [salesInvoiceId]
      );

      const arInvoiceId = result.rows[0]?.id;
      if (!arInvoiceId) {
        throw new Error('Failed to create AR invoice from sales invoice');
      }

      const invoiceResult = await query<ARCustomerInvoice>(
        'SELECT * FROM ar_customer_invoices WHERE id = $1',
        [arInvoiceId]
      );

      if (!invoiceResult.rows[0]) {
        throw new Error('AR invoice not found after creation');
      }

      return invoiceResult.rows[0];
    } catch (error) {
      console.error('Error syncing sales invoice to AR:', error);
      throw error;
    }
  }

  /**
   * Get AR invoices
   */
  static async getARInvoices(
    orgId: string,
    filters?: {
      customer_id?: string;
      status?: string;
      source_type?: 'sales_invoice' | 'direct_ar' | 'manual';
      date_from?: string;
      date_to?: string;
      overdue?: boolean;
    },
    limit = 50,
    offset = 0
  ): Promise<{ data: ARCustomerInvoice[]; count: number }> {
    try {
      const conditions: string[] = ['org_id = $1'];
      const params: unknown[] = [orgId];
      let paramIndex = 2;

      if (filters?.customer_id) {
        conditions.push(`customer_id = $${paramIndex}`);
        params.push(filters.customer_id);
        paramIndex++;
      }

      if (filters?.status) {
        conditions.push(`status = $${paramIndex}`);
        params.push(filters.status);
        paramIndex++;
      }

      if (filters?.source_type) {
        conditions.push(`source_type = $${paramIndex}`);
        params.push(filters.source_type);
        paramIndex++;
      }

      if (filters?.date_from) {
        conditions.push(`invoice_date >= $${paramIndex}`);
        params.push(filters.date_from);
        paramIndex++;
      }

      if (filters?.date_to) {
        conditions.push(`invoice_date <= $${paramIndex}`);
        params.push(filters.date_to);
        paramIndex++;
      }

      if (filters?.overdue) {
        conditions.push(`status IN ('sent', 'partially_paid') AND due_date < CURRENT_DATE`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get count
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ar_customer_invoices ${whereClause}`,
        params
      );
      const count = parseInt(countResult.rows[0]?.count || '0', 10);

      // Get invoices
      params.push(limit, offset);
      const result = await query<ARCustomerInvoice>(
        `SELECT * FROM ar_customer_invoices
         ${whereClause}
         ORDER BY invoice_date DESC, created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
      );

      return { data: result.rows, count };
    } catch (error) {
      console.error('Error fetching AR invoices:', error);
      throw error;
    }
  }

  /**
   * Get AR invoice by ID
   */
  static async getARInvoiceById(id: string, orgId: string): Promise<ARCustomerInvoice | null> {
    try {
      const result = await query<ARCustomerInvoice>(
        'SELECT * FROM ar_customer_invoices WHERE id = $1 AND org_id = $2',
        [id, orgId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching AR invoice:', error);
      throw error;
    }
  }

  /**
   * Get AR invoice for Sales Invoice
   */
  static async getSalesInvoiceARInvoice(salesInvoiceId: string): Promise<ARCustomerInvoice | null> {
    try {
      const result = await query<ARCustomerInvoice>(
        'SELECT * FROM ar_customer_invoices WHERE sales_invoice_id = $1',
        [salesInvoiceId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching AR invoice for sales invoice:', error);
      throw error;
    }
  }

  /**
   * Get AR invoices by source type
   */
  static async getARInvoicesBySource(
    orgId: string,
    sourceType: 'sales_invoice' | 'direct_ar' | 'manual',
    limit = 50,
    offset = 0
  ): Promise<{ data: ARCustomerInvoice[]; count: number }> {
    return this.getARInvoices(orgId, { source_type: sourceType }, limit, offset);
  }

  /**
   * Get invoice line items
   */
  static async getInvoiceLineItems(invoiceId: string): Promise<ARInvoiceLineItem[]> {
    try {
      const result = await query<ARInvoiceLineItem>(
        'SELECT * FROM ar_invoice_line_items WHERE ar_invoice_id = $1 ORDER BY line_number, id',
        [invoiceId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching invoice line items:', error);
      throw error;
    }
  }

  /**
   * Record receipt
   */
  static async recordReceipt(data: {
    org_id: string;
    customer_id: string;
    receipt_number?: string;
    receipt_date?: string;
    amount: number;
    currency?: string;
    payment_method: ARReceipt['payment_method'];
    bank_account_id?: string;
    reference_number?: string;
    transaction_id?: string;
    gateway_transaction_id?: string;
    gateway_response?: Record<string, unknown>;
    notes?: string;
    processed_by?: string;
  }): Promise<ARReceipt> {
    try {
      // Generate receipt number if not provided
      let receiptNumber = data.receipt_number;
      if (!receiptNumber) {
        const year = new Date().getFullYear();
        const result = await query<{ max_num: string | null }>(
          `SELECT MAX(CAST(substring(receipt_number FROM '\\d+$') AS integer)) as max_num
           FROM ar_receipts
           WHERE org_id = $1 AND receipt_number LIKE $2`,
          [data.org_id, `RCP-${year}-%`]
        );
        const nextNum = parseInt(result.rows[0]?.max_num || '0', 10) + 1;
        receiptNumber = `RCP-${year}-${nextNum.toString().padStart(6, '0')}`;
      }

      const result = await query<ARReceipt>(
        `INSERT INTO ar_receipts (
          org_id, customer_id, receipt_number, receipt_date, amount,
          currency, payment_method, bank_account_id, reference_number,
          transaction_id, gateway_transaction_id, gateway_response,
          notes, processed_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          data.org_id,
          data.customer_id,
          receiptNumber,
          data.receipt_date || new Date().toISOString().split('T')[0],
          data.amount,
          data.currency || 'ZAR',
          data.payment_method,
          data.bank_account_id || null,
          data.reference_number || null,
          data.transaction_id || null,
          data.gateway_transaction_id || null,
          data.gateway_response ? JSON.stringify(data.gateway_response) : null,
          data.notes || null,
          data.processed_by || null,
          'paid',
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error recording receipt:', error);
      throw error;
    }
  }

  /**
   * Record Sales Invoice payment (creates receipt and allocates)
   */
  static async recordSalesInvoicePayment(
    salesInvoiceId: string,
    paymentData: {
      amount: number;
      payment_method: ARReceipt['payment_method'];
      reference_number?: string;
      transaction_id?: string;
      processed_by?: string;
    }
  ): Promise<ARReceipt> {
    try {
      // Create receipt using database function
      const result = await query<{ id: string }>(
        'SELECT create_ar_receipt_from_sales_payment($1, $2) as id',
        [salesInvoiceId, paymentData.amount]
      );

      const receiptId = result.rows[0]?.id;
      if (!receiptId) {
        throw new Error('Failed to create receipt from sales payment');
      }

      // Update receipt with additional details
      if (paymentData.reference_number || paymentData.transaction_id || paymentData.processed_by) {
        await query(
          `UPDATE ar_receipts
           SET reference_number = COALESCE($1, reference_number),
               transaction_id = COALESCE($2, transaction_id),
               processed_by = COALESCE($3, processed_by),
               updated_at = now()
           WHERE id = $4`,
          [
            paymentData.reference_number || null,
            paymentData.transaction_id || null,
            paymentData.processed_by || null,
            receiptId,
          ]
        );
      }

      const receiptResult = await query<ARReceipt>(
        'SELECT * FROM ar_receipts WHERE id = $1',
        [receiptId]
      );

      if (!receiptResult.rows[0]) {
        throw new Error('Receipt not found after creation');
      }

      return receiptResult.rows[0];
    } catch (error) {
      console.error('Error recording sales invoice payment:', error);
      throw error;
    }
  }

  /**
   * Allocate receipt to invoices
   */
  static async allocateReceipt(
    receiptId: string,
    allocations: Array<{ invoice_id: string; amount: number; discount_taken?: number }>
  ): Promise<void> {
    try {
      for (const allocation of allocations) {
        await query(
          `INSERT INTO ar_receipt_allocations (
            ar_receipt_id, ar_invoice_id, allocated_amount, discount_taken
          ) VALUES ($1, $2, $3, $4)`,
          [
            receiptId,
            allocation.invoice_id,
            allocation.amount,
            allocation.discount_taken || 0,
          ]
        );

        // Update invoice paid amount
        await query(
          `UPDATE ar_customer_invoices
           SET paid_amount = paid_amount + $1,
               balance_due = total_amount - (paid_amount + $1),
               status = CASE
                 WHEN paid_amount + $1 >= total_amount THEN 'paid'::ar_invoice_status
                 WHEN paid_amount + $1 > 0 THEN 'partially_paid'::ar_invoice_status
                 ELSE status
               END,
               first_payment_at = COALESCE(first_payment_at, now()),
               updated_at = now()
           WHERE id = $2`,
          [allocation.amount, allocation.invoice_id]
        );
      }

      // Update receipt status
      await query(
        `UPDATE ar_receipts SET status = 'paid', updated_at = now() WHERE id = $1`,
        [receiptId]
      );
    } catch (error) {
      console.error('Error allocating receipt:', error);
      throw error;
    }
  }

  /**
   * Post Sales Invoice to General Ledger
   */
  static async postSalesInvoiceToGL(salesInvoiceId: string): Promise<string> {
    try {
      const result = await query<{ id: string }>(
        'SELECT post_sales_invoice_to_gl($1) as id',
        [salesInvoiceId]
      );

      const journalEntryId = result.rows[0]?.id;
      if (!journalEntryId) {
        throw new Error('Failed to post sales invoice to GL');
      }

      return journalEntryId;
    } catch (error) {
      console.error('Error posting sales invoice to GL:', error);
      throw error;
    }
  }

  /**
   * Send invoice (update status and timestamp)
   */
  static async sendInvoice(invoiceId: string, orgId: string): Promise<ARCustomerInvoice> {
    try {
      await query(
        `UPDATE ar_customer_invoices
         SET status = 'sent'::ar_invoice_status,
             sent_at = now(),
             updated_at = now()
         WHERE id = $1 AND org_id = $2`,
        [invoiceId, orgId]
      );

      const result = await query<ARCustomerInvoice>(
        'SELECT * FROM ar_customer_invoices WHERE id = $1',
        [invoiceId]
      );

      if (!result.rows[0]) {
        throw new Error('Invoice not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error sending invoice:', error);
      throw error;
    }
  }

  /**
   * Get aging report
   */
  static async getAgingReport(
    orgId: string,
    asOfDate?: string
  ): Promise<Array<{
    customer_id: string;
    customer_name: string;
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    days_over_90: number;
    total: number;
  }>> {
    try {
      const date = asOfDate || new Date().toISOString().split('T')[0];

      const result = await query<{
        customer_id: string;
        customer_name: string;
        current: string;
        days_1_30: string;
        days_31_60: string;
        days_61_90: string;
        days_over_90: string;
        total: string;
      }>(
        `SELECT
          c.id as customer_id,
          c.name as customer_name,
          COALESCE(SUM(CASE WHEN inv.due_date >= $2 THEN inv.balance_due ELSE 0 END), 0) as current,
          COALESCE(SUM(CASE WHEN inv.due_date < $2 AND inv.due_date >= $2::date - INTERVAL '30 days' THEN inv.balance_due ELSE 0 END), 0) as days_1_30,
          COALESCE(SUM(CASE WHEN inv.due_date < $2::date - INTERVAL '30 days' AND inv.due_date >= $2::date - INTERVAL '60 days' THEN inv.balance_due ELSE 0 END), 0) as days_31_60,
          COALESCE(SUM(CASE WHEN inv.due_date < $2::date - INTERVAL '60 days' AND inv.due_date >= $2::date - INTERVAL '90 days' THEN inv.balance_due ELSE 0 END), 0) as days_61_90,
          COALESCE(SUM(CASE WHEN inv.due_date < $2::date - INTERVAL '90 days' THEN inv.balance_due ELSE 0 END), 0) as days_over_90,
          COALESCE(SUM(inv.balance_due), 0) as total
        FROM customer c
        LEFT JOIN ar_customer_invoices inv ON inv.customer_id = c.id
          AND inv.org_id = $1
          AND inv.balance_due > 0
          AND inv.status NOT IN ('cancelled', 'refunded')
        WHERE c.org_id = $1 OR EXISTS (SELECT 1 FROM ar_customer_invoices WHERE customer_id = c.id AND org_id = $1)
        GROUP BY c.id, c.name
        HAVING COALESCE(SUM(inv.balance_due), 0) > 0
        ORDER BY total DESC`,
        [orgId, date]
      );

      return result.rows.map(row => ({
        customer_id: row.customer_id,
        customer_name: row.customer_name,
        current: parseFloat(row.current),
        days_1_30: parseFloat(row.days_1_30),
        days_31_60: parseFloat(row.days_31_60),
        days_61_90: parseFloat(row.days_61_90),
        days_over_90: parseFloat(row.days_over_90),
        total: parseFloat(row.total),
      }));
    } catch (error) {
      console.error('Error generating aging report:', error);
      throw error;
    }
  }

  /**
   * Create credit note
   */
  static async createCreditNote(data: {
    org_id: string;
    customer_id: string;
    ar_invoice_id?: string;
    credit_note_number?: string;
    credit_note_date?: string;
    reason: string;
    total_amount: number;
    currency?: string;
    notes?: string;
    created_by?: string;
  }): Promise<{ id: string }> {
    try {
      let creditNoteNumber = data.credit_note_number;
      if (!creditNoteNumber) {
        const year = new Date().getFullYear();
        const result = await query<{ max_num: string | null }>(
          `SELECT MAX(CAST(substring(credit_note_number FROM '\\d+$') AS integer)) as max_num
           FROM ar_credit_notes
           WHERE org_id = $1 AND credit_note_number LIKE $2`,
          [data.org_id, `AR-CN-${year}-%`]
        );
        const nextNum = parseInt(result.rows[0]?.max_num || '0', 10) + 1;
        creditNoteNumber = `AR-CN-${year}-${nextNum.toString().padStart(6, '0')}`;
      }

      const result = await query<{ id: string }>(
        `INSERT INTO ar_credit_notes (
          org_id, customer_id, ar_invoice_id, credit_note_number,
          credit_note_date, reason, total_amount, currency, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id`,
        [
          data.org_id,
          data.customer_id,
          data.ar_invoice_id || null,
          creditNoteNumber,
          data.credit_note_date || new Date().toISOString().split('T')[0],
          data.reason,
          data.total_amount,
          data.currency || 'ZAR',
          data.notes || null,
          data.created_by || null,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating credit note:', error);
      throw error;
    }
  }

  /**
   * Process collection (create collection note)
   */
  static async processCollection(data: {
    org_id: string;
    customer_id: string;
    ar_invoice_id?: string;
    contact_method: 'email' | 'phone' | 'letter' | 'in_person';
    contact_person?: string;
    notes: string;
    next_follow_up_date?: string;
    created_by?: string;
  }): Promise<{ id: string }> {
    try {
      const result = await query<{ id: string }>(
        `INSERT INTO ar_collection_notes (
          org_id, customer_id, ar_invoice_id, contact_method,
          contact_person, notes, next_follow_up_date, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          data.org_id,
          data.customer_id,
          data.ar_invoice_id || null,
          data.contact_method,
          data.contact_person || null,
          data.notes,
          data.next_follow_up_date || null,
          data.created_by || null,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error processing collection:', error);
      throw error;
    }
  }
}

