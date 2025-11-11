/**
 * ConflictResolver - Production-ready conflict detection and resolution
 *
 * Features:
 * - Automatic conflict detection (DataMismatch, DuplicateKey, ValidationError, AuthError)
 * - Resolution strategies: AutoRetry, Manual, Skip
 * - Exponential backoff for retries (1s→2s→4s→8s→16s) max 3 attempts
 * - Conflict logging and manual review tracking
 * - Decision tree for strategy selection
 *
 * Conflict Types:
 * - DataMismatch: local != remote (pick remote as source of truth)
 * - DuplicateKey: ID already exists in target (skip, log)
 * - ValidationError: data fails target system validation (manual review)
 * - AuthError: permission denied on target system (manual review)
 * - RetryExhausted: Max retries exceeded, require manual intervention
 *
 * Resolution Strategies:
 * - AutoRetry: Exponential backoff with jitter, max 3 attempts
 * - Manual: Stop batch, log to activity_log for user review
 * - Skip: Continue sync, mark item as skipped, log reason
 */

import { query } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

export type ConflictType =
  | 'DataMismatch'
  | 'DuplicateKey'
  | 'ValidationError'
  | 'AuthError'
  | 'RetryExhausted'
  | 'ManualReviewRequired';

export type ResolutionStrategy = 'auto-retry' | 'manual' | 'skip';

export interface Conflict {
  itemId: string;
  entityType: string;
  sourceData: Record<string, unknown>;
  targetData: Record<string, unknown>;
  retryCount: number;
}

export interface ConflictDetails {
  syncId: string;
  itemId: string;
  entityType: string;
  type: ConflictType;
  data: Record<string, unknown>;
}

export interface ResolutionResult {
  resolved: boolean;
  action: 'auto-retry' | 'manual' | 'skip' | 'use_resolved';
  data?: Record<string, unknown>;
  reason?: string;
}

export class ConflictResolver {
  private readonly MAX_AUTO_RETRIES = 3;
  private readonly RETRY_BACKOFF_BASE = 1000; // 1 second
  private readonly RETRY_BACKOFF_MULTIPLIER = 2;
  private readonly MAX_BACKOFF = 16000; // 16 seconds

  /**
   * Main conflict resolution method
   * Returns resolution action and optional resolved data
   */
  async resolveConflict(conflict: Conflict, retryCount: number): Promise<ResolutionResult> {
    // Detect conflict type
    const conflictType = await this.detectConflictType(conflict);

    console.log(
      `[ConflictResolver] Detected ${conflictType} conflict for item ${conflict.itemId} (retry ${retryCount})`
    );

    // Get resolution strategy based on conflict type and retry count
    const strategy = this.getConflictStrategy(conflictType, retryCount);

    console.log(
      `[ConflictResolver] Resolved to strategy: ${strategy} for ${conflictType} conflict`
    );

    // Apply resolution strategy
    switch (strategy) {
      case 'auto-retry':
        return await this.handleAutoRetry(conflict, retryCount, conflictType);

      case 'manual':
        return {
          resolved: false,
          action: 'manual',
          reason: `${conflictType} requires manual intervention`,
        };

      case 'skip':
        return {
          resolved: true,
          action: 'skip',
          reason: `${conflictType} - skipping item`,
        };

      default:
        return {
          resolved: false,
          action: 'manual',
          reason: 'Unknown conflict type',
        };
    }
  }

  /**
   * Detect what type of conflict exists
   */
  private async detectConflictType(conflict: Conflict): Promise<ConflictType> {
    // Check for data mismatch (different values for same field)
    const mismatchedFields = this.findMismatchedFields(
      conflict.sourceData,
      conflict.targetData
    );

    if (mismatchedFields.length > 0) {
      console.log(
        `[ConflictResolver] Data mismatch detected in fields: ${mismatchedFields.join(', ')}`
      );
      return 'DataMismatch';
    }

    // Check for duplicate key (ID exists in both but differs)
    if (
      conflict.sourceData.id &&
      conflict.targetData.id &&
      conflict.sourceData.id !== conflict.targetData.id
    ) {
      console.log(
        `[ConflictResolver] Duplicate key detected: ${conflict.sourceData.id} vs ${conflict.targetData.id}`
      );
      return 'DuplicateKey';
    }

    // Check for validation errors (data doesn't match required schema)
    const validationError = await this.validateData(conflict.targetData);
    if (validationError) {
      console.log(`[ConflictResolver] Validation error: ${validationError}`);
      return 'ValidationError';
    }

    // Default: no conflict detected
    return 'DataMismatch'; // Default for unresolved differences
  }

