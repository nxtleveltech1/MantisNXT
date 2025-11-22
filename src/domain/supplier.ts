// Canonical Supplier domain model (SSOT)
export type SupplierId = string;

export interface Supplier {
  id: SupplierId;
  name: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'deleted';
  code?: string;
  orgId?: string; // Organization ID - required for all suppliers
  externalRefs?: { [system: string]: string };
  createdAt: string;
  updatedAt: string;
}

