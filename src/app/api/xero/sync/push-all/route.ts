/**
 * Xero Push All API
 *
 * POST /api/xero/sync/push-all
 *
 * Pushes all NXT entities (contacts, items, invoices) for the current org to Xero.
 * Order: suppliers → customers → items → AR invoices → AP invoices.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { validateXeroRequest } from '@/lib/xero/validation';
import { handleApiError } from '@/lib/xero/errors';
import {
  syncSuppliersToXero,
  syncCustomerToXero,
  syncProductsToXero,
  syncSalesInvoiceToXero,
  syncSupplierInvoiceToXero,
} from '@/lib/xero/sync';
import { ARService, APService } from '@/lib/services/financial';
import type { Supplier } from '@/types/supplier';

interface PushSummary {
  contacts: { succeeded: number; failed: number; errors: string[] };
  items: { succeeded: number; failed: number; errors: string[] };
  arInvoices: { succeeded: number; failed: number; errors: string[] };
  apInvoices: { succeeded: number; failed: number; errors: string[] };
}

function toSupplierLike(row: {
  id: string;
  name: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  status?: string | null;
}): Supplier {
  return {
    id: row.id,
    name: row.name,
    code: row.id,
    status: (row.status === 'active' ? 'active' : 'inactive') as 'active' | 'inactive',
    tier: 'approved',
    tags: [],
    contacts: [
      {
        id: row.id,
        type: 'primary' as const,
        name: row.name,
        title: '',
        email: row.contact_email ?? '',
        phone: row.contact_phone ?? '',
        isPrimary: true,
        isActive: true,
      },
    ].filter((c) => c.email || c.phone),
    addresses: [],
    businessInfo: {
      legalName: row.name,
      taxId: '',
      registrationNumber: '',
      currency: 'ZAR',
    },
    capabilities: {
      products: [],
      services: [],
      certifications: [],
      leadTime: 0,
      paymentTerms: '',
    },
    performance: {
      onTimeDelivery: 0,
      qualityRating: 0,
      responseTime: 0,
      totalOrders: 0,
      totalSpend: 0,
    },
    financial: { currency: 'ZAR', paymentTerms: '' },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: '',
  };
}

export async function POST(request: NextRequest) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;
    const { orgId } = validation;

    const summary: PushSummary = {
      contacts: { succeeded: 0, failed: 0, errors: [] },
      items: { succeeded: 0, failed: 0, errors: [] },
      arInvoices: { succeeded: 0, failed: 0, errors: [] },
      apInvoices: { succeeded: 0, failed: 0, errors: [] },
    };

    // 1. Suppliers (public.supplier by org_id)
    try {
      const supplierRows = await query<{
        id: string;
        name: string;
        contact_email: string | null;
        contact_phone: string | null;
        status: string | null;
      }>('SELECT id, name, contact_email, contact_phone, status FROM supplier WHERE org_id = $1', [
        orgId,
      ]);
      const suppliers = supplierRows.rows.map(toSupplierLike);
      if (suppliers.length > 0) {
        const result = await syncSuppliersToXero(orgId, suppliers);
        summary.contacts.succeeded += result.succeeded;
        summary.contacts.failed += result.failed;
        result.errors.forEach((e) =>
          summary.contacts.errors.push(`Supplier ${e.nxtEntityId}: ${e.error}`)
        );
      }
    } catch (err) {
      summary.contacts.errors.push(err instanceof Error ? err.message : 'Suppliers sync failed');
      summary.contacts.failed++;
    }

    // 2. Customers
    try {
      const customerRows = await query<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        company: string | null;
      }>('SELECT id, name, email, phone, company FROM customer WHERE org_id = $1', [orgId]);
      for (const c of customerRows.rows) {
        try {
          const res = await syncCustomerToXero(orgId, {
            id: c.id,
            name: c.name,
            email: c.email ?? undefined,
            phone: c.phone ?? undefined,
            company: c.company ?? undefined,
          });
          if (res.success) summary.contacts.succeeded++;
          else {
            summary.contacts.failed++;
            summary.contacts.errors.push(`Customer ${c.id}: ${res.error}`);
          }
        } catch (err) {
          summary.contacts.failed++;
          summary.contacts.errors.push(
            `Customer ${c.id}: ${err instanceof Error ? err.message : 'Unknown error'}`
          );
        }
      }
    } catch (err) {
      summary.contacts.errors.push(err instanceof Error ? err.message : 'Customers sync failed');
    }

    // 3. Products (inventory_item with org_id if present)
    try {
      const hasOrgColumn = await query<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'inventory_item' AND column_name = 'org_id'
        ) as exists`
      );
      if (hasOrgColumn.rows[0]?.exists) {
        const productRows = await query<{
          id: string;
          sku: string;
          name: string;
          description: string | null;
          cost_price: number | null;
          sale_price: number | null;
        }>(
          'SELECT id, sku, name, description, cost_price, sale_price FROM inventory_item WHERE org_id = $1',
          [orgId]
        );
        const products = productRows.rows.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          description: p.description ?? undefined,
          baseCost: p.cost_price ?? undefined,
          salePrice: p.sale_price ?? undefined,
        }));
        if (products.length > 0) {
          const result = await syncProductsToXero(orgId, products);
          summary.items.succeeded = result.succeeded;
          summary.items.failed = result.failed;
          result.errors.forEach((e) =>
            summary.items.errors.push(`Item ${e.nxtEntityId}: ${e.error}`)
          );
        }
      }
    } catch (err) {
      summary.items.errors.push(err instanceof Error ? err.message : 'Items sync failed');
    }

    // 4. AR Invoices
    try {
      const { data: arInvoices } = await ARService.getARInvoices(orgId, {}, 200, 0);
      for (const inv of arInvoices) {
        try {
          const lineRows = await query<{
            description: string;
            quantity: number;
            unit_price: number;
            tax_rate: number;
            tax_amount: number;
            line_total: number;
            account_id: string | null;
          }>(
            'SELECT description, quantity, unit_price, tax_rate, tax_amount, line_total, account_id FROM ar_invoice_line_items WHERE ar_invoice_id = $1 ORDER BY line_number',
            [inv.id]
          );
          const nxtInvoice = {
            id: inv.id,
            customerId: inv.customer_id,
            invoiceNumber: inv.invoice_number,
            invoiceDate: inv.invoice_date,
            dueDate: inv.due_date,
            currency: inv.currency ?? 'ZAR',
            reference: inv.notes ?? undefined,
            subtotal: Number(inv.subtotal),
            taxAmount: Number(inv.tax_amount),
            totalAmount: Number(inv.total_amount),
            status: inv.status,
            lineItems: lineRows.rows.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              taxRate: item.tax_rate,
              taxAmount: item.tax_amount,
              lineTotal: item.line_total,
              accountCode: item.account_id ?? undefined,
            })),
          };
          const res = await syncSalesInvoiceToXero(orgId, nxtInvoice);
          if (res.success) summary.arInvoices.succeeded++;
          else {
            summary.arInvoices.failed++;
            summary.arInvoices.errors.push(`AR ${inv.invoice_number}: ${res.error}`);
          }
        } catch (err) {
          summary.arInvoices.failed++;
          summary.arInvoices.errors.push(
            `AR ${inv.invoice_number}: ${err instanceof Error ? err.message : 'Unknown error'}`
          );
        }
      }
    } catch (err) {
      summary.arInvoices.errors.push(
        err instanceof Error ? err.message : 'AR invoices sync failed'
      );
    }

    // 5. AP Invoices
    try {
      const { data: apInvoices } = await APService.getVendorInvoices(orgId, {}, 200, 0);
      for (const inv of apInvoices) {
        try {
          const lineRows = await query<{
            description: string;
            quantity: number;
            unit_price: number;
            tax_rate: number;
            account_id: string | null;
          }>(
            'SELECT description, quantity, unit_price, tax_rate, account_id FROM ap_invoice_line_items WHERE ap_invoice_id = $1 ORDER BY line_number',
            [inv.id]
          );
          const nxtInvoice = {
            id: inv.id,
            supplierId: inv.vendor_id,
            invoiceNumber: inv.vendor_invoice_number,
            invoiceDate: inv.invoice_date,
            dueDate: inv.due_date,
            currency: inv.currency ?? 'ZAR',
            subtotal: Number(inv.subtotal),
            taxAmount: Number(inv.tax_amount),
            totalAmount: Number(inv.total_amount),
            status: inv.status,
            lineItems: lineRows.rows.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              taxRate: item.tax_rate,
              accountCode: item.account_id ?? undefined,
            })),
          };
          const res = await syncSupplierInvoiceToXero(orgId, nxtInvoice);
          if (res.success) summary.apInvoices.succeeded++;
          else {
            summary.apInvoices.failed++;
            summary.apInvoices.errors.push(`AP ${inv.invoice_number}: ${res.error}`);
          }
        } catch (err) {
          summary.apInvoices.failed++;
          summary.apInvoices.errors.push(
            `AP ${inv.invoice_number}: ${err instanceof Error ? err.message : 'Unknown error'}`
          );
        }
      }
    } catch (err) {
      summary.apInvoices.errors.push(
        err instanceof Error ? err.message : 'AP invoices sync failed'
      );
    }

    return NextResponse.json({
      success: true,
      summary: {
        contacts: `${summary.contacts.succeeded} synced, ${summary.contacts.failed} failed`,
        items: `${summary.items.succeeded} synced, ${summary.items.failed} failed`,
        arInvoices: `${summary.arInvoices.succeeded} synced, ${summary.arInvoices.failed} failed`,
        apInvoices: `${summary.apInvoices.succeeded} synced, ${summary.apInvoices.failed} failed`,
      },
      details: summary,
    });
  } catch (error) {
    return handleApiError(error, 'Xero Push All');
  }
}
