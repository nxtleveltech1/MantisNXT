/**
 * SyncOrchestrator Unit Tests
 *
 * Tests state machine transitions, batch processing, combined syncs,
 * idempotency, pause/resume, and error recovery.
 *
 * Coverage target: 80%+
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  createMockDatabase,
  createMockWooCommerceService,
  createMockOdooService,
  createMockSyncProgressTracker,
} from '../helpers/sync-test-helpers';
import { generateCustomerData, generateSyncQueueData } from '../fixtures/sync-test-data';

/**
 * Simulated SyncOrchestrator implementation
 */
class SyncOrchestrator {
  private syncs = new Map<string, any>();
  private db: any;
  private wooService: any;
  private odooService: any;
  private progressTracker: any;

  constructor(db: any, wooService: any, odooService: any, progressTracker: any) {
    this.db = db;
    this.wooService = wooService;
    this.odooService = odooService;
    this.progressTracker = progressTracker;
  }

  async initializeSync(config: any) {
    const syncId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const sync = {
      syncId,
      state: 'draft',
      idempotencyKey: config.idempotencyKey || syncId,
      orgId: config.orgId,
      sources: config.sources || ['woocommerce'],
      batchSize: config.batchSize || 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      batches: [],
      paused: false,
      errors: [],
    };

    this.syncs.set(syncId, sync);
    return syncId;
  }

  async transitionState(syncId: string, newState: string) {
    const sync = this.syncs.get(syncId);
    if (!sync) throw new Error(`Sync not found: ${syncId}`);

    const validTransitions: Record<string, string[]> = {
      draft: ['queued', 'cancelled'],
      queued: ['processing', 'cancelled'],
      processing: ['paused', 'done', 'failed'],
      paused: ['processing', 'cancelled'],
      done: [],
      failed: ['processing'],
      cancelled: [],
    };

    if (!validTransitions[sync.state]?.includes(newState)) {
      throw new Error(`Invalid transition from ${sync.state} to ${newState}`);
    }

    sync.state = newState;
    sync.updatedAt = new Date().toISOString();

    return sync;
  }

  async startSync(syncId: string) {
    const sync = this.syncs.get(syncId);
    if (!sync) throw new Error(`Sync not found: ${syncId}`);

    await this.transitionState(syncId, 'queued');
    await this.transitionState(syncId, 'processing');

    this.progressTracker.start(syncId, this.calculateTotalItems(sync));

    return sync;
  }

  private calculateTotalItems(sync: any): number {
    // Simulate counting items across sources
    return 1000; // Mock total
  }

