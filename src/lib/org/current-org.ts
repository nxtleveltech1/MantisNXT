/**
 * Current organization bootstrap for single-org / API context.
 * Used by header to set localStorage org_id and show current org name.
 */

const STORAGE_KEY = 'org_id';
const NAME_KEY = 'org_name';

export function getStoredOrgId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function getStoredOrgName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(NAME_KEY);
}

export function setStoredOrg(id: string, name?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, id);
  if (name != null) localStorage.setItem(NAME_KEY, name);
}

export interface CurrentOrgResponse {
  success: boolean;
  data?: { id: string; name?: string; slug?: string; source?: string };
  error?: string;
}

export async function fetchCurrentOrg(): Promise<CurrentOrgResponse> {
  const res = await fetch('/api/v1/organizations/current');
  const ct = res.headers.get('content-type') ?? '';
  const data = ct.includes('application/json') ? await res.json().catch(() => null) : null;
  if (!res.ok || !data?.success || !data?.data?.id) {
    return { success: false, error: data?.error ?? 'Failed to load organization' };
  }
  return { success: true, data: data.data };
}
