/**
 * ITERATION 2 - ADR-6: Event-Driven Cache Invalidation Logic
 *
 * Implements cache invalidation strategies and event listeners for React Query.
 * Integrates with React Query for client-side cache management.
 */

import { QueryClient } from '@tanstack/react-query';
import {
  CacheInvalidationEvent,
  CacheInvalidationEventType,
  createInvalidationEvent,
} from './events';
import { cacheEventBus, EventSubscription } from './event-bus';
import {
  getSpecificPatterns,
  matchesCacheKey,
  queryKeyToString,
} from './patterns';

/**
 * Cache invalidation configuration
 */
export interface InvalidationConfig {
  enabled: boolean;
  logInvalidations: boolean;
  queryClient: QueryClient;
}

/**
 * Invalidation result
 */
export interface InvalidationResult {
  success: boolean;
  patternsMatched: string[];
  queriesInvalidated: number;
  errors?: Error[];
}

/**
 * Cache invalidation manager
 * Handles event-driven cache invalidation with React Query
 */
export class CacheInvalidationManager {
  private config: InvalidationConfig;
  private subscriptions: EventSubscription[] = [];
  private invalidationLog: Array<{
    timestamp: number;
    event: CacheInvalidationEvent;
    result: InvalidationResult;
  }> = [];

  constructor(config: InvalidationConfig) {
    this.config = config;
  }

  /**
   * Initialize invalidation listeners
   */
  initialize(): void {
    if (!this.config.enabled) {
      console.log('[CacheInvalidation] Invalidation disabled');
      return;
    }

    // Subscribe to all cache invalidation events
    const subscription = cacheEventBus.onAny(async (event) => {
      await this.handleInvalidationEvent(event);
    });

    this.subscriptions.push(subscription);

    console.log('[CacheInvalidation] Invalidation manager initialized');
  }

  /**
   * Handle invalidation event
   */
  private async handleInvalidationEvent(
    event: CacheInvalidationEvent
  ): Promise<InvalidationResult> {
    const startTime = Date.now();

    try {
      // Get patterns to invalidate
      const patterns = getSpecificPatterns(event.type, event.payload);

      if (this.config.logInvalidations) {
        console.log(
          `[CacheInvalidation] Event: ${event.type}`,
          'Patterns:',
          patterns
        );
      }

      // Invalidate queries based on patterns
      const result = await this.invalidateByPatterns(patterns);

      // Log invalidation
      this.invalidationLog.push({
        timestamp: Date.now(),
        event,
        result,
      });

      // Keep log size manageable (last 100 entries)
      if (this.invalidationLog.length > 100) {
        this.invalidationLog = this.invalidationLog.slice(-100);
      }

      if (this.config.logInvalidations) {
        console.log(
          `[CacheInvalidation] Invalidated ${result.queriesInvalidated} queries in ${Date.now() - startTime}ms`
        );
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[CacheInvalidation] Error handling event:', err);

      return {
        success: false,
        patternsMatched: [],
        queriesInvalidated: 0,
        errors: [err],
      };
    }
  }

  /**
   * Invalidate queries matching patterns
   */
  private async invalidateByPatterns(
    patterns: string[]
  ): Promise<InvalidationResult> {
    const errors: Error[] = [];
    let queriesInvalidated = 0;
    const patternsMatched: string[] = [];

    try {
      const queryCache = this.config.queryClient.getQueryCache();
      const queries = queryCache.getAll();

      for (const query of queries) {
        const queryKeyStr = queryKeyToString(query.queryKey);

        // Check if query matches any pattern
        if (matchesCacheKey(queryKeyStr, patterns)) {
          try {
            await this.config.queryClient.invalidateQueries({
              queryKey: query.queryKey,
            });

            queriesInvalidated++;

            // Track which pattern matched
            for (const pattern of patterns) {
              if (!patternsMatched.includes(pattern)) {
                patternsMatched.push(pattern);
              }
            }
          } catch (error) {
            const err =
              error instanceof Error ? error : new Error(String(error));
            errors.push(err);
            console.error(
              '[CacheInvalidation] Error invalidating query:',
              query.queryKey,
              err
            );
          }
        }
      }

      return {
        success: errors.length === 0,
        patternsMatched,
        queriesInvalidated,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        patternsMatched,
        queriesInvalidated,
        errors: [err],
      };
    }
  }

  /**
   * Manually trigger invalidation for specific event
   */
  async invalidate(
    eventType: CacheInvalidationEventType,
    payload: CacheInvalidationEvent['payload'],
    source: string = 'manual'
  ): Promise<InvalidationResult> {
    const event = createInvalidationEvent(eventType, payload, source);
    return this.handleInvalidationEvent(event);
  }

  /**
   * Get invalidation log
   */
  getInvalidationLog() {
    return [...this.invalidationLog];
  }

  /**
   * Clear invalidation log
   */
  clearInvalidationLog(): void {
    this.invalidationLog = [];
  }

  /**
   * Get invalidation statistics
   */
  getStats() {
    const totalInvalidations = this.invalidationLog.length;
    const totalQueriesInvalidated = this.invalidationLog.reduce(
      (sum, entry) => sum + entry.result.queriesInvalidated,
      0
    );

    const eventTypeCounts: Record<string, number> = {};
    this.invalidationLog.forEach((entry) => {
      eventTypeCounts[entry.event.type] =
        (eventTypeCounts[entry.event.type] || 0) + 1;
    });

    return {
      totalInvalidations,
      totalQueriesInvalidated,
      eventTypeCounts,
      avgQueriesPerInvalidation:
        totalInvalidations > 0
          ? totalQueriesInvalidated / totalInvalidations
          : 0,
    };
  }

  /**
   * Cleanup subscriptions
   */
  destroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [];
    this.invalidationLog = [];
  }
}

/**
 * Global invalidation manager instance
 * Will be initialized by the QueryProvider
 */
let globalInvalidationManager: CacheInvalidationManager | null = null;

/**
 * Initialize global invalidation manager
 */
export function initializeInvalidationManager(
  queryClient: QueryClient,
  config: Partial<InvalidationConfig> = {}
): CacheInvalidationManager {
  if (globalInvalidationManager) {
    globalInvalidationManager.destroy();
  }

  const fullConfig: InvalidationConfig = {
    enabled: true,
    logInvalidations: process.env.NODE_ENV === 'development',
    ...config,
    queryClient,
  };

  globalInvalidationManager = new CacheInvalidationManager(fullConfig);
  globalInvalidationManager.initialize();

  return globalInvalidationManager;
}

/**
 * Get global invalidation manager
 */
export function getInvalidationManager(): CacheInvalidationManager | null {
  return globalInvalidationManager;
}

/**
 * Trigger cache invalidation programmatically
 */
export async function triggerCacheInvalidation(
  eventType: CacheInvalidationEventType,
  payload: Omit<CacheInvalidationEvent['payload'], 'timestamp'>,
  source: string = 'api'
): Promise<InvalidationResult> {
  const event = createInvalidationEvent(eventType, payload, source);

  // Emit event to event bus
  await cacheEventBus.emit(event);

  // Manager will handle invalidation through event listener
  // Return immediate result for API responses
  return {
    success: true,
    patternsMatched: getSpecificPatterns(eventType, payload),
    queriesInvalidated: -1, // Will be determined by manager
  };
}
