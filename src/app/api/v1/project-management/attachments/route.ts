import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DocumentService } from '@/lib/services/docustore/document-service';
import { requirePmAuth, assertProjectAccess } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';
import { query } from '@/lib/database';

const AttachmentCreateSchema = z.object({
  entity_type: z.enum(['project', 'task', 'sprint', 'milestone']),
  entity_id: z.string().uuid(),
  document_id: z.string().uuid(),
});

async function getProjectId(orgId: string, entityType: string, entityId: string) {
  switch (entityType) {
    case 'project':
      return entityId;
    case 'task': {
      const result = await query<{ project_id: string }>(
        'SELECT project_id FROM core.pm_task WHERE org_id = $1 AND task_id = $2',
        [orgId, entityId]
      );
      return result.rows[0]?.project_id || null;
    }
    case 'sprint': {
      const result = await query<{ project_id: string }>(
        'SELECT project_id FROM core.pm_sprint WHERE org_id = $1 AND sprint_id = $2',
        [orgId, entityId]
      );
      return result.rows[0]?.project_id || null;
    }
    case 'milestone': {
      const result = await query<{ project_id: string }>(
        'SELECT project_id FROM core.pm_milestone WHERE org_id = $1 AND milestone_id = $2',
        [orgId, entityId]
      );
      return result.rows[0]?.project_id || null;
    }
    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, orgId, userId } = await requirePmAuth(request);
    const body = await request.json();
    const payload = AttachmentCreateSchema.parse(body);

    const projectId = await getProjectId(orgId, payload.entity_type, payload.entity_id);
    if (!projectId) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Entity not found' } },
        { status: 404 }
      );
    }

    await assertProjectAccess({ orgId, user, projectId });

    await DocumentService.createLink({
      document_id: payload.document_id,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      link_type: 'pm_attachment',
      metadata: { source: 'project-management' },
      created_by: userId,
    });

    const result = await query(
      `
      INSERT INTO core.pm_attachment (attachment_id, entity_type, entity_id, document_id, uploaded_by)
      VALUES (gen_random_uuid(), $1, $2, $3, $4)
      RETURNING attachment_id, entity_type, entity_id, document_id, uploaded_by, created_at
      `,
      [payload.entity_type, payload.entity_id, payload.document_id, userId]
    );

    return NextResponse.json({ data: result.rows[0], error: null }, { status: 201 });
  } catch (error) {
    return handlePmError(error);
  }
}
