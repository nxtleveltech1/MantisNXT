/**
 * NXT to Xero Entity Mappers
 * 
 * Functions to transform NXT entities to Xero API format and vice versa.
 */

import type { Supplier, SupplierContact, SupplierAddress } from '@/types/supplier';
import type { 
  XeroContact, 
  XeroAddress, 
  XeroContactPerson,
  XeroPhone,
  XeroInvoice, 
  XeroItem,
  XeroPurchaseOrder,
  XeroQuote,
  XeroQuoteStatus,
  XeroPayment,
  XeroCreditNote,
  XeroTaxType,
  XeroAddressType,
  XeroAccountMappingConfig,
} from './types';
import { DEFAULT_ACCOUNT_MAPPING } from './types';

// ============================================================================
// CONTACT MAPPERS (Suppliers & Customers)
// ============================================================================

/**
 * Map NXT Supplier to Xero Contact
 */
export function mapSupplierToXeroContact(
  supplier: Supplier,
  existingContactId?: string
): XeroContact {
  const primaryContact = supplier.contacts?.find(c => c.isPrimary) || supplier.contacts?.[0];
  const billingAddress = supplier.addresses?.find(a => a.type === 'billing') || supplier.addresses?.[0];
  const shippingAddress = supplier.addresses?.find(a => a.type === 'shipping');

  const contact: XeroContact = {
    Name: supplier.name,
    ContactNumber: supplier.code,
    IsSupplier: true,
    IsCustomer: false,
    ContactStatus: supplier.status === 'active' ? 'ACTIVE' : 'ARCHIVED',
  };

  // Add existing ID for updates
  if (existingContactId) {
    contact.ContactID = existingContactId;
  }

  // Business info
  if (supplier.businessInfo) {
    if (supplier.businessInfo.taxId) {
      contact.TaxNumber = supplier.businessInfo.taxId;
    }
    if (supplier.businessInfo.website) {
      contact.Website = supplier.businessInfo.website;
    }
    if (supplier.businessInfo.registrationNumber) {
      contact.CompanyNumber = supplier.businessInfo.registrationNumber;
    }
  }

  // Bank account details
  if (supplier.financial?.bankDetails) {
    const bankDetails = supplier.financial.bankDetails;
    // Format bank account details string (Xero format: "01-0123-0123456-00" or account number)
    // Use accountNumber primarily, add routingNumber if available
    const bankAccountString = bankDetails.accountNumber || bankDetails.routingNumber || '';
    if (bankAccountString) {
      contact.BankAccountDetails = bankAccountString;
    }
  }

  // Discount (if available - check metadata or other fields)
  // Note: Discount field may not exist in Supplier type, skip for now
  // if (supplier.financial?.discount !== undefined) {
  //   contact.Discount = supplier.financial.discount;
  // }

  // Primary email
  if (primaryContact?.email) {
    contact.EmailAddress = primaryContact.email;
  }

  // Currency
  if (supplier.financial?.currency) {
    contact.DefaultCurrency = supplier.financial.currency;
  }

  // Tax type for purchases
  contact.AccountsPayableTaxType = 'INPUT';

  // Payment terms
  if (supplier.capabilities?.paymentTerms || supplier.financial?.paymentTerms) {
    const terms = supplier.capabilities?.paymentTerms || supplier.financial?.paymentTerms;
    contact.PaymentTerms = {
      Bills: mapPaymentTermsToXero(terms || ''),
    };
  }

  // Addresses
  const addresses: XeroAddress[] = [];
  if (billingAddress) {
    addresses.push(mapAddressToXero(billingAddress, 'POBOX'));
  }
  if (shippingAddress) {
    addresses.push(mapAddressToXero(shippingAddress, 'STREET'));
  }
  if (addresses.length > 0) {
    contact.Addresses = addresses;
  }

  // Phones
  const phones: XeroPhone[] = [];
  if (primaryContact?.phone) {
    phones.push({ PhoneType: 'DEFAULT', PhoneNumber: primaryContact.phone });
  }
  if (primaryContact?.mobile) {
    phones.push({ PhoneType: 'MOBILE', PhoneNumber: primaryContact.mobile });
  }
  if (phones.length > 0) {
    contact.Phones = phones;
  }

  // Contact persons
  if (supplier.contacts && supplier.contacts.length > 0) {
    contact.ContactPersons = supplier.contacts.map(mapContactToXeroPerson);
  }

  return contact;
}

