/**
 * Xero Integration Types
 * 
 * Type definitions for Xero API integration with MantisNXT
 */

// ============================================================================
// DATABASE ENTITY TYPES
// ============================================================================

export interface XeroConnection {
  id: string;
  orgId: string;
  xeroTenantId: string;
  xeroTenantName: string | null;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  scopes: string[];
  isActive: boolean;
  connectedAt: Date;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface XeroEntityMapping {
  id: string;
  orgId: string;
  entityType: XeroEntityType;
  nxtEntityId: string;
  xeroEntityId: string;
  syncStatus: XeroSyncStatus;
  lastSyncedAt: Date | null;
  xeroUpdatedDateUtc: Date | null;
  syncHash: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface XeroAccountMapping {
  id: string;
  orgId: string;
  mappingKey: XeroAccountMappingKey;
  xeroAccountId: string;
  xeroAccountCode: string;
  xeroAccountName: string | null;
  xeroAccountType: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface XeroSyncLog {
  id: string;
  orgId: string;
  entityType: string;
  nxtEntityId: string | null;
  xeroEntityId: string | null;
  action: XeroSyncAction;
  direction: XeroSyncDirection;
  status: XeroSyncLogStatus;
  errorMessage: string | null;
  errorCode: string | null;
  requestPayload: unknown;
  responsePayload: unknown;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  durationMs: number | null;
  createdAt: Date;
  createdBy: string | null;
}

export interface XeroWebhookEvent {
  id: string;
  webhookEventId: string | null;
  resourceId: string;
  resourceUrl: string | null;
  eventCategory: string;
  eventType: string;
  eventDateUtc: Date;
  tenantId: string;
  payload: unknown;
  processingStatus: XeroWebhookStatus;
  processedAt: Date | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: Date;
}

// ============================================================================
// ENUMS
// ============================================================================

export type XeroEntityType = 
  | 'contact'
  | 'invoice'
  | 'item'
  | 'payment'
  | 'purchase_order'
  | 'quote'
  | 'credit_note'
  | 'bank_transaction'
  | 'manual_journal'
  | 'tracking_category'
  | 'contact_group'
  | 'branding_theme';

export type XeroSyncStatus = 
  | 'synced'
  | 'pending'
  | 'error'
  | 'deleted';

export type XeroSyncAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'fetch'
  | 'batch_sync';

export type XeroSyncDirection = 
  | 'to_xero'
  | 'from_xero'
  | 'bidirectional';

export type XeroSyncLogStatus = 
  | 'success'
  | 'error'
  | 'skipped'
  | 'partial';

export type XeroWebhookStatus = 
  | 'pending'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'skipped';

export type XeroAccountMappingKey = 
  | 'sales_revenue'
  | 'service_revenue'
  | 'rental_revenue'
  | 'shipping_revenue'
  | 'cost_of_goods_sold'
  | 'shipping_expense'
  | 'inventory_asset'
  | 'accounts_receivable'
  | 'accounts_payable'
  | 'deposits_received'
  | 'bank_account';

// ============================================================================
// XERO API TYPES
// ============================================================================

export type XeroInvoiceType = 'ACCREC' | 'ACCPAY';

export type XeroInvoiceStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'DELETED'
  | 'AUTHORISED'
  | 'PAID'
  | 'VOIDED';

export type XeroPurchaseOrderStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'AUTHORISED'
  | 'BILLED'
  | 'DELETED';

export type XeroQuoteStatus = 
  | 'DRAFT'
  | 'SENT'
  | 'DECLINED'
  | 'ACCEPTED'
  | 'INVOICED'
  | 'DELETED';

export type XeroContactStatus = 
  | 'ACTIVE'
  | 'ARCHIVED'
  | 'GDPRREQUEST';

export type XeroPaymentStatus = 
  | 'AUTHORISED'
  | 'DELETED';

export type XeroTaxType = 
  | 'OUTPUT'      // Sales tax (VAT on sales)
  | 'INPUT'       // Purchase tax (VAT on purchases)
  | 'NONE'        // No tax
  | 'EXEMPTOUTPUT' // Exempt sales
  | 'EXEMPTINPUT'  // Exempt purchases
  | 'ZERORATEDOUTPUT' // Zero-rated sales
  | 'ZERORATEDINPUT'; // Zero-rated purchases

export type XeroAddressType = 
  | 'POBOX'       // Postal address
  | 'STREET'      // Physical/delivery address
  | 'DELIVERY';   // Delivery address

export type XeroAccountType = 
  | 'BANK'
  | 'CURRENT'
  | 'CURRLIAB'
  | 'DEPRECIATN'
  | 'DIRECTCOSTS'
  | 'EQUITY'
  | 'EXPENSE'
  | 'FIXED'
  | 'INVENTORY'
  | 'LIABILITY'
  | 'NONCURRENT'
  | 'OTHERINCOME'
  | 'OVERHEADS'
  | 'PREPAYMENT'
  | 'REVENUE'
  | 'SALES'
  | 'TERMLIAB'
  | 'PAYGLIABILITY'
  | 'SUPERANNUATIONEXPENSE'
  | 'SUPERANNUATIONLIABILITY'
  | 'WAGESEXPENSE';

// ============================================================================
// XERO API RESPONSE STRUCTURES
// ============================================================================

export interface XeroContact {
  ContactID?: string;
  ContactNumber?: string;
  AccountNumber?: string;
  ContactStatus?: XeroContactStatus;
  Name: string;
  FirstName?: string;
  LastName?: string;
  EmailAddress?: string;
  SkypeUserName?: string;
  BankAccountDetails?: string;
  TaxNumber?: string;
  AccountsReceivableTaxType?: XeroTaxType;
  AccountsPayableTaxType?: XeroTaxType;
  Addresses?: XeroAddress[];
  Phones?: XeroPhone[];
  ContactPersons?: XeroContactPerson[];
  IsSupplier?: boolean;
  IsCustomer?: boolean;
  DefaultCurrency?: string;
  UpdatedDateUTC?: string;
  PaymentTerms?: XeroPaymentTerms;
  Website?: string;
  Discount?: number;
}

export interface XeroAddress {
  AddressType: XeroAddressType;
  AddressLine1?: string;
  AddressLine2?: string;
  AddressLine3?: string;
  AddressLine4?: string;
  City?: string;
  Region?: string;
  PostalCode?: string;
  Country?: string;
  AttentionTo?: string;
}

export interface XeroPhone {
  PhoneType: 'DEFAULT' | 'DDI' | 'MOBILE' | 'FAX';
  PhoneNumber?: string;
  PhoneAreaCode?: string;
  PhoneCountryCode?: string;
}

export interface XeroContactPerson {
  FirstName?: string;
  LastName?: string;
  EmailAddress?: string;
  IncludeInEmails?: boolean;
}

export interface XeroPaymentTerms {
  Bills?: XeroPaymentTerm;
  Sales?: XeroPaymentTerm;
}

export interface XeroPaymentTerm {
  Day?: number;
  Type?: 'DAYSAFTERBILLDATE' | 'DAYSAFTERBILLMONTH' | 'OFCURRENTMONTH' | 'OFFOLLOWINGMONTH';
}

export interface XeroInvoice {
  InvoiceID?: string;
  InvoiceNumber?: string;
  Reference?: string;
  Type: XeroInvoiceType;
  Contact: { ContactID: string } | XeroContact;
  Date?: string;
  DueDate?: string;
  ExpectedPaymentDate?: string;
  LineItems: XeroLineItem[];
  Status?: XeroInvoiceStatus;
  LineAmountTypes?: 'Exclusive' | 'Inclusive' | 'NoTax';
  SubTotal?: number;
  TotalTax?: number;
  Total?: number;
  TotalDiscount?: number;
  CurrencyCode?: string;
  CurrencyRate?: number;
  UpdatedDateUTC?: string;
  BrandingThemeID?: string;
  Url?: string;
  SentToContact?: boolean;
  AmountDue?: number;
  AmountPaid?: number;
  AmountCredited?: number;
  Payments?: XeroPayment[];
  Prepayments?: XeroPayment[];
  Overpayments?: XeroPayment[];
  CreditNotes?: XeroCreditNote[];
}

export interface XeroLineItem {
  LineItemID?: string;
  Description?: string;
  Quantity?: number;
  UnitAmount?: number;
  ItemCode?: string;
  AccountCode?: string;
  TaxType?: XeroTaxType;
  TaxAmount?: number;
  LineAmount?: number;
  DiscountRate?: number;
  DiscountAmount?: number;
  Tracking?: XeroTrackingCategory[];
}

export interface XeroTrackingCategory {
  TrackingCategoryID: string;
  TrackingOptionID?: string;
  Name?: string;
  Option?: string;
}

export interface XeroPayment {
  PaymentID?: string;
  Invoice?: { InvoiceID: string };
  CreditNote?: { CreditNoteID: string };
  Account?: { AccountID: string; Code?: string };
  Date?: string;
  Amount?: number;
  CurrencyRate?: number;
  Reference?: string;
  IsReconciled?: boolean;
  Status?: XeroPaymentStatus;
  PaymentType?: 'ACCRECPAYMENT' | 'ACCPAYPAYMENT' | 'ARCREDITPAYMENT' | 'APCREDITPAYMENT';
  UpdatedDateUTC?: string;
}

export interface XeroCreditNote {
  CreditNoteID?: string;
  CreditNoteNumber?: string;
  Reference?: string;
  Type: 'ACCPAYCREDIT' | 'ACCRECCREDIT';
  Contact: { ContactID: string };
  Date?: string;
  Status?: 'DRAFT' | 'SUBMITTED' | 'DELETED' | 'AUTHORISED' | 'PAID' | 'VOIDED';
  LineItems: XeroLineItem[];
  SubTotal?: number;
  TotalTax?: number;
  Total?: number;
  CurrencyCode?: string;
  UpdatedDateUTC?: string;
}

export interface XeroItem {
  ItemID?: string;
  Code: string;
  Name?: string;
  Description?: string;
  PurchaseDescription?: string;
  IsSold?: boolean;
  IsPurchased?: boolean;
  IsTrackedAsInventory?: boolean;
  InventoryAssetAccountCode?: string;
  TotalCostPool?: number;
  QuantityOnHand?: number;
  SalesDetails?: XeroItemDetails;
  PurchaseDetails?: XeroItemDetails;
  UpdatedDateUTC?: string;
}

export interface XeroItemDetails {
  UnitPrice?: number;
  AccountCode?: string;
  COGSAccountCode?: string;
  TaxType?: XeroTaxType;
}

export interface XeroPurchaseOrder {
  PurchaseOrderID?: string;
  PurchaseOrderNumber?: string;
  Reference?: string;
  Contact: { ContactID: string };
  Date?: string;
  DeliveryDate?: string;
  LineItems: XeroLineItem[];
  Status?: XeroPurchaseOrderStatus;
  LineAmountTypes?: 'Exclusive' | 'Inclusive' | 'NoTax';
  SubTotal?: number;
  TotalTax?: number;
  Total?: number;
  CurrencyCode?: string;
  UpdatedDateUTC?: string;
  DeliveryAddress?: string;
  AttentionTo?: string;
  Telephone?: string;
  DeliveryInstructions?: string;
  SentToContact?: boolean;
}

export interface XeroQuote {
  QuoteID?: string;
  QuoteNumber?: string;
  Reference?: string;
  Contact: { ContactID: string };
  Date?: string;
  ExpiryDate?: string;
  LineItems: XeroLineItem[];
  Status?: XeroQuoteStatus;
  LineAmountTypes?: 'Exclusive' | 'Inclusive' | 'NoTax';
  SubTotal?: number;
  TotalTax?: number;
  Total?: number;
  TotalDiscount?: number;
  CurrencyCode?: string;
  Title?: string;
  Summary?: string;
  Terms?: string;
  UpdatedDateUTC?: string;
}

export interface XeroAccount {
  AccountID?: string;
  Code?: string;
  Name?: string;
  Type?: XeroAccountType;
  Status?: 'ACTIVE' | 'ARCHIVED';
  Description?: string;
  TaxType?: XeroTaxType;
  EnablePaymentsToAccount?: boolean;
  ShowInExpenseClaims?: boolean;
  Class?: 'ASSET' | 'EQUITY' | 'EXPENSE' | 'LIABILITY' | 'REVENUE';
  SystemAccount?: string;
  BankAccountType?: string;
  BankAccountNumber?: string;
  CurrencyCode?: string;
  ReportingCode?: string;
  ReportingCodeName?: string;
  UpdatedDateUTC?: string;
}

export interface XeroTaxRate {
  Name: string;
  TaxType: string;
  TaxComponents?: {
    Name: string;
    Rate: number;
    IsCompound: boolean;
  }[];
  Status: 'ACTIVE' | 'DELETED' | 'ARCHIVED';
  ReportTaxType: string;
  CanApplyToAssets: boolean;
  CanApplyToEquity: boolean;
  CanApplyToExpenses: boolean;
  CanApplyToLiabilities: boolean;
  CanApplyToRevenue: boolean;
  DisplayTaxRate: number;
  EffectiveRate: number;
}

// ============================================================================
// SYNC OPERATION TYPES
// ============================================================================

export interface SyncResult<T = unknown> {
  success: boolean;
  data?: T;
  xeroEntityId?: string;
  error?: string;
  errorCode?: string;
}

export interface BatchSyncResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{
    nxtEntityId: string;
    error: string;
  }>;
}

export interface SyncOptions {
  forceUpdate?: boolean;
  skipExisting?: boolean;
  batchSize?: number;
}

// ============================================================================
// XERO TENANT INFO
// ============================================================================

export interface XeroTenant {
  id: string;
  authEventId: string;
  tenantId: string;
  tenantType: string;
  tenantName: string;
  createdDateUtc: string;
  updatedDateUtc: string;
}

// ============================================================================
// ACCOUNT MAPPING CONFIG
// ============================================================================

export interface XeroAccountMappingConfig {
  salesRevenue: string;
  serviceRevenue: string;
  rentalRevenue: string;
  shippingRevenue: string;
  costOfGoodsSold: string;
  shippingExpense: string;
  inventoryAsset: string;
  accountsReceivable: string;
  accountsPayable: string;
  depositsReceived: string;
  bankAccount: string;
}

export const DEFAULT_ACCOUNT_MAPPING: XeroAccountMappingConfig = {
  salesRevenue: '200',
  serviceRevenue: '200',
  rentalRevenue: '200',
  shippingRevenue: '260',
  costOfGoodsSold: '300',
  shippingExpense: '429',
  inventoryAsset: '630',
  accountsReceivable: '610',
  accountsPayable: '800',
  depositsReceived: '820',
  bankAccount: '090',
};
