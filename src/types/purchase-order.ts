// Purchase Order Types for comprehensive PO management system

export interface PurchaseOrder {
  id: string
  poNumber: string
  supplierId: string
  supplierName: string
  supplierCode: string

  // Status and Lifecycle
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'acknowledged' | 'in_progress' | 'shipped' | 'received' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'

  // Dates
  createdDate: Date
  requestedDeliveryDate: Date
  confirmedDeliveryDate?: Date
  actualDeliveryDate?: Date
  approvedDate?: Date
  sentDate?: Date
  receivedDate?: Date

  // Line Items
  items: PurchaseOrderItem[]

  // Financial Information
  subtotal: number
  taxAmount: number
  discountAmount: number
  shippingCost: number
  totalAmount: number
  currency: string
  exchangeRate: number

  // Budget and Department
  budgetCode?: string
  budgetAllocated: number
  budgetRemaining: number
  department: string
  costCenter: string

  // Approval Workflow
  approvalWorkflow: ApprovalStep[]
  currentApprovalStep: number

  // Requester and Approver
  requestedBy: string
  requestedByName: string
  approvedBy?: string
  approvedByName?: string

  // Contract and Terms
  contractId?: string
  paymentTerms: string
  deliveryTerms: string
  warrantyTerms: string

  // Addresses
  deliveryAddress: Address
  billingAddress: Address

  // Communication and Documents
  notes?: string
  internalNotes?: string
  attachments: Attachment[]

  // Tracking and Receiving
  trackingNumber?: string
  carrier?: string
  receipts: Receipt[]

  // Invoice Matching
  invoices: InvoiceReference[]
  threeWayMatchStatus: 'pending' | 'matched' | 'exceptions' | 'manual_review'

  // Change Management
  changeOrders: ChangeOrder[]

  // Compliance and Risk
  riskScore: number
  complianceChecks: ComplianceCheck[]

  // Performance Metrics
  performanceMetrics: POPerformanceMetrics

  // Metadata
  createdAt: Date
  updatedAt: Date
  version: number
  auditTrail: AuditEntry[]
}

export interface PurchaseOrderItem {
  id: string
  lineNumber: number
  productCode: string
  description: string
  specifications?: string
  category: string
  subcategory?: string

  // Quantities
  quantity: number
  receivedQuantity: number
  remainingQuantity: number
  unit: string

  // Pricing
  unitPrice: number
  totalPrice: number
  discountPercentage: number
  taxPercentage: number

  // Delivery
  requestedDate: Date
  confirmedDate?: Date
  actualDeliveryDate?: Date

  // Status
  status: 'pending' | 'confirmed' | 'shipped' | 'partially_received' | 'received' | 'cancelled'

  // Quality and Compliance
  qualityRequirements?: string[]
  certifications?: string[]
  inspectionRequired: boolean

  // Contract Information
  contractLineId?: string
  reorderPointTriggered: boolean

  // Metadata
  notes?: string
  receivingNotes?: string
}

export interface ApprovalStep {
  id: string
  stepNumber: number
  approverRole: string
  approverName: string
  approverEmail: string
  status: 'pending' | 'approved' | 'rejected' | 'delegated' | 'skipped'
  approvalThreshold?: number
  required: boolean
  approvedDate?: Date
  comments?: string
  escalationDate?: Date
  escalatedTo?: string
  delegatedTo?: string
  delegatedDate?: Date
}

export interface Address {
  id: string
  name?: string
  street: string
  street2?: string
  city: string
  state: string
  zipCode: string
  country: string
  isDefault: boolean
  contactName?: string
  contactPhone?: string
  contactEmail?: string
}

export interface Attachment {
  id: string
  fileName: string
  originalName: string
  fileType: string
  fileSize: number
  uploadDate: Date
  uploadedBy: string
  category: 'specification' | 'quote' | 'drawing' | 'certificate' | 'other'
  url: string
  description?: string
}

export interface Receipt {
  id: string
  receiptNumber: string
  receivedDate: Date
  receivedBy: string
  items: ReceiptItem[]
  status: 'draft' | 'completed' | 'disputed'
  qualityInspection?: QualityInspection
  notes?: string
  attachments: Attachment[]
}

