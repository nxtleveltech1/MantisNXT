import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AutomationService } from '@/lib/services/project-management/automation-service';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const RuleQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
});

const RuleCreateSchema = z.object({
  name: z.string().min(1),
  projectId: z.string().uuid().optional().nullable(),
  triggerType: z.enum(['event', 'schedule', 'sla']),
  triggerConfig: z.record(z.unknown()),
  conditions: z.array(z.record(z.unknown())).optional(),
  actions: z.array(z.record(z.unknown())).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requirePmAuth(request);
    const { searchParams } = new URL(request.url);
    const params = RuleQuerySchema.parse({ project_id: searchParams.get('project_id') || undefined });

    const rules = await AutomationService.listRules(orgId, params.project_id);
    return NextResponse.json({ data: rules, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await requirePmAuth(request);
    const body = await request.json();
    const payload = RuleCreateSchema.parse(body);

    const rule = await AutomationService.createRule({
      orgId,
      projectId: payload.projectId,
      name: payload.name,
      triggerType: payload.triggerType,
      triggerConfig: payload.triggerConfig,
      conditions: payload.conditions || [],
      actions: payload.actions || [],
      createdBy: userId,
    });

    return NextResponse.json({ data: rule, error: null }, { status: 201 });
  } catch (error) {
    return handlePmError(error);
  }
}
