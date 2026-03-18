'use client';

/**
 * Xero Sync Status Component
 *
 * Displays the sync status badge for an entity
 */

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { buildClientXeroUrl, getClientXeroHeaders } from '@/lib/xero/client-org';
import { getXeroSyncPathSegment, safeParseJson } from './xero-sync-utils';
import type { XeroSyncEntityType } from './xero-sync-utils';

interface XeroSyncStatusProps {
  entityType: XeroSyncEntityType;
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
        const pathSegment = getXeroSyncPathSegment(entityType);
        const response = await fetch(buildClientXeroUrl(`/api/xero/sync/${pathSegment}/${entityId}`), {
          headers: getClientXeroHeaders(),
        });
        const data = await safeParseJson<SyncStatus>(response);
        if (response.ok && data) {
          setStatus(data);
        }
      } catch (error) {
        console.error('Failed to fetch sync status:', error);
      } finally {
        setLoading(false);
      }
    }

    void fetchStatus();
  }, [entityType, entityId]);

  if (loading) {
    return (
      <Badge variant="secondary" className={className}>
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        Checking...
      </Badge>
    );
  }

  if (!status) {
    return (
      <Badge variant="secondary" className={className}>
        <Clock className="mr-1 h-3 w-3" />
        Not Synced
      </Badge>
    );
  }

  if (status.error) {
    return (
      <Badge variant="destructive" className={className}>
        <XCircle className="mr-1 h-3 w-3" />
        Error
      </Badge>
    );
  }

  if (status.synced && status.xeroEntityId) {
    return (
      <Badge variant="default" className={className}>
        <CheckCircle className="mr-1 h-3 w-3" />
        Synced
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={className}>
      <Clock className="mr-1 h-3 w-3" />
      Not Synced
    </Badge>
  );
}
