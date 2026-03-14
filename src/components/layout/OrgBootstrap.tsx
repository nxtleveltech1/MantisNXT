'use client';

import { useEffect, useRef } from 'react';
import { fetchCurrentOrg, setStoredOrg, getStoredOrgId } from '@/lib/org/current-org';

/**
 * Runs once on app load: fetches current org and sets localStorage so single-org
 * flows (Xero, financial APIs, etc.) have org_id without Clerk org.
 */
export function OrgBootstrap() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    if (getStoredOrgId()) {
      done.current = true;
      return;
    }
    done.current = true;
    fetchCurrentOrg().then((res) => {
      if (res.success && res.data?.id) {
        setStoredOrg(res.data.id, res.data.name ?? 'Default Organization');
      }
    });
  }, []);

  return null;
}