/**
 * Map NXT Customer to Xero Contact
 */
export function mapCustomerToXeroContact(
  customer: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    taxNumber?: string;
    registrationNumber?: string;
    bankAccountDetails?: string;
    discount?: number;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  },
  existingContactId?: string
): XeroContact {
  const contact: XeroContact = {
    Name: customer.company || customer.name,
    IsCustomer: true,
    IsSupplier: false,
    ContactStatus: 'ACTIVE',
  };

  if (existingContactId) {
    contact.ContactID = existingContactId;
  }

  if (customer.email) {
    contact.EmailAddress = customer.email;
  }

  if (customer.taxNumber) {
    contact.TaxNumber = customer.taxNumber;
  }

  if (customer.registrationNumber) {
    contact.CompanyNumber = customer.registrationNumber;
  }

  if (customer.bankAccountDetails) {
    contact.BankAccountDetails = customer.bankAccountDetails;
  }

  if (customer.discount !== undefined) {
    contact.Discount = customer.discount;
  }

  // Tax type for sales
  contact.AccountsReceivableTaxType = 'OUTPUT';

  // Phone
  if (customer.phone) {
    contact.Phones = [{ PhoneType: 'DEFAULT', PhoneNumber: customer.phone }];
  }

  // Address
  if (customer.address) {
    const address: XeroAddress = {
      AddressType: 'POBOX',
    };
    if (customer.address.street) address.AddressLine1 = customer.address.street;
    if (customer.address.city) address.City = customer.address.city;
    if (customer.address.state) address.Region = customer.address.state;
    if (customer.address.postalCode) address.PostalCode = customer.address.postalCode;
    if (customer.address.country) address.Country = customer.address.country;
    contact.Addresses = [address];
  }

  // Contact person from customer name
  if (customer.name && customer.name !== customer.company) {
    const nameParts = customer.name.split(' ');
    const contactPerson: XeroContactPerson = {
      FirstName: nameParts[0],
      IncludeInEmails: true,
    };
    const lastName = nameParts.slice(1).join(' ');
    if (lastName) contactPerson.LastName = lastName;
    if (customer.email) contactPerson.EmailAddress = customer.email;
    contact.ContactPersons = [contactPerson];
  }

  return contact;
}

/**
 * Map Xero Contact back to NXT format (for sync from Xero)
 */
export function mapXeroContactToSupplier(contact: XeroContact): Partial<Supplier> {
  return {
    name: contact.Name,
    code: contact.ContactNumber || '',
    status: contact.ContactStatus === 'ACTIVE' ? 'active' : 'inactive',
    businessInfo: {
      legalName: contact.Name,
      taxId: contact.TaxNumber || '',
      registrationNumber: '',
      website: contact.Website,
      currency: contact.DefaultCurrency || 'ZAR',
    },
    contacts: contact.ContactPersons?.map((cp, idx) => ({
      id: `xero-${idx}`,
      type: idx === 0 ? 'primary' : 'sales',
      name: `${cp.FirstName || ''} ${cp.LastName || ''}`.trim(),
      title: '',
      email: cp.EmailAddress || '',
      phone: contact.Phones?.find(p => p.PhoneType === 'DEFAULT')?.PhoneNumber || '',
      mobile: contact.Phones?.find(p => p.PhoneType === 'MOBILE')?.PhoneNumber,
      isPrimary: idx === 0,
      isActive: true,
    })) || [],
    addresses: contact.Addresses?.map((addr, idx) => ({
      id: `xero-${idx}`,
      type: addr.AddressType === 'POBOX' ? 'billing' : 'shipping',
      addressLine1: addr.AddressLine1 || '',
      addressLine2: addr.AddressLine2,
      city: addr.City || '',
      state: addr.Region || '',
      postalCode: addr.PostalCode || '',
      country: addr.Country || 'South Africa',
      isPrimary: idx === 0,
      isActive: true,
    })) || [],
  } as Partial<Supplier>;
}

// ============================================================================
// ADDRESS & CONTACT HELPERS
// ============================================================================