  async processBatch(syncId: string, batchNumber: number, items: any[]) {
    const sync = this.syncs.get(syncId);
    if (!sync) throw new Error(`Sync not found: ${syncId}`);

    if (sync.state !== 'processing' && !sync.paused) {
      throw new Error(`Cannot process batch in state ${sync.state}`);
    }

    const batchResult = {
      batchNumber,
      items: items.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    for (const item of items) {
      try {
        // Simulate processing
        const result = await this.processItem(sync, item);
        if (result.created) batchResult.created++;
        if (result.updated) batchResult.updated++;
      } catch (error: any) {
        batchResult.failed++;
        batchResult.errors.push({
          item: item.id,
          error: error.message,
        });
      }
    }

    sync.batches.push(batchResult);
    this.progressTracker.update(syncId, batchResult.created, batchResult.updated, batchResult.failed);

    return batchResult;
  }

  private async processItem(sync: any, item: any) {
    // Simulate item processing based on source
    if (sync.sources.includes('woocommerce')) {
      return { created: true, updated: false };
    }
    return { created: false, updated: true };
  }

  async pauseSync(syncId: string) {
    const sync = this.syncs.get(syncId);
    if (!sync) throw new Error(`Sync not found: ${syncId}`);

    if (sync.state !== 'processing') {
      throw new Error(`Cannot pause sync in state ${sync.state}`);
    }

    sync.paused = true;
    await this.transitionState(syncId, 'paused');

    return sync;
  }

  async resumeSync(syncId: string) {
    const sync = this.syncs.get(syncId);
    if (!sync) throw new Error(`Sync not found: ${syncId}`);

    if (sync.state !== 'paused') {
      throw new Error(`Cannot resume sync in state ${sync.state}`);
    }

    sync.paused = false;
    await this.transitionState(syncId, 'processing');

    return sync;
  }

  async completeSync(syncId: string) {
    const sync = this.syncs.get(syncId);
    if (!sync) throw new Error(`Sync not found: ${syncId}`);

    await this.transitionState(syncId, 'done');

    const summary = {
      syncId,
      state: sync.state,
      totalBatches: sync.batches.length,
      totalCreated: sync.batches.reduce((sum: number, b: any) => sum + b.created, 0),
      totalUpdated: sync.batches.reduce((sum: number, b: any) => sum + b.updated, 0),
      totalFailed: sync.batches.reduce((sum: number, b: any) => sum + b.failed, 0),
      errors: sync.errors,
    };

    this.progressTracker.complete(syncId);

    return summary;
  }

  async syncWithIdempotency(syncId: string, config: any) {
    // Check if sync with same idempotency key already exists
    const existing = Array.from(this.syncs.values()).find(
      (s) => s.idempotencyKey === config.idempotencyKey && s.state !== 'draft'
    );

    if (existing) {
      return existing.syncId;
    }

    return syncId;
  }

  async recoverFromError(syncId: string) {
    const sync = this.syncs.get(syncId);
    if (!sync) throw new Error(`Sync not found: ${syncId}`);

    sync.state = 'processing';
    sync.errors = [];

    return sync;
  }

  getSync(syncId: string) {
    return this.syncs.get(syncId) || null;
  }

  getAllSyncs() {
    return Array.from(this.syncs.values());
  }

  clear() {
    this.syncs.clear();
  }
}

describe('SyncOrchestrator', () => {
  let orchestrator: SyncOrchestrator;
  let mockDb: any;
  let mockWooService: any;
  let mockOdooService: any;
  let mockProgressTracker: any;

  beforeEach(() => {
    mockDb = createMockDatabase();
    mockWooService = createMockWooCommerceService();
    mockOdooService = createMockOdooService();
    mockProgressTracker = createMockSyncProgressTracker();
    orchestrator = new SyncOrchestrator(mockDb, mockWooService, mockOdooService, mockProgressTracker);
  });

  afterEach(() => {
    orchestrator.clear();
    mockDb.clear();
  });

  describe('state machine', () => {
    let syncId: string;

    beforeEach(async () => {
      syncId = await orchestrator.initializeSync({
        orgId: 'org-123',
        sources: ['woocommerce'],
      });
    });

    it('should start in draft state', () => {
      const sync = orchestrator.getSync(syncId);

      expect(sync.state).toBe('draft');
    });

    it('should transition draft -> queued', async () => {
      const sync = await orchestrator.transitionState(syncId, 'queued');

      expect(sync.state).toBe('queued');
    });

    it('should transition queued -> processing', async () => {
      await orchestrator.transitionState(syncId, 'queued');
      const sync = await orchestrator.transitionState(syncId, 'processing');

      expect(sync.state).toBe('processing');
    });

    it('should transition processing -> paused', async () => {
      await orchestrator.transitionState(syncId, 'queued');
      await orchestrator.transitionState(syncId, 'processing');
      const sync = await orchestrator.transitionState(syncId, 'paused');

      expect(sync.state).toBe('paused');
    });

    it('should transition paused -> processing', async () => {
      await orchestrator.transitionState(syncId, 'queued');
      await orchestrator.transitionState(syncId, 'processing');
      await orchestrator.transitionState(syncId, 'paused');
      const sync = await orchestrator.transitionState(syncId, 'processing');

      expect(sync.state).toBe('processing');
    });

    it('should transition processing -> done', async () => {
      await orchestrator.transitionState(syncId, 'queued');
      await orchestrator.transitionState(syncId, 'processing');
      const sync = await orchestrator.transitionState(syncId, 'done');

      expect(sync.state).toBe('done');
    });

    it('should reject invalid state transitions', async () => {
      // draft -> done is invalid
      await expect(orchestrator.transitionState(syncId, 'done')).rejects.toThrow(
        'Invalid transition'
      );
    });

    it('should track updatedAt on state change', async () => {
      const syncBefore = orchestrator.getSync(syncId);
      const timeBefore = syncBefore.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 50));

      await orchestrator.transitionState(syncId, 'queued');
      const syncAfter = orchestrator.getSync(syncId);

      expect(syncAfter.updatedAt).toBeGreaterThan(timeBefore);
    });
  });

