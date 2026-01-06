'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Shield, 
  Settings, 
  Activity, 
  Database, 
  Bell,
  Building2,
  Key,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Server,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { AdminSidebar } from '@/components/admin-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatCard({ title, value, description, icon, trend }: StatCardProps) {
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
  icon: React.ReactNode;
  title: string;
  description: string;
  time: string;
  status?: 'success' | 'warning' | 'error';
}

function ActivityItem({ icon, title, description, time, status }: ActivityItemProps) {
  const statusColors = {
    success: 'text-green-500',
    warning: 'text-amber-500',
    error: 'text-red-500',
  };
  
  return (
    <div className="flex items-start gap-4 py-3 border-b border-border last:border-0">
      <div className={`mt-0.5 ${status ? statusColors[status] : 'text-muted-foreground'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <div className="text-xs text-muted-foreground whitespace-nowrap">
        {time}
      </div>
    </div>
  );
}

export default function SystemAdminPage() {
  const { isLoading, isAuthenticated, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
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
        <AppHeader title="System Administration" subtitle="Platform Management & Configuration" />
        <div className="flex flex-1 flex-col gap-6 p-6">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Users"
              value="2,847"
              description="Active platform users"
              icon={<Users className="h-4 w-4" />}
              trend={{ value: 12, isPositive: true }}
            />
            <StatCard
              title="Active Sessions"
              value="342"
              description="Currently online"
              icon={<Activity className="h-4 w-4" />}
            />
            <StatCard
              title="System Health"
              value="99.8%"
              description="Uptime this month"
              icon={<Server className="h-4 w-4" />}
            />
            <StatCard
              title="Security Alerts"
              value="3"
              description="Pending review"
              icon={<Shield className="h-4 w-4" />}
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
                  <ActivityItem
                    icon={<Users className="h-4 w-4" />}
                    title="New user registered"
                    description="john.smith@company.com joined the platform"
                    time="2 min ago"
                    status="success"
                  />
                  <ActivityItem
                    icon={<Key className="h-4 w-4" />}
                    title="Role permission updated"
                    description="Manager role granted export permissions"
                    time="15 min ago"
                  />
                  <ActivityItem
                    icon={<AlertTriangle className="h-4 w-4" />}
                    title="Failed login attempt"
                    description="Multiple attempts from IP 192.168.1.45"
                    time="1 hour ago"
                    status="warning"
                  />
                  <ActivityItem
                    icon={<Database className="h-4 w-4" />}
                    title="Database backup completed"
                    description="Full backup saved to cloud storage"
                    time="3 hours ago"
                    status="success"
                  />
                  <ActivityItem
                    icon={<Settings className="h-4 w-4" />}
                    title="System settings updated"
                    description="Currency format changed to ZAR"
                    time="5 hours ago"
                  />
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
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">Background Jobs</p>
                    <p className="text-xs text-muted-foreground">3 queued</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
