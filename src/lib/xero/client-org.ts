import { setStoredOrg } from '@/lib/org/current-org';

interface SearchParamLike {
  get(name: string): string | null;
}

export function getClientXeroOrgId(searchParams?: SearchParamLike | null): string | null {
  if (typeof window === 'undefined') return null;

  const storedOrgId = localStorage.getItem('org_id');
  const urlOrgId = searchParams?.get('org_id') ?? new URLSearchParams(window.location.search).get('org_id');
  const orgId = storedOrgId || urlOrgId || null;

  if (urlOrgId && !storedOrgId) {
    setStoredOrg(urlOrgId, 'From URL');
  }

  return orgId;
}

export function buildClientXeroUrl(path: string, searchParams?: SearchParamLike | null): string {
  const orgId = getClientXeroOrgId(searchParams);
  if (!orgId) return path;

  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}org_id=${encodeURIComponent(orgId)}`;
}

export function getClientXeroHeaders(searchParams?: SearchParamLike | null): HeadersInit {
  const orgId = getClientXeroOrgId(searchParams);
  return orgId ? { 'X-Org-Id': orgId } : {};
}
