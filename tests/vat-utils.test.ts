import { describe, it, expect } from '@jest/globals';
import { normalizePriceAndVat, applyVatPolicyToRows } from '@/lib/cmm/vat-utils';

describe('VAT Utils', () => {
  describe('normalizePriceAndVat', () => {
    it('should handle explicit EX-VAT price correctly', () => {
      const row = {
        cost_price_ex_vat: 100.0,
        vat_rate: 0.15,
        currency: 'ZAR',
      };

      const result = normalizePriceAndVat(row);

      expect(result.cost_price_ex_vat).toBe(100.0);
      expect(result.price_incl_vat).toBe(115.0);
      expect(result.vat_rate).toBe(0.15);
      expect(result.price_source).toBe('explicit_ex_vat');
      expect(result.warnings).toHaveLength(0);
    });

    it('should derive EX-VAT from INCL-VAT price', () => {
      const row = {
        price_incl_vat: 115.0,
        vat_rate: 0.15,
        currency: 'ZAR',
      };

      const result = normalizePriceAndVat(row);

      expect(result.cost_price_ex_vat).toBe(100.0);
      expect(result.price_incl_vat).toBe(115.0);
      expect(result.vat_rate).toBe(0.15);
      expect(result.price_source).toBe('derived_from_incl');
      expect(result.warnings).toHaveLength(0);
    });

    it('should apply default VAT rate when not specified', () => {
      const row = {
        cost_price_ex_vat: 100.0,
        currency: 'ZAR',
      };

      const result = normalizePriceAndVat(row);

      expect(result.cost_price_ex_vat).toBe(100.0);
      expect(result.price_incl_vat).toBe(115.0);
      expect(result.vat_rate).toBe(0.15); // Default for ZAR
      expect(result.price_source).toBe('explicit_ex_vat_with_default_vat');
      expect(result.warnings).toContainEqual({
        field: 'vat_rate',
        message: 'VAT rate not specified, using default 0.15 for ZAR',
      });
    });

    it('should handle ambiguous price data with warnings', () => {
      const row = {
        cost_price_ex_vat: 100.0,
        price_incl_vat: 120.0, // Inconsistent with 15% VAT
        vat_rate: 0.15,
        currency: 'ZAR',
      };

      const result = normalizePriceAndVat(row);

      // Should prefer explicit EX-VAT and warn about inconsistency
      expect(result.cost_price_ex_vat).toBe(100.0);
      expect(result.price_incl_vat).toBe(115.0); // Recalculated from EX-VAT
      expect(result.vat_rate).toBe(0.15);
      expect(result.price_source).toBe('explicit_ex_vat');
      expect(result.warnings).toContainEqual({
        field: 'price_incl_vat',
        message:
          'Inconsistent INCL-VAT price (120.00 vs calculated 115.00), using EX-VAT as source',
      });
    });

    it('should handle missing price data with warnings', () => {
      const row = {
        name: 'Test Product',
        currency: 'ZAR',
      };

      const result = normalizePriceAndVat(row);

      expect(result.cost_price_ex_vat).toBeNull();
      expect(result.price_incl_vat).toBeNull();
      expect(result.vat_rate).toBe(0.15); // Default
      expect(result.price_source).toBe('no_price_data');
      expect(result.warnings).toContainEqual({
        field: 'cost_price_ex_vat',
        message: 'No price data found',
      });
    });

    it('should use supplier-specific VAT policy', () => {
      const row = {
        cost_price_ex_vat: 100.0,
        currency: 'EUR',
      };

      const vatPolicy = {
        rate: 0.21, // 21% for EUR
        mode: 'detect',
      };

      const result = normalizePriceAndVat(row, vatPolicy);

      expect(result.cost_price_ex_vat).toBe(100.0);
      expect(result.price_incl_vat).toBe(121.0);
      expect(result.vat_rate).toBe(0.21);
      expect(result.price_source).toBe('explicit_ex_vat_with_default_vat');
    });

    it('should handle zero VAT rate correctly', () => {
      const row = {
        cost_price_ex_vat: 100.0,
        vat_rate: 0,
        currency: 'ZAR',
      };

      const result = normalizePriceAndVat(row);

      expect(result.cost_price_ex_vat).toBe(100.0);
      expect(result.price_incl_vat).toBe(100.0);
      expect(result.vat_rate).toBe(0);
      expect(result.price_source).toBe('explicit_ex_vat');
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('applyVatPolicyToRows', () => {
    it('should process multiple rows with VAT normalization', async () => {
      const rows = [
        {
          supplier_sku: 'SKU001',
          name: 'Product 1',
          cost_price_ex_vat: 100.0,
          vat_rate: 0.15,
          currency: 'ZAR',
        },
        {
          supplier_sku: 'SKU002',
          name: 'Product 2',
          price_incl_vat: 230.0,
          vat_rate: 0.15,
          currency: 'ZAR',
        },
        {
          supplier_sku: 'SKU003',
          name: 'Product 3',
          currency: 'ZAR',
          // Missing price data
        },
      ];

      const result = await applyVatPolicyToRows(rows, 'supplier-123');

      expect(result.rows).toHaveLength(3);
      expect(result.warnings).toHaveLength(1); // Only SKU003 should have warning
      expect(result.priceSources).toEqual({
        explicit_ex_vat: 1,
        derived_from_incl: 1,
        no_price_data: 1,
      });

      // Check first row (explicit EX-VAT)
      expect(result.rows[0].cost_price_ex_vat).toBe(100.0);
      expect(result.rows[0].price_incl_vat).toBe(115.0);

      // Check second row (derived from INCL)
      expect(result.rows[1].cost_price_ex_vat).toBe(200.0);
      expect(result.rows[1].price_incl_vat).toBe(230.0);

      // Check third row (no price data)
      expect(result.rows[2].cost_price_ex_vat).toBeNull();
      expect(result.rows[2].price_incl_vat).toBeNull();
    });

    it('should handle supplier-specific VAT policy from database', async () => {
      // Mock the database query for supplier VAT policy
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [
          {
            vat_rate: 0.2, // 20% for this supplier
            currency: 'EUR',
          },
        ],
      });

      // Override the query function temporarily
      const dbModule = await import('@/lib/database');
      const originalQuery = dbModule.query;
      dbModule.query = mockQuery;

      const rows = [
        {
          supplier_sku: 'SKU001',
          name: 'Product 1',
          cost_price_ex_vat: 100.0,
          currency: 'EUR',
        },
      ];

      const result = await applyVatPolicyToRows(rows, 'supplier-eur');

      expect(result.rows[0].vat_rate).toBe(0.2);
      expect(result.rows[0].price_incl_vat).toBe(120.0);

      // Restore original query function
      dbModule.query = originalQuery;
    });
  });
});
