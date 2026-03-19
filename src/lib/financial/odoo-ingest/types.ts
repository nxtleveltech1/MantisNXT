/**
 * Odoo extraction payload types (from odoo_xero_config_*.json)
 */

export interface OdooExtractionMetadata {
  source?: string;
  export_date?: string;
  models_exported?: string[];
  counts?: Record<string, number>;
}

export interface OdooAccount {
  id: number;
  code: string;
  name: string;
  account_type: string;
  company_id: false | [number, string];
  currency_id: false | [number, string];
  reconcile: boolean;
  deprecated: boolean;
  group_id?: false | number | [number, string];
}

export interface OdooJournal {
  id: number;
  name: string;
  code: string;
  type: string;
  company_id: false | [number, string];
  currency_id: false | [number, string];
  default_account_id: false | [number, string];
  active: boolean;
}

export interface OdooTax {
  id: number;
  name: string;
  amount_type?: string;
  amount: number;
  type_tax_use?: string;
  tax_scope?: boolean | string;
  company_id?: false | [number, string];
  active?: boolean;
}

export interface OdooPaymentTerm {
  id: number;
  name: string;
  note?: string | false;
  company_id: false | [number, string];
}

export interface OdooPaymentTermLine {
  value?: string;
  value_amount?: number;
  days?: number;
  option?: string;
  line_number?: number;
}

export interface OdooCompany {
  id: number;
  name: string;
  currency_id: [number, string];
  fiscalyear_last_day?: number;
  fiscalyear_last_month?: string | number;
}

export interface OdooCurrency {
  id: number;
  name: string;
  full_name?: string;
  symbol?: string;
}

export interface OdooPartner {
  id: number;
  name: string;
  customer_rank?: number;
  supplier_rank?: number;
  property_payment_term_id?: false | [number, string];
  country_id?: false | [number, string];
  state_id?: false | [number, string];
}

export interface OdooFiscalPosition {
  id: number;
  name: string;
  country_id?: false | [number, string];
  state_ids?: number[] | [number, string][];
  active?: boolean;
}

export interface OdooFiscalPositionAccount {
  account_src_id: number;
  account_dest_id: number;
}

export interface OdooFiscalPositionTax {
  tax_src_id: number;
  tax_dest_id: number | false;
}

export interface OdooExtractionPayload {
  metadata?: OdooExtractionMetadata;
  accounts?: OdooAccount[];
  journals?: OdooJournal[];
  taxes?: OdooTax[];
  payment_terms?: OdooPaymentTerm[];
  payment_term_lines?: OdooPaymentTermLine[];
  companies?: OdooCompany[];
  currencies?: OdooCurrency[];
  partners?: OdooPartner[];
  fiscal_positions?: OdooFiscalPosition[];
  fiscal_position_accounts?: OdooFiscalPositionAccount[];
  fiscal_position_taxes?: OdooFiscalPositionTax[];
}

export interface OdooIngestResult {
  importId: string;
  status: 'completed' | 'failed' | 'partial';
  recordsImported: {
    accounts?: number;
    taxes?: number;
    paymentTerms?: number;
    journals?: number;
    fiscalPositions?: number;
    partners?: number;
  };
  validationErrors: string[];
}

export type OdooRelation = [number, string] | false;

export function resolveOdooId(rel: OdooRelation): number | null {
  if (!rel || !Array.isArray(rel)) return null;
  return typeof rel[0] === 'number' ? rel[0] : null;
}

export function resolveOdooCurrency(rel: OdooRelation): string | null {
  if (!rel || !Array.isArray(rel) || rel.length < 2) return null;
  return typeof rel[1] === 'string' ? rel[1] : null;
}
