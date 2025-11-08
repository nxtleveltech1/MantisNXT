// Supplier Management System Constants

export const SUPPLIER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
} as const;

export const SUPPLIER_TIER = {
  STRATEGIC: 'strategic',
  PREFERRED: 'preferred',
  APPROVED: 'approved',
  CONDITIONAL: 'conditional',
} as const;

export const CONTACT_TYPES = {
  PRIMARY: 'primary',
  BILLING: 'billing',
  TECHNICAL: 'technical',
  SALES: 'sales',
  SUPPORT: 'support',
} as const;

export const ADDRESS_TYPES = {
  HEADQUARTERS: 'headquarters',
  BILLING: 'billing',
  SHIPPING: 'shipping',
  WAREHOUSE: 'warehouse',
  MANUFACTURING: 'manufacturing',
} as const;

export const CERTIFICATION_TYPES = {
  QUALITY: 'quality',
  ENVIRONMENTAL: 'environmental',
  SAFETY: 'safety',
  SECURITY: 'security',
  INDUSTRY: 'industry',
} as const;

export const PO_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  ACKNOWLEDGED: 'acknowledged',
  IN_PROGRESS: 'in_progress',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const PO_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export const CONTRACT_TYPES = {
  MASTER_AGREEMENT: 'master_agreement',
  SERVICE_AGREEMENT: 'service_agreement',
  PURCHASE_AGREEMENT: 'purchase_agreement',
  NDA: 'nda',
  FRAMEWORK: 'framework',
  OTHER: 'other',
} as const;

export const CONTRACT_STATUS = {
  DRAFT: 'draft',
  REVIEW: 'review',
  NEGOTIATION: 'negotiation',
  APPROVED: 'approved',
  SIGNED: 'signed',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  TERMINATED: 'terminated',
} as const;

export const COMMUNICATION_TYPES = {
  EMAIL: 'email',
  PHONE: 'phone',
  MEETING: 'meeting',
  NOTE: 'note',
  SYSTEM: 'system',
} as const;

export const COMMUNICATION_CATEGORIES = {
  GENERAL: 'general',
  ORDER: 'order',
  QUALITY: 'quality',
  DELIVERY: 'delivery',
  PAYMENT: 'payment',
  CONTRACT: 'contract',
  SUPPORT: 'support',
} as const;

export const COMMUNICATION_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

/**
 * Product categories for suppliers
 * Based on Pro Audio and similar supplier categories
 * Used for supplier categorization, filtering, and AI extraction
 */
export const SUPPLIER_PRODUCT_CATEGORIES = [
  'DJ Equipment',
  'Mixers',
  'Musical Instruments',
  'Studio Microphones',
  'Turntables',
  'Headphones',
  'Speakers',
  'Audio Interfaces',
  'Studio Monitors',
  'Recording Equipment',
  'Live Sound Equipment',
  'Lighting Equipment',
  'Cables & Accessories',
  'Software',
  'Controllers',
  'Synthesizers',
  'Keyboards',
  'Guitars & Basses',
  'Drums & Percussion',
  'Wind Instruments',
  'String Instruments',
  'Amplifiers',
  'Effects & Pedals',
  'Cases & Bags',
  'Other',
] as const;

export type SupplierProductCategory = (typeof SUPPLIER_PRODUCT_CATEGORIES)[number];

export const INVOICE_STATUS = {
  RECEIVED: 'received',
  APPROVED: 'approved',
  DISPUTED: 'disputed',
  PAID: 'paid',
  OVERDUE: 'overdue',
} as const;

export const PAYMENT_METHODS = {
  BANK_TRANSFER: 'bank_transfer',
  CHECK: 'check',
  CREDIT_CARD: 'credit_card',
  ACH: 'ach',
  WIRE: 'wire',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSED: 'processed',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

// UI Constants
export const ITEMS_PER_PAGE = 10;
export const ITEMS_PER_PAGE_OPTIONS = [5, 10, 25, 50, 100];

export const DATE_FORMATS = {
  SHORT: 'MMM dd, yyyy',
  LONG: 'MMMM dd, yyyy',
  DATETIME: 'MMM dd, yyyy HH:mm',
  TIME: 'HH:mm',
} as const;

// Performance Thresholds
export const PERFORMANCE_THRESHOLDS = {
  EXCELLENT: 4.5,
  GOOD: 3.5,
  AVERAGE: 2.5,
  POOR: 1.5,
} as const;

export const DELIVERY_THRESHOLDS = {
  EXCELLENT: 95, // 95% on-time delivery
  GOOD: 85,
  AVERAGE: 75,
  POOR: 65,
} as const;

export const QUALITY_THRESHOLDS = {
  EXCELLENT: 99, // 99% quality acceptance
  GOOD: 95,
  AVERAGE: 90,
  POOR: 85,
} as const;

// Colors for status indicators
export const STATUS_COLORS = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  PENDING: 'yellow',
  SUSPENDED: 'red',
  DRAFT: 'gray',
  SENT: 'blue',
  ACKNOWLEDGED: 'cyan',
  IN_PROGRESS: 'orange',
  SHIPPED: 'purple',
  DELIVERED: 'green',
  COMPLETED: 'green',
  CANCELLED: 'red',
  APPROVED: 'green',
  REJECTED: 'red',
  REVIEW: 'yellow',
  NEGOTIATION: 'orange',
  SIGNED: 'green',
  EXPIRED: 'red',
  TERMINATED: 'red',
} as const;

