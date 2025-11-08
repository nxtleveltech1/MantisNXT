// Core supplier management types
export interface Supplier {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  tier: 'strategic' | 'preferred' | 'approved' | 'conditional';
  category: string[];
  tags: string[];

  // Contact Information
  contacts: SupplierContact[];
  addresses: SupplierAddress[];

  // Business Information
  businessInfo: {
    legalName: string;
    tradingName?: string;
    taxId: string;
    registrationNumber: string;
    website?: string;
    foundedYear?: number;
    employeeCount?: number;
    annualRevenue?: number;
    currency: string;
  };

  // Capabilities
  capabilities: {
    products: string[];
    services: string[];
    certifications: Certification[];
    capacityPerMonth?: number;
    leadTime: number;
    minimumOrderValue?: number;
    paymentTerms: string;
  };

  // Performance Metrics
  performance: SupplierPerformance;

  // Financial Information
  financial: {
    creditRating?: string;
    paymentTerms: string;
    currency: string;
    bankDetails?: BankDetails;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastContactDate?: Date;
  nextReviewDate?: Date;
  notes?: string;
}

export interface SupplierContact {
  id: string;
  type: 'primary' | 'billing' | 'technical' | 'sales' | 'support';
  name: string;
  title: string;
  email: string;
  phone: string;
  mobile?: string;
  department?: string;
  isPrimary: boolean;
  isActive: boolean;
}

export interface SupplierAddress {
  id: string;
  type: 'headquarters' | 'billing' | 'shipping' | 'warehouse' | 'manufacturing';
  name?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isPrimary: boolean;
  isActive: boolean;
}

export interface Certification {
  id: string;
  name: string;
  type: 'quality' | 'environmental' | 'safety' | 'security' | 'industry';
  issuingBody: string;
  certificateNumber: string;
  issueDate: Date;
  expiryDate: Date;
  status: 'valid' | 'expired' | 'pending' | 'suspended';
  documentUrl?: string;
}

export interface SupplierPerformance {
  overallRating: number; // 1-5
  qualityRating: number;
  deliveryRating: number;
  serviceRating: number;
  priceRating: number;

  metrics: {
    onTimeDeliveryRate: number; // percentage
    qualityAcceptanceRate: number; // percentage
    responseTime: number; // hours
    defectRate: number; // percentage
    leadTimeVariance: number; // percentage
  };

  kpis: SupplierKPI[];
  lastEvaluationDate: Date;
  nextEvaluationDate: Date;
}

export interface SupplierKPI {
  id: string;
  name: string;
  target: number;
  actual: number;
  unit: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: Date;
}

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber: string;
  swiftCode?: string;
  iban?: string;
}

// Purchase Order Types
export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplier: Supplier;
  status:
    | 'draft'
    | 'sent'
    | 'acknowledged'
    | 'in_progress'
    | 'shipped'
    | 'delivered'
    | 'completed'
    | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Order Details
  orderDate: Date;
  requestedDeliveryDate: Date;
  confirmedDeliveryDate?: Date;
  actualDeliveryDate?: Date;

  // Items
  items: PurchaseOrderItem[];

  // Financial
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number;
  currency: string;

  // Addresses
  shippingAddress: SupplierAddress;
  billingAddress: SupplierAddress;

  // Terms
  paymentTerms: string;
  shippingTerms: string;
  notes?: string;

  // Approval
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface PurchaseOrderItem {
  id: string;
  productCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
  requestedDate: Date;
  confirmedDate?: Date;
  deliveredQuantity?: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  notes?: string;
}

// Contract Types
export interface SupplierContract {
  id: string;
  contractNumber: string;
  supplierId: string;
  supplier: Supplier;

  // Contract Details
  type:
    | 'master_agreement'
    | 'service_agreement'
    | 'purchase_agreement'
    | 'nda'
    | 'framework'
    | 'other';
  title: string;
  description: string;

  // Dates
  startDate: Date;
  endDate: Date;
  signedDate?: Date;
  renewalDate?: Date;

  // Status
  status:
    | 'draft'
    | 'review'
    | 'negotiation'
    | 'approved'
    | 'signed'
    | 'active'
    | 'expired'
    | 'terminated';

  // Terms
  autoRenewal: boolean;
  renewalPeriod?: number; // months
  terminationNotice: number; // days

