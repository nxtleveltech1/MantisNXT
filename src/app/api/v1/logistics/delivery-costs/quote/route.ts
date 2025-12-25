import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DeliveryCostService } from '@/lib/services/logistics';
import { getOrgId } from '@/app/api/v1/sales/_helpers';

// Contact schema for pickup/delivery contacts
const contactSchema = z
  .object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    company: z.string().optional(),
  })
  .optional();

const getQuotesSchema = z.object({
  pickup_address: z.record(z.unknown()),
  pickup_contact: contactSchema,
  delivery_address: z.record(z.unknown()),
  delivery_contact: contactSchema,
  weight_kg: z.number().positive(),
  dimensions: z
    .object({
      length_cm: z.number().positive(),
      width_cm: z.number().positive(),
      height_cm: z.number().positive(),
    })
    .optional(),
  service_tier: z.enum(['standard', 'express', 'urgent']).optional(),
  declared_value: z.number().nonnegative().optional(),
  package_description: z.string().optional(),
  requires_signature: z.boolean().default(false),
  is_fragile: z.boolean().default(false),
  is_insured: z.boolean().default(false),
  quotation_id: z.string().uuid().optional(),
  sales_order_id: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validatedData = getQuotesSchema.parse(body);

    const quotes = await DeliveryCostService.getDeliveryQuotes(orgId, validatedData);

    return NextResponse.json({
      success: true,
      data: {
        quotes,
      },
    });
  } catch (error) {
    console.error('Error getting delivery quotes:', error);
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
        error: error instanceof Error ? error.message : 'Failed to get delivery quotes',
      },
      { status: 500 }
    );
  }
}

