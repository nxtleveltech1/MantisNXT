import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CustomFieldService } from '@/lib/services/project-management/custom-field-service';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const ValuesQuerySchema = z.object({
  entity_type: z.string().min(1),
  entity_id: z.string().uuid(),
});

const ValuesCreateSchema = z.object({
  fieldId: z.string().uuid(),
  entityType: z.string().min(1),
  entityId: z.string().uuid(),
  value: z.unknown().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requirePmAuth(request);
    const { searchParams } = new URL(request.url);
    const params = ValuesQuerySchema.parse({
      entity_type: searchParams.get('entity_type') || undefined,
      entity_id: searchParams.get('entity_id') || undefined,
    });

    const values = await CustomFieldService.getValues({
      orgId,
      entityType: params.entity_type,
      entityId: params.entity_id,
    });

    return NextResponse.json({ data: values, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requirePmAuth(request);
    const body = await request.json();
    const payload = ValuesCreateSchema.parse(body);

    const value = await CustomFieldService.setValue({
      orgId,
      fieldId: payload.fieldId,
      entityType: payload.entityType,
      entityId: payload.entityId,
      value: payload.value || null,
    });

    return NextResponse.json({ data: value, error: null }, { status: 201 });
  } catch (error) {
    return handlePmError(error);
  }
}
