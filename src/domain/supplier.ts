// Canonical Supplier domain model (SSOT)
export type SupplierId = string;

export interface Supplier {
  id: SupplierId;
  name: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'deleted';
  code?: string;
  externalRefs?: { [system: string]: string };
  createdAt: string;
  updatedAt: string;
}

