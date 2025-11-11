// Extended types for the complete procurement system
export * from './globals';
export * from './supplier';
export * from './ai';

// Additional types for analytics and performance tracking
export interface SupplierPerformance {
  id: string;
  supplierId: string;
  evaluationDate: Date;
  overallRating: number; // 0-5 scale
  metrics: {
    onTimeDeliveryRate: number; // 0-100%
    qualityAcceptanceRate: number; // 0-100%
    responseTime: number; // hours
    costCompetitiveness: number; // 0-5 scale
    communicationRating: number; // 0-5 scale
    innovationScore: number; // 0-5 scale
  };
  issues: Array<{
    type: 'delivery' | 'quality' | 'communication' | 'cost';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    dateReported: Date;
    status: 'open' | 'in_progress' | 'resolved';
  }>;
  improvements: Array<{
    area: string;
    description: string;
    impact: number; // 0-5 scale
    implementationDate?: Date;
  }>;
  evaluatedBy: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovement {
  id: string;
  itemId: string;
  type: 'inbound' | 'outbound' | 'adjustment' | 'transfer';
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  fromLocationId?: string;
  toLocationId?: string;
  referenceType?: 'purchase_order' | 'sales_order' | 'stock_adjustment' | 'transfer_order';
  referenceId?: string;
  lotId?: string;
  serialNumber?: string;
  reason?: string;
  notes?: string;
  performedBy: string;
  approvedBy?: string;
  timestamp: Date;
  organizationId?: string;
}

// Inventory Types
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;

  // Supplier Information
  supplierId: string;
  supplierPartNumber?: string;

  // Stock Information
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  reorderPoint: number;
  reorderQuantity: number;

  // Pricing
  unitCost: number;
  lastPurchasePrice: number;
  averageCost: number;
  currency: string;

  // Physical Properties
  unit: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };

  // Location
  location: {
    warehouse: string;
    zone: string;
    aisle?: string;
    shelf?: string;
    bin?: string;
  };

  // Status
  status: 'active' | 'inactive' | 'discontinued' | 'obsolete';

  // Quality Control
  qualityChecks: {
    required: boolean;
    frequency: 'incoming' | 'periodic' | 'outgoing' | 'all';
    criteria: string[];
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastCountDate?: Date;
  lastMovementDate?: Date;
  notes?: string;
}

export interface InventoryMovement {
  id: string;
  itemId: string;

  // Movement Details
  type: 'receipt' | 'issue' | 'transfer' | 'adjustment' | 'return' | 'disposal';
  quantity: number;
  previousStock: number;
  newStock: number;

  // Reference
  referenceType?: 'purchase_order' | 'work_order' | 'transfer' | 'adjustment' | 'manual';
  referenceId?: string;

  // Location
  fromLocation?: InventoryItem['location'];
  toLocation?: InventoryItem['location'];

  // Cost
  unitCost?: number;
  totalCost?: number;

  // Metadata
  performedBy: string;
  performedAt: Date;
  reason?: string;
  notes?: string;
}

export interface InventoryAlert {
  id: string;
  type: 'low_stock' | 'overstock' | 'no_stock' | 'expiry' | 'quality_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  itemId: string;

  // Alert Details
  title: string;
  message: string;
  threshold?: number;
  currentValue?: number;

  // Status
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;

  // Metadata
  createdAt: Date;
  expiresAt?: Date;
}

// Message Types
export interface Message {
  id: string;
  threadId?: string;

  // Message Content
  subject?: string;
  content: string;
  messageType: 'text' | 'system' | 'notification' | 'alert';

  // Participants
  senderId: string;
  senderName: string;
  senderType: 'internal' | 'supplier' | 'system';
  recipientIds: string[];
  recipients: MessageParticipant[];

  // Context
  contextType?: 'supplier' | 'purchase_order' | 'contract' | 'invoice' | 'general';
  contextId?: string;

  // Status
  status: 'draft' | 'sent' | 'delivered' | 'read' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Attachments
  attachments: MessageAttachment[];

  // Metadata
  sentAt: Date;
  readAt?: Date;
  isEdited: boolean;
  editedAt?: Date;
  tags: string[];
}

