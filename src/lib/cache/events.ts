// @ts-nocheck

/**
 * ITERATION 2 - ADR-6: Cache Invalidation Events
 *
 * Event type definitions for cache invalidation system.
 * Defines all mutation events that trigger cache invalidation.
 */

export type CacheInvalidationEventType =
  | 'inventory.created'
  | 'inventory.updated'
  | 'inventory.deleted'
  | 'inventory.bulk_updated'
  | 'inventory.stock_movement'
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'supplier.created'
  | 'supplier.updated'
  | 'supplier.deleted'
  | 'analytics.new'
  | 'dashboard.refresh'
  | 'cache.clear_all';

export interface CacheInvalidationEvent {
  type: CacheInvalidationEventType;
  payload: {
    entityId?: string;
    entityIds?: string[];
    supplierId?: string;
    category?: string;
    metadata?: Record<string, unknown>;
    timestamp: number;
  };
  source: string; // Source of the event (e.g., 'api', 'webhook', 'manual')
  correlationId?: string; // For event tracing
}

/**
 * Event listener callback type
 */
export type CacheEventListener = (event: CacheInvalidationEvent) => void | Promise<void>;

/**
 * Event subscription handle for cleanup
 */
export interface EventSubscription {
  unsubscribe: () => void;
}

/**
 * Event emission result
 */
export interface EventEmissionResult {
  success: boolean;
  listenersNotified: number;
  errors?: Error[];
  event: CacheInvalidationEvent;
}

/**
 * Event bus statistics
 */
export interface EventBusStats {
  totalEvents: number;
  totalListeners: number;
  listenersByEvent: Record<string, number>;
  eventCounts: Record<string, number>;
  lastEventTime?: number;
  errors: number;
}

/**
 * Helper function to create invalidation events
 */
export function createInvalidationEvent(
  type: CacheInvalidationEventType,
  payload: Omit<CacheInvalidationEvent['payload'], 'timestamp'>,
  source: string = 'api',
  correlationId?: string
): CacheInvalidationEvent {
  return {
    type,
    payload: {
      ...payload,
      timestamp: Date.now(),
    },
    source,
    correlationId,
  };
}
