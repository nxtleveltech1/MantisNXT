import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AutomationService } from '@/lib/services/project-management/automation-service';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const RuleUpdateSchema = z.object({
  name: z.string().optional(),
  triggerType: z.enum(['event', 'schedule', 'sla']).optional(),
  triggerConfig: z.record(z.unknown()).optional(),
  conditions: z.array(z.record(z.unknown())).optional(),
  actions: z.array(z.record(z.unknown())).optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { orgId } = await requirePmAuth(request);
    const body = await request.json();
    const payload = RuleUpdateSchema.parse(body);

    const rule = await AutomationService.updateRule({
      orgId,
      ruleId: params.id,
      patch: {
        name: payload.name,
        triggerType: payload.triggerType,
        triggerConfig: payload.triggerConfig,
        conditions: payload.conditions,
        actions: payload.actions,
        status: payload.status,
      },
    });

    return NextResponse.json({ data: rule, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { orgId } = await requirePmAuth(request);
    await AutomationService.deleteRule(orgId, params.id);
    return NextResponse.json({ data: { removed: true }, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
