'use client';

import { useEffect, useState } from 'react';

export function useXeroConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      try {
        const orgId = typeof window !== 'undefined' ? localStorage.getItem('org_id') : null;
        const url = orgId ? `/api/xero/connection?org_id=${encodeURIComponent(orgId)}` : '/api/xero/connection';
        const res = await fetch(url);
        const ct = res.headers.get('content-type') ?? '';
        const data = ct.includes('application/json') ? await res.json().catch(() => null) : null;
        setIsConnected(data?.isConnected === true || data?.connected === true);
      } catch {
        setIsConnected(false);
      } finally {
        setLoading(false);
      }
    }
    check();
  }, []);

  return { isConnected, loading };
}
