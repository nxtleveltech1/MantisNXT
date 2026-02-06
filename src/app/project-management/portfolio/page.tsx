'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Request failed');
  return data.data as T;
}

export default function PortfolioPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: portfolios } = useQuery({
    queryKey: ['pm-portfolios'],
    queryFn: () => fetchJson<Array<any>>('/api/v1/project-management/portfolio'),
  });

  const createPortfolio = useMutation({
    mutationFn: async () => fetchJson('/api/v1/project-management/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    }),
    onSuccess: async () => {
      toast({ title: 'Portfolio created' });
      setDialogOpen(false);
      setName('');
      setDescription('');
      await queryClient.invalidateQueries({ queryKey: ['pm-portfolios'] });
    },
  });

  return (
    <AppLayout
      title="Portfolio"
      breadcrumbs={[{ label: 'Project Management', href: '/project-management' }, { label: 'Portfolio' }]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Portfolio</h2>
            <p className="text-muted-foreground">Group projects into strategic portfolios.</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>New Portfolio</Button>
        </div>

        <div className="space-y-4">
          {(portfolios || []).length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">No portfolios yet.</CardContent>
            </Card>
          ) : (
            portfolios?.map(portfolio => (
              <Card key={portfolio.portfolio_id}>
                <CardHeader>
                  <CardTitle>{portfolio.name}</CardTitle>
                  <CardDescription>{portfolio.description || 'No description'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" size="sm" onClick={() => setExpanded(expanded === portfolio.portfolio_id ? null : portfolio.portfolio_id)}>
                    {expanded === portfolio.portfolio_id ? 'Hide Projects' : 'View Projects'}
                  </Button>
                  {expanded === portfolio.portfolio_id && (
                    <PortfolioProjects portfolioId={portfolio.portfolio_id} />
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Portfolio</DialogTitle>
            <DialogDescription>Group projects under a shared portfolio.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="portfolio-name">Name</Label>
              <Input id="portfolio-name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio-description">Description</Label>
              <Input id="portfolio-description" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createPortfolio.mutate()} disabled={!name.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function PortfolioProjects({ portfolioId }: { portfolioId: string }) {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['pm-portfolio-projects', portfolioId],
    queryFn: () => fetchJson<Array<any>>(`/api/v1/project-management/portfolio/${portfolioId}/projects`),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading projects...</div>;
  if (!projects || projects.length === 0) return <div className="text-sm text-muted-foreground">No projects assigned.</div>;

  return (
    <div className="space-y-2">
      {projects.map(project => (
        <div key={project.project_id} className="flex items-center justify-between rounded border p-3">
          <div>
            <div className="text-sm font-medium">{project.name}</div>
            <div className="text-xs text-muted-foreground">{project.status}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