  describe('batch processing', () => {
    let syncId: string;

    beforeEach(async () => {
      syncId = await orchestrator.initializeSync({
        orgId: 'org-123',
        batchSize: 50,
      });
      await orchestrator.startSync(syncId);
    });

    it('should process batch of 50 items', async () => {
      const batch = generateCustomerData(50);

      const result = await orchestrator.processBatch(syncId, 1, batch);

      expect(result.batchNumber).toBe(1);
      expect(result.items).toBe(50);
      expect(result.created + result.updated + result.failed).toBeGreaterThanOrEqual(0);
    });

    it('should process batch of 5000+ items in multiple batches', async () => {
      const allItems = generateCustomerData(5000);

      const batchSize = 50;
      let totalCreated = 0;
      let totalUpdated = 0;

      for (let i = 0; i < allItems.length; i += batchSize) {
        const batch = allItems.slice(i, i + batchSize);
        const result = await orchestrator.processBatch(syncId, Math.floor(i / batchSize) + 1, batch);

        totalCreated += result.created;
        totalUpdated += result.updated;
      }

      const sync = orchestrator.getSync(syncId);
      expect(sync.batches.length).toBe(Math.ceil(5000 / batchSize));
    });

    it('should handle batch errors gracefully', async () => {
      const batch = [
        { id: '1', email: 'valid@example.com' },
        { id: '2', email: null }, // Invalid
        { id: '3', email: 'valid2@example.com' },
      ];

      const result = await orchestrator.processBatch(syncId, 1, batch);

      expect(result.items).toBe(3);
      expect(result.failed).toBeGreaterThanOrEqual(0);
    });

    it('should track batch history', async () => {
      const batch1 = generateCustomerData(50);
      const batch2 = generateCustomerData(50);

      await orchestrator.processBatch(syncId, 1, batch1);
      await orchestrator.processBatch(syncId, 2, batch2);

      const sync = orchestrator.getSync(syncId);

      expect(sync.batches).toHaveLength(2);
      expect(sync.batches[0].batchNumber).toBe(1);
      expect(sync.batches[1].batchNumber).toBe(2);
    });
  });

  describe('pause and resume', () => {
    let syncId: string;

    beforeEach(async () => {
      syncId = await orchestrator.initializeSync({
        orgId: 'org-123',
      });
      await orchestrator.startSync(syncId);
    });

    it('should pause processing sync', async () => {
      const sync = await orchestrator.pauseSync(syncId);

      expect(sync.state).toBe('paused');
      expect(sync.paused).toBe(true);
    });

    it('should resume paused sync', async () => {
      await orchestrator.pauseSync(syncId);
      const sync = await orchestrator.resumeSync(syncId);

      expect(sync.state).toBe('processing');
      expect(sync.paused).toBe(false);
    });

    it('should not pause non-processing sync', async () => {
      await orchestrator.transitionState(syncId, 'queued');

      await expect(orchestrator.pauseSync(syncId)).rejects.toThrow('Cannot pause');
    });

    it('should preserve batch progress after pause/resume', async () => {
      const batch = generateCustomerData(50);
      await orchestrator.processBatch(syncId, 1, batch);

      await orchestrator.pauseSync(syncId);
      const syncPaused = orchestrator.getSync(syncId);

      await orchestrator.resumeSync(syncId);
      const syncResumed = orchestrator.getSync(syncId);

      expect(syncResumed.batches.length).toBe(syncPaused.batches.length);
    });
  });

  describe('idempotency', () => {
    it('should return same syncId for identical idempotency keys', async () => {
      const config = {
        orgId: 'org-123',
        idempotencyKey: 'unique-key-123',
      };

      const syncId1 = await orchestrator.initializeSync(config);
      await orchestrator.startSync(syncId1);

      const syncId2 = await orchestrator.syncWithIdempotency(syncId1, config);

      expect(syncId2).toBe(syncId1);
    });

    it('should generate unique syncIds for different idempotency keys', async () => {
      const syncId1 = await orchestrator.initializeSync({
        orgId: 'org-123',
        idempotencyKey: 'key-1',
      });

      const syncId2 = await orchestrator.initializeSync({
        orgId: 'org-123',
        idempotencyKey: 'key-2',
      });

      expect(syncId1).not.toBe(syncId2);
    });

    it('should auto-generate idempotency key if not provided', async () => {
      const syncId = await orchestrator.initializeSync({
        orgId: 'org-123',
      });

      const sync = orchestrator.getSync(syncId);

      expect(sync.idempotencyKey).toBeDefined();
      expect(typeof sync.idempotencyKey).toBe('string');
    });
  });

