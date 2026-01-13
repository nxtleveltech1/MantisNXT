/**
 * Xero Sync Module Exports
 * 
 * Exports all synchronization functions for NXT-Xero data exchange.
 */

// Shared Helpers
export {
  getXeroEntityId,
  getNxtEntityId,
  saveEntityMapping,
  markMappingError,
  markMappingDeleted,
  getAccountMappings,
  getAccountMappingsWithIds,
  getAccountId,
} from './helpers';

// Contacts (Suppliers & Customers)
export {
  syncSupplierToXero,
  syncSuppliersToXero,
  syncCustomerToXero,
  fetchContactsFromXero,
  getContactFromXero,
} from './contacts';

// Invoices (AR & AP)
export {
  syncSalesInvoiceToXero,
  syncSupplierInvoiceToXero,
  fetchInvoicesFromXero,
  type NxtSalesInvoice,
} from './invoices';

// Items (Products)
export {
  syncProductToXero,
  syncProductsToXero,
  fetchItemsFromXero,
} from './items';

// Payments
export {
  syncPaymentToXero,
  fetchPaymentsFromXero,
} from './payments';

// Purchase Orders
export {
  syncPurchaseOrderToXero,
  fetchPurchaseOrdersFromXero,
} from './purchase-orders';

// Reports
export {
  fetchProfitAndLossReport,
  fetchBalanceSheetReport,
  fetchAgedReceivablesReport,
  fetchAgedPayablesReport,
  fetchTrialBalanceReport,
  type XeroReport,
  type XeroReportRow,
  type ProfitLossReport,
  type BalanceSheetReport,
  type AgedReceivablesReport,
} from './reports';

// Quotes
export {
  syncQuoteToXero,
  fetchQuotesFromXero,
} from './quotes';

// Credit Notes
export {
  syncCreditNoteToXero,
  fetchCreditNotesFromXero,
} from './credit-notes';

// Repairs Invoicing
export {
  syncRepairOrderInvoiceToXero,
} from './repairs-invoicing';

// Rentals Invoicing
export {
  syncReservationInvoiceToXero,
} from './rentals-invoicing';

// Bank Transactions
export {
  syncBankTransactionToXero,
  fetchBankTransactionsFromXero,
} from './bank-transactions';

// Budgets
export {
  fetchBudgetsFromXero,
} from './budgets';

// Manual Journals
export {
  syncManualJournalToXero,
  fetchManualJournalsFromXero,
} from './manual-journals';

// Tracking Categories
export {
  syncTrackingCategoryToXero,
  fetchTrackingCategoriesFromXero,
} from './tracking-categories';

// Branding Themes
export {
  fetchBrandingThemesFromXero,
  fetchPaymentServicesFromXero,
} from './branding-themes';

// Contact Groups
export {
  syncContactGroupToXero,
  fetchContactGroupsFromXero,
  addContactsToGroup as addContactsToContactGroup,
} from './contact-groups';

// History and Notes
export {
  addHistoryNoteToXero,
  fetchHistoryRecordsFromXero,
} from './history-notes';

// Attachments
export {
  uploadAttachmentToXero,
  fetchAttachmentsFromXero,
  downloadAttachmentFromXero,
} from './attachments';
