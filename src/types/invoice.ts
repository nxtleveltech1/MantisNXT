export interface Invoice {
  id: string
  number: string
  supplierId: string
  supplierName: string
  supplierCode: string
  purchaseOrderId?: string
  purchaseOrderNumber?: string
  receiptId?: string
  receiptNumber?: string

  // Invoice Details
  invoiceDate: string
  dueDate: string
  paymentTerms: string
  currency: string
  exchangeRate?: number

  // Financial Information
  subtotal: number
  taxAmount: number
  discountAmount: number
  shippingAmount: number
  totalAmount: number
  paidAmount: number
  remainingAmount: number

  // Early Payment Discount
  earlyPaymentDiscount?: {
    percentage: number
    daysEarly: number
    discountAmount: number
    eligibleUntil: string
  }

  // Status and Workflow
  status: InvoiceStatus
  approvalStatus: ApprovalStatus
  paymentStatus: PaymentStatus
  matchingStatus: ThreeWayMatchStatus

  // Compliance and Audit
  taxCompliant: boolean
  auditTrail: AuditEntry[]
  documents: InvoiceDocument[]

  // Processing Information
  receivedDate: string
  processedDate?: string
  approvedDate?: string
  paidDate?: string

  // OCR and Processing
  ocrProcessed: boolean
  ocrConfidence?: number
  extractedData?: unknown
  manualReview: boolean

  // Dispute Management
  disputed: boolean
  disputeReason?: string
  disputeDate?: string
  disputeResolutionDate?: string

  // Line Items
  lineItems: InvoiceLineItem[]

  // Metadata
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

export interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  lineTotal: number
  taxRate: number
  taxAmount: number
  accountCode?: string
  costCenter?: string
  project?: string
  matchedToReceipt: boolean
  matchedToPO: boolean
  variances?: LineItemVariance[]
}

export interface LineItemVariance {
  type: 'quantity' | 'price' | 'description'
  expectedValue: unknown
  actualValue: unknown
  variance: number
  explanation?: string
}

export interface InvoiceDocument {
  id: string
  type: 'invoice' | 'receipt' | 'supporting_document'
  filename: string
  url: string
  uploadedAt: string
  uploadedBy: string
}

export interface AuditEntry {
  id: string
  action: string
  timestamp: string
  userId: string
  userName: string
  details: unknown
  ipAddress?: string
}

export interface ApprovalWorkflow {
  id: string
  invoiceId: string
  steps: ApprovalStep[]
  currentStep: number
  status: ApprovalStatus
  createdAt: string
  completedAt?: string
}

export interface ApprovalStep {
  id: string
  stepNumber: number
  approverRole: string
  approverIds: string[]
  requiredApprovals: number
  actualApprovals: ApprovalAction[]
  status: 'pending' | 'approved' | 'rejected' | 'skipped'
  dueDate?: string
}

export interface ApprovalAction {
  id: string
  approverId: string
  approverName: string
  action: 'approve' | 'reject' | 'request_changes'
  timestamp: string
  comments?: string
}

export interface ThreeWayMatch {
  invoiceId: string
  purchaseOrderId?: string
  receiptId?: string
  matchingResults: MatchingResult[]
  overallStatus: ThreeWayMatchStatus
  exceptions: MatchingException[]
  performedAt: string
  performedBy: string
}

export interface MatchingResult {
  field: string
  invoiceValue: unknown
  poValue?: unknown
  receiptValue?: unknown
  matched: boolean
  variance?: number
  tolerance?: number
}

export interface MatchingException {
  id: string
  type: 'price_variance' | 'quantity_variance' | 'missing_receipt' | 'missing_po' | 'tax_mismatch'
  severity: 'low' | 'medium' | 'high'
  description: string
  suggestedAction: string
  status: 'open' | 'resolved' | 'escalated'
  assignedTo?: string
  createdAt: string
  resolvedAt?: string
}

export interface InvoiceMetrics {
  totalInvoices: number
  totalValue: number
  averageProcessingTime: number
  approvalRate: number
  disputeRate: number
  onTimePaymentRate: number
  earlyPaymentSavings: number
  exceptionRate: number
  automationRate: number
}

export interface PaymentSchedule {
  invoiceId: string
  installments: PaymentInstallment[]
  totalAmount: number
  currency: string
}

export interface PaymentInstallment {
  id: string
  amount: number
  dueDate: string
  status: PaymentStatus
  paidDate?: string
  paidAmount?: number
  paymentMethod?: string
  referenceNumber?: string
}

export interface BulkInvoiceOperation {
  operationType: 'approve' | 'reject' | 'export' | 'update_status'
  invoiceIds: string[]
  parameters?: unknown
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  completedAt?: string
  results?: BulkOperationResult[]
}

export interface BulkOperationResult {
  invoiceId: string
  success: boolean
  error?: string
  changes?: unknown
}

export type InvoiceStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'cancelled'
  | 'disputed'

export type ApprovalStatus =
  | 'pending'
  | 'in_progress'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'expired'

export type PaymentStatus =
  | 'pending'
  | 'scheduled'
  | 'processing'
  | 'paid'
  | 'partially_paid'
  | 'failed'
  | 'cancelled'
  | 'overdue'

export type ThreeWayMatchStatus =
  | 'not_started'
  | 'in_progress'
  | 'matched'
  | 'exceptions'
  | 'failed'
  | 'manual_review'

export interface InvoiceFilters {
  status?: InvoiceStatus[]
  approvalStatus?: ApprovalStatus[]
  paymentStatus?: PaymentStatus[]
  supplierId?: string[]
  currency?: string[]
  amountRange?: {
    min: number
    max: number
  }
  dateRange?: {
    start: string
    end: string
  }
  dueDateRange?: {
    start: string
    end: string
  }
  disputed?: boolean
  overdue?: boolean
  earlyPaymentEligible?: boolean
}

export interface InvoiceSort {
  field: keyof Invoice
  direction: 'asc' | 'desc'
}

export interface InvoiceSearchParams {
  query?: string
  filters?: InvoiceFilters
  sort?: InvoiceSort
  page?: number
  limit?: number
}