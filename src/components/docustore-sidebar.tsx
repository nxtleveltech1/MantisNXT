'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Archive,
  ArrowLeft,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  PenTool,
  Plus,
  Send,
  Settings as SettingsIcon,
  Users,
  FileStack,
  CheckCircle2,
  Clock,
  AlertCircle,
  History,
  Bell,
  Shield,
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
} from '@/components/ui/sidebar';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';

export const docustoreSidebarData = {
  user: {
    name: 'John Doe',
    email: 'admin@mantisnxt.com',
    avatar: '/avatars/jd.jpg',
  },
  navMain: [
    {
      title: 'Dashboard',
      url: '/docustore',
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: 'Documents',
      url: '/docustore/documents',
      icon: FileText,
      items: [
        {
          title: 'All Documents',
          url: '/docustore',
        },
        {
          title: 'Upload Document',
          url: '/docustore/new',
        },
        {
          title: 'Bulk Send',
          url: '/docustore/bulk-send',
        },
      ],
    },
    {
      title: 'Templates',
      url: '/docustore/templates',
      icon: FileStack,
      items: [
        {
          title: 'All Templates',
          url: '/docustore/templates',
        },
        {
          title: 'Create Template',
          url: '/docustore/templates/new',
        },
      ],
    },
    {
      title: 'Signing Workflows',
      url: '/docustore/signing',
      icon: PenTool,
      items: [
        {
          title: 'Pending My Signature',
          url: '/docustore/signing?status=pending_your_signature',
        },
        {
          title: 'Pending Others',
          url: '/docustore/signing?status=pending_other_signatures',
        },
        {
          title: 'Completed',
          url: '/docustore/signing?status=completed',
        },
        {
          title: 'Voided',
          url: '/docustore/signing?status=voided',
        },
      ],
    },
    {
      title: 'Folders',
      url: '/docustore/folders',
      icon: FolderOpen,
      items: [
        {
          title: 'Manage Folders',
          url: '/docustore/folders',
        },
        {
          title: 'Shared with Me',
          url: '/docustore/folders/shared',
        },
      ],
    },
    {
      title: 'Team',
      url: '/docustore/team',
      icon: Users,
      items: [
        {
          title: 'Team Members',
          url: '/docustore/team',
        },
        {
          title: 'Permissions',
          url: '/docustore/team/permissions',
        },
      ],
    },
    {
      title: 'Activity',
      url: '/docustore/activity',
      icon: History,
      items: [
        {
          title: 'Recent Activity',
          url: '/docustore/activity',
        },
        {
          title: 'Audit Log',
          url: '/docustore/activity/audit',
        },
      ],
    },
    {
      title: 'Settings',
      url: '/docustore/settings',
      icon: SettingsIcon,
      items: [
        {
          title: 'General',
          url: '/docustore/settings',
        },
        {
          title: 'Notifications',
          url: '/docustore/settings/notifications',
        },
        {
          title: 'Integrations',
          url: '/docustore/settings/integrations',
        },
        {
          title: 'Branding',
          url: '/docustore/settings/branding',
        },
      ],
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

export function DocustoreSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [logoError, setLogoError] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  return (
    <Sidebar variant="sidebar" {...props}>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-center p-4">
          <Link href="/docustore" className="flex items-center justify-center w-full">
            <div className="relative flex items-center justify-center w-full min-h-[64px] rounded-lg p-2">
              {!logoError ? (
                <Image
                  src="/images/logo.svg"
                  alt="MantisNXT DocuStore"
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
                  <Archive className="h-8 w-8" />
                  <span className="text-xl font-bold">DocuStore</span>
                </div>
              )}
            </div>
          </Link>
        </div>
        {/* DocuStore Badge */}
        <div className="px-4 pb-2">
          <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-md bg-violet-900/30 border border-violet-800/50">
            <Archive className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-medium text-violet-400 uppercase tracking-wider">
              Document Store
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={docustoreSidebarData.navMain} label={null} />
        <NavSecondary items={docustoreSidebarData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="space-y-2 border-t border-sidebar-border pt-2">
        <NavUser user={docustoreSidebarData.user} />
        <SystemProcessingMeter />
      </SidebarFooter>
    </Sidebar>
  );
}