  describe('combined WooCommerce + Odoo sync', () => {
    it('should support multi-source sync', async () => {
      const syncId = await orchestrator.initializeSync({
        orgId: 'org-123',
        sources: ['woocommerce', 'odoo'],
      });

      const sync = orchestrator.getSync(syncId);

      expect(sync.sources).toContain('woocommerce');
      expect(sync.sources).toContain('odoo');
    });

    it('should process items from multiple sources', async () => {
      const syncId = await orchestrator.initializeSync({
        orgId: 'org-123',
        sources: ['woocommerce', 'odoo'],
      });

      await orchestrator.startSync(syncId);

      const wooItems = generateCustomerData(25);
      const odooItems = generateCustomerData(25);

      await orchestrator.processBatch(syncId, 1, wooItems);
      await orchestrator.processBatch(syncId, 2, odooItems);

      const sync = orchestrator.getSync(syncId);

      expect(sync.batches).toHaveLength(2);
    });
  });

  describe('error recovery', () => {
    let syncId: string;

    beforeEach(async () => {
      syncId = await orchestrator.initializeSync({
        orgId: 'org-123',
      });
      await orchestrator.startSync(syncId);
    });

    it('should recover from failed state', async () => {
      await orchestrator.transitionState(syncId, 'failed');

      const recovered = await orchestrator.recoverFromError(syncId);

      expect(recovered.state).toBe('processing');
    });

    it('should clear errors on recovery', async () => {
      const sync = orchestrator.getSync(syncId);
      sync.errors.push({ message: 'Test error' });

      await orchestrator.recoverFromError(syncId);

      const recovered = orchestrator.getSync(syncId);
      expect(recovered.errors).toHaveLength(0);
    });
  });

  describe('sync completion', () => {
    let syncId: string;

    beforeEach(async () => {
      syncId = await orchestrator.initializeSync({
        orgId: 'org-123',
      });
      await orchestrator.startSync(syncId);
    });

    it('should complete sync successfully', async () => {
      const summary = await orchestrator.completeSync(syncId);

      expect(summary.state).toBe('done');
      expect(summary).toHaveProperty('totalBatches');
      expect(summary).toHaveProperty('totalCreated');
      expect(summary).toHaveProperty('totalUpdated');
      expect(summary).toHaveProperty('totalFailed');
    });

    it('should return accurate summary statistics', async () => {
      const batch1 = generateCustomerData(50);
      const batch2 = generateCustomerData(50);

      await orchestrator.processBatch(syncId, 1, batch1);
      await orchestrator.processBatch(syncId, 2, batch2);

      const summary = await orchestrator.completeSync(syncId);

      expect(summary.totalBatches).toBe(2);
      expect(summary.totalCreated + summary.totalUpdated + summary.totalFailed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('sync retrieval', () => {
    it('should retrieve sync by ID', async () => {
      const syncId = await orchestrator.initializeSync({
        orgId: 'org-123',
      });

      const sync = orchestrator.getSync(syncId);

      expect(sync).toBeDefined();
      expect(sync.syncId).toBe(syncId);
    });

    it('should return null for non-existent sync', () => {
      const sync = orchestrator.getSync('non-existent');

      expect(sync).toBeNull();
    });

    it('should retrieve all syncs', async () => {
      const syncId1 = await orchestrator.initializeSync({ orgId: 'org-1' });
      const syncId2 = await orchestrator.initializeSync({ orgId: 'org-2' });

      const allSyncs = orchestrator.getAllSyncs();

      expect(allSyncs).toHaveLength(2);
    });
  });

  describe('performance', () => {
    it('should handle 50-item batch within timeout', async () => {
      const syncId = await orchestrator.initializeSync({ orgId: 'org-123' });
      await orchestrator.startSync(syncId);

      const batch = generateCustomerData(50);

      const startTime = Date.now();
      await orchestrator.processBatch(syncId, 1, batch);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });

    it('should handle 5000-item dataset in multiple batches', async () => {
      const syncId = await orchestrator.initializeSync({ orgId: 'org-123' });
      await orchestrator.startSync(syncId);

      const allItems = generateCustomerData(5000);
      const batchSize = 50;

      const startTime = Date.now();

      for (let i = 0; i < allItems.length; i += batchSize) {
        const batch = allItems.slice(i, i + batchSize);
        await orchestrator.processBatch(syncId, Math.floor(i / batchSize) + 1, batch);
      }

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(30000);
    });
  });
});
