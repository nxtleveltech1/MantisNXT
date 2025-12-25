// UPDATE: [2025-12-25] Created document type registry for all platform document types

/**
 * DocuStore Document Type Registry
 * 
 * Centralized registry of all document types generated across the platform.
 * Each module that produces documents is represented here.
 */

// ============================================================================
// Document Type Constants
// ============================================================================

export const DOCUMENT_TYPES = {
  // Sales Module
  QUOTATION: 'quotation',
  SALES_INVOICE: 'sales_invoice',
  PROFORMA_INVOICE: 'proforma_invoice',
  SALES_ORDER: 'sales_order',
  CREDIT_NOTE: 'credit_note',
  
  // Rentals Module
  RENTAL_AGREEMENT: 'rental_agreement',
  RENTAL_INVOICE: 'rental_invoice',
  RENTAL_QUOTE: 'rental_quote',
  
  // Repairs Module
  REPAIR_ORDER: 'repair_order',
  REPAIR_INVOICE: 'repair_invoice',
  REPAIR_ESTIMATE: 'repair_estimate',
  
  // Purchase Orders Module
  PURCHASE_ORDER: 'purchase_order',
  GOODS_RECEIVED_NOTE: 'goods_received_note',
  
  // Accounts Receivable (AR) Module
  AR_INVOICE: 'ar_invoice',
  PAYMENT_RECEIPT: 'payment_receipt',
  AR_CREDIT_NOTE: 'ar_credit_note',
  AR_AGING_REPORT: 'ar_aging_report',
  CUSTOMER_STATEMENT: 'customer_statement',
  
  // Accounts Payable (AP) Module
  AP_INVOICE: 'ap_invoice',
  PAYMENT_VOUCHER: 'payment_voucher',
  AP_CREDIT_NOTE: 'ap_credit_note',
  AP_AGING_REPORT: 'ap_aging_report',
  SUPPLIER_STATEMENT: 'supplier_statement',
  
  // General Ledger (GL) Module
  JOURNAL_ENTRY: 'journal_entry',
  TRIAL_BALANCE: 'trial_balance',
  ACCOUNT_STATEMENT: 'account_statement',
  
  // Financial Reports Module
  BALANCE_SHEET: 'balance_sheet',
  INCOME_STATEMENT: 'income_statement',
  CASH_FLOW_STATEMENT: 'cash_flow_statement',
  BUDGET_REPORT: 'budget_report',
  VARIANCE_REPORT: 'variance_report',
  
  // Tax Module
  TAX_RETURN: 'tax_return',
  TAX_REPORT: 'tax_report',
  VAT_RECONCILIATION: 'vat_reconciliation',
  
  // Logistics Module
  DELIVERY_NOTE: 'delivery_note',
  SHIPPING_LABEL: 'shipping_label',
  PACKING_SLIP: 'packing_slip',
  LOGISTICS_REPORT: 'logistics_report',
  
  // Inventory Module
  STOCK_ADJUSTMENT: 'stock_adjustment',
  STOCK_TAKE_REPORT: 'stock_take_report',
  INVENTORY_VALUATION: 'inventory_valuation',
  INVENTORY_REPORT: 'inventory_report',
  
  // Customer Module
  CUSTOMER_PROFILE: 'customer_profile',
  
  // Loyalty Module
  REDEMPTION_RECEIPT: 'redemption_receipt',
  REWARD_CERTIFICATE: 'reward_certificate',
  LOYALTY_STATEMENT: 'loyalty_statement',
  
  // Assets Module
  ASSET_REGISTER: 'asset_register',
  DEPRECIATION_SCHEDULE: 'depreciation_schedule',
  ASSET_DISPOSAL_REPORT: 'asset_disposal_report',
  
  // Project Management Module
  PROJECT_REPORT: 'project_report',
  TIMESHEET_REPORT: 'timesheet_report',
  MILESTONE_REPORT: 'milestone_report',
  
  // Integration Reports
  SYNC_REPORT: 'sync_report',
  INTEGRATION_LOG: 'integration_log',
  
  // Analytics & Reports
  ANALYTICS_REPORT: 'analytics_report',
  CUSTOM_REPORT: 'custom_report',
  
  // DocuStore Internal
  DOCUSTORE_RECORD: 'docustore_record',
  AUDIT_PACK: 'audit_pack',
} as const;