export interface ReceiptItem {
  id: string
  poItemId: string
  receivedQuantity: number
  acceptedQuantity: number
  rejectedQuantity: number
  damagedQuantity: number
  location: string
  batchNumber?: string
  serialNumbers?: string[]
  expiryDate?: Date
  qualityGrade?: string
  notes?: string
}

export interface QualityInspection {
  id: string
  inspectorName: string
  inspectionDate: Date
  status: 'passed' | 'failed' | 'conditional'
  criteria: InspectionCriteria[]
  overallScore: number
  certificateNumber?: string
  notes?: string
}

export interface InspectionCriteria {
  id: string
  criterion: string
  required: boolean
  result: 'pass' | 'fail' | 'n/a'
  notes?: string
}

export interface InvoiceReference {
  id: string
  invoiceNumber: string
  supplierInvoiceNumber: string
  invoiceDate: Date
  amount: number
  currency: string
  status: 'pending' | 'received' | 'matched' | 'disputed' | 'paid'
  matchingResults: ThreeWayMatchResult[]
}

export interface ThreeWayMatchResult {
  field: string
  poValue: any
  invoiceValue: any
  receiptValue?: any
  matched: boolean
  variance?: number
  toleranceExceeded: boolean
  notes?: string
}

export interface ChangeOrder {
  id: string
  changeNumber: string
  description: string
  reason: string
  category: 'scope' | 'price' | 'delivery' | 'specification' | 'terms'

  // Financial Impact
  originalAmount: number
  newAmount: number
  netChange: number

  // Timeline Impact
  originalDeliveryDate?: Date
  newDeliveryDate?: Date

  // Status and Approval
  status: 'pending' | 'approved' | 'rejected' | 'implemented'
  requestedBy: string
  requestedDate: Date
  approvedBy?: string
  approvedDate?: Date

  // Documentation
  justification: string
  impact: string
  attachments: Attachment[]

  // Implementation
  implementedDate?: Date
  implementedBy?: string
  actualImpact?: string
}

export interface ComplianceCheck {
  id: string
  checkType: 'budget' | 'contract' | 'policy' | 'regulatory' | 'supplier'
  status: 'compliant' | 'non_compliant' | 'warning' | 'pending'
  description: string
  details?: string
  resolvedDate?: Date
  resolvedBy?: string
}

export interface POPerformanceMetrics {
  onTimeDeliveryScore: number
  qualityScore: number
  priceVariancePercentage: number
  cycleTimeHours: number
  supplierResponseTimeHours: number
  changeOrderCount: number
  budgetVariancePercentage: number
  complianceScore: number
}

export interface AuditEntry {
  id: string
  timestamp: Date
  userId: string
  userName: string
  action: string
  details: string
  oldValue?: any
  newValue?: any
  ipAddress?: string
}

// Search and Filter Types
export interface POFilters {
  status?: string[]
  priority?: string[]
  department?: string[]
  supplier?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  amountRange?: {
    min: number
    max: number
  }
  budgetCode?: string[]
  approvalStatus?: string[]
  riskLevel?: string[]
  complianceStatus?: string[]
}

export interface POSortOptions {
  field: string
  direction: 'asc' | 'desc'
}

// Dashboard and Analytics Types
export interface PODashboardMetrics {
  totalOrders: number
  pendingApprovals: number
  inProgress: number
  overdueDeliveries: number
  totalValue: number
  budgetUtilization: number
  averageCycleTime: number
  onTimeDeliveryRate: number
  qualityScore: number
  costSavings: number
  contractCompliance: number
  supplierPerformance: number
}

export interface POAnalytics {
  spendByCategory: CategorySpend[]
  spendBySupplier: SupplierSpend[]
  deliveryPerformance: DeliveryMetrics[]
  budgetAnalysis: BudgetAnalysis
  riskAnalysis: RiskAnalysis
  trendAnalysis: TrendAnalysis
}

export interface CategorySpend {
  category: string
  amount: number
  percentage: number
  orderCount: number
  avgOrderValue: number
}

