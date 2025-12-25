import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SigningWorkflowService } from '@/lib/services/docustore';
import { getOrgId } from '../../../../sales/_helpers';

const recordSignatureSchema = z.object({
  signer_id: z.string().uuid(),
  signature_data: z.string().min(1), // Base64-encoded signature
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getOrgId(request);
    const userId = request.headers.get('x-user-id') || request.headers.get('x-clerk-user-id') || undefined;
    const body = await request.json();
    const validated = recordSignatureSchema.parse(body);

    // Get IP address and user agent
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                      request.headers.get('x-real-ip') || 
                      undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    const signature = await SigningWorkflowService.recordSignature(
      validated.signer_id,
      validated.signature_data,
      {
        ip_address: ipAddress,
        user_agent: userAgent,
      }
    );

    return NextResponse.json(
      {
        success: true,
        data: signature,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error recording signature:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record signature',
      },
      { status: 400 }
    );
  }
}

