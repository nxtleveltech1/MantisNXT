import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';
import { query } from '@/lib/database';

function getSecret() {
  return (
    process.env.PM_ICAL_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    process.env.JWT_SECRET ||
    'pm-ical-dev-secret'
  );
}

function sign(payload: string) {
  const hmac = crypto.createHmac('sha256', getSecret());
  hmac.update(payload, 'utf8');
  return hmac.digest('hex');
}

function encodePayload(payload: Record<string, unknown>) {
  const json = JSON.stringify(payload);
  const base = Buffer.from(json, 'utf8').toString('base64url');
  const signature = sign(base);
  return `${base}.${signature}`;
}

function decodePayload(token: string) {
  const [base, signature] = token.split('.');
  if (!base || !signature) return null;
  if (sign(base) !== signature) return null;
  const json = Buffer.from(base, 'base64url').toString('utf8');
  return JSON.parse(json) as Record<string, unknown>;
}

function buildIcs(events: Array<{ uid: string; title: string; description?: string | null; start?: string | null; end?: string | null; updated?: string | null }>) {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MantisNXT//Project Management//EN',
    'CALSCALE:GREGORIAN',
  ];

  for (const event of events) {
    if (!event.start && !event.end) continue;
    const dtStart = event.start ? new Date(event.start).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : '';
    const dtEnd = event.end ? new Date(event.end).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : '';

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.uid}`);
    lines.push(`SUMMARY:${(event.title || '').replace(/\n/g, ' ')}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${event.description.replace(/\n/g, ' ')}`);
    }
    if (dtStart) lines.push(`DTSTART:${dtStart}`);
    if (dtEnd) lines.push(`DTEND:${dtEnd}`);
    if (event.updated) {
      const dtStamp = new Date(event.updated).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      lines.push(`DTSTAMP:${dtStamp}`);
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      const { orgId, userId } = await requirePmAuth(request);
      const projectId = searchParams.get('project_id');
      const expiresInDays = Number(searchParams.get('expires_in_days') || 30);
      const exp = Date.now() + Math.max(1, expiresInDays) * 24 * 60 * 60 * 1000;

      const payload = {
        orgId,
        userId,
        projectId: projectId || null,
        exp,
      };

      const signed = encodePayload(payload);
      const feedUrl = `${new URL(request.url).origin}/api/v1/project-management/integrations/ical?token=${signed}`;

      return NextResponse.json({ data: { feedUrl, expiresAt: new Date(exp).toISOString() }, error: null });
    }

    const payload = decodePayload(token);
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { data: null, error: { code: 'INVALID_TOKEN', message: 'Invalid feed token' } },
        { status: 401 }
      );
    }

    const exp = Number(payload.exp || 0);
    if (!exp || Date.now() > exp) {
      return NextResponse.json(
        { data: null, error: { code: 'TOKEN_EXPIRED', message: 'Feed token expired' } },
        { status: 401 }
      );
    }

    const orgId = String(payload.orgId || '');
    const projectId = payload.projectId ? String(payload.projectId) : null;

    const tasks = await query(
      `
      SELECT task_id, title, description, start_date, due_date, updated_at
      FROM core.pm_task
      WHERE org_id = $1
      ${projectId ? 'AND project_id = $2' : ''}
      ORDER BY due_date NULLS LAST
      `,
      projectId ? [orgId, projectId] : [orgId]
    );

    const milestones = await query(
      `
      SELECT milestone_id, name, description, due_date, updated_at
      FROM core.pm_milestone
      WHERE org_id = $1
      ${projectId ? 'AND project_id = $2' : ''}
      ORDER BY due_date NULLS LAST
      `,
      projectId ? [orgId, projectId] : [orgId]
    );

    const events = [
      ...tasks.rows.map((row: any) => ({
        uid: `task-${row.task_id}@mantisnxt`,
        title: row.title,
        description: row.description,
        start: row.start_date,
        end: row.due_date,
        updated: row.updated_at,
      })),
      ...milestones.rows.map((row: any) => ({
        uid: `milestone-${row.milestone_id}@mantisnxt`,
        title: row.name,
        description: row.description,
        start: row.due_date,
        end: row.due_date,
        updated: row.updated_at,
      })),
    ];

    const ics = buildIcs(events);

    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    return handlePmError(error);
  }
}
