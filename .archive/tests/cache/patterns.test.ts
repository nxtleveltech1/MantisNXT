/**
 * ITERATION 2 - ADR-6: Pattern Matching Tests
 *
 * Unit tests for cache key pattern matching logic.
 */

import {
  INVALIDATION_PATTERNS,
  getSpecificPatterns,
  patternToRegex,
  matchesCacheKey,
  queryKeyToString,
} from '@/lib/cache/patterns';

describe('Pattern Matching', () => {
  describe('INVALIDATION_PATTERNS', () => {
    it('should have patterns for all event types', () => {
      expect(INVALIDATION_PATTERNS['inventory.created']).toBeDefined();
      expect(INVALIDATION_PATTERNS['inventory.updated']).toBeDefined();
      expect(INVALIDATION_PATTERNS['supplier.created']).toBeDefined();
      expect(INVALIDATION_PATTERNS['analytics.new']).toBeDefined();
    });

    it('should have array of patterns for each event type', () => {
      Object.values(INVALIDATION_PATTERNS).forEach(patterns => {
        expect(Array.isArray(patterns)).toBe(true);
        expect(patterns.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getSpecificPatterns', () => {
    it('should return base patterns for event type', () => {
      const patterns = getSpecificPatterns('inventory.updated', {});

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns).toContain('inventory-list.*');
      expect(patterns).toContain('dashboard-metrics.*');
    });

    it('should add entity-specific patterns', () => {
      const patterns = getSpecificPatterns('inventory.updated', {
        entityId: 'item-123',
      });

      expect(patterns).toContain('inventory-item-item-123');
    });

    it('should add supplier-specific patterns', () => {
      const patterns = getSpecificPatterns('inventory.updated', {
        supplierId: 'supplier-456',
      });

      expect(patterns).toContain('supplier-inventory-supplier-456');
      expect(patterns).toContain('supplier-metrics-supplier-456');
    });

    it('should add category-specific patterns', () => {
      const patterns = getSpecificPatterns('inventory.updated', {
        category: 'electronics',
      });

      expect(patterns).toContain('inventory-category-electronics');
    });

    it('should handle bulk entity IDs', () => {
      const patterns = getSpecificPatterns('inventory.bulk_updated', {
        entityIds: ['item-1', 'item-2', 'item-3'],
      });

      expect(patterns).toContain('inventory-item-item-1');
      expect(patterns).toContain('inventory-item-item-2');
      expect(patterns).toContain('inventory-item-item-3');
    });
  });

  describe('patternToRegex', () => {
    it('should convert wildcard patterns to regex', () => {
      const regex = patternToRegex('inventory-list.*');

      expect(regex.test('inventory-list.filter1')).toBe(true);
      expect(regex.test('inventory-list.anything')).toBe(true);
      expect(regex.test('supplier-list.filter1')).toBe(false);
    });

    it('should match exact patterns without wildcards', () => {
      const regex = patternToRegex('inventory-item-123');

      expect(regex.test('inventory-item-123')).toBe(true);
      expect(regex.test('inventory-item-456')).toBe(false);
    });

    it('should handle patterns with dots', () => {
      const regex = patternToRegex('dashboard-metrics.*');

      expect(regex.test('dashboard-metrics.kpis')).toBe(true);
      expect(regex.test('dashboard-metricsXkpis')).toBe(false);
    });

    it('should escape regex special characters', () => {
      const regex = patternToRegex('query[test]');

      expect(regex.test('query[test]')).toBe(true);
      expect(regex.test('queryXtestY')).toBe(false);
    });
  });

  describe('matchesCacheKey', () => {
    it('should match key against single pattern', () => {
      const patterns = ['inventory-list.*'];

      expect(matchesCacheKey('inventory-list.filter', patterns)).toBe(true);
      expect(matchesCacheKey('supplier-list.filter', patterns)).toBe(false);
    });

    it('should match key against multiple patterns', () => {
      const patterns = ['inventory-list.*', 'dashboard-metrics.*'];

      expect(matchesCacheKey('inventory-list.filter', patterns)).toBe(true);
      expect(matchesCacheKey('dashboard-metrics.kpis', patterns)).toBe(true);
      expect(matchesCacheKey('supplier-list.filter', patterns)).toBe(false);
    });

    it('should match specific entity patterns', () => {
      const patterns = ['inventory-item-123'];

      expect(matchesCacheKey('inventory-item-123', patterns)).toBe(true);
      expect(matchesCacheKey('inventory-item-456', patterns)).toBe(false);
    });

    it('should handle empty patterns array', () => {
      expect(matchesCacheKey('any-key', [])).toBe(false);
    });

    it('should match global clear pattern', () => {
      const patterns = ['.*'];

      expect(matchesCacheKey('inventory-list', patterns)).toBe(true);
      expect(matchesCacheKey('dashboard-metrics', patterns)).toBe(true);
      expect(matchesCacheKey('anything', patterns)).toBe(true);
    });
  });

  describe('queryKeyToString', () => {
    it('should convert simple query key to string', () => {
      const key = ['dashboard-metrics'];
      expect(queryKeyToString(key)).toBe('["dashboard-metrics"]');
    });

    it('should convert query key with parameters to string', () => {
      const key = ['inventory-list', { category: 'electronics' }];
      const result = queryKeyToString(key);

      expect(result).toContain('inventory-list');
      expect(result).toContain('category');
      expect(result).toContain('electronics');
    });

    it('should handle nested objects in query key', () => {
      const key = [
        'inventory-list',
        {
          filters: {
            category: 'electronics',
            price: { min: 10, max: 100 },
          },
        },
      ];

      const result = queryKeyToString(key);
      expect(result).toContain('filters');
      expect(result).toContain('category');
      expect(result).toContain('price');
    });
  });
});
