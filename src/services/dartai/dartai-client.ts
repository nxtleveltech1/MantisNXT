import { z } from 'zod';

const DartAiConfigSchema = z.unknown();
const DartAiUnknownSchema = z.unknown();

export type DartAiClientConfig = {
  baseUrl?: string;
};

export class DartAiClient {
  private readonly baseUrl: string;

  constructor(config: DartAiClientConfig = {}) {
    this.baseUrl = (config.baseUrl || process.env.DARTAI_API_BASE_URL || 'https://app.dartai.com/api/v0/public')
      .replace(/\/+$/, '');
  }

  private async requestJson(params: {
    token: string;
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    query?: Record<string, string | undefined>;
    body?: unknown;
  }) {
    const url = new URL(`${this.baseUrl}${params.path}`);
    if (params.query) {
      for (const [k, v] of Object.entries(params.query)) {
        if (v !== undefined && v !== null && String(v).length > 0) {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const res = await fetch(url.toString(), {
      method: params.method,
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json',
      },
      body: params.body !== undefined ? JSON.stringify(params.body) : undefined,
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }

    if (!res.ok) {
      return { ok: false as const, status: res.status, body: json };
    }

    return { ok: true as const, status: res.status, data: DartAiUnknownSchema.parse(json) };
  }

  async getConfig(params: { token: string }) {
    const res = await this.requestJson({ token: params.token, path: '/config', method: 'GET' });
    if (!res.ok) return res;
    return { ok: true as const, status: res.status, data: DartAiConfigSchema.parse(res.data) };
  }

  async getDartboard(params: { token: string; id: string }) {
    return this.requestJson({ token: params.token, path: `/dartboards/${params.id}`, method: 'GET' });
  }

  async listDartboards(params: { token: string; query?: Record<string, string | undefined> }) {
    // Note: Dart-AI API doesn't have a direct list endpoint, but we can extract dartboard IDs from tasks
    // This is a helper that fetches tasks and extracts unique dartboard IDs
    const tasksResult = await this.listTasks({ token: params.token, query: params.query });
    if (!tasksResult.ok) {
      return tasksResult;
    }
    
    // Extract unique dartboard IDs from tasks
    const tasks = Array.isArray(tasksResult.data) 
      ? tasksResult.data 
      : Array.isArray(tasksResult.data?.items) 
        ? tasksResult.data.items 
        : Array.isArray(tasksResult.data?.item)
          ? tasksResult.data.item
          : [];
    
    const dartboardIds = new Set<string>();
    tasks.forEach((task: unknown) => {
      if (task && typeof task === 'object' && 'dartboard' in task && typeof task.dartboard === 'string') {
        dartboardIds.add(task.dartboard);
      }
    });
    
    // Fetch each dartboard
    const dartboards = await Promise.all(
      Array.from(dartboardIds).map(id => this.getDartboard({ token: params.token, id }))
    );
    
    const successfulDartboards = dartboards
      .filter(d => d.ok)
      .map(d => d.data);
    
    return { ok: true as const, status: 200, data: successfulDartboards };
  }

  async listTasks(params: { token: string; query?: Record<string, string | undefined> }) {
    return this.requestJson({ token: params.token, path: '/tasks/list', method: 'GET', query: params.query });
  }

  async createTask(params: { token: string; body: unknown }) {
    return this.requestJson({ token: params.token, path: '/tasks', method: 'POST', body: params.body });
  }

  async getTask(params: { token: string; id: string }) {
    return this.requestJson({ token: params.token, path: `/tasks/${params.id}`, method: 'GET' });
  }

  async updateTask(params: { token: string; id: string; body: unknown }) {
    return this.requestJson({ token: params.token, path: `/tasks/${params.id}`, method: 'PUT', body: params.body });
  }

  async deleteTask(params: { token: string; id: string }) {
    return this.requestJson({ token: params.token, path: `/tasks/${params.id}`, method: 'DELETE' });
  }

  async moveTask(params: { token: string; id: string; body: unknown }) {
    return this.requestJson({ token: params.token, path: `/tasks/${params.id}/move`, method: 'POST', body: params.body });
  }

  async addTimeTracking(params: { token: string; id: string; body: unknown }) {
    return this.requestJson({
      token: params.token,
      path: `/tasks/${params.id}/time-tracking`,
      method: 'POST',
      body: params.body,
    });
  }

  async addAttachmentFromUrl(params: { token: string; id: string; body: unknown }) {
    return this.requestJson({
      token: params.token,
      path: `/tasks/${params.id}/attachments/from-url`,
      method: 'POST',
      body: params.body,
    });
  }
}


