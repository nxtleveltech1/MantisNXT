'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Archive,
  ArrowLeft,
  FileText,
  LayoutDashboard,
  MessageSquare,
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
export const docustoreSidebarData = {
  navMain: [
    {
      title: 'Dashboard',
      url: '/docustore',
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: 'Documents',
      url: '/docustore',
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
        <NavUser />
        <SystemProcessingMeter />
      </SidebarFooter>
    </Sidebar>
  );
}

