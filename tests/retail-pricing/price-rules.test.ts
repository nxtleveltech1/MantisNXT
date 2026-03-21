import { describe, it, expect } from '@jest/globals';
import {
  applyRounding,
  computeSuggestedPrice,
  marginPercentOnCost,
  marginPercentOnCostNormalized,
  DEFAULT_VAT_RATE,
} from '@/lib/retail-pricing/price-rules';

const baseRules = {
  marginPercent: 30,
  markupPercent: 30,
  fixedPrice: 99,
  valueAdd: 10,
  marginBasis: 'on_cost' as const,
  rounding: 'none' as const,
  priceIncVat: false,
};

describe('applyRounding', () => {
  it('returns two decimals for none', () => {
    expect(applyRounding(12.345, 'none')).toBe(12.35);
  });
  it('rounds to whole', () => {
    expect(applyRounding(12.4, 'whole')).toBe(12);
    expect(applyRounding(12.6, 'whole')).toBe(13);
  });
  it('forces .99 ending', () => {
    expect(applyRounding(47.33, 'cents_99')).toBe(47.99);
    expect(applyRounding(47.99, 'cents_99')).toBe(47.99);
    expect(applyRounding(48.0, 'cents_99')).toBe(48.99);
  });
  it('forces .95 ending', () => {
    expect(applyRounding(100.01, 'cents_95')).toBe(100.95);
  });
  it('handles zero cost path', () => {
    expect(applyRounding(0, 'none')).toBe(0);
  });
});

describe('computeSuggestedPrice', () => {
  it('markup 30% on cost 100 → 130 ex VAT', () => {
    const p = computeSuggestedPrice({
      unitCostExVat: 100,
      lastPurchaseExVat: null,
      costBasis: 'unit_cost',
      rules: { ...baseRules, mode: 'markup_pct', markupPercent: 30 },
    });
    expect(p).toBe(130);
  });

  it('margin on sell 30%: cost 70 → sell 100 ex VAT', () => {
    const p = computeSuggestedPrice({
      unitCostExVat: 70,
      lastPurchaseExVat: null,
      costBasis: 'unit_cost',
      rules: {
        ...baseRules,
        mode: 'margin_pct',
        marginPercent: 30,
        marginBasis: 'on_sell',
      },
    });
    expect(p).toBe(100);
  });

  it('applies VAT gross-up when priceIncVat', () => {
    const p = computeSuggestedPrice({
      unitCostExVat: 100,
      lastPurchaseExVat: null,
      costBasis: 'unit_cost',
      rules: {
        ...baseRules,
        mode: 'markup_pct',
        markupPercent: 0,
        priceIncVat: true,
      },
    });
    expect(p).toBeCloseTo(100 * (1 + DEFAULT_VAT_RATE), 5);
  });

  it('returns null when cost missing for markup', () => {
    const p = computeSuggestedPrice({
      unitCostExVat: 0,
      lastPurchaseExVat: null,
      costBasis: 'unit_cost',
      rules: { ...baseRules, mode: 'markup_pct', markupPercent: 10 },
    });
    expect(p).toBeNull();
  });

  it('fixed price ignores zero cost', () => {
    const p = computeSuggestedPrice({
      unitCostExVat: 0,
      lastPurchaseExVat: null,
      costBasis: 'unit_cost',
      rules: { ...baseRules, mode: 'fixed_price', fixedPrice: 250 },
    });
    expect(p).toBe(250);
  });
});

describe('marginPercentOnCostNormalized', () => {
  it('strips VAT from sell when priceIncVat', () => {
    const inc = 115;
    const m = marginPercentOnCostNormalized(100, inc, true, 0.15);
    expect(m).toBeCloseTo(0, 5);
  });
});

describe('marginPercentOnCost', () => {
  it('returns null for zero cost', () => {
    expect(marginPercentOnCost(0, 10)).toBeNull();
  });
});