// File upload constraints
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'text/csv',
  ],
  EXTENSIONS: [
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.txt',
    '.csv',
  ],
} as const;

// Validation constraints
export const VALIDATION = {
  SUPPLIER_NAME_MIN: 2,
  SUPPLIER_NAME_MAX: 100,
  SUPPLIER_CODE_MIN: 3,
  SUPPLIER_CODE_MAX: 20,
  CONTACT_NAME_MIN: 2,
  CONTACT_NAME_MAX: 50,
  PHONE_MIN: 10,
  PHONE_MAX: 15,
  ADDRESS_MIN: 5,
  ADDRESS_MAX: 100,
  DESCRIPTION_MIN: 10,
  DESCRIPTION_MAX: 1000,
  NOTES_MAX: 2000,
  TAX_ID_MIN: 9,
  TAX_ID_MAX: 20,
} as const;

// Default values - Updated for South Africa
export const DEFAULTS = {
  CURRENCY: 'ZAR',
  COUNTRY: 'ZA',
  LANGUAGE: 'en-ZA',
  TIMEZONE: 'Africa/Johannesburg',
  PAYMENT_TERMS: '30',
  TERMINATION_NOTICE: 30,
  RENEWAL_PERIOD: 12,
  VAT_RATE: 0.15,
} as const;

// API endpoints (if using REST API)
export const API_ENDPOINTS = {
  SUPPLIERS: '/api/suppliers',
  PURCHASE_ORDERS: '/api/purchase-orders',
  COMMUNICATIONS: '/api/communications',
  FINANCIALS: '/api/financials',
  DOCUMENTS: '/api/documents',
  DASHBOARD: '/api/dashboard',
} as const;

// Navigation menu items
export const NAVIGATION_ITEMS = [
  {
    label: 'Dashboard',
    href: '/',
    icon: 'LayoutDashboard',
  },
  {
    label: 'Suppliers',
    href: '/suppliers',
    icon: 'Building2',
    children: [
      { label: 'All Suppliers', href: '/suppliers' },
      { label: 'Add Supplier', href: '/suppliers/new' },
    ],
  },
  {
    label: 'Purchase Orders',
    href: '/purchase-orders',
    icon: 'ShoppingCart',
    children: [
      { label: 'All Orders', href: '/purchase-orders' },
      { label: 'Create Order', href: '/purchase-orders/new' },
    ],
  },
  {
    label: 'Communications',
    href: '/communications',
    icon: 'MessageSquare',
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: 'BarChart3',
  },
  {
    label: 'Financials',
    href: '/financials',
    icon: 'DollarSign',
  },
] as const;

// Chart colors for analytics
export const CHART_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
  '#F97316', // orange-500
] as const;

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const;

// Export helper functions
export const getStatusColor = (status: string): string => {
  return STATUS_COLORS[status.toUpperCase() as keyof typeof STATUS_COLORS] || 'gray';
};

export const getPerformanceLevel = (rating: number): string => {
  if (rating >= PERFORMANCE_THRESHOLDS.EXCELLENT) return 'Excellent';
  if (rating >= PERFORMANCE_THRESHOLDS.GOOD) return 'Good';
  if (rating >= PERFORMANCE_THRESHOLDS.AVERAGE) return 'Average';
  return 'Poor';
};

export const getDeliveryPerformanceLevel = (rate: number): string => {
  if (rate >= DELIVERY_THRESHOLDS.EXCELLENT) return 'Excellent';
  if (rate >= DELIVERY_THRESHOLDS.GOOD) return 'Good';
  if (rate >= DELIVERY_THRESHOLDS.AVERAGE) return 'Average';
  return 'Poor';
};

export const getQualityPerformanceLevel = (rate: number): string => {
  if (rate >= QUALITY_THRESHOLDS.EXCELLENT) return 'Excellent';
  if (rate >= QUALITY_THRESHOLDS.GOOD) return 'Good';
  if (rate >= QUALITY_THRESHOLDS.AVERAGE) return 'Average';
  return 'Poor';
};
