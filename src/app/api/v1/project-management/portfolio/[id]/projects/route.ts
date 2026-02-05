import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PortfolioService } from '@/lib/services/project-management/portfolio-service';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const PortfolioProjectSchema = z.object({
  projectId: z.string().uuid(),
  position: z.number().int().optional().nullable(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { orgId } = await requirePmAuth(request);
    const projects = await PortfolioService.listProjects(orgId, params.id);
    return NextResponse.json({ data: projects, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { orgId } = await requirePmAuth(request);
    const body = await request.json();
    const payload = PortfolioProjectSchema.parse(body);

    const project = await PortfolioService.addProject({
      orgId,
      portfolioId: params.id,
      projectId: payload.projectId,
      position: payload.position,
    });

    return NextResponse.json({ data: project, error: null }, { status: 201 });
  } catch (error) {
    return handlePmError(error);
  }
}
