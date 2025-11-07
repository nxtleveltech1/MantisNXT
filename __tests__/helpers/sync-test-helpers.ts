/**
 * Test utilities and helpers for sync service testing
 */

import { generateCustomerData, generateSyncQueueData, generateDeltaData } from '../fixtures/sync-test-data';

/**
 * Mock database query function
 */
export const createMockDatabase = () => {
  const data: Record<string, any[]> = {
    customer: [],
    woo_customer_sync_queue: [],
    woo_customer_sync_queue_line: [],
    conflict: [],
    activity: [],
  };

  return {
    async query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }> {
      // Simulate INSERT operations
      if (sql.includes('INSERT INTO customer')) {
        const customerId = `cust-${Date.now()}`;
        data.customer.push({
          id: customerId,
          email: params?.[2],
          name: params?.[1],
          ...params?.slice(3).reduce((acc, val, idx) => acc, {}),
        });
        return { rows: [{ id: customerId } as T] };
      }

      // Simulate SELECT operations
      if (sql.includes('SELECT * FROM customer WHERE email')) {
        const email = params?.[0];
        return {
          rows: data.customer.filter((c) => c.email === email) as T[],
        };
      }

      if (sql.includes('SELECT * FROM woo_customer_sync_queue WHERE id')) {
        const id = params?.[0];
        return {
          rows: data.woo_customer_sync_queue.filter((q) => q.id === id) as T[],
        };
      }

      if (sql.includes('SELECT COUNT(*) FROM')) {
        return { rows: [{ count: Math.floor(Math.random() * 1000) } as T] };
      }

      return { rows: [] };
    },

    async insert(table: string, values: Record<string, any>) {
      const record = {
        id: `${table}-${Date.now()}`,
        ...values,
        created_at: new Date(),
        updated_at: new Date(),
      };
      if (!data[table]) data[table] = [];
      data[table].push(record);
      return record;
    },

    async update(table: string, id: string, values: Record<string, any>) {
      if (!data[table]) return null;
      const idx = data[table].findIndex((r) => r.id === id);
      if (idx >= 0) {
        data[table][idx] = { ...data[table][idx], ...values, updated_at: new Date() };
        return data[table][idx];
      }
      return null;
    },

    async delete(table: string, id: string) {
      if (!data[table]) return;
      data[table] = data[table].filter((r) => r.id !== id);
    },

    get(table: string) {
      return data[table] || [];
    },

    clear() {
      Object.keys(data).forEach((key) => {
        data[key] = [];
      });
    },
  };
};

/**
 * Mock WooCommerce service
 */
export const createMockWooCommerceService = (overrides: Record<string, any> = {}) => {
  return {
    async getCustomers(params: any = {}) {
      return {
        data: generateCustomerData(params.per_page || 10),
      };
    },

    async getCustomer(id: number) {
      const customers = generateCustomerData(1);
      return {
        data: { ...customers[0], id },
      };
    },

    async getOrders(params: any = {}) {
      return {
        data: [
          {
            id: '1',
            customer_id: params.customer,
            status: 'completed',
            total: '1500.00',
            date_created: '2024-01-15T10:30:00Z',
          },
          {
            id: '2',
            customer_id: params.customer,
            status: 'completed',
            total: '2500.00',
            date_created: '2024-02-20T14:45:00Z',
          },
        ],
      };
    },

    async fetchAllPages(callback: Function, params: any = {}) {
      return generateCustomerData(100);
    },

    ...overrides,
  };
};

/**
 * Mock Odoo service
 */
export const createMockOdooService = (overrides: Record<string, any> = {}) => {
  return {
    async getPartners(params: any = {}) {
      return generateCustomerData(params.limit || 10);
    },

    async getPartner(id: number) {
      return generateCustomerData(1)[0];
    },

    async createPartner(data: any) {
      return {
        id: Math.floor(Math.random() * 10000),
        ...data,
      };
    },

    async updatePartner(id: number, data: any) {
      return {
        id,
        ...data,
      };
    },

    ...overrides,
  };
};

/**
 * Create mock sync progress tracker
 */
export const createMockSyncProgressTracker = () => {
  let progress = {
    jobId: `job-${Date.now()}`,
    state: 'draft',
    startTime: null as number | null,
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
    total: 0,
    speed: 0,
    eta: null as number | null,
  };

  return {
    start(total: number) {
      progress.state = 'processing';
      progress.total = total;
      progress.startTime = Date.now();
      return progress;
    },

    update(created: number = 0, updated: number = 0, failed: number = 0) {
      progress.processed = created + updated + failed;
      progress.created += created;
      progress.updated += updated;
      progress.failed += failed;

      if (progress.startTime) {
        const elapsedMs = Date.now() - progress.startTime;
        progress.speed = progress.processed / (elapsedMs / 1000);
        const remaining = progress.total - progress.processed;
        progress.eta = remaining > 0 ? progress.startTime + elapsedMs + (remaining / progress.speed) * 1000 : null;
      }

      return progress;
    },

    complete() {
      progress.state = 'done';
      return progress;
    },

    getProgress() {
      return { ...progress };
    },
  };
};