function mapAddressToXero(
  address: SupplierAddress,
  type: XeroAddressType
): XeroAddress {
  const xeroAddress: XeroAddress = {
    AddressType: type,
    AddressLine1: address.addressLine1,
    City: address.city,
    Region: address.state,
    PostalCode: address.postalCode,
    Country: address.country,
  };
  if (address.addressLine2) xeroAddress.AddressLine2 = address.addressLine2;
  if (address.name) xeroAddress.AttentionTo = address.name;
  return xeroAddress;
}

function mapContactToXeroPerson(contact: SupplierContact): XeroContactPerson {
  const nameParts = contact.name.split(' ');
  const person: XeroContactPerson = {
    FirstName: nameParts[0],
    IncludeInEmails: contact.isPrimary,
  };
  const lastName = nameParts.slice(1).join(' ');
  if (lastName) person.LastName = lastName;
  if (contact.email) person.EmailAddress = contact.email;
  return person;
}

function mapPaymentTermsToXero(terms: string): { Day?: number; Type?: 'DAYSAFTERBILLDATE' | 'DAYSAFTERBILLMONTH' | 'OFCURRENTMONTH' | 'OFFOLLOWINGMONTH' } {
  // Parse common payment terms formats
  const match = terms.match(/(\d+)/);
  const days = match ? parseInt(match[1], 10) : 30;
  
  if (terms.toLowerCase().includes('eom') || terms.toLowerCase().includes('end of month')) {
    return { Day: days, Type: 'OFCURRENTMONTH' };
  }
  
  return { Day: days, Type: 'DAYSAFTERBILLDATE' };
}

// ============================================================================
// INVOICE MAPPERS
// ============================================================================

/**
 * Map NXT Supplier Invoice (Bill) to Xero Invoice (ACCPAY)
 */
export function mapSupplierInvoiceToXero(
  bill: {
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    currency?: string;
    reference?: string;
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
      accountCode?: string;
    }>;
  },
  xeroContactId: string,
  accountMapping: Partial<XeroAccountMappingConfig> = {}
): XeroInvoice {
  const mapping = { ...DEFAULT_ACCOUNT_MAPPING, ...accountMapping };

  const invoice: XeroInvoice = {
    Type: 'ACCPAY',
    Contact: { ContactID: xeroContactId },
    InvoiceNumber: bill.invoiceNumber,
    LineAmountTypes: 'Exclusive',
    Status: 'AUTHORISED',
    CurrencyCode: bill.currency || 'ZAR',
    LineItems: bill.lineItems.map(item => ({
      Description: item.description,
      Quantity: item.quantity,
      UnitAmount: item.unitPrice,
      AccountCode: item.accountCode || mapping.costOfGoodsSold,
      TaxType: 'INPUT' as XeroTaxType,
    })),
  };
  if (bill.reference) invoice.Reference = bill.reference;
  const invoiceDate = formatDateForXero(bill.invoiceDate);
  if (invoiceDate) invoice.Date = invoiceDate;
  const dueDate = formatDateForXero(bill.dueDate);
  if (dueDate) invoice.DueDate = dueDate;
  return invoice;
}


// ============================================================================
// ITEM/PRODUCT MAPPERS
// ============================================================================

/**
 * Map NXT Product to Xero Item
 */
export function mapProductToXeroItem(
  product: {
    sku: string;
    name: string;
    description?: string;
    baseCost?: number;
    salePrice?: number;
    isTracked?: boolean;
  },
  accountMapping: Partial<XeroAccountMappingConfig> = {},
  existingItemId?: string
): XeroItem {
  const mapping = { ...DEFAULT_ACCOUNT_MAPPING, ...accountMapping };

  const item: XeroItem = {
    Code: product.sku.substring(0, 30), // Xero limit: 30 chars
    Name: product.name.substring(0, 50), // Xero limit: 50 chars
    IsSold: true,
    IsPurchased: true,
  };
  if (product.description) {
    item.Description = product.description.substring(0, 4000);
  }

  if (existingItemId) {
    item.ItemID = existingItemId;
  }

  // Sales details
  if (product.salePrice !== undefined) {
    item.SalesDetails = {
      UnitPrice: product.salePrice,
      AccountCode: mapping.salesRevenue,
      TaxType: 'OUTPUT',
    };
  }

  // Purchase details
  if (product.baseCost !== undefined) {
    item.PurchaseDetails = {
      UnitPrice: product.baseCost,
      COGSAccountCode: mapping.costOfGoodsSold,
      TaxType: 'INPUT',
    };
  }

  // Tracked inventory
  if (product.isTracked) {
    item.IsTrackedAsInventory = true;
    item.InventoryAssetAccountCode = mapping.inventoryAsset;
  }

  return item;
}

