/**
 * Fiscal position resolution types (platform-only; Xero has no equivalent)
 */

export interface FiscalPositionContact {
  countryCode?: string | null;
  stateCode?: string | null;
  countryId?: number | null;
  stateId?: number | null;
}

export interface FiscalPositionOverrides {
  taxOverrides: Array<{ odooTaxId: number; xeroTaxType: string | null }>;
  accountOverrides: Array<{ odooAccountCodeSrc: string; xeroAccountCodeDest: string }>;
}

export interface ResolvedFiscalPosition {
  fiscalPositionId: string;
  name: string;
  taxOverrides: FiscalPositionOverrides['taxOverrides'];
  accountOverrides: FiscalPositionOverrides['accountOverrides'];
}