/**
 * Create mock conflict resolver
 */
export const createMockConflictResolver = () => {
  const conflicts: Record<string, any> = {};
  const resolutions: Record<string, any> = {};

  return {
    async registerConflict(conflict: any) {
      conflicts[conflict.id] = conflict;
      return conflict.id;
    },

    async resolveConflict(conflictId: string, strategy: 'auto-retry' | 'manual' | 'skip', resolution: any = {}) {
      if (!conflicts[conflictId]) throw new Error(`Conflict not found: ${conflictId}`);

      const resolved = {
        ...conflicts[conflictId],
        resolved: true,
        resolution: { strategy, ...resolution },
        resolvedAt: new Date().toISOString(),
      };

      resolutions[conflictId] = resolved;
      delete conflicts[conflictId];

      return resolved;
    },

    getConflict(conflictId: string) {
      return conflicts[conflictId] || null;
    },

    getAllConflicts() {
      return Object.values(conflicts);
    },

    getResolution(conflictId: string) {
      return resolutions[conflictId] || null;
    },

    clear() {
      Object.keys(conflicts).forEach((k) => delete conflicts[k]);
      Object.keys(resolutions).forEach((k) => delete resolutions[k]);
    },
  };
};

/**
 * Create mock delta detection service
 */
export const createMockDeltaDetectionService = () => {
  const cache = new Map<string, any>();

  return {
    async detectDelta(externalIds: string[], localData: any) {
      const cacheKey = `delta-${externalIds.join('-')}`;

      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }

      const delta = generateDeltaData();
      cache.set(cacheKey, delta);

      return delta;
    },

    async compareRecords(external: any, local: any) {
      const changes: Record<string, any> = {};

      Object.keys(external).forEach((key) => {
        if (JSON.stringify(external[key]) !== JSON.stringify(local?.[key])) {
          changes[key] = {
            old: local?.[key],
            new: external[key],
          };
        }
      });

      return {
        hasChanges: Object.keys(changes).length > 0,
        changes,
      };
    },

    clearCache() {
      cache.clear();
    },

    getCacheStats() {
      return {
        size: cache.size,
        entries: Array.from(cache.keys()),
      };
    },
  };
};

/**
 * API request/response builders
 */
export const createApiRequest = (method: string = 'POST', body: any = {}) => {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
    },
    body: JSON.stringify(body),
  };
};

export const createAuthenticatedRequest = (token: string, method: string = 'POST', body: any = {}) => {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Org-Id': 'org-test',
    },
    body: JSON.stringify(body),
  };
};

/**
 * SSE event stream emulator
 */
export const createMockSSEStream = () => {
  const listeners: Record<string, Function[]> = {};

  return {
    on(eventType: string, callback: Function) {
      if (!listeners[eventType]) listeners[eventType] = [];
      listeners[eventType].push(callback);
    },

    emit(eventType: string, data: any) {
      if (listeners[eventType]) {
        listeners[eventType].forEach((cb) => cb(data));
      }
    },

    emitProgress(processed: number, total: number) {
      this.emit('progress', {
        processed,
        total,
        percentage: (processed / total) * 100,
      });
    },

    emitMetrics(metrics: any) {
      this.emit('metrics', metrics);
    },

    emitComplete(summary: any) {
      this.emit('complete', summary);
    },

    emitError(error: any) {
      this.emit('error', error);
    },

    close() {
      Object.keys(listeners).forEach((k) => delete listeners[k]);
    },
  };
};

/**
 * Wait utilities for async tests
 */
export const waitForCondition = async (condition: () => boolean, timeout: number = 5000) => {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Condition timeout exceeded');
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

export const waitForMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Assertion helpers
 */
export const expectToBeValidUUID = (value: string) => {
  expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
};

export const expectValidTimestamp = (value: string) => {
  expect(() => new Date(value)).not.toThrow();
  expect(new Date(value).getTime()).toBeGreaterThan(0);
};

export const expectValidEmail = (email: string) => {
  expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
};

/**
 * Pagination helpers
 */
export const createPaginationHelper = (items: any[], pageSize: number = 50) => {
  const pages = Math.ceil(items.length / pageSize);

  return {
    getPage(pageNumber: number) {
      const start = (pageNumber - 1) * pageSize;
      return items.slice(start, start + pageSize);
    },

    getAllPages() {
      const result = [];
      for (let i = 0; i < pages; i++) {
        result.push(this.getPage(i + 1));
      }
      return result;
    },

    getTotalPages() {
      return pages;
    },

    getTotalItems() {
      return items.length;
    },
  };
};

/**
 * Performance measurement helpers
 */
export const measurePerformance = async (fn: () => Promise<any>, label: string = 'Operation') => {
  const startTime = performance.now();
  const startMemory = process.memoryUsage().heapUsed;

  const result = await fn();

  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed;

  return {
    result,
    metrics: {
      durationMs: endTime - startTime,
      memoryDeltaBytes: endMemory - startMemory,
      memoryDeltaMB: (endMemory - startMemory) / 1024 / 1024,
      timestamp: new Date().toISOString(),
    },
  };
};
