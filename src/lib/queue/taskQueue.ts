import { randomUUID } from 'crypto';
import NodeCache from 'node-cache';
import type { NextRequest } from 'next/server';

type TaskStatus = 'pending' | 'completed' | 'failed';

interface TaskRecord<T = unknown> {
  status: TaskStatus;
  result?: T;
  error?: string;
  startedAt: string;
  finishedAt?: string;
}

const store = new NodeCache({ stdTTL: 60 * 60, checkperiod: 120, useClones: false });

export function enqueueTask<T>(executor: () => Promise<T>): string {
  const id = randomUUID();
  const record: TaskRecord = {
    status: 'pending',
    startedAt: new Date().toISOString(),
  };
  store.set(id, record);

  setTimeout(async () => {
    try {
      const result = await executor();
      store.set(id, {
        status: 'completed',
        result,
        startedAt: record.startedAt,
        finishedAt: new Date().toISOString(),
      });
    } catch (error) {
      store.set(id, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        startedAt: record.startedAt,
        finishedAt: new Date().toISOString(),
      });
    }
  }, 0);

  return id;
}

export function getTask<T = unknown>(id: string): TaskRecord<T> | undefined {
  return store.get<TaskRecord<T>>(id);
}

export function isAsyncRequest(request: NextRequest): boolean {
  const asyncQuery = request.nextUrl.searchParams.get('async');
  if (asyncQuery && ['true', '1', 'yes'].includes(asyncQuery.toLowerCase())) {
    return true;
  }

  const header = request.headers.get('x-async-task');
  if (header && ['true', '1', 'yes'].includes(header.toLowerCase())) {
    return true;
  }

  return false;
}

export async function executeWithOptionalAsync<T>(
  request: NextRequest,
  executor: () => Promise<T>
): Promise<{ queued: true; taskId: string } | { queued: false; result: T }> {
  if (isAsyncRequest(request)) {
    const taskId = enqueueTask(executor);
    return { queued: true, taskId };
  }

  const result = await executor();
  return { queued: false, result };
}
