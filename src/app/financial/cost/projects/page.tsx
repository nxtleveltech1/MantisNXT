/**
 * Cost Management - Projects Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface Project {
  id: string;
  code: string;
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  budget: number;
  actual_cost: number;
  status: string;
  manager?: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const response = await fetch(`/api/v1/financial/cost/projects?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setProjects(result.data || []);
        } else {
          setProjects([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setProjects([]);
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      on_hold: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      planning: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AppLayout
      title="Projects"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Cost Management', href: '/financial/cost/centers' },
        { label: 'Projects' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Manage project costing and tracking</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Active and completed projects</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="text-sm text-muted-foreground">No projects found</div>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => {
                  const variance = project.budget - project.actual_cost;
                  const variancePercent = project.budget > 0 
                    ? ((variance / project.budget) * 100).toFixed(1) 
                    : '0';
                  
                  return (
                    <div key={project.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{project.code}</span>
                          <span className="font-medium">{project.name}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(project.status)}`}>
                            {project.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(project.start_date).toLocaleDateString()}
                          {project.end_date && ` - ${new Date(project.end_date).toLocaleDateString()}`}
                          {project.manager && ` | Manager: ${project.manager}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          Budget: {formatCurrency(project.budget)}
                        </div>
                        <div className="text-sm">
                          Actual: {formatCurrency(project.actual_cost)}
                        </div>
                        <div className={`text-xs ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {variance >= 0 ? 'Under budget: ' : 'Over budget: '}
                          {formatCurrency(Math.abs(variance))} ({variancePercent}%)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

