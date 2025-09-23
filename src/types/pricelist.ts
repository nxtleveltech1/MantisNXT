// Supplier Price List domain types

export type PriceListRequiredField =
  | "supplierId"
  | "supplierName"
  | "sku"
  | "supplierSku"
  | "unitCost";

export type PriceListOptionalField =
  | "currency"
  | "unit"
  | "minQty"
  | "effectiveDate"
  | "notes";

export type PriceListField = PriceListRequiredField | PriceListOptionalField;

export interface PriceListCsvRowRaw {
  [key: string]: string | number | undefined;
}

export interface PriceListRow {
  supplierId?: string;
  supplierName?: string;
  sku: string;
  supplierSku?: string;
  unitCost: number;
  currency?: string;
  unit?: string;
  minQty?: number;
  effectiveDate?: Date;
  notes?: string;
}

export interface PriceListMapping {
  supplierId?: string; // CSV column name
  supplierName?: string;
  sku: string;
  supplierSku?: string;
  unitCost: string;
  currency?: string;
  unit?: string;
  minQty?: string;
  effectiveDate?: string;
  notes?: string;
}

export interface PriceListValidationError {
  rowIndex: number; // 1-based (excluding header)
  field: PriceListField;
  value?: string;
  error: string;
}

export interface PriceListParseResult {
  headers: string[];
  mapping: Partial<PriceListMapping>;
  rowsRaw: PriceListCsvRowRaw[];
}

export interface PriceListBuildResult {
  rows: PriceListRow[];
  errors: PriceListValidationError[];
  total: number;
  valid: number;
  invalid: number;
}

export interface ApplyPriceListResultSummary {
  updatedItems: number;
  createdLinks: number;
  skipped: number;
}
