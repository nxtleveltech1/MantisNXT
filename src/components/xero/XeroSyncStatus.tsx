'use client';

/**
 * Xero Sync Status Component
 * 
 * Displays the sync status badge for an entity
 */

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

interface XeroSyncStatusProps {
  entityType: 'invoice' | 'quote' | 'contact' | 'payment' | 'item' | 'purchase-order' | 'credit-note';
  entityId: string;
  className?: string;
}

interface SyncStatus {
  synced: boolean;
  xeroEntityId?: string;
  lastSyncedAt?: string;
  error?: string;
}

export function XeroSyncStatus({ entityType, entityId, className }: XeroSyncStatusProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch(`/api/xero/sync/${entityType}/${entityId}`);
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (error) {
        console.error('Failed to fetch sync status:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, [entityType, entityId]);

  if (loading) {
    return (
      <Badge variant="secondary" className={className}>
        <Loader2 className="h-3 w-3 animate-spin mr-1" />
        Checking...
      </Badge>
    );
  }

  if (!status) {
    return (
      <Badge variant="secondary" className={className}>
        <Clock className="h-3 w-3 mr-1" />
        Not Synced
      </Badge>
    );
  }

  if (status.error) {
    return (
      <Badge variant="destructive" className={className}>
        <XCircle className="h-3 w-3 mr-1" />
        Error
      </Badge>
    );
  }

  if (status.synced && status.xeroEntityId) {
    return (
      <Badge variant="default" className={className}>
        <CheckCircle className="h-3 w-3 mr-1" />
        Synced
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={className}>
      <Clock className="h-3 w-3 mr-1" />
      Not Synced
    </Badge>
  );
}
