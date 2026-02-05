import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ProjectService } from '@/lib/services/project-management/project-service';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const ProjectCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  projectKey: z.string().min(1),
  visibility: z.enum(['org', 'private']).optional(),
  ownerId: z.string().uuid().optional().nullable(),
  startDate: z.string().optional().nullable(),
  targetDate: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const ProjectListSchema = z.object({
  status: z.string().optional(),
  visibility: z.string().optional(),
  search: z.string().optional(),
});

function isAdmin(user: { roles: Array<{ slug: string; level: number }> }) {
  return user.roles.some(role => role.slug === 'admin' || role.slug === 'super_admin' || role.level >= 90);
}

export async function GET(request: NextRequest) {
  try {
    const { user, orgId, userId } = await requirePmAuth(request);
    const { searchParams } = new URL(request.url);
    const filters = ProjectListSchema.parse({
      status: searchParams.get('status') || undefined,
      visibility: searchParams.get('visibility') || undefined,
      search: searchParams.get('search') || undefined,
    });

    const projects = await ProjectService.listForUser({
      orgId,
      userId,
      isAdmin: isAdmin(user),
      filters,
    });

    return NextResponse.json({ data: projects, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await requirePmAuth(request);
    const body = await request.json();
    const payload = ProjectCreateSchema.parse(body);

    const project = await ProjectService.create({
      orgId,
      name: payload.name,
      description: payload.description,
      projectKey: payload.projectKey,
      visibility: payload.visibility,
      ownerId: payload.ownerId ?? userId,
      startDate: payload.startDate,
      targetDate: payload.targetDate,
      metadata: payload.metadata,
    });

    return NextResponse.json({ data: project, error: null }, { status: 201 });
  } catch (error) {
    return handlePmError(error);
  }
}
