import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-helper';
import * as testingService from '@/services/repairs/testingService';
import { z } from 'zod';

const createTestSchema = z.object({
  repair_order_id: z.string().uuid(),
  test_type: z.string().optional(),
  test_name: z.string().min(1).max(200),
  test_result: z.enum(['pass', 'fail', 'partial']).optional(),
  test_data: z.record(z.unknown()).optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = createTestSchema.parse(body);

    const test = await testingService.createRepairTest(validated, user.id);

    return NextResponse.json({ success: true, data: test }, { status: 201 });
  } catch (error) {
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

    console.error('Error in POST /api/repairs/tests:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create test',
      },
      { status: 500 }
    );
  }
}

