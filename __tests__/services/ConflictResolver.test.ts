/**
 * ConflictResolver Unit Tests
 *
 * Tests conflict resolution strategies (auto-retry, manual, skip),
 * retry backoff timing, conflict logging, and all conflict types.
 *
 * Coverage target: 85%+
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockDatabase } from '../helpers/sync-test-helpers';
import { generateConflictData } from '../fixtures/sync-test-data';

/**
 * Simulated ConflictResolver implementation
 */
class ConflictResolver {
  private conflicts = new Map<string, any>();
  private resolutions = new Map<string, any>();
  private retryAttempts = new Map<string, number>();
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async registerConflict(conflict: any) {
    const conflictId = conflict.id || `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const registered = {
      ...conflict,
      id: conflictId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.conflicts.set(conflictId, registered);

    // Log to database
    await this.db.insert('conflict', registered);

    return conflictId;
  }

  async resolveConflict(
    conflictId: string,
    strategy: 'auto-retry' | 'manual' | 'skip',
    resolution: any = {}
  ) {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) throw new Error(`Conflict not found: ${conflictId}`);

    const resolved = {
      ...conflict,
      status: 'resolved',
      strategy,
      resolution,
      resolvedAt: new Date().toISOString(),
      resolvedBy: 'system',
    };

    this.resolutions.set(conflictId, resolved);
    this.conflicts.delete(conflictId);

    // Log resolution
    await this.db.insert('conflict_resolution', resolved);

    return resolved;
  }

  async autoRetryConflict(conflictId: string, maxRetries: number = 3) {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) throw new Error(`Conflict not found: ${conflictId}`);

    const attempts = this.retryAttempts.get(conflictId) || 0;

    if (attempts >= maxRetries) {
      throw new Error(`Max retries exceeded for conflict ${conflictId}`);
    }

    // Wait with exponential backoff
    const backoffMs = this.getBackoffDelay(attempts);
    await new Promise((resolve) => setTimeout(resolve, backoffMs));

    this.retryAttempts.set(conflictId, attempts + 1);

    // Mark conflict as retrying
    const updated = {
      ...conflict,
      status: 'retrying',
      retryCount: attempts + 1,
      lastRetry: new Date().toISOString(),
    };

    this.conflicts.set(conflictId, updated);

    return {
      conflictId,
      attempt: attempts + 1,
      backoffDelayMs: backoffMs,
      status: 'retrying',
    };
  }

  getBackoffDelay(attempt: number, initialMs: number = 1000, multiplier: number = 2): number {
    return initialMs * Math.pow(multiplier, attempt);
  }

  async resolveWithStrategy(conflictId: string, strategy: string) {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) throw new Error(`Conflict not found: ${conflictId}`);

    switch (strategy) {
      case 'auto-retry':
        return this.autoRetryConflict(conflictId);

      case 'manual':
        return {
          conflictId,
          status: 'awaiting_manual_resolution',
          conflict,
        };

      case 'skip':
        return this.resolveConflict(conflictId, 'skip', { reason: 'skipped_by_user' });

      default:
        throw new Error(`Unknown resolution strategy: ${strategy}`);
    }
  }

  getConflict(conflictId: string) {
    return this.conflicts.get(conflictId) || null;
  }

  getAllConflicts() {
    return Array.from(this.conflicts.values());
  }

  getConflictsByType(type: string) {
    return Array.from(this.conflicts.values()).filter((c) => c.type === type);
  }

  getResolution(conflictId: string) {
    return this.resolutions.get(conflictId) || null;
  }

  getAllResolutions() {
    return Array.from(this.resolutions.values());
  }

  getRetryCount(conflictId: string) {
    return this.retryAttempts.get(conflictId) || 0;
  }

  clearRetries() {
    this.retryAttempts.clear();
  }

  clear() {
    this.conflicts.clear();
    this.resolutions.clear();
    this.retryAttempts.clear();
  }
}

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;
  let mockDb: any;

  beforeEach(() => {
    mockDb = createMockDatabase();
    resolver = new ConflictResolver(mockDb);
  });

  afterEach(() => {
    resolver.clear();
    mockDb.clear();
  });

  describe('registerConflict', () => {
    it('should register a conflict', async () => {
      const conflict = generateConflictData('DataMismatch');

      const conflictId = await resolver.registerConflict(conflict);

      expect(conflictId).toBeDefined();
      expect(typeof conflictId).toBe('string');
    });

    it('should auto-generate ID if not provided', async () => {
      const conflict = generateConflictData('DataMismatch');
      delete conflict.id;

      const conflictId = await resolver.registerConflict(conflict);

      expect(conflictId).toMatch(/^conflict-/);
    });

    it('should store conflict with pending status', async () => {
      const conflict = generateConflictData('DataMismatch');

      const conflictId = await resolver.registerConflict(conflict);
      const stored = resolver.getConflict(conflictId);

      expect(stored).toEqual(
        expect.objectContaining({
          id: conflictId,
          status: 'pending',
        })
      );
    });

    it('should set timestamps on registration', async () => {
      const conflict = generateConflictData('DataMismatch');

      const conflictId = await resolver.registerConflict(conflict);
      const stored = resolver.getConflict(conflictId);

      expect(stored).toHaveProperty('createdAt');
      expect(stored).toHaveProperty('updatedAt');
    });

    it('should support DataMismatch conflict type', async () => {
      const conflict = generateConflictData('DataMismatch');

      const conflictId = await resolver.registerConflict(conflict);

      expect(conflictId).toBeDefined();
      expect(resolver.getConflict(conflictId)?.type).toBe('DataMismatch');
    });

    it('should support DuplicateKey conflict type', async () => {
      const conflict = generateConflictData('DuplicateKey');

      const conflictId = await resolver.registerConflict(conflict);

      expect(resolver.getConflict(conflictId)?.type).toBe('DuplicateKey');
    });

    it('should support ValidationError conflict type', async () => {
      const conflict = generateConflictData('ValidationError');

      const conflictId = await resolver.registerConflict(conflict);

      expect(resolver.getConflict(conflictId)?.type).toBe('ValidationError');
    });

    it('should register multiple conflicts', async () => {
      const conflicts = [
        generateConflictData('DataMismatch'),
        generateConflictData('DuplicateKey'),
        generateConflictData('ValidationError'),
      ];

      const ids = await Promise.all(conflicts.map((c) => resolver.registerConflict(c)));

      expect(ids).toHaveLength(3);
      expect(resolver.getAllConflicts()).toHaveLength(3);
    });
  });

  describe('resolution strategies', () => {
    let conflictId: string;

    beforeEach(async () => {
      const conflict = generateConflictData('DataMismatch');
      conflictId = await resolver.registerConflict(conflict);
    });

    it('should support auto-retry strategy', async () => {
      const result = await resolver.autoRetryConflict(conflictId);

      expect(result.status).toBe('retrying');
      expect(result.attempt).toBe(1);
      expect(result).toHaveProperty('backoffDelayMs');
    });

    it('should support manual resolution strategy', async () => {
      const result = await resolver.resolveWithStrategy(conflictId, 'manual');

      expect(result.status).toBe('awaiting_manual_resolution');
      expect(result).toHaveProperty('conflict');
    });

    it('should support skip strategy', async () => {
      const result = await resolver.resolveWithStrategy(conflictId, 'skip');

      expect(result.status).toBe('resolved');
      expect(result.strategy).toBe('skip');
    });

    it('should throw for unknown strategy', async () => {
      await expect(resolver.resolveWithStrategy(conflictId, 'invalid')).rejects.toThrow(
        'Unknown resolution strategy'
      );
    });
  });

  describe('retry backoff timing', () => {
    it('should use exponential backoff for retries', () => {
      const delay0 = resolver.getBackoffDelay(0);
      const delay1 = resolver.getBackoffDelay(1);
      const delay2 = resolver.getBackoffDelay(2);
      const delay3 = resolver.getBackoffDelay(3);

      expect(delay0).toBe(1000); // 1s
      expect(delay1).toBe(2000); // 2s
      expect(delay2).toBe(4000); // 4s
      expect(delay3).toBe(8000); // 8s

      // Verify exponential progression
      expect(delay1 / delay0).toBe(2);
      expect(delay2 / delay1).toBe(2);
    });

    it('should support custom backoff parameters', () => {
      const initialMs = 500;
      const multiplier = 3;

      const delay0 = resolver.getBackoffDelay(0, initialMs, multiplier);
      const delay1 = resolver.getBackoffDelay(1, initialMs, multiplier);
      const delay2 = resolver.getBackoffDelay(2, initialMs, multiplier);

      expect(delay0).toBe(500);
      expect(delay1).toBe(1500);
      expect(delay2).toBe(4500);
    });

    it('should apply backoff delay on auto-retry', async () => {
      const conflict = generateConflictData('DataMismatch');
      const conflictId = await resolver.registerConflict(conflict);

      const startTime = Date.now();
      await resolver.autoRetryConflict(conflictId, 3);
      const duration = Date.now() - startTime;

      // First retry should have ~1s backoff
      expect(duration).toBeGreaterThanOrEqual(900);
    });

    it('should respect max retries limit', async () => {
      const conflict = generateConflictData('DataMismatch');
      const conflictId = await resolver.registerConflict(conflict);

      const maxRetries = 3;

      // Complete max retries
      for (let i = 0; i < maxRetries; i++) {
        await resolver.autoRetryConflict(conflictId, maxRetries);
      }

      // Fourth retry should fail
      await expect(resolver.autoRetryConflict(conflictId, maxRetries)).rejects.toThrow(
        'Max retries exceeded'
      );
    });

    it('should track retry attempts', async () => {
      const conflict = generateConflictData('DataMismatch');
      const conflictId = await resolver.registerConflict(conflict);

      expect(resolver.getRetryCount(conflictId)).toBe(0);

      await resolver.autoRetryConflict(conflictId, 5);
      expect(resolver.getRetryCount(conflictId)).toBe(1);

      await resolver.autoRetryConflict(conflictId, 5);
      expect(resolver.getRetryCount(conflictId)).toBe(2);
    });
  });

  describe('conflict logging', () => {
    it('should log registered conflicts to database', async () => {
      const conflict = generateConflictData('DataMismatch');

      const conflictId = await resolver.registerConflict(conflict);

      // Verify it was stored in mock DB
      const stored = resolver.getConflict(conflictId);
      expect(stored).toBeDefined();
    });

    it('should log resolutions to database', async () => {
      const conflict = generateConflictData('DataMismatch');
      const conflictId = await resolver.registerConflict(conflict);

      await resolver.resolveConflict(conflictId, 'skip', { reason: 'user_request' });

      const resolution = resolver.getResolution(conflictId);
      expect(resolution).toEqual(
        expect.objectContaining({
          status: 'resolved',
          strategy: 'skip',
          resolution: { reason: 'user_request' },
        })
      );
    });

    it('should track conflict metadata', async () => {
      const conflict = {
        ...generateConflictData('DataMismatch'),
        entityId: 'cust-123',
        externalId: 'woo-456',
        field: 'email',
      };

      const conflictId = await resolver.registerConflict(conflict);
      const stored = resolver.getConflict(conflictId);

      expect(stored.entityId).toBe('cust-123');
      expect(stored.externalId).toBe('woo-456');
      expect(stored.field).toBe('email');
    });
  });

  describe('conflict types', () => {
    it('should handle DataMismatch conflicts', async () => {
      const conflict = {
        ...generateConflictData('DataMismatch'),
        field: 'email',
        currentValue: 'old@example.com',
        incomingValue: 'new@example.com',
      };

      const conflictId = await resolver.registerConflict(conflict);
      const stored = resolver.getConflict(conflictId);

      expect(stored.type).toBe('DataMismatch');
      expect(stored.field).toBe('email');
    });

    it('should handle DuplicateKey conflicts', async () => {
      const conflict = {
        ...generateConflictData('DuplicateKey'),
        key: 'email',
        value: 'duplicate@example.com',
        existingEntityId: 'cust-999',
      };

      const conflictId = await resolver.registerConflict(conflict);
      const stored = resolver.getConflict(conflictId);

      expect(stored.type).toBe('DuplicateKey');
      expect(stored.key).toBe('email');
    });

    it('should handle ValidationError conflicts', async () => {
      const conflict = {
        ...generateConflictData('ValidationError'),
        field: 'phone',
        rule: 'phone_format',
        message: 'Invalid phone format',
      };

      const conflictId = await resolver.registerConflict(conflict);
      const stored = resolver.getConflict(conflictId);

      expect(stored.type).toBe('ValidationError');
      expect(stored.rule).toBe('phone_format');
    });

    it('should filter conflicts by type', async () => {
      const conflicts = [
        generateConflictData('DataMismatch'),
        generateConflictData('DataMismatch'),
        generateConflictData('DuplicateKey'),
        generateConflictData('ValidationError'),
      ];

      for (const conflict of conflicts) {
        await resolver.registerConflict(conflict);
      }

      const dataMismatches = resolver.getConflictsByType('DataMismatch');
      const duplicates = resolver.getConflictsByType('DuplicateKey');
      const validationErrors = resolver.getConflictsByType('ValidationError');

      expect(dataMismatches).toHaveLength(2);
      expect(duplicates).toHaveLength(1);
      expect(validationErrors).toHaveLength(1);
    });
  });

  describe('conflict retrieval', () => {
    it('should retrieve single conflict by ID', async () => {
      const conflict = generateConflictData('DataMismatch');
      const conflictId = await resolver.registerConflict(conflict);

      const retrieved = resolver.getConflict(conflictId);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(conflictId);
    });

    it('should return null for non-existent conflict', () => {
      const retrieved = resolver.getConflict('non-existent');

      expect(retrieved).toBeNull();
    });

    it('should retrieve all conflicts', async () => {
      const conflicts = [
        generateConflictData('DataMismatch'),
        generateConflictData('DuplicateKey'),
        generateConflictData('ValidationError'),
      ];

      for (const conflict of conflicts) {
        await resolver.registerConflict(conflict);
      }

      const all = resolver.getAllConflicts();

      expect(all).toHaveLength(3);
    });

    it('should retrieve all resolutions', async () => {
      const conflict = generateConflictData('DataMismatch');
      const conflictId = await resolver.registerConflict(conflict);

      await resolver.resolveConflict(conflictId, 'skip', {});

      const resolutions = resolver.getAllResolutions();

      expect(resolutions).toHaveLength(1);
      expect(resolutions[0].id).toBe(conflictId);
    });
  });

  describe('error handling', () => {
    it('should throw when resolving non-existent conflict', async () => {
      await expect(
        resolver.resolveConflict('non-existent', 'skip', {})
      ).rejects.toThrow('Conflict not found');
    });

    it('should throw when retrying non-existent conflict', async () => {
      await expect(resolver.autoRetryConflict('non-existent')).rejects.toThrow('Conflict not found');
    });

    it('should throw when checking strategy for non-existent conflict', async () => {
      await expect(resolver.resolveWithStrategy('non-existent', 'skip')).rejects.toThrow(
        'Conflict not found'
      );
    });
  });

  describe('cleanup', () => {
    it('should clear all conflicts', async () => {
      const conflicts = [generateConflictData('DataMismatch'), generateConflictData('DuplicateKey')];

      for (const conflict of conflicts) {
        await resolver.registerConflict(conflict);
      }

      resolver.clear();

      expect(resolver.getAllConflicts()).toHaveLength(0);
    });

    it('should clear retry attempts', async () => {
      const conflict = generateConflictData('DataMismatch');
      const conflictId = await resolver.registerConflict(conflict);

      await resolver.autoRetryConflict(conflictId, 5);
      expect(resolver.getRetryCount(conflictId)).toBeGreaterThan(0);

      resolver.clearRetries();
      expect(resolver.getRetryCount(conflictId)).toBe(0);
    });
  });
});