  // Financial
  value?: number;
  currency?: string;
  paymentTerms?: string;

  // Documents
  documents: ContractDocument[];

  // Stakeholders
  ourSignatory: string;
  supplierSignatory: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  notes?: string;
}

export interface ContractDocument {
  id: string;
  name: string;
  type: 'contract' | 'amendment' | 'schedule' | 'attachment' | 'certificate';
  version: string;
  uploadDate: Date;
  uploadedBy: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  isActive: boolean;
}

// Communication Types
export interface SupplierCommunication {
  id: string;
  supplierId: string;
  supplier: Supplier;

  // Communication Details
  type: 'email' | 'phone' | 'meeting' | 'note' | 'system';
  subject: string;
  content: string;
  direction: 'inbound' | 'outbound';

  // Participants
  fromContact?: SupplierContact;
  toContacts: SupplierContact[];
  ccContacts?: SupplierContact[];

  // Classification
  category: 'general' | 'order' | 'quality' | 'delivery' | 'payment' | 'contract' | 'support';
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Follow-up
  requiresFollowUp: boolean;
  followUpDate?: Date;
  followUpAssignee?: string;

  // Attachments
  attachments: CommunicationAttachment[];

  // Metadata
  createdAt: Date;
  createdBy: string;
  isArchived: boolean;
  tags: string[];
}

export interface CommunicationAttachment {
  id: string;
  name: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadDate: Date;
}

// Financial Types
export interface SupplierFinancial {
  id: string;
  supplierId: string;
  supplier: Supplier;

  // Invoice Information
  invoices: SupplierInvoice[];

  // Payment Information
  payments: SupplierPayment[];

  // Financial Summary
  summary: {
    totalPurchases: number;
    totalPaid: number;
    totalOutstanding: number;
    averagePaymentDays: number;
    creditLimit?: number;
    currency: string;
  };

  // Credit Information
  creditInfo?: {
    rating: string;
    limit: number;
    used: number;
    available: number;
    lastReviewDate: Date;
    nextReviewDate: Date;
  };
}

export interface SupplierInvoice {
  id: string;
  invoiceNumber: string;
  poNumber?: string;

  // Dates
  invoiceDate: Date;
  dueDate: Date;
  receivedDate: Date;

  // Amounts
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  currency: string;

  // Status
  status: 'received' | 'approved' | 'disputed' | 'paid' | 'overdue';

  // Payment
  paymentTerms: string;
  discountTerms?: string;

  // Metadata
  createdAt: Date;
  createdBy: string;
  notes?: string;
}

export interface SupplierPayment {
  id: string;
  invoiceId: string;
  paymentMethod: 'bank_transfer' | 'check' | 'credit_card' | 'ach' | 'wire';

  // Payment Details
  amount: number;
  currency: string;
  paymentDate: Date;
  referenceNumber: string;

  // Status
  status: 'pending' | 'processed' | 'completed' | 'failed' | 'cancelled';

  // Metadata
  createdAt: Date;
  createdBy: string;
  notes?: string;
}

// Search and Filter Types
export interface SupplierSearchFilters {
  query?: string;
  status?: Supplier['status'][];
  tier?: Supplier['tier'][];
  category?: string[];
  location?: string[];
  performanceRating?: {
    min: number;
    max: number;
  };
  tags?: string[];
  hasActiveContracts?: boolean;
  lastContactDate?: {
    from: Date;
    to: Date;
  };
}

export interface SupplierSortOptions {
  field:
    | 'name'
    | 'code'
    | 'status'
    | 'tier'
    | 'performanceRating'
    | 'lastContactDate'
    | 'createdAt';
  direction: 'asc' | 'desc';
}

// Dashboard Types
export interface DashboardMetrics {
  totalSuppliers: number;
  activeSuppliers: number;
  pendingApprovals: number;
  contractsExpiringSoon: number;
  avgPerformanceRating: number;
  totalPurchaseValue: number;
  onTimeDeliveryRate: number;
  qualityAcceptanceRate: number;
}

export interface DashboardActivity {
  id: string;
  type:
    | 'supplier_added'
    | 'contract_signed'
    | 'order_placed'
    | 'delivery_received'
    | 'payment_made'
    | 'performance_review';
  title: string;
  description: string;
  supplierId?: string;
  supplierName?: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high';
  status?: string;
}
