'use client';

/**
 * Xero Sync Button Component
 * 
 * Reusable button component for triggering Xero sync operations
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, CheckCircle, XCircle, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';

interface XeroSyncButtonProps {
  entityType: 'invoice' | 'quote' | 'contact' | 'payment' | 'item' | 'purchase-order' | 'credit-note';
  entityId: string;
  onSyncComplete?: (result: { success: boolean; xeroEntityId?: string; error?: string }) => void;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function XeroSyncButton({
  entityType,
  entityId,
  onSyncComplete,
  variant = 'outline',
  size = 'sm',
  className,
}: XeroSyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; xeroEntityId?: string } | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setLastResult(null);

    try {
      const response = await fetch(`/api/xero/sync/${entityType}/${entityId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLastResult({ success: true, xeroEntityId: data.xeroEntityId });
        toast.success(`${entityType} synced to Xero successfully`);
        onSyncComplete?.({ success: true, xeroEntityId: data.xeroEntityId });
      } else {
        setLastResult({ success: false });
        toast.error(data.error || `Failed to sync ${entityType} to Xero`);
        onSyncComplete?.({ success: false, error: data.error });
      }
    } catch (error) {
      setLastResult({ success: false });
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync';
      toast.error(errorMessage);
      onSyncComplete?.({ success: false, error: errorMessage });
    } finally {
      setSyncing(false);
    }
  };

  const getIcon = () => {
    if (syncing) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (lastResult?.success) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (lastResult?.success === false) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    return <ArrowRightLeft className="h-4 w-4" />;
  };

  return (
    <Button
      onClick={handleSync}
      disabled={syncing}
      variant={variant}
      size={size}
      className={className}
    >
      {getIcon()}
      <span className={size === 'icon' ? 'sr-only' : 'ml-2'}>
        {syncing ? 'Syncing...' : lastResult?.success ? 'Synced' : 'Sync to Xero'}
      </span>
    </Button>
  );
}
