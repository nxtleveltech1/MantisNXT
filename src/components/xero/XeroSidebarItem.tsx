'use client';

/**
 * Xero Sidebar Item with Status Indicator
 * 
 * Renders Xero sidebar item with connection status indicator
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarMenuSubButton } from '@/components/ui/sidebar';
import { Circle } from 'lucide-react';

interface XeroConnectionStatus {
  connected: boolean;
  tokenExpiring?: boolean;
}

export function XeroSidebarItem() {
  const pathname = usePathname();
  const [status, setStatus] = useState<XeroConnectionStatus | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch('/api/xero/connection');
        if (response.ok) {
          const data = await response.json();
          setStatus({
            connected: data.connected || false,
            tokenExpiring: data.connection?.tokenStatus?.isExpired || false,
          });
        }
      } catch (error) {
        console.error('Failed to fetch Xero status:', error);
      }
    }
    fetchStatus();
  }, []);

  const getStatusColor = () => {
    if (!status) return 'text-muted-foreground';
    if (status.tokenExpiring) return 'text-yellow-500';
    if (status.connected) return 'text-green-500';
    return 'text-red-500';
  };

  return (
    <SidebarMenuSubButton asChild isActive={pathname === '/integrations/xero'}>
      <Link href="/integrations/xero" className="flex items-center gap-2">
        <span>Xero Accounting</span>
        {status && (
          <Circle className={`h-2 w-2 fill-current ${getStatusColor()}`} />
        )}
      </Link>
    </SidebarMenuSubButton>
  );
}
