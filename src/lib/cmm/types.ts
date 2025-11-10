export type StockType = 'stock' | 'made_to_order' | 'preorder';

export type Product = {
  sku: string; // immutable PK
  supplierId: string;
  categoryId?: string;
  description: string;
  brand?: string;
  seriesRange?: string; // Series (Range) field
  price?: number;
  stockType?: StockType;
  imageUrl?: string;
  tags: string[];
  attributes?: Record<string, any>;
  updatedAt: number;
};

export type Category = {
  id: string;
  name: string;
  parentId?: string;
  path: string; // e.g. "Apparel>Outerwear>Coats"
};

export type Tag = {
  id: string;
  name: string;
  type?: 'seasonal' | 'stock' | 'custom';
};

export type TagAssignment = {
  sku: string;
  tagId: string;
};

export type Supplier = {
  id: string;
  name: string;
};

export type Conflict = {
  id: string;
  sku: string;
  type: 'duplicate' | 'data_mismatch' | 'immutable_violation';
  message: string;
  details?: any;
  reportedAt: number;
};

export type Rule = {
  id: string;
  kind: 'keyword';
  keyword: string;
  tagId: string;
};
