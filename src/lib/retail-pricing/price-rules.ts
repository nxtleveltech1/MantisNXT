/**
 * Retail price preview calculations for Price List workspace.
 * Costs are treated as ex-VAT (matches typical inventory cost_per_unit_zar).
 * VAT applies to the final displayed/stored selling price when priceIncVat is true.
 */

/** South Africa standard VAT — adjust if multi-region later */
export const DEFAULT_VAT_RATE = 0.15;

export type PricingMode =
  | 'margin_pct'
  | 'markup_pct'
  | 'fixed_price'
  | 'cost_plus_value'
  | 'rule_based';

export type RoundingMode = 'none' | 'cents_99' | 'cents_95' | 'whole';

export type CostBasis = 'unit_cost' | 'last_purchase';

export type MarginBasis = 'on_cost' | 'on_sell';

export type PriceRulesInput = {
  mode: Exclude<PricingMode, 'rule_based'>;
  /** Margin % — when marginBasis is on_cost, same as markup on cost; on_sell is gross margin on retail. */
  marginPercent: number;
  markupPercent: number;
  /** Single fixed selling price (ex VAT before VAT toggle) for fixed_price mode */
  fixedPrice: number;
  /** Added to cost for cost_plus_value */
  valueAdd: number;
  marginBasis: MarginBasis;
  rounding: RoundingMode;
  /** When true, output selling price includes VAT (multiply ex-VAT result by 1+VAT). */
  priceIncVat: boolean;
  vatRate?: number;
};

export type ComputePriceArgs = {
  unitCostExVat: number;
  lastPurchaseExVat: number | null;
  costBasis: CostBasis;
  rules: PriceRulesInput;
};

/**
 * Charm / psychological rounding after base ex-VAT price is computed (before VAT gross-up).
 */
export function applyRounding(priceExVat: number, rounding: RoundingMode): number {
  if (!Number.isFinite(priceExVat) || priceExVat < 0) return 0;
  switch (rounding) {
    case 'none':
      return Math.round(priceExVat * 100) / 100;
    case 'whole':
      return Math.round(priceExVat);
    case 'cents_99': {
      const base = Math.floor(priceExVat);
      const candidate = base + 0.99;
      return candidate >= priceExVat ? candidate : base + 1 + 0.99;
    }
    case 'cents_95': {
      const base = Math.floor(priceExVat);
      const candidate = base + 0.95;
      return candidate >= priceExVat ? candidate : base + 1 + 0.95;
    }
    default: {
      const _exhaustive: never = rounding;
      return _exhaustive;
    }
  }
}

function baseCost(args: ComputePriceArgs): number {
  const { unitCostExVat, lastPurchaseExVat, costBasis } = args;
  if (costBasis === 'last_purchase' && lastPurchaseExVat != null && lastPurchaseExVat > 0) {
    return lastPurchaseExVat;
  }
  return Math.max(0, unitCostExVat);
}

/**
 * Computes suggested selling price from cost and rule set (excludes rule_based — use API).
 */
export function computeSuggestedPrice(args: ComputePriceArgs): number | null {
  const { rules } = args;
  const vatRate = rules.vatRate ?? DEFAULT_VAT_RATE;
  const cost = baseCost(args);
  const needsCost =
    rules.mode === 'margin_pct' ||
    rules.mode === 'markup_pct' ||
    rules.mode === 'cost_plus_value';
  if (needsCost && cost <= 0) return null;

  let exVat = 0;

  switch (rules.mode) {
    case 'margin_pct': {
      const m = rules.marginPercent;
      if (!Number.isFinite(m)) return null;
      if (rules.marginBasis === 'on_cost') {
        // "Margin" on cost = markup on cost
        exVat = cost * (1 + m / 100);
      } else {
        // Gross margin on selling price: (sell - cost) / sell = m/100 → sell = cost / (1 - m/100)
        if (m >= 100) return null;
        exVat = cost / (1 - m / 100);
      }
      break;
    }
    case 'markup_pct': {
      const u = rules.markupPercent;
      if (!Number.isFinite(u)) return null;
      exVat = cost * (1 + u / 100);
      break;
    }
    case 'fixed_price': {
      const f = rules.fixedPrice;
      if (!Number.isFinite(f) || f < 0) return null;
      exVat = f;
      break;
    }
    case 'cost_plus_value': {
      const v = rules.valueAdd;
      if (!Number.isFinite(v)) return null;
      exVat = cost + v;
      break;
    }
    default:
      return null;
  }

  const roundedEx = applyRounding(exVat, rules.rounding);
  const mult = rules.priceIncVat ? 1 + vatRate : 1;
  const gross = roundedEx * mult;
  return Math.round(gross * 100) / 100;
}

export function marginPercentOnCost(cost: number, sell: number): number | null {
  if (!cost || cost <= 0 || !Number.isFinite(sell)) return null;
  return ((sell - cost) / cost) * 100;
}

/** Margin on cost (ex-VAT) when `sellGross` may be inc-VAT per `priceIncVat`. */
export function marginPercentOnCostNormalized(
  costExVat: number,
  sellGross: number,
  priceIncVat: boolean,
  vatRate: number = DEFAULT_VAT_RATE,
): number | null {
  const sellEx = priceIncVat ? sellGross / (1 + vatRate) : sellGross;
  return marginPercentOnCost(costExVat, sellEx);
}
