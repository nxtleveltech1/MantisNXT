import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CustomFieldService } from '@/lib/services/project-management/custom-field-service';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const CustomFieldQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
  entity_type: z.enum(['project', 'task']).optional(),
});

const CustomFieldCreateSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  entityType: z.enum(['project', 'task']),
  name: z.string().min(1),
  key: z.string().min(1),
  type: z.string().min(1),
  options: z.record(z.unknown()).optional(),
  isRequired: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requirePmAuth(request);
    const { searchParams } = new URL(request.url);
    const params = CustomFieldQuerySchema.parse({
      project_id: searchParams.get('project_id') || undefined,
      entity_type: searchParams.get('entity_type') || undefined,
    });

    const fields = await CustomFieldService.listFields({
      orgId,
      projectId: params.project_id || null,
      entityType: params.entity_type || null,
    });

    return NextResponse.json({ data: fields, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requirePmAuth(request);
    const body = await request.json();
    const payload = CustomFieldCreateSchema.parse(body);

    const field = await CustomFieldService.createField({
      orgId,
      projectId: payload.projectId,
      entityType: payload.entityType,
      name: payload.name,
      key: payload.key,
      type: payload.type,
      options: payload.options,
      isRequired: payload.isRequired,
    });

    return NextResponse.json({ data: field, error: null }, { status: 201 });
  } catch (error) {
    return handlePmError(error);
  }
}
