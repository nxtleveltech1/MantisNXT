/**
 * ZAR Payment Mock Data for South African Business Context
 * All amounts in South African Rand (ZAR)
 */

export const ZAR_PAYMENT_DATA = [
  {
    id: 'PAY-001',
    paymentNumber: 'PAY-2024-001',
    invoiceId: 'INV-001',
    invoiceNumber: 'INV-2024-001',
    supplierId: 'SUP-001',
    supplierName: 'Johannesburg Industrial Supplies',
    supplierCode: 'JIS001',
    paymentDate: '2024-02-14',
    dueDate: '2024-02-15',
    currency: 'ZAR',
    invoiceAmount: 141250, // R 141,250 original invoice amount
    discountAmount: 2825, // R 2,825 early payment discount
    paymentAmount: 138425, // R 138,425 actual payment
    paymentMethod: 'Electronic Transfer',
    paymentReference: 'EFT-20240214-001',
    bankReference: 'ABSA-TX-789456123',
    status: 'completed',
    approvalStatus: 'approved',
    processedDate: '2024-02-14T10:30:00Z',
    scheduledDate: '2024-02-14',
    actualDate: '2024-02-14',
    paymentTerms: 'Net 30 with 2% early discount',
    beneficiaryAccount: {
      accountName: 'Johannesburg Industrial Supplies',
      accountNumber: '123456789',
      bankName: 'ABSA Bank',
      branchCode: '632005',
      accountType: 'Business Cheque',
    },
    vatAmount: 18750, // R 18,750 VAT component
    withholdingTax: 0, // No withholding tax
    fees: 25, // R 25 bank transfer fee
    createdAt: '2024-02-13T14:20:00Z',
    updatedAt: '2024-02-14T10:35:00Z',
    createdBy: 'user1',
    updatedBy: 'user1',
  },
  {
    id: 'PAY-002',
    paymentNumber: 'PAY-2024-002',
    invoiceId: 'INV-002',
    invoiceNumber: 'INV-2024-002',
    supplierId: 'SUP-002',
    supplierName: 'Cape Town Manufacturing Co',
    supplierCode: 'CTMC002',
    paymentDate: '2024-02-18',
    dueDate: '2024-02-20',
    currency: 'ZAR',
    invoiceAmount: 76000, // R 76,000 original invoice amount
    discountAmount: 0, // No discount
    paymentAmount: 76000, // R 76,000 full payment
    paymentMethod: 'Electronic Transfer',
    paymentReference: 'EFT-20240218-002',
    bankReference: 'FNB-TX-456789012',
    status: 'completed',
    approvalStatus: 'approved',
    processedDate: '2024-02-18T09:15:00Z',
    scheduledDate: '2024-02-18',
    actualDate: '2024-02-18',
    paymentTerms: 'Net 30',
    beneficiaryAccount: {
      accountName: 'Cape Town Manufacturing Co',
      accountNumber: '987654321',
      bankName: 'First National Bank',
      branchCode: '250655',
      accountType: 'Business Current',
    },
    vatAmount: 9750, // R 9,750 VAT component
    withholdingTax: 0, // No withholding tax
    fees: 25, // R 25 bank transfer fee
    createdAt: '2024-02-17T11:45:00Z',
    updatedAt: '2024-02-18T09:20:00Z',
    createdBy: 'user2',
    updatedBy: 'user2',
  },
  {
    id: 'PAY-003',
    paymentNumber: 'PAY-2024-003',
    invoiceId: 'INV-004',
    invoiceNumber: 'INV-2024-004',
    supplierId: 'SUP-004',
    supplierName: 'Pretoria Tech Systems',
    supplierCode: 'PTS004',
    paymentDate: '2024-02-05',
    dueDate: '2024-03-03',
    currency: 'ZAR',
    invoiceAmount: 502500, // R 502,500 original invoice amount
    discountAmount: 0, // No discount
    paymentAmount: 250000, // R 250,000 partial payment
    paymentMethod: 'Electronic Transfer',
    paymentReference: 'EFT-20240205-003',
    bankReference: 'STD-TX-234567890',
    status: 'completed',
    approvalStatus: 'approved',
    processedDate: '2024-02-05T15:45:00Z',
    scheduledDate: '2024-02-05',
    actualDate: '2024-02-05',
    paymentTerms: 'Net 30 - Partial Payment',
    beneficiaryAccount: {
      accountName: 'Pretoria Tech Systems',
      accountNumber: '456789123',
      bankName: 'Standard Bank',
      branchCode: '051001',
      accountType: 'Business Cheque',
    },
    vatAmount: 33750, // R 33,750 VAT component (partial)
    withholdingTax: 0, // No withholding tax
    fees: 35, // R 35 bank transfer fee
    remainingAmount: 252500, // R 252,500 remaining balance
    createdAt: '2024-02-04T13:30:00Z',
    updatedAt: '2024-02-05T15:50:00Z',
    createdBy: 'user3',
    updatedBy: 'user3',
  },
  {
    id: 'PAY-004',
    paymentNumber: 'PAY-2024-004',
    invoiceId: 'INV-005',
    invoiceNumber: 'INV-2024-005',
    supplierId: 'SUP-005',
    supplierName: 'Eastern Cape Mining Supplies',
    supplierCode: 'ECMS005',
    paymentDate: '2024-02-12',
    dueDate: '2024-02-20',
    currency: 'ZAR',
    invoiceAmount: 207000, // R 207,000 original invoice amount
    discountAmount: 3105, // R 3,105 early payment discount
    paymentAmount: 203895, // R 203,895 actual payment
    paymentMethod: 'Electronic Transfer',
    paymentReference: 'EFT-20240212-004',
    bankReference: 'NED-TX-345678901',
    status: 'completed',
    approvalStatus: 'approved',
    processedDate: '2024-02-12T14:20:00Z',
    scheduledDate: '2024-02-12',
    actualDate: '2024-02-12',
    paymentTerms: 'Net 15 with 1.5% early discount',
    beneficiaryAccount: {
      accountName: 'Eastern Cape Mining Supplies',
      accountNumber: '789123456',
      bankName: 'Nedbank',
      branchCode: '198765',
      accountType: 'Business Current',
    },
    vatAmount: 27750, // R 27,750 VAT component
    withholdingTax: 0, // No withholding tax
    fees: 25, // R 25 bank transfer fee
    createdAt: '2024-02-11T16:00:00Z',
    updatedAt: '2024-02-12T14:25:00Z',
    createdBy: 'user1',
    updatedBy: 'user1',
  },
  {
    id: 'PAY-005',
    paymentNumber: 'PAY-2024-005',
    invoiceId: 'INV-006',
    invoiceNumber: 'INV-2024-006',
    supplierId: 'SUP-006',
    supplierName: 'Western Cape Agricultural',
    supplierCode: 'WCA006',
    paymentDate: '2024-02-20',
    dueDate: '2024-03-15',
    currency: 'ZAR',
    invoiceAmount: 95000, // R 95,000 original invoice amount
    discountAmount: 0, // No discount
    paymentAmount: 0, // Scheduled for future payment
    paymentMethod: 'Electronic Transfer',
    paymentReference: 'EFT-20240220-005',
    bankReference: '',
    status: 'scheduled',
    approvalStatus: 'approved',
    processedDate: null,
    scheduledDate: '2024-02-20',
    actualDate: null,
    paymentTerms: 'Net 45',
    beneficiaryAccount: {
      accountName: 'Western Cape Agricultural',
      accountNumber: '321654987',
      bankName: 'Capitec Bank',
      branchCode: '470010',
      accountType: 'Business Save',
    },
    vatAmount: 12825, // R 12,825 VAT component
    withholdingTax: 0, // No withholding tax
    fees: 25, // R 25 estimated bank transfer fee
    createdAt: '2024-02-15T10:30:00Z',
    updatedAt: '2024-02-15T10:30:00Z',
    createdBy: 'user2',
    updatedBy: 'user2',
  },
];

export const ZAR_PAYMENT_METRICS = {
  totalPayments: 423,
  totalPaid: 42500000, // R 42.5M total payments made
  averagePaymentTime: 12.8, // Days from invoice to payment
  onTimePaymentRate: 91.5, // Percentage of on-time payments
  earlyPaymentRate: 23.4, // Percentage with early payment discounts
  totalDiscountsSaved: 875000, // R 875,000 in early payment discounts
  averagePaymentAmount: 100472, // R 100,472 average payment
  electronicPaymentRate: 98.6, // Percentage via electronic transfer
  pendingPayments: 45, // Number of scheduled payments
  pendingAmount: 8750000, // R 8.75M pending payments
  overduePayments: 12, // Number of overdue payments
  overdueAmount: 1250000, // R 1.25M overdue amount
  bankFeesPaid: 12580, // R 12,580 in bank transfer fees
  vatPaid: 5737500, // R 5.737M in VAT payments
};
