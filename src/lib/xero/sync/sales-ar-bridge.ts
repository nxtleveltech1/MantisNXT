import { query } from '@/lib/database';
import { hasActiveConnection } from '@/lib/xero/token-manager';
import { syncSalesInvoiceToXero } from './invoices';
import { syncCustomerToXero } from './contacts';
import { getXeroEntityId } from './helpers';

type ArInvoiceRow = {
  id: string;
  org_id: string;
  customer_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  notes: string | null;
};

type ArInvoiceLineRow = {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  account_id: string | null;
};

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  tax_number: string | null;
  address: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  } | null;
};

async function ensureCustomerSyncedToXero(orgId: string, customerId: string): Promise<void> {
  const existing = await getXeroEntityId(orgId, 'contact', customerId);
  if (existing) return;

  const customerResult = await query<CustomerRow>(
    `SELECT id, name, email, phone, company, tax_number, address
     FROM customer
     WHERE id = $1 AND org_id = $2`,
    [customerId, orgId]
  );
  const customer = customerResult.rows[0];
  if (!customer) {
    throw new Error(`Customer ${customerId} not found for organization ${orgId}`);
  }

  const syncResult = await syncCustomerToXero(orgId, {
    id: customer.id,
    name: customer.name,
    email: customer.email || undefined,
    phone: customer.phone || undefined,
    company: customer.company || undefined,
    taxNumber: customer.tax_number || undefined,
    address: customer.address
      ? {
          street: customer.address.street,
          city: customer.address.city,
          state: customer.address.state,
          postalCode: customer.address.postal_code,
          country: customer.address.country,
        }
      : undefined,
  });

  if (!syncResult.success) {
    throw new Error(syncResult.error || 'Failed to sync customer to Xero');
  }
}

export async function scheduleSyncArInvoiceToXero(orgId: string, arInvoiceId: string): Promise<void> {
  try {
    const isConnected = await hasActiveConnection(orgId);
    if (!isConnected) return;

    const invoiceResult = await query<ArInvoiceRow>(
      `SELECT id, org_id, customer_id, invoice_number, invoice_date, due_date, currency,
              subtotal, tax_amount, total_amount, status, notes
       FROM ar_customer_invoices
       WHERE id = $1 AND org_id = $2`,
      [arInvoiceId, orgId]
    );
    const invoice = invoiceResult.rows[0];
    if (!invoice) return;

    const lineItemsResult = await query<ArInvoiceLineRow>(
      `SELECT description, quantity, unit_price, tax_rate, tax_amount, line_total, account_id
       FROM ar_invoice_line_items
       WHERE ar_invoice_id = $1
       ORDER BY line_number`,
      [arInvoiceId]
    );

    await ensureCustomerSyncedToXero(orgId, invoice.customer_id);

    await syncSalesInvoiceToXero(orgId, {
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
      lineItems: lineItemsResult.rows.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        taxRate: item.tax_rate,
        taxAmount: item.tax_amount,
        lineTotal: item.line_total,
        accountCode: item.account_id || undefined,
      })),
    });
  } catch (error) {
    console.error('[Xero Sync] Failed to sync AR invoice:', { orgId, arInvoiceId, error });
  }
}

export async function scheduleSyncSalesInvoiceToXero(orgId: string, salesInvoiceId: string): Promise<void> {
  try {
    const arInvoiceResult = await query<{ id: string }>(
      `SELECT id
       FROM ar_customer_invoices
       WHERE org_id = $1 AND sales_invoice_id = $2`,
      [orgId, salesInvoiceId]
    );
    const arInvoiceId = arInvoiceResult.rows[0]?.id;
    if (!arInvoiceId) return;

    await scheduleSyncArInvoiceToXero(orgId, arInvoiceId);
  } catch (error) {
    console.error('[Xero Sync] Failed to schedule sales invoice sync:', { orgId, salesInvoiceId, error });
  }
}
