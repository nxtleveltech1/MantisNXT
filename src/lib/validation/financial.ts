/**
 * Financial Module Validation Schemas
 * Zod schemas for financial API validation
 */

import { z } from 'zod';

// Common schemas
export const uuidSchema = z.string().uuid();
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const periodSchema = z.string().regex(/^\d{4}-\d{2}$/);
export const currencySchema = z.string().length(3).default('ZAR');
export const amountSchema = z.number().positive().or(z.string().transform((val) => parseFloat(val)).pipe(z.number().positive()));

// AP Invoice Line Item Schema
export const apInvoiceLineItemSchema = z.object({
  purchase_order_item_id: uuidSchema.optional().nullable(),
  product_id: uuidSchema.optional().nullable(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
  discount_percent: z.number().min(0).max(100).default(0),
  tax_rate: z.number().min(0).max(1).default(0),
  account_id: uuidSchema.optional().nullable(),
  line_number: z.number().int().positive().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// AP Vendor Invoice Schema
export const createAPInvoiceSchema = z.object({
  org_id: uuidSchema,
  vendor_id: uuidSchema,
  purchase_order_id: uuidSchema.optional().nullable(),
  invoice_number: z.string().optional(),
  vendor_invoice_number: z.string().min(1),
  invoice_date: dateSchema.optional(),
  due_date: dateSchema,
  payment_terms: z.string().default('Net 30'),
  currency: currencySchema,
  items: z.array(apInvoiceLineItemSchema).min(1),
  notes: z.string().optional().nullable(),
  billing_address: z.record(z.unknown()).optional().nullable(),
  created_by: uuidSchema.optional().nullable(),
});

// AR Invoice Line Item Schema
export const arInvoiceLineItemSchema = z.object({
  sales_order_item_id: uuidSchema.optional().nullable(),
  product_id: uuidSchema.optional().nullable(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
  discount_percent: z.number().min(0).max(100).default(0),
  tax_rate: z.number().min(0).max(1).default(0),
  account_id: uuidSchema.optional().nullable(),
  line_number: z.number().int().positive().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// AR Customer Invoice Schema
export const createARInvoiceSchema = z.object({
  org_id: uuidSchema,
  customer_id: uuidSchema,
  invoice_number: z.string().optional(),
  invoice_date: dateSchema.optional(),
  due_date: dateSchema,
  payment_terms: z.string().default('Net 30'),
  currency: currencySchema,
  items: z.array(arInvoiceLineItemSchema).min(1),
  notes: z.string().optional().nullable(),
  billing_address: z.record(z.unknown()).optional().nullable(),
  shipping_address: z.record(z.unknown()).optional().nullable(),
  created_by: uuidSchema.optional().nullable(),
});

// Journal Entry Line Schema
export const journalEntryLineSchema = z.object({
  account_id: uuidSchema,
  description: z.string().optional(),
  debit_amount: z.number().nonnegative(),
  credit_amount: z.number().nonnegative(),
}).refine(
  (data) => (data.debit_amount > 0 && data.credit_amount === 0) || (data.debit_amount === 0 && data.credit_amount > 0),
  {
    message: 'Line must have either debit or credit amount, not both',
  }
);

// Journal Entry Schema
export const createJournalEntrySchema = z.object({
  org_id: uuidSchema,
  entry_number: z.string().optional(),
  description: z.string().min(1),
  entry_date: dateSchema.optional(),
  reference_type: z.string().optional().nullable(),
  reference_id: uuidSchema.optional().nullable(),
  lines: z.array(journalEntryLineSchema).min(2),
  created_by: uuidSchema,
}).refine(
  (data) => {
    const totalDebits = data.lines.reduce((sum, line) => sum + line.debit_amount, 0);
    const totalCredits = data.lines.reduce((sum, line) => sum + line.credit_amount, 0);
    return Math.abs(totalDebits - totalCredits) < 0.01;
  },
  {
    message: 'Journal entry must balance (debits must equal credits)',
  }
);

// AP Payment Schema
export const createAPPaymentSchema = z.object({
  org_id: uuidSchema,
  vendor_id: uuidSchema,
  payment_number: z.string().optional(),
  payment_date: dateSchema.optional(),
  amount: amountSchema,
  currency: currencySchema,
  payment_method: z.enum(['bank_transfer', 'credit_card', 'cheque', 'cash', 'eft', 'stop_order', 'debit_order']),
  bank_account_id: uuidSchema.optional().nullable(),
  reference_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  processed_by: uuidSchema.optional().nullable(),
});

// AR Receipt Schema
export const createARReceiptSchema = z.object({
  org_id: uuidSchema,
  customer_id: uuidSchema,
  receipt_number: z.string().optional(),
  receipt_date: dateSchema.optional(),
  amount: amountSchema,
  currency: currencySchema,
  payment_method: z.enum(['bank_transfer', 'credit_card', 'cheque', 'cash', 'eft', 'stop_order', 'debit_order']),
  bank_account_id: uuidSchema.optional().nullable(),
  reference_number: z.string().optional().nullable(),
  transaction_id: z.string().optional().nullable(),
  gateway_transaction_id: z.string().optional().nullable(),
  gateway_response: z.record(z.unknown()).optional().nullable(),
  notes: z.string().optional().nullable(),
  processed_by: uuidSchema.optional().nullable(),
});

// Sales Invoice Payment Schema
export const salesInvoicePaymentSchema = z.object({
  sales_invoice_id: uuidSchema,
  amount: amountSchema,
  payment_method: z.enum(['bank_transfer', 'credit_card', 'cheque', 'cash', 'eft', 'stop_order', 'debit_order']),
  reference_number: z.string().optional().nullable(),
  transaction_id: z.string().optional().nullable(),
  processed_by: uuidSchema.optional().nullable(),
});