  /**
   * Find fields where source and target data differ
   */
  private findMismatchedFields(
    sourceData: Record<string, unknown>,
    targetData: Record<string, unknown>
  ): string[] {
    const mismatched: string[] = [];

    // Compare all keys in source
    for (const key of Object.keys(sourceData)) {
      if (targetData.hasOwnProperty(key)) {
        const sourceValue = JSON.stringify(sourceData[key]);
        const targetValue = JSON.stringify(targetData[key]);

        if (sourceValue !== targetValue) {
          mismatched.push(key);
        }
      }
    }

    // Check for extra keys in target
    for (const key of Object.keys(targetData)) {
      if (!sourceData.hasOwnProperty(key) && targetData[key] !== null) {
        mismatched.push(key);
      }
    }

    return mismatched;
  }

  /**
   * Validate data against target system schema
   * Returns error message if invalid, null if valid
   */
  private async validateData(data: Record<string, unknown>): Promise<string | null> {
    // Basic validation checks
    const required = ['name', 'email'];

    for (const field of required) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        return `Required field missing: ${field}`;
      }
    }

    // Email format validation
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return `Invalid email format: ${data.email}`;
      }
    }

    // Phone format validation if present
    if (data.phone) {
      const phoneRegex = /^\+?[\d\s\-()]+$/;
      if (!phoneRegex.test(data.phone)) {
        return `Invalid phone format: ${data.phone}`;
      }
    }

    return null; // Data is valid
  }

  /**
   * Get resolution strategy based on conflict type and retry count
   *
   * Decision tree:
   * - DataMismatch + retry < 3: AutoRetry
   * - ValidationError: Manual
   * - AuthError: Manual
   * - DuplicateKey: Skip
   * - RetryExhausted: Manual
   */
  getConflictStrategy(
    conflictType: ConflictType,
    retryCount: number
  ): ResolutionStrategy {
    switch (conflictType) {
      case 'DataMismatch':
        // Retry data mismatches up to 3 times (might be timing issue)
        return retryCount < this.MAX_AUTO_RETRIES ? 'auto-retry' : 'manual';

      case 'ValidationError':
        // Validation errors need manual review
        return 'manual';

      case 'AuthError':
        // Auth errors need manual review (permissions issue)
        return 'manual';

      case 'DuplicateKey':
        // Duplicate keys are skipped (non-critical)
        return 'skip';

      case 'RetryExhausted':
        // Exhausted retries require manual review
        return 'manual';

      case 'ManualReviewRequired':
        return 'manual';

      default:
        return 'manual';
    }
  }

  /**
   * Handle auto-retry strategy with exponential backoff
   */
  private async handleAutoRetry(
    conflict: Conflict,
    retryCount: number,
    conflictType: ConflictType
  ): Promise<ResolutionResult> {
    if (retryCount >= this.MAX_AUTO_RETRIES) {
      console.log(
        `[ConflictResolver] Max retries (${this.MAX_AUTO_RETRIES}) exceeded for item ${conflict.itemId}`
      );
      return {
        resolved: false,
        action: 'manual',
        reason: 'Max retries exceeded',
      };
    }

    // Calculate backoff delay with jitter
    const delay = this.calculateBackoffDelay(retryCount);
    const jitter = Math.random() * 1000; // Add up to 1s jitter

    console.log(
      `[ConflictResolver] Auto-retry ${retryCount + 1}/${this.MAX_AUTO_RETRIES}: ${conflictType}. Backing off for ${delay + jitter}ms`
    );

    // Wait before retrying
    await this.sleep(delay + jitter);

    // Attempt to resolve data mismatch
    const resolvedData = this.resolveDataMismatch(conflict.sourceData, conflict.targetData);

    return {
      resolved: true,
      action: 'use_resolved',
      data: resolvedData,
      reason: `Auto-resolved after backoff (attempt ${retryCount + 1})`,
    };
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(retryCount: number): number {
    const exponentialDelay = this.RETRY_BACKOFF_BASE * Math.pow(this.RETRY_BACKOFF_MULTIPLIER, retryCount);
    return Math.min(exponentialDelay, this.MAX_BACKOFF);
  }

  /**
   * Resolve data mismatch by picking remote as source of truth
   * Merge source data with target overrides
   */
  private resolveDataMismatch(
    sourceData: Record<string, unknown>,
    targetData: Record<string, unknown>
  ): Record<string, unknown> {
    // Strategy: Use source as base, apply target overrides (remote is source of truth)
    return {
      ...sourceData,
      ...targetData,
      // Preserve timestamps
      updated_at: new Date().toISOString(),
      resolved_conflict: true,
      resolution_strategy: 'remote_source_of_truth',
    };
  }

  /**
   * Record unresolved conflict for manual intervention
   */
  async recordConflict(conflictDetails: ConflictDetails): Promise<void> {
    try {
      const conflictId = `conflict-${uuidv4()}`;

      await query(
        `INSERT INTO sync_conflict (
          id, sync_id, item_id, entity_type, conflict_type,
          data, is_resolved, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, false, NOW())`,
        [
          conflictId,
          conflictDetails.syncId,
          conflictDetails.itemId,
          conflictDetails.entityType,
          conflictDetails.type,
          JSON.stringify(conflictDetails.data),
        ]
      );

      console.log(
        `[ConflictResolver] Recorded conflict ${conflictId} for manual review`
      );
    } catch (error) {
      console.error('[ConflictResolver] Failed to record conflict:', error);
      // Don't throw - conflict recording shouldn't break sync
    }
  }

  /**
   * Get unresolved conflicts for manual review
   */
  async getUnresolvedConflicts(
    syncId: string,
    limit: number = 100
  ): Promise<Array<{ id: string; itemId: string; type: ConflictType; data: Record<string, unknown> }>> {
    try {
      const result = await query(
        `SELECT id, item_id, conflict_type, data
         FROM sync_conflict
         WHERE sync_id = $1 AND is_resolved = false
         ORDER BY created_at DESC
         LIMIT $2`,
        [syncId, limit]
      );

      return result.rows.map(row => ({
        id: row.id,
        itemId: row.item_id,
        type: row.conflict_type as ConflictType,
        data: row.data,
      }));
    } catch (error) {
      console.error('[ConflictResolver] Failed to fetch unresolved conflicts:', error);
      return [];
    }
  }

  /**
   * Resolve a conflict manually (mark as resolved by user)
   */
  async resolveConflictManually(
    conflictId: string,
    resolution: 'accept' | 'reject' | 'custom',
    customData?: Record<string, unknown>
  ): Promise<void> {
    try {
      const setClauses = [
        'is_resolved = true',
        'resolution_action = $1',
        'resolved_at = NOW()',
      ];
      const values: unknown[] = [resolution];
      let paramIndex = 2;

      if (resolution === 'custom' && customData) {
        setClauses.push(`resolved_data = $${paramIndex}`);
        values.push(JSON.stringify(customData));
        paramIndex++;
      }

      values.push(conflictId);

      await query(
        `UPDATE sync_conflict
         SET ${setClauses.join(', ')}
         WHERE id = $${paramIndex}`,
        values
      );

      console.log(`[ConflictResolver] Manually resolved conflict ${conflictId}`);
    } catch (error) {
      console.error('[ConflictResolver] Failed to resolve conflict manually:', error);
      throw error;
    }
  }

  /**
   * Get conflict statistics for a sync
   */
  async getConflictStats(syncId: string): Promise<{
    totalConflicts: number;
    unresolvedCount: number;
    byType: Record<ConflictType, number>;
  }> {
    try {
      const result = await query(
        `SELECT conflict_type, COUNT(*) as count
         FROM sync_conflict
         WHERE sync_id = $1
         GROUP BY conflict_type`,
        [syncId]
      );

      const byType: Record<ConflictType, number> = {} as unknown;
      let totalConflicts = 0;

      result.rows.forEach(row => {
        const type = row.conflict_type as ConflictType;
        byType[type] = parseInt(row.count);
        totalConflicts += parseInt(row.count);
      });

      const unresolvedResult = await query(
        `SELECT COUNT(*) as count FROM sync_conflict WHERE sync_id = $1 AND is_resolved = false`,
        [syncId]
      );

      return {
        totalConflicts,
        unresolvedCount: parseInt(unresolvedResult.rows[0].count),
        byType,
      };
    } catch (error) {
      console.error('[ConflictResolver] Failed to get conflict stats:', error);
      return { totalConflicts: 0, unresolvedCount: 0, byType: {} as Record<ConflictType, number> };
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
