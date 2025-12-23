/**
 * Accounts Payable Service
 * Handles vendor invoices, payments, three-way matching, and AP operations
 */

import { query } from '@/lib/database';

export interface APVendorInvoice {
  id: string;
  org_id: string;
  vendor_id: string;
  purchase_order_id?: string | null;
  invoice_number: string;
  vendor_invoice_number: string;
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
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled' | 'disputed';
  three_way_match_status: 'not_started' | 'in_progress' | 'matched' | 'exceptions' | 'failed' | 'manual_review' | 'approved_with_exceptions';
  notes?: string | null;
  billing_address?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  created_by?: string | null;
  updated_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface APInvoiceLineItem {
  id: string;
  ap_invoice_id: string;
  purchase_order_item_id?: string | null;
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

export interface APPayment {
  id: string;
  org_id: string;
  vendor_id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  payment_method: 'bank_transfer' | 'credit_card' | 'cheque' | 'cash' | 'eft' | 'stop_order' | 'debit_order';
  status: 'pending' | 'scheduled' | 'processing' | 'paid' | 'partially_paid' | 'failed' | 'cancelled' | 'overdue' | 'refunded';
  bank_account_id?: string | null;
  reference_number?: string | null;
  transaction_id?: string | null;
  notes?: string | null;
  processed_by?: string | null;
  authorized_by?: string | null;
  authorized_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface APPaymentAllocation {
  id: string;
  ap_payment_id: string;
  ap_invoice_id: string;
  allocated_amount: number;
  discount_taken: number;
  created_at: string;
}

export class APService {
  /**
   * Create vendor invoice
   */
  static async createVendorInvoice(data: {
    org_id: string;
    vendor_id: string;
    purchase_order_id?: string;
    invoice_number?: string;
    vendor_invoice_number: string;
    invoice_date?: string;
    due_date: string;
    payment_terms?: string;
    currency?: string;
    items: Omit<APInvoiceLineItem, 'id' | 'ap_invoice_id' | 'created_at'>[];
    notes?: string;
    billing_address?: Record<string, unknown>;
    created_by?: string;
  }): Promise<APVendorInvoice> {
    try {
      // Generate invoice number if not provided
      let invoiceNumber = data.invoice_number;
      if (!invoiceNumber) {
        const year = new Date().getFullYear();
        const result = await query<{ max_num: string | null }>(
          `SELECT MAX(CAST(substring(invoice_number FROM '\\d+$') AS integer)) as max_num
           FROM ap_vendor_invoices
           WHERE org_id = $1 AND invoice_number LIKE $2`,
          [data.org_id, `AP-INV-${year}-%`]
        );
        const nextNum = parseInt(result.rows[0]?.max_num || '0', 10) + 1;
        invoiceNumber = `AP-INV-${year}-${nextNum.toString().padStart(6, '0')}`;
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
      const invoiceResult = await query<APVendorInvoice>(
        `INSERT INTO ap_vendor_invoices (
          org_id, vendor_id, purchase_order_id, invoice_number, vendor_invoice_number,
          invoice_date, due_date, payment_terms, currency, subtotal, tax_amount,
          discount_amount, total_amount, notes, billing_address, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          data.org_id,
          data.vendor_id,
          data.purchase_order_id || null,
          invoiceNumber,
          data.vendor_invoice_number,
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
          `INSERT INTO ap_invoice_line_items (
            ap_invoice_id, purchase_order_item_id, product_id, description,
            quantity, unit_price, discount_percent, discount_amount,
            tax_rate, tax_amount, line_total, line_number, account_id, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            invoice.id,
            item.purchase_order_item_id || null,
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

      return invoice;
    } catch (error) {
      console.error('Error creating vendor invoice:', error);
      throw error;
    }
  }

  /**
   * Get vendor invoices
   */
  static async getVendorInvoices(
    orgId: string,
    filters?: {
      vendor_id?: string;
      status?: string;
      date_from?: string;
      date_to?: string;
      overdue?: boolean;
    },
    limit = 50,
    offset = 0
  ): Promise<{ data: APVendorInvoice[]; count: number }> {
    try {
      const conditions: string[] = ['org_id = $1'];
      const params: unknown[] = [orgId];
      let paramIndex = 2;

      if (filters?.vendor_id) {
        conditions.push(`vendor_id = $${paramIndex}`);
        params.push(filters.vendor_id);
        paramIndex++;
      }

      if (filters?.status) {
        conditions.push(`status = $${paramIndex}`);
        params.push(filters.status);
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
        conditions.push(`status IN ('submitted', 'approved', 'partially_paid') AND due_date < CURRENT_DATE`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get count
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ap_vendor_invoices ${whereClause}`,
        params
      );
      const count = parseInt(countResult.rows[0]?.count || '0', 10);

      // Get invoices
      params.push(limit, offset);
      const result = await query<APVendorInvoice>(
        `SELECT * FROM ap_vendor_invoices
         ${whereClause}
         ORDER BY invoice_date DESC, created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
      );

      return { data: result.rows, count };
    } catch (error) {
      console.error('Error fetching vendor invoices:', error);
      throw error;
    }
  }

  /**
   * Get vendor invoice by ID
   */
  static async getVendorInvoiceById(id: string, orgId: string): Promise<APVendorInvoice | null> {
    try {
      const result = await query<APVendorInvoice>(
        'SELECT * FROM ap_vendor_invoices WHERE id = $1 AND org_id = $2',
        [id, orgId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching vendor invoice:', error);
      throw error;
    }
  }

  /**
   * Get invoice line items
   */
  static async getInvoiceLineItems(invoiceId: string): Promise<APInvoiceLineItem[]> {
    try {
      const result = await query<APInvoiceLineItem>(
        'SELECT * FROM ap_invoice_line_items WHERE ap_invoice_id = $1 ORDER BY line_number, id',
        [invoiceId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching invoice line items:', error);
      throw error;
    }
  }

  /**
   * Approve invoice
   */
  static async approveInvoice(
    invoiceId: string,
    orgId: string,
    approvedBy: string
  ): Promise<APVendorInvoice> {
    try {
      await query(
        `UPDATE ap_vendor_invoices
         SET status = 'approved', approved_by = $1, approved_at = now(), updated_at = now()
         WHERE id = $2 AND org_id = $3`,
        [approvedBy, invoiceId, orgId]
      );

      const result = await query<APVendorInvoice>(
        'SELECT * FROM ap_vendor_invoices WHERE id = $1',
        [invoiceId]
      );

      if (!result.rows[0]) {
        throw new Error('Invoice not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error approving invoice:', error);
      throw error;
    }
  }

  /**
   * Process payment
   */
  static async processPayment(data: {
    org_id: string;
    vendor_id: string;
    payment_number?: string;
    payment_date?: string;
    amount: number;
    currency?: string;
    payment_method: APPayment['payment_method'];
    bank_account_id?: string;
    reference_number?: string;
    notes?: string;
    processed_by?: string;
  }): Promise<APPayment> {
    try {
      // Generate payment number if not provided
      let paymentNumber = data.payment_number;
      if (!paymentNumber) {
        const year = new Date().getFullYear();
        const result = await query<{ max_num: string | null }>(
          `SELECT MAX(CAST(substring(payment_number FROM '\\d+$') AS integer)) as max_num
           FROM ap_payments
           WHERE org_id = $1 AND payment_number LIKE $2`,
          [data.org_id, `AP-PAY-${year}-%`]
        );
        const nextNum = parseInt(result.rows[0]?.max_num || '0', 10) + 1;
        paymentNumber = `AP-PAY-${year}-${nextNum.toString().padStart(6, '0')}`;
      }

      const result = await query<APPayment>(
        `INSERT INTO ap_payments (
          org_id, vendor_id, payment_number, payment_date, amount,
          currency, payment_method, bank_account_id, reference_number,
          notes, processed_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          data.org_id,
          data.vendor_id,
          paymentNumber,
          data.payment_date || new Date().toISOString().split('T')[0],
          data.amount,
          data.currency || 'ZAR',
          data.payment_method,
          data.bank_account_id || null,
          data.reference_number || null,
          data.notes || null,
          data.processed_by || null,
          'pending',
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  /**
   * Get payments
   */
  static async getPayments(
    orgId: string,
    filters?: {
      vendor_id?: string;
      status?: string;
      date_from?: string;
      date_to?: string;
      payment_method?: string;
    },
    limit = 50,
    offset = 0
  ): Promise<{ data: APPayment[]; count: number }> {
    try {
      const conditions: string[] = ['org_id = $1'];
      const params: unknown[] = [orgId];
      let paramIndex = 2;

      if (filters?.vendor_id) {
        conditions.push(`vendor_id = $${paramIndex}`);
        params.push(filters.vendor_id);
        paramIndex++;
      }

      if (filters?.status) {
        conditions.push(`status = $${paramIndex}`);
        params.push(filters.status);
        paramIndex++;
      }

      if (filters?.date_from) {
        conditions.push(`payment_date >= $${paramIndex}`);
        params.push(filters.date_from);
        paramIndex++;
      }

      if (filters?.date_to) {
        conditions.push(`payment_date <= $${paramIndex}`);
        params.push(filters.date_to);
        paramIndex++;
      }

      if (filters?.payment_method) {
        conditions.push(`payment_method = $${paramIndex}`);
        params.push(filters.payment_method);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get count
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ap_payments ${whereClause}`,
        params
      );
      const count = parseInt(countResult.rows[0]?.count || '0', 10);

      // Get payments
      params.push(limit, offset);
      const result = await query<APPayment>(
        `SELECT * FROM ap_payments
         ${whereClause}
         ORDER BY payment_date DESC, created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
      );

      return { data: result.rows, count };
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }
  }

  /**
   * Allocate payment to invoices
   */
  static async allocatePayment(
    paymentId: string,
    allocations: Array<{ invoice_id: string; amount: number; discount_taken?: number }>
  ): Promise<void> {
    try {
      for (const allocation of allocations) {
        await query(
          `INSERT INTO ap_payment_allocations (
            ap_payment_id, ap_invoice_id, allocated_amount, discount_taken
          ) VALUES ($1, $2, $3, $4)`,
          [
            paymentId,
            allocation.invoice_id,
            allocation.amount,
            allocation.discount_taken || 0,
          ]
        );

        // Update invoice paid amount
        await query(
          `UPDATE ap_vendor_invoices
           SET paid_amount = paid_amount + $1,
               status = CASE
                 WHEN paid_amount + $1 >= total_amount THEN 'paid'
                 WHEN paid_amount + $1 > 0 THEN 'partially_paid'
                 ELSE status
               END,
               updated_at = now()
           WHERE id = $2`,
          [allocation.amount, allocation.invoice_id]
        );
      }

      // Update payment status
      await query(
        `UPDATE ap_payments SET status = 'paid', updated_at = now() WHERE id = $1`,
        [paymentId]
      );
    } catch (error) {
      console.error('Error allocating payment:', error);
      throw error;
    }
  }

  /**
   * Three-way match
   */
  static async matchThreeWay(
    invoiceId: string,
    purchaseOrderId: string,
    receiptId?: string
  ): Promise<void> {
    try {
      // Get amounts
      const poResult = await query<{ total: number }>(
        'SELECT COALESCE(SUM(total), 0) as total FROM purchase_order_items WHERE purchase_order_id = $1',
        [purchaseOrderId]
      );
      const poAmount = parseFloat(poResult.rows[0]?.total || '0');

      const invoiceResult = await query<{ total_amount: number }>(
        'SELECT total_amount FROM ap_vendor_invoices WHERE id = $1',
        [invoiceId]
      );
      const invoiceAmount = parseFloat(invoiceResult.rows[0]?.total_amount || '0');

      let receiptAmount = 0;
      if (receiptId) {
        const receiptResult = await query<{ total: number }>(
          'SELECT COALESCE(SUM(quantity), 0) as total FROM receipt_items WHERE receipt_id = $1',
          [receiptId]
        );
        receiptAmount = parseFloat(receiptResult.rows[0]?.total || '0');
      }

      const varianceAmount = invoiceAmount - poAmount;
      const variancePercent = poAmount > 0 ? (varianceAmount / poAmount) * 100 : 0;

      let matchStatus: APVendorInvoice['three_way_match_status'] = 'matched';
      const exceptions: string[] = [];

      if (Math.abs(variancePercent) > 5) {
        matchStatus = 'exceptions';
        exceptions.push(`Variance exceeds 5%: ${variancePercent.toFixed(2)}%`);
      }

      if (receiptId && Math.abs(receiptAmount - poAmount) > 0.01) {
        matchStatus = 'exceptions';
        exceptions.push('Receipt quantity does not match PO quantity');
      }

      await query(
        `INSERT INTO ap_three_way_match (
          ap_invoice_id, purchase_order_id, receipt_id, status,
          po_amount, receipt_amount, invoice_amount, variance_amount,
          variance_percent, exceptions, matched_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
        ON CONFLICT (ap_invoice_id) DO UPDATE SET
          purchase_order_id = $2,
          receipt_id = $3,
          status = $4,
          po_amount = $5,
          receipt_amount = $6,
          invoice_amount = $7,
          variance_amount = $8,
          variance_percent = $9,
          exceptions = $10,
          matched_at = now(),
          updated_at = now()`,
        [
          invoiceId,
          purchaseOrderId,
          receiptId || null,
          matchStatus,
          poAmount,
          receiptAmount,
          invoiceAmount,
          varianceAmount,
          variancePercent,
          exceptions,
        ]
      );

      // Update invoice match status
      await query(
        `UPDATE ap_vendor_invoices
         SET three_way_match_status = $1, updated_at = now()
         WHERE id = $2`,
        [matchStatus, invoiceId]
      );
    } catch (error) {
      console.error('Error performing three-way match:', error);
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
    vendor_id: string;
    vendor_name: string;
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
        vendor_id: string;
        vendor_name: string;
        current: string;
        days_1_30: string;
        days_31_60: string;
        days_61_90: string;
        days_over_90: string;
        total: string;
      }>(
        `SELECT
          v.id as vendor_id,
          v.name as vendor_name,
          COALESCE(SUM(CASE WHEN inv.due_date >= $2 THEN inv.balance_due ELSE 0 END), 0) as current,
          COALESCE(SUM(CASE WHEN inv.due_date < $2 AND inv.due_date >= $2::date - INTERVAL '30 days' THEN inv.balance_due ELSE 0 END), 0) as days_1_30,
          COALESCE(SUM(CASE WHEN inv.due_date < $2::date - INTERVAL '30 days' AND inv.due_date >= $2::date - INTERVAL '60 days' THEN inv.balance_due ELSE 0 END), 0) as days_31_60,
          COALESCE(SUM(CASE WHEN inv.due_date < $2::date - INTERVAL '60 days' AND inv.due_date >= $2::date - INTERVAL '90 days' THEN inv.balance_due ELSE 0 END), 0) as days_61_90,
          COALESCE(SUM(CASE WHEN inv.due_date < $2::date - INTERVAL '90 days' THEN inv.balance_due ELSE 0 END), 0) as days_over_90,
          COALESCE(SUM(inv.balance_due), 0) as total
        FROM supplier v
        LEFT JOIN ap_vendor_invoices inv ON inv.vendor_id = v.id
          AND inv.org_id = $1
          AND inv.balance_due > 0
          AND inv.status NOT IN ('cancelled', 'disputed')
        WHERE v.org_id = $1 OR EXISTS (SELECT 1 FROM ap_vendor_invoices WHERE vendor_id = v.id AND org_id = $1)
        GROUP BY v.id, v.name
        HAVING COALESCE(SUM(inv.balance_due), 0) > 0
        ORDER BY total DESC`,
        [orgId, date]
      );

      return result.rows.map(row => ({
        vendor_id: row.vendor_id,
        vendor_name: row.vendor_name,
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
    vendor_id: string;
    ap_invoice_id?: string;
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
           FROM ap_credit_notes
           WHERE org_id = $1 AND credit_note_number LIKE $2`,
          [data.org_id, `AP-CN-${year}-%`]
        );
        const nextNum = parseInt(result.rows[0]?.max_num || '0', 10) + 1;
        creditNoteNumber = `AP-CN-${year}-${nextNum.toString().padStart(6, '0')}`;
      }

      const result = await query<{ id: string }>(
        `INSERT INTO ap_credit_notes (
          org_id, vendor_id, ap_invoice_id, credit_note_number,
          credit_note_date, reason, total_amount, currency, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id`,
        [
          data.org_id,
          data.vendor_id,
          data.ap_invoice_id || null,
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
}

