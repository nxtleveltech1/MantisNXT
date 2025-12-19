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

  private extractListResultsArray(data: unknown): unknown[] {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];

    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.results)) return obj.results;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.tasks)) return obj.tasks;
    if (Array.isArray(obj.data)) return obj.data;
    if (obj.item !== undefined) return Array.isArray(obj.item) ? (obj.item as unknown[]) : [obj.item];
    return [];
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
    // Dart-AI public API does not expose a dartboards list endpoint.
    // We derive "projects" from task list results (ConciseTask.dartboard is the dartboard title).
    const tasksResult = await this.listTasks({
      token: params.token,
      query: {
        no_defaults: 'true',
        limit: '200',
        ...(params.query || {}),
      },
    });
    if (!tasksResult.ok) {
      return tasksResult;
    }
    
    const tasks = this.extractListResultsArray(tasksResult.data);

    const dartboardTitles = new Set<string>();
    for (const task of tasks) {
      if (task && typeof task === 'object') {
        const dartboard = (task as Record<string, unknown>).dartboard;
        if (typeof dartboard === 'string' && dartboard.trim().length > 0) {
          dartboardTitles.add(dartboard.trim());
        }
      }
    }

    return { ok: true as const, status: 200, data: Array.from(dartboardTitles).sort() };
  }

  async listTasks(params: { token: string; query?: Record<string, string | undefined> }) {
    const result = await this.requestJson({ token: params.token, path: '/tasks/list', method: 'GET', query: params.query });
    if (!result.ok) return result;
    
    // Log the raw response structure for debugging
    console.log('[Dart-AI Client] listTasks raw response:', {
      hasData: !!result.data,
      dataType: typeof result.data,
      isArray: Array.isArray(result.data),
      keys: result.data && typeof result.data === 'object' ? Object.keys(result.data) : [],
    });
    
    return result;
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

  // Docs/Notes endpoints
  async listDocs(params: { token: string; query?: Record<string, string | undefined> }) {
    return this.requestJson({ token: params.token, path: '/docs/list', method: 'GET', query: params.query });
  }

  async getDoc(params: { token: string; id: string }) {
    return this.requestJson({ token: params.token, path: `/docs/${params.id}`, method: 'GET' });
  }

  async createDoc(params: { token: string; body: unknown }) {
    return this.requestJson({ token: params.token, path: '/docs', method: 'POST', body: params.body });
  }

  async updateDoc(params: { token: string; id: string; body: unknown }) {
    return this.requestJson({ token: params.token, path: `/docs/${params.id}`, method: 'PUT', body: params.body });
  }

  async deleteDoc(params: { token: string; id: string }) {
    return this.requestJson({ token: params.token, path: `/docs/${params.id}`, method: 'DELETE' });
  }

  // Views/Plans endpoints
  async getView(params: { token: string; id: string }) {
    return this.requestJson({ token: params.token, path: `/views/${params.id}`, method: 'GET' });
  }

  // Comments endpoints
  async listComments(params: { token: string; query?: Record<string, string | undefined> }) {
    return this.requestJson({ token: params.token, path: '/comments/list', method: 'GET', query: params.query });
  }

  async createComment(params: { token: string; body: unknown }) {
    return this.requestJson({ token: params.token, path: '/comments', method: 'POST', body: params.body });
  }
}


