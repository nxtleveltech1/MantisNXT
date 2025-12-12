'use client';

import { Badge } from '@/components/ui/badge';

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
export type SalesOrderStatus = 'draft' | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'completed';
export type ProformaInvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled' | 'converted';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled' | 'refunded';

type DocumentStatus = QuotationStatus | SalesOrderStatus | ProformaInvoiceStatus | InvoiceStatus;

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  type?: 'quotation' | 'sales-order' | 'proforma-invoice' | 'invoice';
}

const statusConfig: Record<string, { color: string; label: string }> = {
  // Common statuses
  draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
  sent: { color: 'bg-blue-100 text-blue-800', label: 'Sent' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
  converted: { color: 'bg-purple-100 text-purple-800', label: 'Converted' },
  
  // Quotation specific
  accepted: { color: 'bg-green-100 text-green-800', label: 'Accepted' },
  rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
  expired: { color: 'bg-orange-100 text-orange-800', label: 'Expired' },
  
  // Sales Order specific
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  confirmed: { color: 'bg-green-100 text-green-800', label: 'Confirmed' },
  processing: { color: 'bg-blue-100 text-blue-800', label: 'Processing' },
  shipped: { color: 'bg-indigo-100 text-indigo-800', label: 'Shipped' },
  delivered: { color: 'bg-green-100 text-green-800', label: 'Delivered' },
  completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
  
  // Invoice specific
  paid: { color: 'bg-green-100 text-green-800', label: 'Paid' },
  partially_paid: { color: 'bg-yellow-100 text-yellow-800', label: 'Partially Paid' },
  overdue: { color: 'bg-red-100 text-red-800', label: 'Overdue' },
  refunded: { color: 'bg-orange-100 text-orange-800', label: 'Refunded' },
};

export function DocumentStatusBadge({ status, type }: DocumentStatusBadgeProps) {
  const config = statusConfig[status] || {
    color: 'bg-gray-100 text-gray-800',
    label: status,
  };

  return <Badge className={`${config.color} font-medium`}>{config.label}</Badge>;
}

