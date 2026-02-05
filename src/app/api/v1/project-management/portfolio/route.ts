import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PortfolioService } from '@/lib/services/project-management/portfolio-service';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const PortfolioCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requirePmAuth(request);
    const portfolios = await PortfolioService.list(orgId);
    return NextResponse.json({ data: portfolios, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await requirePmAuth(request);
    const body = await request.json();
    const payload = PortfolioCreateSchema.parse(body);

    const portfolio = await PortfolioService.create({
      orgId,
      name: payload.name,
      description: payload.description,
      ownerId: userId,
    });

    return NextResponse.json({ data: portfolio, error: null }, { status: 201 });
  } catch (error) {
    return handlePmError(error);
  }
}
