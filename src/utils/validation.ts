import { z } from 'zod';
import type { SupplierFormContact, SupplierFormData } from '@/types/supplier';

type ValidationErrorNode = Record<string, unknown>;

const isRecord = (value: unknown): value is ValidationErrorNode =>
  typeof value === 'object' && value !== null;

// Supplier validation schemas
export const SupplierContactSchema = z.object({
  type: z.enum(['primary', 'billing', 'technical', 'sales', 'support']),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  title: z.string().min(1, 'Title is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  mobile: z.string().optional(),
  department: z.string().optional(),
  isPrimary: z.boolean(),
  isActive: z.boolean(),
});

export const SupplierAddressSchema = z.object({
  type: z.enum(['headquarters', 'billing', 'shipping', 'warehouse', 'manufacturing']),
  name: z.string().optional(),
  addressLine1: z.string().min(5, 'Address line 1 is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(5, 'Postal code is required'),
  country: z.string().min(2, 'Country is required'),
  isPrimary: z.boolean(),
  isActive: z.boolean(),
});

export const SupplierBusinessInfoSchema = z.object({
  legalName: z.string().min(2, 'Legal name is required'),
  tradingName: z.string().optional(),
  taxId: z.string().min(9, 'Tax ID is required'),
  registrationNumber: z.string().min(1, 'Registration number is required'),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  foundedYear: z.number().min(1800).max(new Date().getFullYear()).optional(),
  employeeCount: z.number().min(1).optional(),
  annualRevenue: z.number().min(0).optional(),
  currency: z.string().length(3, 'Currency must be 3 characters'),
});

export const SupplierSchema = z.object({
  name: z.string().min(2, 'Supplier name must be at least 2 characters'),
  code: z.string().min(3, 'Supplier code must be at least 3 characters'),
  status: z.enum(['active', 'inactive', 'pending', 'suspended']),
  tier: z.enum(['strategic', 'preferred', 'approved', 'conditional']),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).default([]),
  contacts: z.array(SupplierContactSchema).min(1, 'At least one contact is required'),
  addresses: z.array(SupplierAddressSchema).min(1, 'At least one address is required'),
  businessInfo: SupplierBusinessInfoSchema,
  notes: z.string().optional(),
});

// Purchase Order validation schemas
export const PurchaseOrderItemSchema = z.object({
  productCode: z.string().min(1, 'Product code is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  requestedDate: z.date(),
  notes: z.string().optional(),
});

export const PurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  orderNumber: z.string().min(1, 'Order number is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  requestedDeliveryDate: z.date(),
  items: z.array(PurchaseOrderItemSchema).min(1, 'At least one item is required'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  paymentTerms: z.string().min(1, 'Payment terms are required'),
  shippingTerms: z.string().min(1, 'Shipping terms are required'),
  notes: z.string().optional(),
});

// Contract validation schemas
export const ContractSchema = z
  .object({
    contractNumber: z.string().min(1, 'Contract number is required'),
    supplierId: z.string().min(1, 'Supplier is required'),
    type: z.enum([
      'master_agreement',
      'service_agreement',
      'purchase_agreement',
      'nda',
      'framework',
      'other',
    ]),
    title: z.string().min(5, 'Title must be at least 5 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    startDate: z.date(),
    endDate: z.date(),
    autoRenewal: z.boolean(),
    renewalPeriod: z.number().min(1).optional(),
    terminationNotice: z.number().min(1, 'Termination notice is required'),
    value: z.number().min(0).optional(),
    currency: z.string().length(3).optional(),
    paymentTerms: z.string().optional(),
    ourSignatory: z.string().min(1, 'Our signatory is required'),
    supplierSignatory: z.string().min(1, 'Supplier signatory is required'),
    notes: z.string().optional(),
  })
  .refine(data => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

// Communication validation schemas
export const CommunicationSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  type: z.enum(['email', 'phone', 'meeting', 'note', 'system']),
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  direction: z.enum(['inbound', 'outbound']),
  category: z.enum(['general', 'order', 'quality', 'delivery', 'payment', 'contract', 'support']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  requiresFollowUp: z.boolean(),
  followUpDate: z.date().optional(),
  followUpAssignee: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

// Validation helper functions
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[+]?([1-9]\d{0,15})$/;
  return phoneRegex.test(phone.replace(/[\s()-]/g, ''));
};

export const validateTaxId = (taxId: string, country: string): boolean => {
  // Basic validation - could be enhanced based on country-specific rules
  if (country === 'US') {
    const usEinRegex = /^\d{2}-\d{7}$/;
    return usEinRegex.test(taxId);
  }
  return taxId.length >= 9;
};

export const validatePostalCode = (postalCode: string, country: string): boolean => {
  const patterns: Record<string, RegExp> = {
    US: /^\d{5}(-\d{4})?$/,
    CA: /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/,
    UK: /^[A-Za-z]{1,2}\d[A-Za-z\d]? \d[A-Za-z]{2}$/,
    DE: /^\d{5}$/,
    FR: /^\d{5}$/,
  };

  const pattern = patterns[country];
  return pattern ? pattern.test(postalCode) : postalCode.length >= 5;
};

export const validateCurrency = (currency: string): boolean => {
  const validCurrencies = ['ZAR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR'];
  return validCurrencies.includes(currency.toUpperCase());
};

export const validateWebsite = (website: string): boolean => {
  try {
    new URL(website);
    return true;
  } catch {
    return false;
  }
};

// Form validation helpers
export const getFieldError = (
  errors: ValidationErrorNode | undefined,
  fieldPath: string
): string | undefined => {
  if (!errors) {
    return undefined;
  }

  const keys = fieldPath.split('.');
  let current: unknown = errors;

  for (const key of keys) {
    if (!isRecord(current) || !(key in current)) {
      return undefined;
    }
    current = current[key];
  }

  if (typeof current === 'string') {
    return current;
  }

  if (isRecord(current) && typeof current.message === 'string') {
    return current.message;
  }

  return undefined;
};

export const hasFieldError = (
  errors: ValidationErrorNode | undefined,
  fieldPath: string
): boolean => {
  return !!getFieldError(errors, fieldPath);
};

// Data transformation helpers
export const sanitizeSupplierData = (data: Partial<SupplierFormData>) => {
  return {
    ...data,
    name: data.name?.trim(),
    code: data.code?.toUpperCase().trim(),
    businessInfo: {
      ...data.businessInfo,
      legalName: data.businessInfo?.legalName?.trim(),
      taxId: data.businessInfo?.taxId?.replace(/[\s-]/g, ''),
      website: data.businessInfo?.website?.toLowerCase().trim(),
    },
    contacts: data.contacts?.map((contact: SupplierFormContact) => ({
      ...contact,
      name: contact.name?.trim(),
      email: contact.email?.toLowerCase().trim(),
      phone: contact.phone?.replace(/[\s()-]/g, ''),
    })),
  };
};

/**
 * @deprecated Use formatCurrency from '@/lib/utils/currency-formatter' instead.
 * This implementation has bugs (uses USD formatter then replaces $ symbol).
 * Will be removed in a future version.
 */
export const formatCurrency = (amount: number, currency: string = 'ZAR'): string => {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  // Replace $ with R for ZAR currency
  return currency === 'ZAR' ? formatted.replace('$', 'R') : formatted;
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

export const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};
