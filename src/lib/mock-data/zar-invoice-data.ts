/**
 * ZAR Invoice Mock Data for South African Business Context
 * All amounts in South African Rand (ZAR)
 */

export const ZAR_INVOICE_DATA = [
  {
    id: "INV-001",
    number: "INV-2024-001",
    supplierId: "SUP-1011",
    supplierName: "Stage Audio Works",
    supplierCode: "STGAW",
    purchaseOrderId: "PO-001",
    purchaseOrderNumber: "PO-2024-001",
    receiptId: "REC-001",
    receiptNumber: "REC-2024-001",
    invoiceDate: "2024-01-15",
    dueDate: "2024-02-15",
    paymentTerms: "Net 30",
    currency: "ZAR",
    subtotal: 125000, // R 125,000 (VAT exclusive)
    taxAmount: 18750, // R 18,750 (15% VAT)
    discountAmount: 5000, // R 5,000 discount
    shippingAmount: 2500, // R 2,500 shipping
    totalAmount: 141250, // R 141,250 (VAT inclusive)
    paidAmount: 0,
    remainingAmount: 141250,
    status: "under_review",
    approvalStatus: "pending",
    paymentStatus: "pending",
    matchingStatus: "matched",
    taxCompliant: true,
    auditTrail: [],
    documents: [],
    receivedDate: "2024-01-15T09:00:00Z",
    ocrProcessed: true,
    ocrConfidence: 95,
    manualReview: false,
    disputed: false,
    lineItems: [],
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
    createdBy: "user1",
    updatedBy: "user1",
    earlyPaymentDiscount: {
      percentage: 2,
      daysEarly: 10,
      discountAmount: 2825, // R 2,825 early payment discount (2% of R141,250)
      eligibleUntil: "2024-02-05",
    },
  },
  {
    id: "INV-002",
    number: "INV-2024-002",
    supplierId: "SUP-1021",
    supplierName: "Audiosure",
    supplierCode: "AUDSURE",
    invoiceDate: "2024-01-20",
    dueDate: "2024-02-20",
    paymentTerms: "Net 30",
    currency: "ZAR",
    subtotal: 65000, // R 65,000 (VAT exclusive)
    taxAmount: 9750, // R 9,750 (15% VAT)
    discountAmount: 0, // No discount
    shippingAmount: 1250, // R 1,250 shipping
    totalAmount: 76000, // R 76,000 (VAT inclusive)
    paidAmount: 76000,
    remainingAmount: 0,
    status: "paid",
    approvalStatus: "approved",
    paymentStatus: "paid",
    matchingStatus: "exceptions",
    taxCompliant: true,
    auditTrail: [],
    documents: [],
    receivedDate: "2024-01-20T10:30:00Z",
    processedDate: "2024-01-21T14:15:00Z",
    approvedDate: "2024-01-22T16:45:00Z",
    paidDate: "2024-01-25T11:20:00Z",
    ocrProcessed: true,
    ocrConfidence: 88,
    manualReview: true,
    disputed: false,
    lineItems: [],
    createdAt: "2024-01-20T10:30:00Z",
    updatedAt: "2024-01-25T11:20:00Z",
    createdBy: "user1",
    updatedBy: "user2",
  },
  {
    id: "INV-003",
    number: "INV-2024-003",
    supplierId: "SUP-1022",
    supplierName: "ApexPro Distribution",
    supplierCode: "APEXPR",
    invoiceDate: "2024-01-25",
    dueDate: "2024-02-10",
    paymentTerms: "Net 15",
    currency: "ZAR",
    subtotal: 285000, // R 285,000 (VAT exclusive)
    taxAmount: 42750, // R 42,750 (15% VAT)
    discountAmount: 15000, // R 15,000 discount
    shippingAmount: 4500, // R 4,500 shipping
    totalAmount: 317250, // R 317,250 (VAT inclusive)
    paidAmount: 0,
    remainingAmount: 317250,
    status: "overdue",
    approvalStatus: "approved",
    paymentStatus: "overdue",
    matchingStatus: "manual_review",
    taxCompliant: true,
    auditTrail: [],
    documents: [],
    receivedDate: "2024-01-25T08:45:00Z",
    processedDate: "2024-01-26T12:30:00Z",
    approvedDate: "2024-01-27T10:15:00Z",
    ocrProcessed: false,
    manualReview: true,
    disputed: true,
    disputeReason: "BEE compliance documentation missing",
    disputeDate: "2024-02-01",
    lineItems: [],
    createdAt: "2024-01-25T08:45:00Z",
    updatedAt: "2024-02-01T14:20:00Z",
    createdBy: "user1",
    updatedBy: "user3",
  },
  {
    id: "INV-004",
    number: "INV-2024-004",
    supplierId: "SUP-1015",
    supplierName: "Sennheiser South Africa",
    supplierCode: "SENNZA",
    invoiceDate: "2024-02-01",
    dueDate: "2024-03-03",
    paymentTerms: "Net 30",
    currency: "ZAR",
    subtotal: 450000, // R 450,000 (VAT exclusive)
    taxAmount: 67500, // R 67,500 (15% VAT)
    discountAmount: 22500, // R 22,500 discount (5%)
    shippingAmount: 7500, // R 7,500 shipping
    totalAmount: 502500, // R 502,500 (VAT inclusive)
    paidAmount: 250000, // R 250,000 partial payment
    remainingAmount: 252500,
    status: "approved",
    approvalStatus: "approved",
    paymentStatus: "partially_paid",
    matchingStatus: "matched",
    taxCompliant: true,
    auditTrail: [],
    documents: [],
    receivedDate: "2024-02-01T08:30:00Z",
    processedDate: "2024-02-02T11:15:00Z",
    approvedDate: "2024-02-03T14:20:00Z",
    ocrProcessed: true,
    ocrConfidence: 92,
    manualReview: false,
    disputed: false,
    lineItems: [],
    createdAt: "2024-02-01T08:30:00Z",
    updatedAt: "2024-02-05T16:45:00Z",
    createdBy: "user2",
    updatedBy: "user2",
  },
  {
    id: "INV-005",
    number: "INV-2024-005",
    supplierId: "SUP-1013",
    supplierName: "Yamaha Music South Africa",
    supplierCode: "YAMZA",
    invoiceDate: "2024-02-05",
    dueDate: "2024-02-20",
    paymentTerms: "Net 15",
    currency: "ZAR",
    subtotal: 185000, // R 185,000 (VAT exclusive)
    taxAmount: 27750, // R 27,750 (15% VAT)
    discountAmount: 9250, // R 9,250 discount
    shippingAmount: 3500, // R 3,500 shipping
    totalAmount: 207000, // R 207,000 (VAT inclusive)
    paidAmount: 207000,
    remainingAmount: 0,
    status: "paid",
    approvalStatus: "approved",
    paymentStatus: "paid",
    matchingStatus: "matched",
    taxCompliant: true,
    auditTrail: [],
    documents: [],
    receivedDate: "2024-02-05T12:00:00Z",
    processedDate: "2024-02-05T15:30:00Z",
    approvedDate: "2024-02-06T09:45:00Z",
    paidDate: "2024-02-12T14:20:00Z",
    ocrProcessed: true,
    ocrConfidence: 97,
    manualReview: false,
    disputed: false,
    lineItems: [],
    createdAt: "2024-02-05T12:00:00Z",
    updatedAt: "2024-02-12T14:20:00Z",
    createdBy: "user1",
    updatedBy: "user3",
    earlyPaymentDiscount: {
      percentage: 1.5,
      daysEarly: 7,
      discountAmount: 3105, // R 3,105 early payment discount
      eligibleUntil: "2024-02-13",
    },
  },
];

export const ZAR_INVOICE_METRICS = {
  totalInvoices: 186,
  totalValue: 28500000, // R 28.5M total value
  averageProcessingTime: 2.3, // Improved processing time
  approvalRate: 96.8, // High approval rate
  disputeRate: 2.1, // Low dispute rate
  onTimePaymentRate: 91.5, // Good payment performance
  earlyPaymentSavings: 750000, // R 750,000 early payment savings
  exceptionRate: 8.7, // Reduced exception rate
  automationRate: 89.2, // High automation
  beeCompliantSpend: 18500000, // R 18.5M BEE compliant spend (65%)
  localSupplierSpend: 25000000, // R 25M local supplier spend (87.7%)
  vatRecoverable: 3825000, // R 3.825M VAT recoverable
};
