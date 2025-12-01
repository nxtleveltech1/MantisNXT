/**
 * ITERATION 2 - ADR-6: Event Bus Implementation
 *
 * Central event bus for cache invalidation events.
 * Supports event emission, subscription, and listener management.
 */

import type {
  CacheInvalidationEvent,
  CacheInvalidationEventType,
  CacheEventListener,
  EventSubscription,
  EventEmissionResult,
  EventBusStats,
} from './events';

/**
 * Event Bus for cache invalidation
 * Singleton pattern for global event coordination
 */
export class CacheEventBus {
  private listeners: Map<CacheInvalidationEventType, Set<CacheEventListener>>;
  private globalListeners: Set<CacheEventListener>;
  private stats: {
    totalEvents: number;
    eventCounts: Map<CacheInvalidationEventType, number>;
    errors: number;
    lastEventTime?: number;
  };

  constructor() {
    this.listeners = new Map();
    this.globalListeners = new Set();
    this.stats = {
      totalEvents: 0,
      eventCounts: new Map(),
      errors: 0,
    };
  }

  /**
   * Emit an event to all registered listeners
   */
  async emit(event: CacheInvalidationEvent): Promise<EventEmissionResult> {
    const errors: Error[] = [];
    let listenersNotified = 0;

    try {
      // Update stats
      this.stats.totalEvents++;
      this.stats.lastEventTime = Date.now();
      this.stats.eventCounts.set(event.type, (this.stats.eventCounts.get(event.type) || 0) + 1);

      // Get event-specific listeners
      const eventListeners = this.listeners.get(event.type) || new Set();

      // Combine with global listeners
      const allListeners = new Set([...eventListeners, ...this.globalListeners]);

      // Notify all listeners
      const notifications = Array.from(allListeners).map(async listener => {
        try {
          await listener(event);
          listenersNotified++;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          errors.push(err);
          this.stats.errors++;
          console.error(`[CacheEventBus] Listener error for event ${event.type}:`, err);
        }
      });

      await Promise.all(notifications);

      return {
        success: errors.length === 0,
        listenersNotified,
        errors: errors.length > 0 ? errors : undefined,
        event,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.stats.errors++;
      return {
        success: false,
        listenersNotified,
        errors: [err],
        event,
      };
    }
  }

  /**
   * Subscribe to specific event type
   */
  on(eventType: CacheInvalidationEventType, listener: CacheEventListener): EventSubscription {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const listeners = this.listeners.get(eventType)!;
    listeners.add(listener);

    return {
      unsubscribe: () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(eventType);
        }
      },
    };
  }

  /**
   * Subscribe to all events (global listener)
   */
  onAny(listener: CacheEventListener): EventSubscription {
    this.globalListeners.add(listener);

    return {
      unsubscribe: () => {
        this.globalListeners.delete(listener);
      },
    };
  }

  /**
   * Remove specific listener
   */
  off(eventType: CacheInvalidationEventType, listener: CacheEventListener): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  /**
   * Remove all listeners for an event type
   */
  removeAllListeners(eventType?: CacheInvalidationEventType): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
      this.globalListeners.clear();
    }
  }

  /**
   * Get event bus statistics
   */
  getStats(): EventBusStats {
    const listenersByEvent: Record<string, number> = {};
    this.listeners.forEach((listeners, eventType) => {
      listenersByEvent[eventType] = listeners.size;
    });

    const eventCounts: Record<string, number> = {};
    this.stats.eventCounts.forEach((count, eventType) => {
      eventCounts[eventType] = count;
    });

    let totalListeners = this.globalListeners.size;
    this.listeners.forEach(listeners => {
      totalListeners += listeners.size;
    });

    return {
      totalEvents: this.stats.totalEvents,
      totalListeners,
      listenersByEvent,
      eventCounts,
      lastEventTime: this.stats.lastEventTime,
      errors: this.stats.errors,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalEvents: 0,
      eventCounts: new Map(),
      errors: 0,
    };
  }

  /**
   * Check if there are any listeners for an event type
   */
  hasListeners(eventType?: CacheInvalidationEventType): boolean {
    if (eventType) {
      const listeners = this.listeners.get(eventType);
      return (listeners && listeners.size > 0) || this.globalListeners.size > 0;
    }
    return this.listeners.size > 0 || this.globalListeners.size > 0;
  }

  /**
   * Get listener count for an event type
   */
  getListenerCount(eventType?: CacheInvalidationEventType): number {
    if (eventType) {
      const listeners = this.listeners.get(eventType);
      return (listeners?.size || 0) + this.globalListeners.size;
    }

    let total = this.globalListeners.size;
    this.listeners.forEach(listeners => {
      total += listeners.size;
    });
    return total;
  }
}

/**
 * Global event bus instance (singleton)
 */
export const cacheEventBus = new CacheEventBus();

/**
 * Convenience function to emit events
 */
export async function emitCacheEvent(event: CacheInvalidationEvent): Promise<EventEmissionResult> {
  return cacheEventBus.emit(event);
}

/**
 * Convenience function to subscribe to events
 */
export function onCacheEvent(
  eventType: CacheInvalidationEventType,
  listener: CacheEventListener
): EventSubscription {
  return cacheEventBus.on(eventType, listener);
}

/**
 * Convenience function to subscribe to all events
 */
export function onAnyCacheEvent(listener: CacheEventListener): EventSubscription {
  return cacheEventBus.onAny(listener);
}
