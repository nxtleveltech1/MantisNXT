'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Shield, 
  Settings, 
  Activity, 
  Database, 
  Key,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Server,
  RefreshCw,
  LogIn,
  LogOut,
  UserPlus,
  Lock,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { AdminSidebar } from '@/components/admin-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminDashboard, formatRelativeTime } from '@/hooks/useAdminDashboard';
import type { ActivityEvent } from '@/app/api/admin/dashboard/activity/route';
import type { ServiceStatus } from '@/app/api/admin/dashboard/status/route';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isLoading?: boolean;
}

function StatCard({ title, value, description, icon, trend, isLoading }: StatCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className={`flex items-center text-xs mt-1 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
            <TrendingUp className={`h-3 w-3 mr-1 ${!trend.isPositive && 'rotate-180'}`} />
            {trend.value}% from last month
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ActivityItemProps {
  event: ActivityEvent;
}

function ActivityItem({ event }: ActivityItemProps) {
  const statusColors = {
    success: 'text-green-500',
    warning: 'text-amber-500',
    error: 'text-red-500',
  };

  const getIcon = () => {
    switch (event.type) {
      case 'user':
        return <UserPlus className="h-4 w-4" />;
      case 'auth':
        if (event.title.toLowerCase().includes('logout')) {
          return <LogOut className="h-4 w-4" />;
        }
        return <LogIn className="h-4 w-4" />;
      case 'security':
        return <Shield className="h-4 w-4" />;
      case 'data':
        return <Database className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };
  
  return (
    <div className="flex items-start gap-4 py-3 border-b border-border last:border-0">
      <div className={`mt-0.5 ${event.status ? statusColors[event.status] : 'text-muted-foreground'}`}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{event.title}</p>
        <p className="text-xs text-muted-foreground truncate">{event.description}</p>
      </div>
      <div className="text-xs text-muted-foreground whitespace-nowrap">
        {formatRelativeTime(event.timestamp)}
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-border last:border-0">
      <Skeleton className="h-4 w-4 mt-0.5" />
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-1" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

interface ServiceStatusCardProps {
  service: ServiceStatus;
}

function ServiceStatusCard({ service }: ServiceStatusCardProps) {
  const statusConfig = {
    operational: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      label: service.message || 'Operational',
    },
    degraded: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      icon: <Clock className="h-5 w-5 text-amber-500" />,
      label: service.message || 'Degraded',
    },
    down: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      label: service.message || 'Down',
    },
  };

  const config = statusConfig[service.status];

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${config.bg} border ${config.border}`}>
      {config.icon}
      <div>
        <p className="text-sm font-medium">{service.name}</p>
        <p className="text-xs text-muted-foreground">{config.label}</p>
      </div>
    </div>
  );
}

export default function SystemAdminPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { 
    stats, 
    activity, 
    status,
    isLoading,
    isStatsLoading,
    isActivityLoading,
    isStatusLoading,
    refetch,
  } = useAdminDashboard(10);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-900"></div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <AdminSidebar />
      <SidebarInset>
        <AppHeader title="System Administration" subtitle="Platform Management & Configuration">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </AppHeader>
        <div className="flex flex-1 flex-col gap-6 p-6">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Users"
              value={stats?.totalUsers?.toLocaleString() || '0'}
              description={`${stats?.activeUsers?.toLocaleString() || '0'} active`}
              icon={<Users className="h-4 w-4" />}
              trend={stats?.usersTrend}
              isLoading={isStatsLoading}
            />
            <StatCard
              title="Active Sessions"
              value={stats?.activeSessionsCount?.toLocaleString() || '0'}
              description="Currently online"
              icon={<Activity className="h-4 w-4" />}
              isLoading={isStatsLoading}
            />
            <StatCard
              title="System Health"
              value={stats?.systemHealth?.uptimePercentage ? `${stats.systemHealth.uptimePercentage}%` : 'N/A'}
              description={stats?.systemHealth?.status === 'healthy' ? 'All systems operational' : 'Issues detected'}
              icon={<Server className="h-4 w-4" />}
              isLoading={isStatsLoading}
            />
            <StatCard
              title="Security Alerts"
              value={stats?.securityAlerts?.pending?.toString() || '0'}
              description={`${stats?.securityAlerts?.total || 0} total this month`}
              icon={<Shield className="h-4 w-4" />}
              isLoading={isStatsLoading}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest system events and user actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {isActivityLoading ? (
                    <>
                      <ActivitySkeleton />
                      <ActivitySkeleton />
                      <ActivitySkeleton />
                      <ActivitySkeleton />
                      <ActivitySkeleton />
                    </>
                  ) : activity && activity.length > 0 ? (
                    activity.slice(0, 5).map((event) => (
                      <ActivityItem key={event.id} event={event} />
                    ))
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No recent activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <button 
                    onClick={() => router.push('/admin/users')}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left"
                  >
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Manage Users</p>
                      <p className="text-xs text-muted-foreground">Add, edit, or remove users</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => router.push('/admin/roles')}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left"
                  >
                    <Key className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Roles & Permissions</p>
                      <p className="text-xs text-muted-foreground">Configure access controls</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => router.push('/admin/security')}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left"
                  >
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Security Settings</p>
                      <p className="text-xs text-muted-foreground">Review security configurations</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => router.push('/admin/settings/general')}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left"
                  >
                    <Settings className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">System Settings</p>
                      <p className="text-xs text-muted-foreground">General platform configuration</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => router.push('/admin/settings/backup')}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left"
                  >
                    <Database className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Backup & Recovery</p>
                      <p className="text-xs text-muted-foreground">Manage data backups</p>
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Current health of platform services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {isStatusLoading ? (
                  <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : status?.services && status.services.length > 0 ? (
                  status.services.map((service) => (
                    <ServiceStatusCard key={service.name} service={service} />
                  ))
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">API Services</p>
                        <p className="text-xs text-muted-foreground">Operational</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">Database</p>
                        <p className="text-xs text-muted-foreground">Healthy</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">AI Engine</p>
                        <p className="text-xs text-muted-foreground">Running</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">Background Jobs</p>
                        <p className="text-xs text-muted-foreground">0 queued</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
