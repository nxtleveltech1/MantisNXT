import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DeliveryService } from '@/lib/services/logistics';
import { getOrgId } from '@/app/api/v1/sales/_helpers';

const createDeliverySchema = z.object({
  quotation_id: z.string().uuid().optional().nullable(),
  sales_order_id: z.string().uuid().optional().nullable(),
  customer_id: z.string().uuid().optional().nullable(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_email: z.string().email().optional(),
  pickup_address: z.record(z.unknown()),
  pickup_contact_name: z.string().optional(),
  pickup_contact_phone: z.string().optional(),
  pickup_lat: z.number().optional(),
  pickup_lng: z.number().optional(),
  delivery_address: z.record(z.unknown()),
  delivery_contact_name: z.string().optional(),
  delivery_contact_phone: z.string().optional(),
  delivery_lat: z.number().optional(),
  delivery_lng: z.number().optional(),
  courier_provider_id: z.string().uuid().optional().nullable(),
  service_tier_id: z.string().uuid().optional().nullable(),
  tracking_number: z.string().optional(),
  package_type: z.string().optional(),
  weight_kg: z.number().positive().optional(),
  dimensions_length_cm: z.number().positive().optional(),
  dimensions_width_cm: z.number().positive().optional(),
  dimensions_height_cm: z.number().positive().optional(),
  declared_value: z.number().nonnegative().optional(),
  requires_signature: z.boolean().default(false),
  is_fragile: z.boolean().default(false),
  is_insured: z.boolean().default(false),
  special_instructions: z.string().optional(),
  cost_quoted: z.number().nonnegative().optional(),
  currency: z.string().default('ZAR'),
  requested_pickup_date: z.string().optional(),
  requested_delivery_date: z.string().optional(),
  is_dropshipping: z.boolean().default(false),
  supplier_id: z.string().uuid().optional().nullable(),
  supplier_shipping_address: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;
    const tracking_number = searchParams.get('tracking_number');

    // If tracking_number is provided, use the dedicated method
    if (tracking_number) {
      const delivery = await DeliveryService.getDeliveryByTrackingNumber(tracking_number, orgId);
      return NextResponse.json({
        success: true,
        data: delivery ? [delivery] : [],
        count: delivery ? 1 : 0,
      });
    }

    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status') || undefined;
    const quotation_id = searchParams.get('quotation_id') || undefined;
    const sales_order_id = searchParams.get('sales_order_id') || undefined;
    const customer_id = searchParams.get('customer_id') || undefined;
    const courier_provider_id = searchParams.get('courier_provider_id') || undefined;

    const result = await DeliveryService.getDeliveries(orgId, limit, offset, {
      status: status as any,
      quotation_id,
      sales_order_id,
      customer_id,
      courier_provider_id,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.count,
    });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch deliveries',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validatedData = createDeliverySchema.parse(body);

    const delivery = await DeliveryService.createDelivery({
      org_id: orgId,
      ...validatedData,
    });

    // Auto-generate PDF document in DocuStore
    const userId = request.headers.get('x-user-id') || request.headers.get('x-clerk-user-id') || undefined;
    DocumentGenerationHooks.onDeliveryCreated(delivery.id, orgId, userId).catch(
      (error) => {
        console.error('Failed to auto-generate delivery note PDF:', error);
        // Don't fail the request if PDF generation fails
      }
    );

    return NextResponse.json(
      {
        success: true,
        data: delivery,
        message: 'Delivery created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating delivery:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create delivery',
      },
      { status: 500 }
    );
  }
}

