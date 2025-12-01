// Inventory Management Types
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;

  // Stock Management
  currentStock: number;
  reservedStock: number;
  availableStock: number; // calculated: currentStock - reservedStock
  reorderPoint: number;
  maxStock: number;
  minStock: number;

  // Location Tracking
  locations: InventoryLocation[];
  primaryLocationId: string;

  // Batch/Lot Tracking
  batchTracking: boolean;
  lots: InventoryLot[];

  // Supplier Information
  supplierId?: string;
  supplierName?: string;
  supplierSku?: string;

  // Pricing
  unitCost: number;
  unitPrice: number;
  currency: string;

  // Physical Properties
  unit: string; // pieces, kg, liters, etc.
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
  };

  // Status and Alerts
  status: 'active' | 'inactive' | 'discontinued' | 'out_of_stock' | 'low_stock';
  alerts: InventoryAlert[];

  // Tracking
  lastStockUpdate: Date;
  lastOrderDate?: Date;
  nextDeliveryDate?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags: string[];
  notes?: string;
}

export interface InventoryLocation {
  id: string;
  warehouseId: string;
  warehouseName: string;
  zone?: string;
  aisle?: string;
  shelf?: string;
  bin?: string;
  locationCode: string; // full location identifier
  quantity: number;
  reservedQuantity: number;
  isDefault: boolean;
  isPrimary: boolean;
}

export interface InventoryLot {
  id: string;
  lotNumber: string;
  batchNumber?: string;
  quantity: number;
  reservedQuantity: number;
  manufactureDate?: Date;
  expiryDate?: Date;
  receivedDate: Date;
  supplierId?: string;
  supplierLotNumber?: string;
  qualityStatus: 'approved' | 'pending' | 'rejected' | 'quarantine';
  locations: {
    locationId: string;
    locationCode: string;
    quantity: number;
  }[];
  notes?: string;
}

export interface InventoryAlert {
  id: string;
  type:
    | 'low_stock'
    | 'out_of_stock'
    | 'overstock'
    | 'expiry_warning'
    | 'quality_issue'
    | 'location_discrepancy';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  isActive: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
  dueDate?: Date;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  type: 'main' | 'distribution' | 'fulfillment' | 'transit' | 'consignment';
  address: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  manager: string;
  capacity: {
    totalSpace: number;
    usedSpace: number;
    unit: 'sqm' | 'sqft' | 'cubic_m' | 'cubic_ft';
  };
  zones: WarehouseZone[];
  isActive: boolean;
  createdAt: Date;
}

export interface WarehouseZone {
  id: string;
  name: string;
  code: string;
  type: 'receiving' | 'storage' | 'picking' | 'packing' | 'shipping' | 'quarantine';
  temperature?: {
    min: number;
    max: number;
    unit: 'celsius' | 'fahrenheit';
  };
  humidity?: {
    min: number;
    max: number;
  };
  aisles: number;
  isActive: boolean;
}

export interface StockMovement {
  id: string;
  itemId: string;
  type: 'inbound' | 'outbound' | 'transfer' | 'adjustment' | 'consumption' | 'return';
  reason: string;
  quantity: number;
  fromLocationId?: string;
  toLocationId?: string;
  lotNumber?: string;
  referenceNumber?: string; // PO, SO, etc.
  referenceType?: 'purchase_order' | 'sales_order' | 'transfer_order' | 'adjustment' | 'manual';
  unitCost?: number;
  totalValue?: number;
  performedBy: string;
  approvedBy?: string;
  timestamp: Date;
  notes?: string;
}

export interface InventoryAdjustment {
  id: string;
  adjustmentNumber: string;
  items: InventoryAdjustmentItem[];
  reason: 'cycle_count' | 'damage' | 'theft' | 'expiry' | 'error_correction' | 'other';
  reasonDetails: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'applied';
  totalValueImpact: number;
  currency: string;
  performedBy: string;
  approvedBy?: string;
  createdAt: Date;
  appliedAt?: Date;
  notes?: string;
}

export interface InventoryAdjustmentItem {
  id: string;
  itemId: string;
  locationId: string;
  lotNumber?: string;
  systemQuantity: number;
  actualQuantity: number;
  adjustmentQuantity: number; // actualQuantity - systemQuantity
  unitCost: number;
  valueImpact: number;
  reason?: string;
}

export interface CycleCount {
  id: string;
  countNumber: string;
  type: 'full' | 'partial' | 'abc_analysis' | 'random';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  countedBy: string[];
  supervisedBy?: string;

  items: CycleCountItem[];
  discrepancies: number;
  accuracyRate: number; // percentage

  locations: string[]; // location IDs to count
  instructions?: string;
  notes?: string;
}

export interface CycleCountItem {
  id: string;
  itemId: string;
  locationId: string;
  lotNumber?: string;
  systemQuantity: number;
  countedQuantity?: number;
  discrepancy?: number;
  status: 'pending' | 'counted' | 'verified' | 'discrepancy';
  countedBy?: string;
  countedAt?: Date;
  notes?: string;
}

// Search and Filter Types
export interface InventorySearchFilters {
  query?: string;
  category?: string[];
  status?: InventoryItem['status'][];
  warehouse?: string[];
  supplier?: string[];
  lowStock?: boolean;
  outOfStock?: boolean;
  expiringItems?: {
    days: number;
  };
  valueRange?: {
    min: number;
    max: number;
  };
  lastUpdated?: {
    from: Date;
    to: Date;
  };
  tags?: string[];
}

export interface InventorySortOptions {
  field: 'name' | 'sku' | 'category' | 'currentStock' | 'value' | 'lastStockUpdate' | 'status';
  direction: 'asc' | 'desc';
}

// Dashboard Types
export interface InventoryMetrics {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalWarehouses: number;
  pendingAdjustments: number;
  expiringItemsCount: number;
  turnoverRate: number; // inventory turnover ratio
  averageDaysInStock: number;
}

export interface InventoryTrend {
  date: Date;
  totalValue: number;
  itemCount: number;
  stockOuts: number;
  adjustments: number;
  turnover: number;
}

export interface TopMovingItem {
  itemId: string;
  itemName: string;
  sku: string;
  category: string;
  totalMovement: number;
  direction: 'inbound' | 'outbound';
  trend: 'up' | 'down' | 'stable';
}

// Import/Export Types
export interface InventoryImport {
  id: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  errors: ImportError[];
  uploadedBy: string;
  uploadedAt: Date;
  processedAt?: Date;
}

export interface ImportError {
  row: number;
  field: string;
  value: string;
  error: string;
}

export interface InventoryExport {
  id: string;
  type: 'full' | 'filtered' | 'template';
  format: 'csv' | 'xlsx' | 'pdf';
  filters?: InventorySearchFilters;
  status: 'generating' | 'ready' | 'expired';
  fileName: string;
  fileUrl?: string;
  rowCount: number;
  generatedBy: string;
  generatedAt: Date;
  expiresAt: Date;
}