/**
 * Map Xero Item back to NXT Product format
 */
export function mapXeroItemToProduct(item: XeroItem): {
  sku: string;
  name: string;
  description?: string | undefined;
  baseCost?: number | undefined;
  salePrice?: number | undefined;
  isTracked: boolean;
} {
  const product: {
    sku: string;
    name: string;
    description?: string | undefined;
    baseCost?: number | undefined;
    salePrice?: number | undefined;
    isTracked: boolean;
  } = {
    sku: item.Code,
    name: item.Name || item.Code,
    isTracked: item.IsTrackedAsInventory || false,
  };
  if (item.Description) product.description = item.Description;
  if (item.PurchaseDetails?.UnitPrice !== undefined) product.baseCost = item.PurchaseDetails.UnitPrice;
  if (item.SalesDetails?.UnitPrice !== undefined) product.salePrice = item.SalesDetails.UnitPrice;
  return product;
}

// ============================================================================
// PURCHASE ORDER MAPPERS
// ============================================================================

/**
 * Map NXT Purchase Order to Xero Purchase Order
 */
export function mapPurchaseOrderToXero(
  po: {
    poNumber: string;
    createdDate: Date | string;
    requestedDeliveryDate?: Date | string;
    deliveryAddress?: string;
    notes?: string;
    items: Array<{
      productCode: string;
      description: string;
      quantity: number;
      unitPrice: number;
    }>;
  },
  xeroContactId: string,
  accountMapping: Partial<XeroAccountMappingConfig> = {}
): XeroPurchaseOrder {
  const mapping = { ...DEFAULT_ACCOUNT_MAPPING, ...accountMapping };

  const purchaseOrder: XeroPurchaseOrder = {
    Contact: { ContactID: xeroContactId },
    PurchaseOrderNumber: po.poNumber,
    LineAmountTypes: 'Exclusive',
    Status: 'AUTHORISED',
    LineItems: po.items.map(item => ({
      ItemCode: item.productCode,
      Description: item.description,
      Quantity: item.quantity,
      UnitAmount: item.unitPrice,
      AccountCode: mapping.costOfGoodsSold,
      TaxType: 'INPUT' as XeroTaxType,
    })),
  };
  const date = formatDateForXero(po.createdDate);
  if (date) purchaseOrder.Date = date;
  if (po.requestedDeliveryDate) {
    const deliveryDate = formatDateForXero(po.requestedDeliveryDate);
    if (deliveryDate) purchaseOrder.DeliveryDate = deliveryDate;
  }
  if (po.deliveryAddress) purchaseOrder.DeliveryAddress = po.deliveryAddress;
  if (po.notes) purchaseOrder.DeliveryInstructions = po.notes;
  return purchaseOrder;
}

// ============================================================================
// PAYMENT MAPPERS
// ============================================================================

/**
 * Map NXT Payment to Xero Payment
 */
export function mapPaymentToXero(
  payment: {
    amount: number;
    date: Date | string;
    reference?: string;
  },
  xeroInvoiceId: string,
  xeroAccountId: string
): XeroPayment {
  const xeroPayment: XeroPayment = {
    Invoice: { InvoiceID: xeroInvoiceId },
    Account: { AccountID: xeroAccountId },
    Amount: payment.amount,
  };
  const date = formatDateForXero(payment.date);
  if (date) xeroPayment.Date = date;
  if (payment.reference) xeroPayment.Reference = payment.reference;
  return xeroPayment;
}

// ============================================================================
// QUOTE MAPPERS
// ============================================================================

/**
 * Map quote status from NXT to Xero
 */
