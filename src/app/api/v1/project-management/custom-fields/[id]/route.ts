import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CustomFieldService } from '@/lib/services/project-management/custom-field-service';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const CustomFieldUpdateSchema = z.object({
  name: z.string().optional(),
  key: z.string().optional(),
  type: z.string().optional(),
  options: z.record(z.unknown()).optional(),
  is_required: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { orgId } = await requirePmAuth(request);
    const body = await request.json();
    const payload = CustomFieldUpdateSchema.parse(body);

    const field = await CustomFieldService.updateField({
      orgId,
      fieldId: params.id,
      patch: payload,
    });

    return NextResponse.json({ data: field, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { orgId } = await requirePmAuth(request);
    await CustomFieldService.deleteField(orgId, params.id);
    return NextResponse.json({ data: { removed: true }, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
