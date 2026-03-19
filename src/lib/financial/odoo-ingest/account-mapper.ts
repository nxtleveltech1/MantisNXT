/**
 * Odoo account_type → Xero Account Type mapping (from XERO_MAPPING_GUIDE)
 */

export const ODOO_ACCOUNT_TYPE_TO_XERO: Record<string, string> = {
  asset_receivable: 'CURRENT',
  asset_cash: 'BANK',
  asset_current: 'CURRENT',
  asset_non_current: 'NONCURRENT',
  asset_prepayments: 'PREPAYMENT',
  asset_fixed: 'FIXED',
  liability_payable: 'CURRLIAB',
  liability_credit_card: 'LIABILITY',
  liability_current: 'CURRLIAB',
  liability_non_current: 'TERMLIAB',
  equity: 'EQUITY',
  equity_unaffected: 'EQUITY',
  income: 'REVENUE',
  income_other: 'OTHERINCOME',
  expense: 'EXPENSE',
  expense_depreciation: 'DEPRECIATN',
  expense_direct_cost: 'DIRECTCOSTS',
  off_balance: 'CURRENT',
};

/**
 * Map Odoo account_type to Xero Type. Returns CURRENT for unknown (e.g. off_balance).
 */
export function mapOdooAccountTypeToXero(odooAccountType: string): string {
  return ODOO_ACCOUNT_TYPE_TO_XERO[odooAccountType] ?? 'CURRENT';
}
