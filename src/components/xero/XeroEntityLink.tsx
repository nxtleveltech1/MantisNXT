'use client';

/**
 * Xero Entity Link Component
 * 
 * Provides a link to view an entity in Xero
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface XeroEntityLinkProps {
  entityType: 'invoice' | 'quote' | 'contact' | 'payment' | 'item' | 'purchase-order' | 'credit-note';
  entityId: string;
  xeroEntityId?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function XeroEntityLink({
  entityType,
  entityId,
  xeroEntityId: providedXeroId,
  variant = 'ghost',
  size = 'sm',
  className,
}: XeroEntityLinkProps) {
  const [xeroEntityId, setXeroEntityId] = useState<string | undefined>(providedXeroId);

  useEffect(() => {
    async function fetchXeroId() {
      if (providedXeroId) {
        setXeroEntityId(providedXeroId);
        return;
      }

      try {
        const response = await fetch(`/api/xero/sync/${entityType}/${entityId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.xeroEntityId) {
            setXeroEntityId(data.xeroEntityId);
          }
        }
      } catch (error) {
        console.error('Failed to fetch Xero entity ID:', error);
      }
    }

    fetchXeroId();
  }, [entityType, entityId, providedXeroId]);

  if (!xeroEntityId) {
    return null;
  }

  // Xero URL patterns
  const getXeroUrl = () => {
    const baseUrl = 'https://go.xero.com';
    switch (entityType) {
      case 'invoice':
        return `${baseUrl}/AccountsReceivable/View.aspx?InvoiceID=${xeroEntityId}`;
      case 'quote':
        return `${baseUrl}/Accounts/Receivable/Quotes/View/${xeroEntityId}`;
      case 'contact':
        return `${baseUrl}/Contacts/View.aspx?contactID=${xeroEntityId}`;
      case 'payment':
        return `${baseUrl}/AccountsReceivable/View.aspx?InvoiceID=${xeroEntityId}`;
      case 'item':
        return `${baseUrl}/Settings/ProductAndServices.aspx`;
      case 'purchase-order':
        return `${baseUrl}/Purchase/View.aspx?PurchaseOrderID=${xeroEntityId}`;
      case 'credit-note':
        return `${baseUrl}/AccountsReceivable/View.aspx?CreditNoteID=${xeroEntityId}`;
      default:
        return baseUrl;
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      asChild
    >
      <a
        href={getXeroUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2"
      >
        <ExternalLink className="h-4 w-4" />
        <span className={size === 'icon' ? 'sr-only' : ''}>View in Xero</span>
      </a>
    </Button>
  );
}