export interface SupplierSpend {
  supplierId: string
  supplierName: string
  amount: number
  percentage: number
  orderCount: number
  onTimeDeliveryRate: number
  qualityScore: number
}

export interface DeliveryMetrics {
  period: string
  totalDeliveries: number
  onTimeDeliveries: number
  earlyDeliveries: number
  lateDeliveries: number
  averageDelayDays: number
}

export interface BudgetAnalysis {
  totalBudget: number
  allocatedBudget: number
  spentAmount: number
  remainingBudget: number
  utilizationPercentage: number
  forecasted: number
  variancePercentage: number
}

export interface RiskAnalysis {
  highRiskOrders: number
  supplierRisks: SupplierRisk[]
  deliveryRisks: DeliveryRisk[]
  budgetRisks: BudgetRisk[]
  complianceRisks: ComplianceRisk[]
}

export interface SupplierRisk {
  supplierId: string
  supplierName: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskFactors: string[]
  mitigation?: string
}

export interface DeliveryRisk {
  poId: string
  poNumber: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  delayProbability: number
  estimatedDelayDays: number
  impact: string
}

export interface BudgetRisk {
  department: string
  budgetCode: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  overrunRisk: number
  remainingBudget: number
  pendingCommitments: number
}

export interface ComplianceRisk {
  type: string
  description: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  affectedOrders: number
  remediation: string
}

export interface TrendAnalysis {
  spendTrend: TrendDataPoint[]
  volumeTrend: TrendDataPoint[]
  cycleTimeTrend: TrendDataPoint[]
  qualityTrend: TrendDataPoint[]
}

export interface TrendDataPoint {
  period: string
  value: number
  change: number
  changePercentage: number
}

// Bulk Operations Types
export interface BulkOperation {
  type: 'approve' | 'reject' | 'send' | 'cancel' | 'export' | 'update_status' | 'reassign_approver'
  orderIds: string[]
  parameters?: Record<string, any>
  notes?: string
}

export interface BulkOperationResult {
  operation: BulkOperation
  successCount: number
  failureCount: number
  errors: BulkOperationError[]
  executedAt: Date
  executedBy: string
}

export interface BulkOperationError {
  orderId: string
  error: string
  details?: string
}

// Template Types
export interface POTemplate {
  id: string
  name: string
  description: string
  category: string
  isDefault: boolean

  // Template Configuration
  defaultSupplier?: string
  defaultDeliveryTerms: string
  defaultPaymentTerms: string
  defaultItems: TemplateItem[]
  defaultAddresses: {
    delivery?: Address
    billing?: Address
  }

  // Approval Configuration
  approvalWorkflowTemplate: ApprovalStepTemplate[]

  // Metadata
  createdBy: string
  createdAt: Date
  lastUsed?: Date
  usageCount: number
}

export interface TemplateItem {
  productCode: string
  description: string
  category: string
  defaultQuantity: number
  estimatedPrice: number
  specifications?: string
}

export interface ApprovalStepTemplate {
  stepNumber: number
  role: string
  required: boolean
  thresholdAmount?: number
  escalationHours?: number
}

// Reorder Management Types
export interface ReorderPoint {
  id: string
  productCode: string
  minimumStock: number
  reorderQuantity: number
  leadTimeDays: number
  supplierId: string
  autoReorder: boolean
  isActive: boolean
}

export interface AutoReorderConfig {
  enabled: boolean
  rules: ReorderRule[]
  notifications: ReorderNotification[]
}

export interface ReorderRule {
  id: string
  name: string
  conditions: ReorderCondition[]
  actions: ReorderAction[]
  isActive: boolean
}

export interface ReorderCondition {
  type: 'stock_level' | 'consumption_rate' | 'lead_time' | 'seasonal'
  operator: 'below' | 'above' | 'equals'
  value: number
  unit: string
}

export interface ReorderAction {
  type: 'create_po' | 'notify' | 'flag_review'
  parameters: Record<string, any>
}

export interface ReorderNotification {
  id: string
  type: 'email' | 'system' | 'sms'
  recipients: string[]
  template: string
  isActive: boolean
}