/**
 * ITERATION 2 - ADR-6: Event Bus Tests
 *
 * Unit tests for cache invalidation event bus.
 */

import { CacheEventBus } from '@/lib/cache/event-bus';
import { createInvalidationEvent, CacheInvalidationEvent } from '@/lib/cache/events';

describe('CacheEventBus', () => {
  let eventBus: CacheEventBus;

  beforeEach(() => {
    eventBus = new CacheEventBus();
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  describe('Event Emission', () => {
    it('should emit events to registered listeners', async () => {
      const listener = jest.fn();
      eventBus.on('inventory.updated', listener);

      const event = createInvalidationEvent('inventory.updated', {
        entityId: 'test-123',
      });

      const result = await eventBus.emit(event);

      expect(result.success).toBe(true);
      expect(result.listenersNotified).toBe(1);
      expect(listener).toHaveBeenCalledWith(event);
    });

    it('should emit events to multiple listeners', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();

      eventBus.on('inventory.updated', listener1);
      eventBus.on('inventory.updated', listener2);
      eventBus.on('inventory.updated', listener3);

      const event = createInvalidationEvent('inventory.updated', {
        entityId: 'test-123',
      });

      const result = await eventBus.emit(event);

      expect(result.success).toBe(true);
      expect(result.listenersNotified).toBe(3);
      expect(listener1).toHaveBeenCalledWith(event);
      expect(listener2).toHaveBeenCalledWith(event);
      expect(listener3).toHaveBeenCalledWith(event);
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = jest.fn().mockRejectedValue(new Error('Listener error'));
      const successListener = jest.fn();

      eventBus.on('inventory.updated', errorListener);
      eventBus.on('inventory.updated', successListener);

      const event = createInvalidationEvent('inventory.updated', {
        entityId: 'test-123',
      });

      const result = await eventBus.emit(event);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.listenersNotified).toBe(1); // Only success listener
      expect(successListener).toHaveBeenCalled();
    });

    it('should update statistics on event emission', async () => {
      const listener = jest.fn();
      eventBus.on('inventory.updated', listener);

      const event = createInvalidationEvent('inventory.updated', {
        entityId: 'test-123',
      });

      await eventBus.emit(event);

      const stats = eventBus.getStats();
      expect(stats.totalEvents).toBe(1);
      expect(stats.eventCounts['inventory.updated']).toBe(1);
      expect(stats.lastEventTime).toBeDefined();
    });
  });

  describe('Global Listeners', () => {
    it('should emit to global listeners for any event type', async () => {
      const globalListener = jest.fn();
      eventBus.onAny(globalListener);

      const event1 = createInvalidationEvent('inventory.updated', {
        entityId: 'test-123',
      });
      const event2 = createInvalidationEvent('supplier.created', {
        entityId: 'supplier-456',
      });

      await eventBus.emit(event1);
      await eventBus.emit(event2);

      expect(globalListener).toHaveBeenCalledTimes(2);
      expect(globalListener).toHaveBeenCalledWith(event1);
      expect(globalListener).toHaveBeenCalledWith(event2);
    });

    it('should emit to both global and specific listeners', async () => {
      const globalListener = jest.fn();
      const specificListener = jest.fn();

      eventBus.onAny(globalListener);
      eventBus.on('inventory.updated', specificListener);

      const event = createInvalidationEvent('inventory.updated', {
        entityId: 'test-123',
      });

      const result = await eventBus.emit(event);

      expect(result.listenersNotified).toBe(2);
      expect(globalListener).toHaveBeenCalledWith(event);
      expect(specificListener).toHaveBeenCalledWith(event);
    });
  });

  describe('Subscriptions', () => {
    it('should return unsubscribe function', () => {
      const listener = jest.fn();
      const subscription = eventBus.on('inventory.updated', listener);

      expect(subscription).toHaveProperty('unsubscribe');
      expect(typeof subscription.unsubscribe).toBe('function');
    });

    it('should unsubscribe listeners', async () => {
      const listener = jest.fn();
      const subscription = eventBus.on('inventory.updated', listener);

      const event = createInvalidationEvent('inventory.updated', {
        entityId: 'test-123',
      });

      await eventBus.emit(event);
      expect(listener).toHaveBeenCalledTimes(1);

      subscription.unsubscribe();

      await eventBus.emit(event);
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should remove all listeners for event type', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      eventBus.on('inventory.updated', listener1);
      eventBus.on('inventory.updated', listener2);

      eventBus.removeAllListeners('inventory.updated');

      const event = createInvalidationEvent('inventory.updated', {
        entityId: 'test-123',
      });

      const result = await eventBus.emit(event);

      expect(result.listenersNotified).toBe(0);
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should track event counts by type', async () => {
      const listener = jest.fn();
      eventBus.on('inventory.updated', listener);
      eventBus.on('supplier.created', listener);

      await eventBus.emit(
        createInvalidationEvent('inventory.updated', { entityId: '1' })
      );
      await eventBus.emit(
        createInvalidationEvent('inventory.updated', { entityId: '2' })
      );
      await eventBus.emit(
        createInvalidationEvent('supplier.created', { entityId: '3' })
      );

      const stats = eventBus.getStats();

      expect(stats.totalEvents).toBe(3);
      expect(stats.eventCounts['inventory.updated']).toBe(2);
      expect(stats.eventCounts['supplier.created']).toBe(1);
    });

    it('should track listener counts', () => {
      eventBus.on('inventory.updated', jest.fn());
      eventBus.on('inventory.updated', jest.fn());
      eventBus.on('supplier.created', jest.fn());
      eventBus.onAny(jest.fn());

      const stats = eventBus.getStats();

      expect(stats.totalListeners).toBe(4);
      expect(stats.listenersByEvent['inventory.updated']).toBe(2);
      expect(stats.listenersByEvent['supplier.created']).toBe(1);
    });

    it('should reset statistics', async () => {
      const listener = jest.fn();
      eventBus.on('inventory.updated', listener);

      await eventBus.emit(
        createInvalidationEvent('inventory.updated', { entityId: '1' })
      );

      let stats = eventBus.getStats();
      expect(stats.totalEvents).toBe(1);

      eventBus.resetStats();

      stats = eventBus.getStats();
      expect(stats.totalEvents).toBe(0);
      expect(stats.errors).toBe(0);
    });
  });

  describe('Listener Checks', () => {
    it('should check if listeners exist for event type', () => {
      expect(eventBus.hasListeners('inventory.updated')).toBe(false);

      eventBus.on('inventory.updated', jest.fn());

      expect(eventBus.hasListeners('inventory.updated')).toBe(true);
    });

    it('should check if any listeners exist', () => {
      expect(eventBus.hasListeners()).toBe(false);

      eventBus.on('inventory.updated', jest.fn());

      expect(eventBus.hasListeners()).toBe(true);
    });

    it('should get listener count for event type', () => {
      expect(eventBus.getListenerCount('inventory.updated')).toBe(0);

      eventBus.on('inventory.updated', jest.fn());
      eventBus.on('inventory.updated', jest.fn());

      expect(eventBus.getListenerCount('inventory.updated')).toBe(2);
    });
  });
});
