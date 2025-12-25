// UPDATE: [2025-12-25] Created purchase order PDF route with DocuStore integration

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getOrgId } from '../../../../sales/_helpers';
import { PurchaseOrderPDFService, type PurchaseOrderData } from '@/lib/services/purchasing/purchase-order-pdf-service';
import { query } from '@/lib/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PORow {
  id: string;
  po_number: string;
  status: string;
  supplier_id: string;
  supplier_name: string;
  supplier_contact: string | null;
  supplier_email: string | null;
  supplier_phone: string | null;
  supplier_address: string | null;
  ship_to_name: string | null;
  ship_to_address: string | null;
  order_date: string;
  expected_date: string | null;
  currency: string;
  subtotal: number;
  total_tax: number;
  total: number;
  notes: string | null;
  terms: string | null;
}

interface POItemRow {
  line_number: number;
  product_name: string;
  sku: string | null;
  description: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  tax_rate: number | null;
  tax_amount: number | null;
  subtotal: number;
  total: number;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const orgId = await getOrgId(request);
    const userId = request.headers.get('x-user-id') || undefined;

    // Fetch PO details
    const poResult = await query<PORow>(
      `SELECT 
         po.id, po.po_number, po.status,
         po.supplier_id, s.name as supplier_name,
         s.contact_name as supplier_contact, s.email as supplier_email,
         s.phone as supplier_phone, s.address as supplier_address,
         po.ship_to_name, po.ship_to_address,
         po.order_date, po.expected_date, po.currency,
         po.subtotal, po.total_tax, po.total,
         po.notes, po.terms
       FROM purchasing.purchase_orders po
       JOIN purchasing.suppliers s ON s.id = po.supplier_id
       WHERE po.id = $1 AND po.org_id = $2`,
      [id, orgId]
    );

    if (poResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    const po = poResult.rows[0];

    // Fetch PO items
    const itemsResult = await query<POItemRow>(
      `SELECT 
         poi.line_number,
         p.name as product_name,
         p.sku,
         poi.description,
         poi.quantity, poi.unit,
         poi.unit_price, poi.tax_rate, poi.tax_amount,
         poi.subtotal, poi.total
       FROM purchasing.purchase_order_items poi
       LEFT JOIN inventory.products p ON p.id = poi.product_id
       WHERE poi.purchase_order_id = $1
       ORDER BY poi.line_number`,
      [id]
    );

    const data: PurchaseOrderData = {
      purchaseOrderId: po.id,
      poNumber: po.po_number,
      orgId,
      status: po.status,
      supplier: {
        id: po.supplier_id,
        name: po.supplier_name,
        contactName: po.supplier_contact || undefined,
        email: po.supplier_email || undefined,
        phone: po.supplier_phone || undefined,
        address: po.supplier_address || undefined,
      },
      shipTo: po.ship_to_name ? {
        name: po.ship_to_name,
        address: po.ship_to_address || '',
      } : undefined,
      orderDate: po.order_date,
      expectedDate: po.expected_date || undefined,
      currency: po.currency,
      items: itemsResult.rows.map(item => ({
        lineNumber: item.line_number,
        productName: item.product_name || 'Unlisted Item',
        sku: item.sku || undefined,
        description: item.description || undefined,
        quantity: item.quantity,
        unit: item.unit || undefined,
        unitPrice: item.unit_price,
        taxRate: item.tax_rate || undefined,
        taxAmount: item.tax_amount || undefined,
        subtotal: item.subtotal,
        total: item.total,
      })),
      subtotal: po.subtotal,
      totalTax: po.total_tax,
      total: po.total,
      notes: po.notes || undefined,
      terms: po.terms || undefined,
    };

    const { pdfBuffer } = await PurchaseOrderPDFService.generatePurchaseOrder(data, userId);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${po.po_number}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error generating purchase order PDF:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

