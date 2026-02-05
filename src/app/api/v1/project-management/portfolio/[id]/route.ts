import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PortfolioService } from '@/lib/services/project-management/portfolio-service';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const PortfolioUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  owner_id: z.string().uuid().optional().nullable(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { orgId } = await requirePmAuth(request);
    const body = await request.json();
    const payload = PortfolioUpdateSchema.parse(body);

    const portfolio = await PortfolioService.update({
      orgId,
      portfolioId: params.id,
      patch: payload,
    });

    return NextResponse.json({ data: portfolio, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
