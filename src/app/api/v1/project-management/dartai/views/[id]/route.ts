import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createErrorResponse } from '@/lib/utils/neon-error-handler';
import { DartAiClient } from '@/services/dartai/dartai-client';
import { requirePmDartAiToken } from '@/lib/project-management/dartai-auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { token } = await requirePmDartAiToken(request);
    const client = new DartAiClient();

    const result = await client.getView({ token, id: params.id });

    if (!result.ok) {
      return NextResponse.json(
        { data: null, error: { code: 'DARTAI_ERROR', message: 'Failed to get view' } },
        { status: result.status }
      );
    }

    return NextResponse.json({ data: result.data, error: null });
  } catch (error: unknown) {
    return createErrorResponse(error, 500);
  }
}



