'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api/v1/pricing-intel';

// Types
export interface CompetitorProfile {
  competitor_id: string;
  org_id: string;
  company_name: string;
  website_url?: string;
  marketplace_listings?: Array<{ platform: string; url: string }>;
  social_profiles?: Array<{ network: string; url: string }>;
  custom_data_sources?: Array<{ label: string; url: string }>;
  default_currency?: string;
  proxy_policy?: Record<string, unknown>;
  captcha_policy?: Record<string, unknown>;
  robots_txt_behavior?: string;
  notes?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CompetitorDataSource {
  data_source_id: string;
  competitor_id: string;
  org_id: string;
  source_type: string;
  label?: string;
  endpoint_url: string;
  auth_config?: Record<string, unknown>;
  rate_limit_config?: Record<string, unknown>;
  health_status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCompetitorInput {
  company_name: string;
  website_url?: string;
  marketplace_listings?: Array<{ platform: string; url: string }>;
  social_profiles?: Array<{ network: string; url: string }>;
  custom_data_sources?: Array<{ label: string; url: string }>;
  default_currency?: string;
  notes?: string;
}

// Query Keys
export const competitiveIntelKeys = {
  all: ['competitive-intel'] as const,
  competitors: () => [...competitiveIntelKeys.all, 'competitors'] as const,
  competitor: (id: string) => [...competitiveIntelKeys.competitors(), id] as const,
  competitorSources: (id: string) => [...competitiveIntelKeys.competitor(id), 'sources'] as const,
  jobs: () => [...competitiveIntelKeys.all, 'jobs'] as const,
  job: (id: string) => [...competitiveIntelKeys.jobs(), id] as const,
  matches: () => [...competitiveIntelKeys.all, 'matches'] as const,
  snapshots: () => [...competitiveIntelKeys.all, 'snapshots'] as const,
  alerts: () => [...competitiveIntelKeys.all, 'alerts'] as const,
};

// Fetch functions
async function fetchCompetitors(orgId?: string): Promise<CompetitorProfile[]> {
  const params = orgId ? `?orgId=${orgId}` : '';
  const response = await fetch(`${API_BASE}/competitors${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch competitors');
  }
  const data = await response.json();
  return data.data || [];
}

async function fetchCompetitor(id: string, orgId?: string): Promise<CompetitorProfile> {
  const params = orgId ? `?orgId=${orgId}` : '';
  const response = await fetch(`${API_BASE}/competitors/${id}${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch competitor');
  }
  const data = await response.json();
  return data.data;
}

async function fetchCompetitorSources(
  competitorId: string,
  orgId?: string
): Promise<CompetitorDataSource[]> {
  const params = orgId ? `?orgId=${orgId}` : '';
  const response = await fetch(`${API_BASE}/competitors/${competitorId}/sources${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch data sources');
  }
  const data = await response.json();
  return data.data || [];
}

// Hooks
export function useCompetitors(orgId?: string) {
  return useQuery({
    queryKey: competitiveIntelKeys.competitors(),
    queryFn: () => fetchCompetitors(orgId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCompetitor(id: string | null, orgId?: string) {
  return useQuery({
    queryKey: competitiveIntelKeys.competitor(id || ''),
    queryFn: () => fetchCompetitor(id!, orgId),
    enabled: !!id,
  });
}

export function useCompetitorSources(competitorId: string | null, orgId?: string) {
  return useQuery({
    queryKey: competitiveIntelKeys.competitorSources(competitorId || ''),
    queryFn: () => fetchCompetitorSources(competitorId!, orgId),
    enabled: !!competitorId,
  });
}

export function useCreateCompetitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCompetitorInput & { orgId?: string }) => {
      const response = await fetch(`${API_BASE}/competitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create competitor');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: competitiveIntelKeys.competitors() });
    },
  });
}

export function useUpdateCompetitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateCompetitorInput> & { orgId?: string };
    }) => {
      const response = await fetch(`${API_BASE}/competitors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update competitor');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: competitiveIntelKeys.competitors() });
      queryClient.invalidateQueries({ queryKey: competitiveIntelKeys.competitor(variables.id) });
    },
  });
}

export function useDeleteCompetitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, orgId }: { id: string; orgId?: string }) => {
      const params = orgId ? `?orgId=${orgId}` : '';
      const response = await fetch(`${API_BASE}/competitors/${id}${params}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete competitor');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: competitiveIntelKeys.competitors() });
    },
  });
}

// Organization ID hook
export function useOrgId() {
  return useQuery({
    queryKey: ['organization', 'current'],
    queryFn: async () => {
      const stored = localStorage.getItem('orgId');
      if (stored) {
        return stored;
      }

      const response = await fetch('/api/v1/organizations/current');
      if (!response.ok) {
        throw new Error('Failed to fetch organization ID');
      }
      const data = await response.json();
      const orgId = data.data?.id || data.data?.org_id;
      if (orgId) {
        localStorage.setItem('orgId', orgId);
        return orgId;
      }
      throw new Error('Organization ID not found');
    },
    staleTime: Infinity,
    retry: 1,
  });
}

// Scraping Jobs
interface ScrapingJob {
  job_id: string;
  org_id: string;
  competitor_id?: string;
  job_name: string;
  schedule_type: 'manual' | 'cron' | 'interval';
  schedule_config: Record<string, unknown>;
  status: 'active' | 'paused' | 'archived';
  priority: number;
  max_concurrency: number;
  rate_limit_per_min: number;
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

interface CreateScrapingJobInput {
  orgId: string;
  job_name: string;
  competitor_id?: string;
  schedule_type: 'manual' | 'cron' | 'interval';
  schedule_config: Record<string, unknown>;
  status: 'active' | 'paused';
  priority: number;
  max_concurrency: number;
  rate_limit_per_min: number;
  metadata?: Record<string, unknown>;
}

async function fetchScrapingJobs(orgId?: string): Promise<ScrapingJob[]> {
  const params = orgId ? `?orgId=${orgId}` : '';
  const response = await fetch(`${API_BASE}/jobs${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch scraping jobs');
  }
  const data = await response.json();
  return data.data || [];
}

export function useScrapingJobs(orgId?: string) {
  return useQuery({
    queryKey: [...competitiveIntelKeys.jobs(), orgId],
    queryFn: () => fetchScrapingJobs(orgId),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useCreateScrapingJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateScrapingJobInput) => {
      const response = await fetch(`${API_BASE}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create scraping job');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: competitiveIntelKeys.jobs() });
    },
  });
}
