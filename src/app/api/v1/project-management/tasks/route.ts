import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TaskService } from '@/lib/services/project-management/task-service';
import { requirePmAuth, assertProjectAccess } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const TaskQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
  status_id: z.string().uuid().optional(),
  assignee_id: z.string().uuid().optional(),
  label_id: z.string().uuid().optional(),
  sprint_id: z.string().uuid().optional(),
  milestone_id: z.string().uuid().optional(),
  search: z.string().optional(),
  due_from: z.string().optional(),
  due_to: z.string().optional(),
});

const TaskCreateSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  statusId: z.string().uuid().optional().nullable(),
  parentTaskId: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  taskType: z.enum(['task', 'bug', 'feature']).optional(),
  estimatePoints: z.number().int().optional().nullable(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  sprintId: z.string().uuid().optional().nullable(),
  milestoneId: z.string().uuid().optional().nullable(),
  primaryAssigneeId: z.string().uuid().optional().nullable(),
  assigneeIds: z.array(z.string().uuid()).optional(),
  labelIds: z.array(z.string().uuid()).optional(),
  reporterId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

function isAdmin(user: { roles: Array<{ slug: string; level: number }> }) {
  return user.roles.some(role => role.slug === 'admin' || role.slug === 'super_admin' || role.level >= 90);
}

export async function GET(request: NextRequest) {
  try {
    const { user, orgId, userId } = await requirePmAuth(request);
    const { searchParams } = new URL(request.url);
    const filters = TaskQuerySchema.parse({
      project_id: searchParams.get('project_id') || undefined,
      status_id: searchParams.get('status_id') || undefined,
      assignee_id: searchParams.get('assignee_id') || undefined,
      label_id: searchParams.get('label_id') || undefined,
      sprint_id: searchParams.get('sprint_id') || undefined,
      milestone_id: searchParams.get('milestone_id') || undefined,
      search: searchParams.get('search') || undefined,
      due_from: searchParams.get('due_from') || undefined,
      due_to: searchParams.get('due_to') || undefined,
    });

    if (filters.project_id) {
      await assertProjectAccess({ orgId, user, projectId: filters.project_id });
    }

    const tasks = await TaskService.list({
      orgId,
      projectId: filters.project_id,
      statusId: filters.status_id,
      assigneeId: filters.assignee_id,
      labelId: filters.label_id,
      sprintId: filters.sprint_id,
      milestoneId: filters.milestone_id,
      search: filters.search,
      dueFrom: filters.due_from,
      dueTo: filters.due_to,
      userId,
      isAdmin: isAdmin(user),
    });

    return NextResponse.json({ data: tasks, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, orgId, userId } = await requirePmAuth(request);
    const body = await request.json();
    const payload = TaskCreateSchema.parse(body);

    await assertProjectAccess({ orgId, user, projectId: payload.projectId });

    const task = await TaskService.create({
      orgId,
      projectId: payload.projectId,
      title: payload.title,
      description: payload.description,
      statusId: payload.statusId,
      parentTaskId: payload.parentTaskId,
      priority: payload.priority,
      taskType: payload.taskType,
      estimatePoints: payload.estimatePoints,
      startDate: payload.startDate,
      dueDate: payload.dueDate,
      sprintId: payload.sprintId,
      milestoneId: payload.milestoneId,
      primaryAssigneeId: payload.primaryAssigneeId,
      assigneeIds: payload.assigneeIds,
      labelIds: payload.labelIds,
      reporterId: payload.reporterId ?? userId,
      metadata: payload.metadata,
    });

    return NextResponse.json({ data: task, error: null }, { status: 201 });
  } catch (error) {
    return handlePmError(error);
  }
}
