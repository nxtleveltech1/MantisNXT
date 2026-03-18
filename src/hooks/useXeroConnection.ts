'use client';

import { useEffect, useState } from 'react';
import { buildClientXeroUrl, getClientXeroHeaders } from '@/lib/xero/client-org';

export function useXeroConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      try {
        const response = await fetch(buildClientXeroUrl('/api/xero/connection'), {
          headers: getClientXeroHeaders(),
        });
        const contentType = response.headers.get('content-type') ?? '';
        const data = contentType.includes('application/json') ? await response.json().catch(() => null) : null;
        setIsConnected(data?.isConnected === true || data?.connected === true);
      } catch {
        setIsConnected(false);
      } finally {
        setLoading(false);
      }
    }

    void check();

    const handler = () => {
      setLoading(true);
      void check();
    };

    window.addEventListener('org-changed', handler);
    return () => window.removeEventListener('org-changed', handler);
  }, []);

  return { isConnected, loading };
}