function mapQuoteStatusToXero(status?: string): XeroQuoteStatus {
  switch (status) {
    case 'draft':
      return 'DRAFT';
    case 'sent':
      return 'SENT';
    case 'accepted':
      return 'ACCEPTED';
    case 'rejected':
      return 'DECLINED';
    case 'expired':
      return 'DELETED'; // Xero doesn't have expired, use deleted
    case 'converted':
      return 'INVOICED';
    default:
      return 'DRAFT';
  }
}

/**
 * Map NXT Quotation to Xero Quote
 */
export function mapQuotationToXero(
  quote: {
    quoteNumber: string;
    date: Date | string;
    expiryDate?: Date | string;
    title?: string;
    summary?: string;
    terms?: string;
    status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
    currency?: string;
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
    }>;
  },
  xeroContactId: string,
  accountMapping: Partial<XeroAccountMappingConfig> = {}
): XeroQuote {
  const mapping = { ...DEFAULT_ACCOUNT_MAPPING, ...accountMapping };

  const xeroQuote: XeroQuote = {
    Contact: { ContactID: xeroContactId },
    QuoteNumber: quote.quoteNumber,
    LineAmountTypes: 'Exclusive',
    Status: mapQuoteStatusToXero(quote.status),
    CurrencyCode: quote.currency || 'ZAR',
    LineItems: quote.lineItems.map(item => ({
      Description: item.description,
      Quantity: item.quantity,
      UnitAmount: item.unitPrice,
      AccountCode: mapping.salesRevenue,
      TaxType: 'OUTPUT' as XeroTaxType,
    })),
  };
  const date = formatDateForXero(quote.date);
  if (date) xeroQuote.Date = date;
  if (quote.expiryDate) {
    const expiryDate = formatDateForXero(quote.expiryDate);
    if (expiryDate) xeroQuote.ExpiryDate = expiryDate;
  }
  if (quote.title) xeroQuote.Title = quote.title;
  if (quote.summary) xeroQuote.Summary = quote.summary;
  if (quote.terms) xeroQuote.Terms = quote.terms;
  return xeroQuote;
}

// ============================================================================
// CREDIT NOTE MAPPERS
// ============================================================================

/**
 * Map NXT Credit Note to Xero Credit Note
 */
export function mapCreditNoteToXero(
  creditNote: {
    creditNoteNumber: string;
    date: Date | string;
    reference?: string;
    type: 'sales' | 'purchase';
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
    }>;
  },
  xeroContactId: string,
  accountMapping: Partial<XeroAccountMappingConfig> = {}
): XeroCreditNote {
  const mapping = { ...DEFAULT_ACCOUNT_MAPPING, ...accountMapping };
  const isSales = creditNote.type === 'sales';

  const xeroCreditNote: XeroCreditNote = {
    Type: isSales ? 'ACCRECCREDIT' : 'ACCPAYCREDIT',
    Contact: { ContactID: xeroContactId },
    CreditNoteNumber: creditNote.creditNoteNumber,
    Status: 'AUTHORISED',
    LineItems: creditNote.lineItems.map(item => ({
      Description: item.description,
      Quantity: item.quantity,
      UnitAmount: item.unitPrice,
      AccountCode: isSales ? mapping.salesRevenue : mapping.costOfGoodsSold,
      TaxType: (isSales ? 'OUTPUT' : 'INPUT') as XeroTaxType,
    })),
  };
  if (creditNote.reference) xeroCreditNote.Reference = creditNote.reference;
  const date = formatDateForXero(creditNote.date);
  if (date) xeroCreditNote.Date = date;
  return xeroCreditNote;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format date for Xero API (YYYY-MM-DD)
 */
export function formatDateForXero(date: Date | string | undefined): string | undefined {
  if (!date) return undefined;
  
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Parse Xero date format
 */
export function parseXeroDate(xeroDate: string | undefined): Date | null {
  if (!xeroDate) return null;
  
  // Xero returns dates in format: /Date(1234567890000)/
  const match = xeroDate.match(/\/Date\((\d+)([+-]\d+)?\)\//);
  if (match) {
    return new Date(parseInt(match[1], 10));
  }
  
  // Also handle ISO format
  return new Date(xeroDate);
}

/**
 * Generate a hash of entity data for change detection
 */
export function generateSyncHash(data: unknown): string {
  const str = JSON.stringify(data, Object.keys(data as object).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}
