export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import type { NextRequest } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const uploadId = url.searchParams.get('upload_id');
  const supplierId = url.searchParams.get('supplier_id');
  const timeline = url.searchParams.get('timeline') === 'true';

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  let lastId = 0;
  let lastRuleExecutionId = 0;
  let closed = false;

  async function pushEvent(ev: unknown, eventType: string = 'audit') {
    const line = `event: ${eventType}\ndata: ${JSON.stringify(ev)}\n\n`;
    await writer.write(encoder.encode(line));
  }

  async function pushTimelineEvent(event: any) {
    const timelineEvent = {
      timestamp: new Date().toISOString(),
      type: event.type,
      action: event.action,
      status: event.status,
      details: event.details,
      duration: event.duration || null,
      metadata: event.metadata || {},
    };
    await pushEvent(timelineEvent, 'timeline');
  }

  // Enhanced query to include rule executions for timeline view
  async function fetchEvents() {
    if (closed) return;

    try {
      // Fetch audit events
      const where: string[] = [];
      const params: unknown[] = [];
      if (uploadId) {
        where.push(`upload_id = $${params.length + 1}`);
        params.push(uploadId);
      }
      if (supplierId) {
        where.push(`supplier_id = $${params.length + 1}`);
        params.push(supplierId);
      }

      let auditSql = `SELECT id, supplier_id, upload_id, action, status, details, started_at, finished_at
                     FROM public.ai_agent_audit`;
      if (where.length) auditSql += ' WHERE ' + where.join(' AND ');
      auditSql += `${where.length ? ' AND' : ' WHERE'} id > $${params.length + 1}`;
      auditSql += ' ORDER BY id ASC';
      params.push(lastId);

      const auditRes = await query(auditSql, params);

      for (const row of auditRes.rows) {
        lastId = Math.max(lastId, row.id as number);

        if (timeline) {
          // Calculate duration if finished
          let duration = null;
          if (row.finished_at && row.started_at) {
            const start = new Date(row.started_at).getTime();
            const end = new Date(row.finished_at).getTime();
            duration = end - start;
          }

          await pushTimelineEvent({
            type: 'audit',
            action: row.action,
            status: row.status,
            details: row.details,
            duration,
            metadata: {
              supplier_id: row.supplier_id,
              upload_id: row.upload_id,
              audit_id: row.id,
            },
          });
        } else {
          await pushEvent(row);
        }
      }

      // Fetch rule executions for timeline view
      if (timeline && uploadId) {
        const ruleSql = `
          SELECT 
            sre.id,
            sre.supplier_id,
            sre.upload_id,
            sr.rule_name,
            sr.rule_type,
            sre.execution_order,
            sre.trigger_event,
            sre.executed_at,
            sre.success,
            sre.blocked,
            sre.input_snapshot,
            sre.output_snapshot,
            sre.warnings,
            sre.execution_time_ms
          FROM spp.supplier_rule_executions sre
          JOIN spp.supplier_rules sr ON sre.rule_id = sr.id
          WHERE sre.upload_id = $1 AND sre.id > $2
          ORDER BY sre.id ASC
        `;
        const ruleRes = await query(ruleSql, [uploadId, lastRuleExecutionId]);

        for (const row of ruleRes.rows) {
          lastRuleExecutionId = Math.max(lastRuleExecutionId, row.id as number);

          await pushTimelineEvent({
            type: 'rule_execution',
            action: row.rule_type,
            status: row.success ? 'completed' : 'failed',
            details: {
              rule_name: row.rule_name,
              execution_order: row.execution_order,
              blocked: row.blocked,
              warnings: row.warnings,
              input_changed:
                JSON.stringify(row.input_snapshot) !== JSON.stringify(row.output_snapshot),
            },
            duration: row.execution_time_ms,
            metadata: {
              supplier_id: row.supplier_id,
              upload_id: row.upload_id,
              rule_execution_id: row.id,
              rule_type: row.rule_type,
              trigger_event: row.trigger_event,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      // Send error event to client
      await pushEvent(
        {
          type: 'error',
          error: 'Failed to fetch events',
          timestamp: new Date().toISOString(),
        },
        'error'
      );
    }
  }

  // Initial fetch
  await fetchEvents();

  // Set up interval for periodic updates
  const interval = setInterval(fetchEvents, 1000);

  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  request.signal.addEventListener('abort', async () => {
    closed = true;
    clearInterval(interval);
    await writer.close();
  });

  return new Response(stream.readable, { headers });
}
