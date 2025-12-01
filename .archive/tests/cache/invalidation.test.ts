/**
 * ITERATION 2 - ADR-6: Cache Invalidation Tests
 *
 * Unit tests for event-driven cache invalidation logic.
 */

import { QueryClient } from '@tanstack/react-query';
import { CacheInvalidationManager, triggerCacheInvalidation } from '@/lib/cache/event-invalidation';
import { cacheEventBus } from '@/lib/cache/event-bus';
import { createInvalidationEvent } from '@/lib/cache/events';

describe('CacheInvalidationManager', () => {
  let queryClient: QueryClient;
  let manager: CacheInvalidationManager;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    manager = new CacheInvalidationManager({
      enabled: true,
      logInvalidations: false,
      queryClient,
    });

    manager.initialize();
  });

  afterEach(() => {
    manager.destroy();
    queryClient.clear();
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(manager).toBeDefined();
    });

    it('should subscribe to event bus on initialization', () => {
      const stats = cacheEventBus.getStats();
      expect(stats.totalListeners).toBeGreaterThan(0);
    });

    it('should not initialize if disabled', () => {
      const disabledManager = new CacheInvalidationManager({
        enabled: false,
        logInvalidations: false,
        queryClient,
      });

      disabledManager.initialize();
      // Should not subscribe to events
      disabledManager.destroy();
    });
  });

  describe('Event-Driven Invalidation', () => {
    it('should invalidate queries on inventory.updated event', async () => {
      // Set up query data
      queryClient.setQueryData(['inventory-list', {}], {
        data: [{ id: '1', name: 'Item 1' }],
      });

      const query = queryClient.getQueryCache().find({
        queryKey: ['inventory-list', {}],
      });

      expect(query?.state.isInvalidated).toBe(false);

      // Emit event
      await cacheEventBus.emit(
        createInvalidationEvent('inventory.updated', {
          entityId: 'item-123',
        })
      );

      // Small delay for async invalidation
      await new Promise(resolve => setTimeout(resolve, 100));

      const updatedQuery = queryClient.getQueryCache().find({
        queryKey: ['inventory-list', {}],
      });

      expect(updatedQuery?.state.isInvalidated).toBe(true);
    });

    it('should invalidate multiple queries matching patterns', async () => {
      // Set up multiple queries
      queryClient.setQueryData(['inventory-list', {}], { data: [] });
      queryClient.setQueryData(['inventory-analytics', {}], { data: {} });
      queryClient.setQueryData(['dashboard-metrics'], { data: {} });

      // Emit event
      await cacheEventBus.emit(
        createInvalidationEvent('inventory.created', {
          entityId: 'new-item',
        })
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // All related queries should be invalidated
      const queries = queryClient.getQueryCache().getAll();
      queries.forEach(query => {
        expect(query.state.isInvalidated).toBe(true);
      });
    });

    it('should not invalidate unrelated queries', async () => {
      // Set up queries
      queryClient.setQueryData(['inventory-list', {}], { data: [] });
      queryClient.setQueryData(['unrelated-query'], { data: {} });

      // Emit supplier event
      await cacheEventBus.emit(
        createInvalidationEvent('supplier.updated', {
          entityId: 'supplier-123',
        })
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const unrelatedQuery = queryClient.getQueryCache().find({
        queryKey: ['unrelated-query'],
      });

      // Unrelated query should not be invalidated
      expect(unrelatedQuery?.state.isInvalidated).toBe(false);
    });
  });

  describe('Manual Invalidation', () => {
    it('should allow manual invalidation trigger', async () => {
      queryClient.setQueryData(['inventory-list', {}], { data: [] });

      const result = await manager.invalidate('inventory.updated', {
        entityId: 'manual-test',
      });

      expect(result.success).toBe(true);
      expect(result.queriesInvalidated).toBeGreaterThan(0);
    });

    it('should return patterns matched', async () => {
      queryClient.setQueryData(['inventory-list', {}], { data: [] });

      const result = await manager.invalidate('inventory.updated', {
        entityId: 'test-123',
      });

      expect(result.patternsMatched.length).toBeGreaterThan(0);
    });
  });

  describe('Invalidation Log', () => {
    it('should log invalidations', async () => {
      await manager.invalidate('inventory.updated', {
        entityId: 'log-test',
      });

      const log = manager.getInvalidationLog();
      expect(log.length).toBe(1);
      expect(log[0].event.type).toBe('inventory.updated');
    });

    it('should limit log size to 100 entries', async () => {
      // Emit 150 events
      for (let i = 0; i < 150; i++) {
        await manager.invalidate('inventory.updated', {
          entityId: `test-${i}`,
        });
      }

      const log = manager.getInvalidationLog();
      expect(log.length).toBe(100);
    });

    it('should clear invalidation log', async () => {
      await manager.invalidate('inventory.updated', {
        entityId: 'test',
      });

      expect(manager.getInvalidationLog().length).toBe(1);

      manager.clearInvalidationLog();

      expect(manager.getInvalidationLog().length).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should track invalidation statistics', async () => {
      queryClient.setQueryData(['inventory-list', {}], { data: [] });
      queryClient.setQueryData(['dashboard-metrics'], { data: {} });

      await manager.invalidate('inventory.updated', { entityId: '1' });
      await manager.invalidate('inventory.updated', { entityId: '2' });
      await manager.invalidate('supplier.created', { entityId: '3' });

      const stats = manager.getStats();

      expect(stats.totalInvalidations).toBe(3);
      expect(stats.totalQueriesInvalidated).toBeGreaterThan(0);
      expect(stats.eventTypeCounts['inventory.updated']).toBe(2);
      expect(stats.eventTypeCounts['supplier.created']).toBe(1);
    });

    it('should calculate average queries per invalidation', async () => {
      queryClient.setQueryData(['inventory-list', {}], { data: [] });

      await manager.invalidate('inventory.updated', { entityId: '1' });
      await manager.invalidate('inventory.updated', { entityId: '2' });

      const stats = manager.getStats();

      expect(stats.avgQueriesPerInvalidation).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    it('should clean up subscriptions on destroy', () => {
      const initialListeners = cacheEventBus.getStats().totalListeners;

      manager.destroy();

      const finalListeners = cacheEventBus.getStats().totalListeners;

      expect(finalListeners).toBeLessThan(initialListeners);
    });

    it('should clear log on destroy', async () => {
      await manager.invalidate('inventory.updated', { entityId: 'test' });

      expect(manager.getInvalidationLog().length).toBe(1);

      manager.destroy();

      expect(manager.getInvalidationLog().length).toBe(0);
    });
  });
});

describe('triggerCacheInvalidation', () => {
  it('should emit event and return result', async () => {
    const result = await triggerCacheInvalidation('inventory.updated', {
      entityId: 'test-123',
    });

    expect(result.success).toBe(true);
    expect(result.patternsMatched.length).toBeGreaterThan(0);
  });

  it('should include entity-specific patterns', async () => {
    const result = await triggerCacheInvalidation('inventory.updated', {
      entityId: 'specific-item',
      supplierId: 'supplier-456',
    });

    expect(result.patternsMatched).toContain('inventory-item-specific-item');
    expect(result.patternsMatched).toContain('supplier-inventory-supplier-456');
  });
});