export type DocumentType = typeof DOCUMENT_TYPES[keyof typeof DOCUMENT_TYPES];

// ============================================================================
// Document Category Mapping
// ============================================================================

export const DOCUMENT_CATEGORIES = {
  SALES: 'Sales',
  RENTALS: 'Rentals',
  REPAIRS: 'Repairs',
  PURCHASING: 'Purchasing',
  ACCOUNTS_RECEIVABLE: 'Accounts Receivable',
  ACCOUNTS_PAYABLE: 'Accounts Payable',
  GENERAL_LEDGER: 'General Ledger',
  FINANCIAL_REPORTS: 'Financial Reports',
  TAX: 'Tax',
  LOGISTICS: 'Logistics',
  INVENTORY: 'Inventory',
  CUSTOMERS: 'Customers',
  LOYALTY: 'Loyalty',
  ASSETS: 'Assets',
  PROJECTS: 'Projects',
  INTEGRATIONS: 'Integrations',
  ANALYTICS: 'Analytics',
  DOCUSTORE: 'DocuStore',
} as const;

export type DocumentCategory = typeof DOCUMENT_CATEGORIES[keyof typeof DOCUMENT_CATEGORIES];

// ============================================================================
// Document Type Metadata
// ============================================================================

export interface DocumentTypeInfo {
  type: DocumentType;
  label: string;
  category: DocumentCategory;
  description: string;
  icon: string; // Lucide icon name
  entityType: string; // Primary entity type for linking
  supportsVersioning: boolean;
  requiresSignature: boolean;
}

