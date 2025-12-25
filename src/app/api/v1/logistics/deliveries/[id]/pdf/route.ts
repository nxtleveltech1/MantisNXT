// UPDATE: [2025-12-25] Created delivery note PDF route with DocuStore integration

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getOrgId } from '../../../../_helpers';
import { LogisticsPDFService, type DeliveryNoteData } from '@/lib/services/logistics/logistics-pdf-service';
import { query } from '@/lib/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DeliveryRow {
  id: string;
  delivery_number: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_company: string | null;
  customer_phone: string | null;
  delivery_address: string;
  delivery_date: string;
  delivery_contact: string | null;
  notes: string | null;
  driver_name: string | null;
  vehicle_registration: string | null;
}

interface DeliveryItemRow {
  product_name: string;
  sku: string | null;
  quantity: number;
  unit: string | null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const orgId = await getOrgId(request);
    const userId = request.headers.get('x-user-id') || undefined;

    // Fetch delivery details
    const deliveryResult = await query<DeliveryRow>(
      `SELECT 
         d.id, d.delivery_number, d.order_id,
         o.document_number as order_number,
         c.name as customer_name, c.company as customer_company,
         c.phone as customer_phone,
         d.delivery_address, d.delivery_date, d.delivery_contact,
         d.notes, d.driver_name, d.vehicle_registration
       FROM logistics.deliveries d
       JOIN sales.orders o ON o.id = d.order_id
       JOIN customers.customers c ON c.id = o.customer_id
       WHERE d.id = $1 AND d.org_id = $2`,
      [id, orgId]
    );

    if (deliveryResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Delivery not found' },
        { status: 404 }
      );
    }

    const delivery = deliveryResult.rows[0];

    // Fetch delivery items
    const itemsResult = await query<DeliveryItemRow>(
      `SELECT 
         p.name as product_name,
         p.sku,
         di.quantity,
         di.unit
       FROM logistics.delivery_items di
       JOIN inventory.products p ON p.id = di.product_id
       WHERE di.delivery_id = $1
       ORDER BY di.line_number`,
      [id]
    );

    const data: DeliveryNoteData = {
      deliveryId: delivery.id,
      deliveryNumber: delivery.delivery_number,
      orgId,
      orderId: delivery.order_id,
      orderNumber: delivery.order_number,
      customer: {
        name: delivery.customer_name,
        company: delivery.customer_company || undefined,
        phone: delivery.customer_phone || undefined,
      },
      deliveryAddress: delivery.delivery_address,
      deliveryDate: delivery.delivery_date,
      deliveryContact: delivery.delivery_contact || undefined,
      items: itemsResult.rows.map(item => ({
        name: item.product_name,
        sku: item.sku || undefined,
        quantity: item.quantity,
        unit: item.unit || undefined,
      })),
      notes: delivery.notes || undefined,
      driver: delivery.driver_name || undefined,
      vehicleReg: delivery.vehicle_registration || undefined,
    };

    const { pdfBuffer } = await LogisticsPDFService.generateDeliveryNote(data, userId);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${delivery.delivery_number}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error generating delivery note PDF:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