export interface MessageParticipant {
  id: string;
  name: string;
  email: string;
  type: 'internal' | 'supplier';
  role?: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

export interface MessageAttachment {
  id: string;
  name: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  thumbnail?: string;
}

export interface MessageThread {
  id: string;
  subject: string;
  participants: MessageParticipant[];

  // Context
  contextType?: 'supplier' | 'purchase_order' | 'contract' | 'invoice' | 'general';
  contextId?: string;

  // Messages
  messages: Message[];
  messageCount: number;
  unreadCount: number;

  // Status
  status: 'active' | 'archived' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Metadata
  createdAt: Date;
  lastActivityAt: Date;
  lastMessage?: Message;
  tags: string[];
}

// Analytics Types
export interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  previousValue?: number;
  change?: number;
  changeType: 'increase' | 'decrease' | 'stable';
  target?: number;
  lastUpdated: Date;
}

export interface AnalyticsDashboard {
  // Overview Metrics
  totalSpend: AnalyticsMetric;
  supplierCount: AnalyticsMetric;
  orderVolume: AnalyticsMetric;
  costSavings: AnalyticsMetric;

  // Performance Metrics
  onTimeDelivery: AnalyticsMetric;
  qualityScore: AnalyticsMetric;
  supplierRating: AnalyticsMetric;
  paymentTermsCompliance: AnalyticsMetric;

  // Financial Metrics
  outstandingPayments: AnalyticsMetric;
  averagePaymentDays: AnalyticsMetric;
  discountCapture: AnalyticsMetric;
  contractUtilization: AnalyticsMetric;

  // Risk Metrics
  supplierRisk: AnalyticsMetric;
  contractExpiries: AnalyticsMetric;
  complianceScore: AnalyticsMetric;
  diversificationIndex: AnalyticsMetric;
}

export interface AnalyticsReport {
  id: string;
  name: string;
  type: 'spend_analysis' | 'supplier_performance' | 'compliance' | 'risk_assessment' | 'custom';

  // Configuration
  dateRange: {
    start: Date;
    end: Date;
  };
  filters: {
    suppliers?: string[];
    categories?: string[];
    regions?: string[];
    [key: string]: unknown;
  };

  // Data
  charts: AnalyticsChart[];
  tables: AnalyticsTable[];
  insights: AnalyticsInsight[];

  // Metadata
  generatedAt: Date;
  generatedBy: string;
  isScheduled: boolean;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    recipients: string[];
  };
}

export interface AnalyticsChart {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter';
  data: AnalyticsDataPoint[];
  config: {
    xAxis?: string;
    yAxis?: string;
    groupBy?: string;
    colors?: string[];
  };
}

export interface AnalyticsTable {
  id: string;
  title: string;
  columns: AnalyticsColumn[];
  data: Record<string, unknown>[];
  pagination?: {
    page: number;
    size: number;
    total: number;
  };
}

export interface AnalyticsColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'currency' | 'percentage' | 'date';
  sortable?: boolean;
  width?: number;
}

export interface AnalyticsDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk' | 'recommendation';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  relatedMetrics: string[];
  actionItems?: string[];
}

// Enhanced Common Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'buyer' | 'analyst' | 'viewer';
  department: string;
  isActive: boolean;
  lastLogin?: Date;
  permissions: string[];
}

export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;

  // Context
  contextType?: 'supplier' | 'purchase_order' | 'contract' | 'invoice' | 'payment' | 'inventory';
  contextId?: string;
  actionUrl?: string;

  // Status
  isRead: boolean;
  readAt?: Date;

  // Metadata
  createdAt: Date;
  expiresAt?: Date;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'view' | 'export';

  // Changes
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];

  // User
  performedBy: string;
  performedAt: Date;

  // Context
  ipAddress?: string;
  userAgent?: string;

  // Metadata
  notes?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form Types
export interface FormState {
  isLoading: boolean;
  errors: Record<string, string>;
  isDirty: boolean;
  isValid: boolean;
}

export interface TableSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface TableFilter {
  [key: string]: unknown;
}
