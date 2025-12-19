import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PDFService } from '@/lib/services/docustore/pdf-service';
import { getOrgId } from '../../sales/_helpers';

const generateAuditPackSchema = z.object({
  entity_type: z.string().min(1),
  entity_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validated = generateAuditPackSchema.parse(body);
    const userId = request.headers.get('x-user-id') || undefined;

    const artifact = await PDFService.generateAuditPack(
      validated.entity_type,
      validated.entity_id,
      orgId,
      userId
    );

    return NextResponse.json({
      success: true,
      data: artifact,
    });
  } catch (error: unknown) {
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

    console.error('Error in POST /api/v1/docustore/audit-pack:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate audit pack',
      },
      { status: 500 }
    );
  }
}








