import type { ExtractedSupplierData as BaseExtractedSupplierData } from './AIDataExtractionService';

export type SupplierBrandLink = {
  name: string;
  url?: string;
  logo?: string;
};

export type ExtractedSupplierData = Omit<BaseExtractedSupplierData, 'brandLinks'> & {
  brandLinks?: SupplierBrandLink[];
};