export const DOCUMENT_TYPE_INFO: Record<DocumentType, DocumentTypeInfo> = {
  // Sales
  [DOCUMENT_TYPES.QUOTATION]: {
    type: DOCUMENT_TYPES.QUOTATION,
    label: 'Quotation',
    category: DOCUMENT_CATEGORIES.SALES,
    description: 'Sales quotation document',
    icon: 'FileText',
    entityType: 'quotation',
    supportsVersioning: true,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.SALES_INVOICE]: {
    type: DOCUMENT_TYPES.SALES_INVOICE,
    label: 'Sales Invoice',
    category: DOCUMENT_CATEGORIES.SALES,
    description: 'Sales invoice document',
    icon: 'Receipt',
    entityType: 'sales_invoice',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.PROFORMA_INVOICE]: {
    type: DOCUMENT_TYPES.PROFORMA_INVOICE,
    label: 'Proforma Invoice',
    category: DOCUMENT_CATEGORIES.SALES,
    description: 'Proforma invoice document',
    icon: 'FileText',
    entityType: 'proforma_invoice',
    supportsVersioning: true,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.SALES_ORDER]: {
    type: DOCUMENT_TYPES.SALES_ORDER,
    label: 'Sales Order',
    category: DOCUMENT_CATEGORIES.SALES,
    description: 'Sales order confirmation',
    icon: 'ShoppingCart',
    entityType: 'sales_order',
    supportsVersioning: true,
    requiresSignature: true,
  },
  [DOCUMENT_TYPES.CREDIT_NOTE]: {
    type: DOCUMENT_TYPES.CREDIT_NOTE,
    label: 'Credit Note',
    category: DOCUMENT_CATEGORIES.SALES,
    description: 'Sales credit note',
    icon: 'FileText',
    entityType: 'credit_note',
    supportsVersioning: false,
    requiresSignature: false,
  },
  
  // Rentals
  [DOCUMENT_TYPES.RENTAL_AGREEMENT]: {
    type: DOCUMENT_TYPES.RENTAL_AGREEMENT,
    label: 'Rental Agreement',
    category: DOCUMENT_CATEGORIES.RENTALS,
    description: 'Equipment rental agreement',
    icon: 'FileSignature',
    entityType: 'rental_agreement',
    supportsVersioning: true,
    requiresSignature: true,
  },
  [DOCUMENT_TYPES.RENTAL_INVOICE]: {
    type: DOCUMENT_TYPES.RENTAL_INVOICE,
    label: 'Rental Invoice',
    category: DOCUMENT_CATEGORIES.RENTALS,
    description: 'Rental invoice document',
    icon: 'Receipt',
    entityType: 'rental_invoice',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.RENTAL_QUOTE]: {
    type: DOCUMENT_TYPES.RENTAL_QUOTE,
    label: 'Rental Quote',
    category: DOCUMENT_CATEGORIES.RENTALS,
    description: 'Rental quotation',
    icon: 'FileText',
    entityType: 'rental_quote',
    supportsVersioning: true,
    requiresSignature: false,
  },
  
  // Repairs
  [DOCUMENT_TYPES.REPAIR_ORDER]: {
    type: DOCUMENT_TYPES.REPAIR_ORDER,
    label: 'Repair Order',
    category: DOCUMENT_CATEGORIES.REPAIRS,
    description: 'Repair work order',
    icon: 'Wrench',
    entityType: 'repair_order',
    supportsVersioning: true,
    requiresSignature: true,
  },
  [DOCUMENT_TYPES.REPAIR_INVOICE]: {
    type: DOCUMENT_TYPES.REPAIR_INVOICE,
    label: 'Repair Invoice',
    category: DOCUMENT_CATEGORIES.REPAIRS,
    description: 'Repair service invoice',
    icon: 'Receipt',
    entityType: 'repair_invoice',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.REPAIR_ESTIMATE]: {
    type: DOCUMENT_TYPES.REPAIR_ESTIMATE,
    label: 'Repair Estimate',
    category: DOCUMENT_CATEGORIES.REPAIRS,
    description: 'Repair cost estimate',
    icon: 'Calculator',
    entityType: 'repair_estimate',
    supportsVersioning: true,
    requiresSignature: false,
  },
  
  // Purchase Orders
  [DOCUMENT_TYPES.PURCHASE_ORDER]: {
    type: DOCUMENT_TYPES.PURCHASE_ORDER,
    label: 'Purchase Order',
    category: DOCUMENT_CATEGORIES.PURCHASING,
    description: 'Purchase order document',
    icon: 'ShoppingBag',
    entityType: 'purchase_order',
    supportsVersioning: true,
    requiresSignature: true,
  },
  [DOCUMENT_TYPES.GOODS_RECEIVED_NOTE]: {
    type: DOCUMENT_TYPES.GOODS_RECEIVED_NOTE,
    label: 'Goods Received Note',
    category: DOCUMENT_CATEGORIES.PURCHASING,
    description: 'GRN document',
    icon: 'PackageCheck',
    entityType: 'grn',
    supportsVersioning: false,
    requiresSignature: false,
  },
  
  // Accounts Receivable
  [DOCUMENT_TYPES.AR_INVOICE]: {
    type: DOCUMENT_TYPES.AR_INVOICE,
    label: 'AR Invoice',
    category: DOCUMENT_CATEGORIES.ACCOUNTS_RECEIVABLE,
    description: 'Accounts receivable invoice',
    icon: 'Receipt',
    entityType: 'ar_invoice',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.PAYMENT_RECEIPT]: {
    type: DOCUMENT_TYPES.PAYMENT_RECEIPT,
    label: 'Payment Receipt',
    category: DOCUMENT_CATEGORIES.ACCOUNTS_RECEIVABLE,
    description: 'Customer payment receipt',
    icon: 'CreditCard',
    entityType: 'payment_receipt',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.AR_CREDIT_NOTE]: {
    type: DOCUMENT_TYPES.AR_CREDIT_NOTE,
    label: 'AR Credit Note',
    category: DOCUMENT_CATEGORIES.ACCOUNTS_RECEIVABLE,
    description: 'AR credit note',
    icon: 'FileText',
    entityType: 'ar_credit_note',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.AR_AGING_REPORT]: {
    type: DOCUMENT_TYPES.AR_AGING_REPORT,
    label: 'AR Aging Report',
    category: DOCUMENT_CATEGORIES.ACCOUNTS_RECEIVABLE,
    description: 'Accounts receivable aging report',
    icon: 'BarChart3',
    entityType: 'ar_aging',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.CUSTOMER_STATEMENT]: {
    type: DOCUMENT_TYPES.CUSTOMER_STATEMENT,
    label: 'Customer Statement',
    category: DOCUMENT_CATEGORIES.ACCOUNTS_RECEIVABLE,
    description: 'Customer account statement',
    icon: 'FileText',
    entityType: 'customer',
    supportsVersioning: false,
    requiresSignature: false,
  },
  
  // Accounts Payable
  [DOCUMENT_TYPES.AP_INVOICE]: {
    type: DOCUMENT_TYPES.AP_INVOICE,
    label: 'AP Invoice',
    category: DOCUMENT_CATEGORIES.ACCOUNTS_PAYABLE,
    description: 'Accounts payable invoice',
    icon: 'Receipt',
    entityType: 'ap_invoice',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.PAYMENT_VOUCHER]: {
    type: DOCUMENT_TYPES.PAYMENT_VOUCHER,
    label: 'Payment Voucher',
    category: DOCUMENT_CATEGORIES.ACCOUNTS_PAYABLE,
    description: 'Supplier payment voucher',
    icon: 'CreditCard',
    entityType: 'payment_voucher',
    supportsVersioning: false,
    requiresSignature: true,
  },
  [DOCUMENT_TYPES.AP_CREDIT_NOTE]: {
    type: DOCUMENT_TYPES.AP_CREDIT_NOTE,
    label: 'AP Credit Note',
    category: DOCUMENT_CATEGORIES.ACCOUNTS_PAYABLE,
    description: 'AP credit note',
    icon: 'FileText',
    entityType: 'ap_credit_note',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.AP_AGING_REPORT]: {
    type: DOCUMENT_TYPES.AP_AGING_REPORT,
    label: 'AP Aging Report',
    category: DOCUMENT_CATEGORIES.ACCOUNTS_PAYABLE,
    description: 'Accounts payable aging report',
    icon: 'BarChart3',
    entityType: 'ap_aging',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.SUPPLIER_STATEMENT]: {
    type: DOCUMENT_TYPES.SUPPLIER_STATEMENT,
    label: 'Supplier Statement',
    category: DOCUMENT_CATEGORIES.ACCOUNTS_PAYABLE,
    description: 'Supplier account statement',
    icon: 'FileText',
    entityType: 'supplier',
    supportsVersioning: false,
    requiresSignature: false,
  },
  
  // General Ledger
  [DOCUMENT_TYPES.JOURNAL_ENTRY]: {
    type: DOCUMENT_TYPES.JOURNAL_ENTRY,
    label: 'Journal Entry',
    category: DOCUMENT_CATEGORIES.GENERAL_LEDGER,
    description: 'GL journal entry document',
    icon: 'BookOpen',
    entityType: 'journal_entry',
    supportsVersioning: false,
    requiresSignature: true,
  },
  [DOCUMENT_TYPES.TRIAL_BALANCE]: {
    type: DOCUMENT_TYPES.TRIAL_BALANCE,
    label: 'Trial Balance',
    category: DOCUMENT_CATEGORIES.GENERAL_LEDGER,
    description: 'Trial balance report',
    icon: 'Scale',
    entityType: 'trial_balance',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.ACCOUNT_STATEMENT]: {
    type: DOCUMENT_TYPES.ACCOUNT_STATEMENT,
    label: 'Account Statement',
    category: DOCUMENT_CATEGORIES.GENERAL_LEDGER,
    description: 'GL account statement',
    icon: 'FileText',
    entityType: 'gl_account',
    supportsVersioning: false,
    requiresSignature: false,
  },
  
  // Financial Reports
  [DOCUMENT_TYPES.BALANCE_SHEET]: {
    type: DOCUMENT_TYPES.BALANCE_SHEET,
    label: 'Balance Sheet',
    category: DOCUMENT_CATEGORIES.FINANCIAL_REPORTS,
    description: 'Balance sheet report',
    icon: 'PieChart',
    entityType: 'balance_sheet',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.INCOME_STATEMENT]: {
    type: DOCUMENT_TYPES.INCOME_STATEMENT,
    label: 'Income Statement',
    category: DOCUMENT_CATEGORIES.FINANCIAL_REPORTS,
    description: 'Profit & loss statement',
    icon: 'TrendingUp',
    entityType: 'income_statement',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.CASH_FLOW_STATEMENT]: {
    type: DOCUMENT_TYPES.CASH_FLOW_STATEMENT,
    label: 'Cash Flow Statement',
    category: DOCUMENT_CATEGORIES.FINANCIAL_REPORTS,
    description: 'Cash flow report',
    icon: 'ArrowRightLeft',
    entityType: 'cash_flow',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.BUDGET_REPORT]: {
    type: DOCUMENT_TYPES.BUDGET_REPORT,
    label: 'Budget Report',
    category: DOCUMENT_CATEGORIES.FINANCIAL_REPORTS,
    description: 'Budget analysis report',
    icon: 'Target',
    entityType: 'budget',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.VARIANCE_REPORT]: {
    type: DOCUMENT_TYPES.VARIANCE_REPORT,
    label: 'Variance Report',
    category: DOCUMENT_CATEGORIES.FINANCIAL_REPORTS,
    description: 'Budget variance report',
    icon: 'GitCompare',
    entityType: 'variance',
    supportsVersioning: false,
    requiresSignature: false,
  },
  
  // Tax
  [DOCUMENT_TYPES.TAX_RETURN]: {
    type: DOCUMENT_TYPES.TAX_RETURN,
    label: 'Tax Return',
    category: DOCUMENT_CATEGORIES.TAX,
    description: 'Tax return document',
    icon: 'FileStack',
    entityType: 'tax_return',
    supportsVersioning: true,
    requiresSignature: true,
  },
  [DOCUMENT_TYPES.TAX_REPORT]: {
    type: DOCUMENT_TYPES.TAX_REPORT,
    label: 'Tax Report',
    category: DOCUMENT_CATEGORIES.TAX,
    description: 'Tax summary report',
    icon: 'FileText',
    entityType: 'tax_report',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.VAT_RECONCILIATION]: {
    type: DOCUMENT_TYPES.VAT_RECONCILIATION,
    label: 'VAT Reconciliation',
    category: DOCUMENT_CATEGORIES.TAX,
    description: 'VAT reconciliation report',
    icon: 'Calculator',
    entityType: 'vat_reconciliation',
    supportsVersioning: false,
    requiresSignature: false,
  },
  
  // Logistics
  [DOCUMENT_TYPES.DELIVERY_NOTE]: {
    type: DOCUMENT_TYPES.DELIVERY_NOTE,
    label: 'Delivery Note',
    category: DOCUMENT_CATEGORIES.LOGISTICS,
    description: 'Delivery note document',
    icon: 'Truck',
    entityType: 'delivery',
    supportsVersioning: false,
    requiresSignature: true,
  },
  [DOCUMENT_TYPES.SHIPPING_LABEL]: {
    type: DOCUMENT_TYPES.SHIPPING_LABEL,
    label: 'Shipping Label',
    category: DOCUMENT_CATEGORIES.LOGISTICS,
    description: 'Shipping label',
    icon: 'Tag',
    entityType: 'delivery',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.PACKING_SLIP]: {
    type: DOCUMENT_TYPES.PACKING_SLIP,
    label: 'Packing Slip',
    category: DOCUMENT_CATEGORIES.LOGISTICS,
    description: 'Packing slip document',
    icon: 'Package',
    entityType: 'delivery',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.LOGISTICS_REPORT]: {
    type: DOCUMENT_TYPES.LOGISTICS_REPORT,
    label: 'Logistics Report',
    category: DOCUMENT_CATEGORIES.LOGISTICS,
    description: 'Logistics summary report',
    icon: 'BarChart3',
    entityType: 'logistics_report',
    supportsVersioning: false,
    requiresSignature: false,
  },
  
  // Inventory
  [DOCUMENT_TYPES.STOCK_ADJUSTMENT]: {
    type: DOCUMENT_TYPES.STOCK_ADJUSTMENT,
    label: 'Stock Adjustment',
    category: DOCUMENT_CATEGORIES.INVENTORY,
    description: 'Inventory adjustment document',
    icon: 'PackagePlus',
    entityType: 'stock_adjustment',
    supportsVersioning: false,
    requiresSignature: true,
  },
  [DOCUMENT_TYPES.STOCK_TAKE_REPORT]: {
    type: DOCUMENT_TYPES.STOCK_TAKE_REPORT,
    label: 'Stock Take Report',
    category: DOCUMENT_CATEGORIES.INVENTORY,
    description: 'Physical count report',
    icon: 'ClipboardList',
    entityType: 'stock_take',
    supportsVersioning: false,
    requiresSignature: true,
  },
  [DOCUMENT_TYPES.INVENTORY_VALUATION]: {
    type: DOCUMENT_TYPES.INVENTORY_VALUATION,
    label: 'Inventory Valuation',
    category: DOCUMENT_CATEGORIES.INVENTORY,
    description: 'Inventory valuation report',
    icon: 'DollarSign',
    entityType: 'inventory_valuation',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.INVENTORY_REPORT]: {
    type: DOCUMENT_TYPES.INVENTORY_REPORT,
    label: 'Inventory Report',
    category: DOCUMENT_CATEGORIES.INVENTORY,
    description: 'Inventory summary report',
    icon: 'BarChart3',
    entityType: 'inventory_report',
    supportsVersioning: false,
    requiresSignature: false,
  },
  
  // Customers
  [DOCUMENT_TYPES.CUSTOMER_PROFILE]: {
    type: DOCUMENT_TYPES.CUSTOMER_PROFILE,
    label: 'Customer Profile',
    category: DOCUMENT_CATEGORIES.CUSTOMERS,
    description: 'Customer profile document',
    icon: 'User',
    entityType: 'customer',
    supportsVersioning: false,
    requiresSignature: false,
  },
  
  // Loyalty
  [DOCUMENT_TYPES.REDEMPTION_RECEIPT]: {
    type: DOCUMENT_TYPES.REDEMPTION_RECEIPT,
    label: 'Redemption Receipt',
    category: DOCUMENT_CATEGORIES.LOYALTY,
    description: 'Loyalty points redemption receipt',
    icon: 'Gift',
    entityType: 'redemption',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.REWARD_CERTIFICATE]: {
    type: DOCUMENT_TYPES.REWARD_CERTIFICATE,
    label: 'Reward Certificate',
    category: DOCUMENT_CATEGORIES.LOYALTY,
    description: 'Loyalty reward certificate',
    icon: 'Award',
    entityType: 'reward',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.LOYALTY_STATEMENT]: {
    type: DOCUMENT_TYPES.LOYALTY_STATEMENT,
    label: 'Loyalty Statement',
    category: DOCUMENT_CATEGORIES.LOYALTY,
    description: 'Loyalty program statement',
    icon: 'Star',
    entityType: 'loyalty_account',
    supportsVersioning: false,
    requiresSignature: false,
  },
  
  // Assets
  [DOCUMENT_TYPES.ASSET_REGISTER]: {
    type: DOCUMENT_TYPES.ASSET_REGISTER,
    label: 'Asset Register',
    category: DOCUMENT_CATEGORIES.ASSETS,
    description: 'Fixed asset register',
    icon: 'Building2',
    entityType: 'asset_register',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.DEPRECIATION_SCHEDULE]: {
    type: DOCUMENT_TYPES.DEPRECIATION_SCHEDULE,
    label: 'Depreciation Schedule',
    category: DOCUMENT_CATEGORIES.ASSETS,
    description: 'Asset depreciation schedule',
    icon: 'TrendingDown',
    entityType: 'depreciation',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.ASSET_DISPOSAL_REPORT]: {
    type: DOCUMENT_TYPES.ASSET_DISPOSAL_REPORT,
    label: 'Asset Disposal Report',
    category: DOCUMENT_CATEGORIES.ASSETS,
    description: 'Asset disposal documentation',
    icon: 'Trash2',
    entityType: 'disposal',
    supportsVersioning: false,
    requiresSignature: true,
  },
  
  // Projects
  [DOCUMENT_TYPES.PROJECT_REPORT]: {
    type: DOCUMENT_TYPES.PROJECT_REPORT,
    label: 'Project Report',
    category: DOCUMENT_CATEGORIES.PROJECTS,
    description: 'Project status report',
    icon: 'FolderKanban',
    entityType: 'project',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.TIMESHEET_REPORT]: {
    type: DOCUMENT_TYPES.TIMESHEET_REPORT,
    label: 'Timesheet Report',
    category: DOCUMENT_CATEGORIES.PROJECTS,
    description: 'Time tracking report',
    icon: 'Clock',
    entityType: 'timesheet',
    supportsVersioning: false,
    requiresSignature: true,
  },
  [DOCUMENT_TYPES.MILESTONE_REPORT]: {
    type: DOCUMENT_TYPES.MILESTONE_REPORT,
    label: 'Milestone Report',
    category: DOCUMENT_CATEGORIES.PROJECTS,
    description: 'Project milestone report',
    icon: 'Flag',
    entityType: 'milestone',
    supportsVersioning: false,
    requiresSignature: false,
  },
  
  // Integrations
  [DOCUMENT_TYPES.SYNC_REPORT]: {
    type: DOCUMENT_TYPES.SYNC_REPORT,
    label: 'Sync Report',
    category: DOCUMENT_CATEGORIES.INTEGRATIONS,
    description: 'Integration sync report',
    icon: 'RefreshCcw',
    entityType: 'sync',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.INTEGRATION_LOG]: {
    type: DOCUMENT_TYPES.INTEGRATION_LOG,
    label: 'Integration Log',
    category: DOCUMENT_CATEGORIES.INTEGRATIONS,
    description: 'Integration activity log',
    icon: 'FileJson',
    entityType: 'integration',
    supportsVersioning: false,
    requiresSignature: false,
  },
  
  // Analytics
  [DOCUMENT_TYPES.ANALYTICS_REPORT]: {
    type: DOCUMENT_TYPES.ANALYTICS_REPORT,
    label: 'Analytics Report',
    category: DOCUMENT_CATEGORIES.ANALYTICS,
    description: 'Business analytics report',
    icon: 'LineChart',
    entityType: 'analytics',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.CUSTOM_REPORT]: {
    type: DOCUMENT_TYPES.CUSTOM_REPORT,
    label: 'Custom Report',
    category: DOCUMENT_CATEGORIES.ANALYTICS,
    description: 'Custom generated report',
    icon: 'FileSpreadsheet',
    entityType: 'custom_report',
    supportsVersioning: true,
    requiresSignature: false,
  },
  
  // DocuStore Internal
  [DOCUMENT_TYPES.DOCUSTORE_RECORD]: {
    type: DOCUMENT_TYPES.DOCUSTORE_RECORD,
    label: 'DocuStore Record',
    category: DOCUMENT_CATEGORIES.DOCUSTORE,
    description: 'Document record with metadata',
    icon: 'FileArchive',
    entityType: 'document',
    supportsVersioning: false,
    requiresSignature: false,
  },
  [DOCUMENT_TYPES.AUDIT_PACK]: {
    type: DOCUMENT_TYPES.AUDIT_PACK,
    label: 'Audit Pack',
    category: DOCUMENT_CATEGORIES.DOCUSTORE,
    description: 'Consolidated audit package',
    icon: 'FolderArchive',
    entityType: 'entity',
    supportsVersioning: false,
    requiresSignature: false,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get document type info by type
 */
export function getDocumentTypeInfo(type: DocumentType): DocumentTypeInfo {
  return DOCUMENT_TYPE_INFO[type];
}

/**
 * Get all document types for a category
 */
export function getDocumentTypesByCategory(category: DocumentCategory): DocumentTypeInfo[] {
  return Object.values(DOCUMENT_TYPE_INFO).filter(info => info.category === category);
}

/**
 * Get all categories with their document types
 */
export function getAllCategoriesWithTypes(): Map<DocumentCategory, DocumentTypeInfo[]> {
  const map = new Map<DocumentCategory, DocumentTypeInfo[]>();
  
  for (const category of Object.values(DOCUMENT_CATEGORIES)) {
    map.set(category, getDocumentTypesByCategory(category));
  }
  
  return map;
}

/**
 * Check if a string is a valid document type
 */
export function isValidDocumentType(type: string): type is DocumentType {
  return Object.values(DOCUMENT_TYPES).includes(type as DocumentType);
}

