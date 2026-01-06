'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Activity,
  Bot,
  Building2,
  FileText,
  Gift,
  LayoutDashboard,
  MessageSquare,
  Plug,
  Shield,
  Users,
  Settings as SettingsIcon,
  Database,
  Key,
  Bell,
  Globe,
  Server,
  Lock,
  Eye,
  ClipboardList,
  Workflow,
  DollarSign,
  ArrowLeft,
} from 'lucide-react';

import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import { SystemProcessingMeter } from '@/components/sidebar/InventoryValueMeter';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export const adminSidebarData = {
  user: {
    name: 'John Doe',
    email: 'admin@mantisnxt.com',
    avatar: '/avatars/jd.jpg',
  },
  navMain: [
    {
      title: 'Admin Dashboard',
      url: '/system-admin',
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: 'User Management',
      url: '/admin/users',
      icon: Users,
      items: [
        {
          title: 'All Users',
          url: '/admin/users',
        },
        {
          title: 'Add User',
          url: '/admin/users/bulk',
        },
        {
          title: 'Roles & Permissions',
          url: '/admin/roles',
        },
        {
          title: 'Permission Matrix',
          url: '/admin/roles/permissions',
        },
      ],
    },
    {
      title: 'Security',
      url: '/admin/security',
      icon: Shield,
      items: [
        {
          title: 'Overview',
          url: '/admin/security',
        },
        {
          title: 'Access Logs',
          url: '/admin/security/access-logs',
        },
        {
          title: 'IP Whitelist',
          url: '/admin/security/ip-whitelist',
        },
        {
          title: 'Data Encryption',
          url: '/admin/security/data-encryption',
        },
        {
          title: 'Compliance',
          url: '/admin/security/compliance',
        },
      ],
    },
    {
      title: 'Organizations',
      url: '/admin/organizations',
      icon: Building2,
      items: [
        {
          title: 'All Organizations',
          url: '/admin/organizations',
        },
        {
          title: 'Billing',
          url: '/admin/organizations/billing',
        },
      ],
    },
    {
      title: 'System Settings',
      url: '/admin/settings/general',
      icon: SettingsIcon,
      items: [
        {
          title: 'General',
          url: '/admin/settings/general',
        },
        {
          title: 'Currency & Tax',
          url: '/admin/settings/currency',
        },
        {
          title: 'Regional',
          url: '/admin/settings/regional',
        },
        {
          title: 'Localization',
          url: '/admin/settings/localization',
        },
        {
          title: 'Financial',
          url: '/admin/settings/financial',
        },
        {
          title: 'Module Visibility',
          url: '/admin/settings/module-visibility',
        },
      ],
    },
    {
      title: 'Notifications',
      url: '/admin/settings/email',
      icon: Bell,
      items: [
        {
          title: 'Email Settings',
          url: '/admin/settings/email',
        },
      ],
    },
    {
      title: 'Integrations',
      url: '/admin/settings/integrations',
      icon: Plug,
      items: [
        {
          title: 'Connected Apps',
          url: '/admin/settings/integrations',
        },
      ],
    },
    {
      title: 'AI Services',
      url: '/admin/ai/config',
      icon: Bot,
      items: [
        {
          title: 'Configuration',
          url: '/admin/ai/config',
        },
        {
          title: 'Health Monitor',
          url: '/admin/ai/health',
        },
        {
          title: 'Metrics',
          url: '/admin/ai/metrics',
        },
        {
          title: 'Anomalies',
          url: '/admin/ai/anomalies',
        },
      ],
    },
    {
      title: 'Pricing Admin',
      url: '/admin/pricing/automation',
      icon: DollarSign,
      items: [
        {
          title: 'Automation Rules',
          url: '/admin/pricing/automation',
        },
        {
          title: 'Review Queue',
          url: '/admin/pricing/review-queue',
        },
      ],
    },
    {
      title: 'Supplier Admin',
      url: '/admin/supplier-profiles',
      icon: Building2,
      items: [
        {
          title: 'Supplier Profiles',
          url: '/admin/supplier-profiles',
        },
        {
          title: 'Supplier Rules',
          url: '/admin/supplier-rules',
        },
      ],
    },
    {
      title: 'Audit & Logs',
      url: '/admin/audit',
      icon: ClipboardList,
      items: [
        {
          title: 'Audit Trail',
          url: '/admin/audit',
        },
        {
          title: 'System Monitoring',
          url: '/admin/monitoring/dashboard',
        },
      ],
    },
    {
      title: 'Backup & Recovery',
      url: '/admin/settings/backup',
      icon: Database,
      items: [
        {
          title: 'Backup Settings',
          url: '/admin/settings/backup',
        },
      ],
    },
    {
      title: 'Loyalty Program',
      url: '/admin/loyalty/programs',
      icon: Gift,
      items: [
        {
          title: 'Programs',
          url: '/admin/loyalty/programs',
        },
        {
          title: 'Rewards',
          url: '/admin/loyalty/rewards',
        },
        {
          title: 'Rules',
          url: '/admin/loyalty/rules',
        },
        {
          title: 'Redemptions',
          url: '/admin/loyalty/redemptions',
        },
        {
          title: 'Analytics',
          url: '/admin/loyalty/analytics',
        },
      ],
    },
    {
      title: 'Workflows',
      url: '/admin/config/workflows',
      icon: Workflow,
    },
  ],
  navSecondary: [
    {
      title: 'Back to Portal',
      url: '/portal',
      icon: ArrowLeft,
    },
    {
      title: 'Support',
      url: '/support',
      icon: MessageSquare,
    },
  ],
};

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [logoError, setLogoError] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  return (
    <Sidebar variant="sidebar" {...props}>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-center p-4">
          <Link href="/system-admin" className="flex items-center justify-center w-full">
            <div className="relative flex items-center justify-center w-full min-h-[64px] rounded-lg p-2">
              {!logoError ? (
                <Image
                  src="/images/logo.svg"
                  alt="MantisNXT Admin"
                  width={200}
                  height={60}
                  className="w-full h-full object-contain"
                  priority
                  unoptimized
                  onError={(e) => {
                    console.warn('Logo failed to load, using fallback');
                    setLogoError(true);
                  }}
                />
              ) : (
                <div className="flex items-center gap-2 text-white">
                  <Shield className="h-8 w-8" />
                  <span className="text-xl font-bold">System Admin</span>
                </div>
              )}
            </div>
          </Link>
        </div>
        {/* Admin Badge */}
        <div className="px-4 pb-2">
          <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-md bg-red-900/30 border border-red-800/50">
            <Shield className="h-4 w-4 text-red-400" />
            <span className="text-xs font-medium text-red-400 uppercase tracking-wider">
              System Administration
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={adminSidebarData.navMain} label={null} />
        <NavSecondary items={adminSidebarData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="space-y-2 border-t border-sidebar-border pt-2">
        <NavUser user={adminSidebarData.user} />
        <SystemProcessingMeter />
      </SidebarFooter>
    </Sidebar>
  );
}

