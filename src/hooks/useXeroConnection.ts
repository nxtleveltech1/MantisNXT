'use client';

import { useEffect, useState } from 'react';

export function useXeroConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/xero/connection');
        const data = await res.json();
        setIsConnected(data.isConnected === true || data.connected === true);
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
