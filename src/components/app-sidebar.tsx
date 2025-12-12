'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Activity,
  Bot,
  Building2,
  DollarSign,
  FileText,
  Gift,
  LayoutDashboard,
  MessageSquare,
  Package,
  Plug,
  Receipt,
  ShoppingBag,
  Tag,
  TrendingUp,
  Users,
  Settings as SettingsIcon,
} from 'lucide-react';

import { NavMain } from '@/components/nav-main';
import { NavProjects } from '@/components/nav-projects';
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

export const sidebarData = {
  user: {
    name: 'John Doe',
    email: 'admin@mantisnxt.com',
    avatar: '/avatars/jd.jpg',
  },
  navMain: [
    {
      title: 'Dashboard (AI)',
      url: '/',
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: 'Analytics',
      url: '/analytics',
      icon: TrendingUp,
    },
    {
      title: 'System Health',
      url: '/system-health',
      icon: Activity,
    },
    {
      title: 'Suppliers',
      url: '/suppliers',
      icon: Building2,
      items: [
        {
          title: 'Supplier Dashboard',
          url: '/suppliers',
        },
        {
          title: 'Supplier Inventory Portfolio',
          url: '/nxt-spp',
        },
        {
          title: 'AI Price Extraction',
          url: '/nxt-spp?tab=ai-price-extraction',
        },
        {
          title: 'Supplier Rules Engine',
          url: '/nxt-spp/rules',
        },
        {
          title: 'Supplier Profiles',
          url: '/nxt-spp/profiles',
        },
        {
          title: 'Supplier Directory',
          url: '/directories/suppliers',
        },
      ],
    },
    {
      title: 'Product Management',
      url: '/catalog/categories',
      icon: ShoppingBag,
      items: [
        {
          title: 'Inventory',
          url: '/inventory',
          icon: Package,
        },
        {
          title: 'Locations',
          url: '/inventory/locations',
        },
        {
          title: 'Categories',
          url: '/catalog/categories',
          items: [
            {
              title: 'Dashboard',
              url: '/catalog/categories',
            },
            {
              title: 'AI Categorization',
              url: '/catalog/categories/ai-categorization',
            },
            {
              title: 'Categories',
              url: '/catalog/categories/categories',
            },
            {
              title: 'Analytics',
              url: '/catalog/categories/analytics',
            },
            {
              title: 'Exceptions',
              url: '/catalog/categories/exceptions',
            },
          ],
        },
        {
          title: 'Tags',
          url: '/catalog/tags/ai-tagging',
          icon: Tag,
        },
        {
          title: 'Meta Data',
          url: '/catalog/metadata',
        },
        {
          title: 'Pricing Optimization',
          url: '/pricing-optimization',
          items: [
            {
              title: 'Overview',
              url: '/pricing-optimization',
            },
            {
              title: 'Rules',
              url: '/pricing-optimization/rules',
            },
            {
              title: 'Optimization Runs',
              url: '/pricing-optimization/optimization',
            },
            {
              title: 'Analytics',
              url: '/pricing-optimization/analytics',
            },
            {
              title: 'Competitive Intelligence',
              url: '/pricing-optimization/competitive-intelligence',
            },
            {
              title: 'Competitors',
              url: '/pricing-optimization/competitive-intelligence/competitors',
            },
            {
              title: 'Scraping Jobs',
              url: '/pricing-optimization/competitive-intelligence/jobs',
            },
            {
              title: 'Product Matches',
              url: '/pricing-optimization/competitive-intelligence/matches',
            },
            {
              title: 'Alerts',
              url: '/pricing-optimization/competitive-intelligence/alerts',
            },
            {
              title: 'Price Positioning',
              url: '/pricing-optimization/competitive-intelligence/positioning',
            },
            {
              title: 'Price History',
              url: '/pricing-optimization/competitive-intelligence/history',
            },
            {
              title: 'Trend Analysis',
              url: '/pricing-optimization/competitive-intelligence/trends',
            },
            {
              title: 'Settings',
              url: '/pricing-optimization/competitive-intelligence/settings',
            },
          ],
        },
      ],
    },
    {
      title: 'Customers',
      url: '/customers',
      icon: Users,
      items: [
        {
          title: 'All Customers',
          url: '/customers',
        },
        {
          title: 'Add Customer',
          url: '/customers/new',
        },
      ],
    },
    {
      title: 'Sales Services',
      url: '/sales/quotations',
      icon: FileText,
      items: [
        {
          title: 'Quotations',
          url: '/sales/quotations',
        },
        {
          title: 'Sales Orders',
          url: '/sales/sales-orders',
        },
        {
          title: 'Proforma Invoices',
          url: '/sales/proforma-invoices',
        },
        {
          title: 'Invoices',
          url: '/sales/invoices',
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
          title: 'Assistant',
          url: '/admin/ai/assistant',
        },
        {
          title: 'Predictions',
          url: '/admin/ai/predictions',
        },
        {
          title: 'Forecasts',
          url: '/admin/ai/forecasts',
        },
        {
          title: 'Alerts',
          url: '/admin/ai/alerts',
        },
        {
          title: 'Dashboards',
          url: '/admin/ai/dashboards',
        },
        {
          title: 'Health Monitor',
          url: '/admin/ai/health',
        },
      ],
    },
    {
      title: 'Financial',
      url: '/financial/invoices',
      icon: DollarSign,
      items: [
        {
          title: 'Sales',
          url: '/financial/sales',
          items: [
            {
              title: 'Online',
              url: '/financial/sales/online',
            },
            {
              title: 'In-Store',
              url: '/financial/sales/in-store',
            },
          ],
        },
        {
          title: 'Invoices',
          url: '/financial/invoices',
        },
        {
          title: 'Payments',
          url: '/financial/payments',
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: 'System Integration',
      url: '/system/integrations',
      icon: Plug,
      items: [
        {
          title: 'Integrations',
          url: '/system/integrations',
        },
        {
          title: 'API Settings',
          url: '/system/api',
        },
      ],
    },
    {
      title: 'Administration',
      url: '/admin/settings/general',
      icon: SettingsIcon,
      items: [
        {
          title: 'Users & Accounts',
          url: '/admin/users',
        },
        {
          title: 'Roles & Permissions',
          url: '/admin/roles',
        },
        {
          title: 'General Settings',
          url: '/admin/settings/general',
        },
        {
          title: 'Currency & Tax',
          url: '/admin/settings/currency',
        },
        {
          title: 'Regional Settings',
          url: '/admin/settings/regional',
        },
        {
          title: 'Email & Notifications',
          url: '/admin/settings/email',
        },
        {
          title: 'Backup & Recovery',
          url: '/admin/settings/backup',
        },
        {
          title: 'Integrations',
          url: '/admin/settings/integrations',
        },
      ],
    },
    {
      title: 'Support',
      url: '/support',
      icon: MessageSquare,
    },
  ],
  projects: [
    {
      name: 'Loyalty',
      url: '/admin/loyalty/programs',
      icon: Gift,
    },
    {
      name: 'Communication',
      url: '/communication/messages',
      icon: MessageSquare,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [logoError, setLogoError] = useState(false);

  return (
    <Sidebar variant="sidebar" {...props}>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-center p-4">
          <Link href="/" className="flex items-center justify-center w-full">
            <div className="relative flex items-center justify-center w-full min-h-[64px] rounded-lg p-2">
              {!logoError ? (
                <Image
                  src="/images/logo.svg"
                  alt="MantisNXT"
                  width={200}
                  height={60}
                  className="w-full h-full object-contain"
                  priority
                  unoptimized
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="flex items-center gap-2 text-white">
                  <Building2 className="h-8 w-8" />
                  <span className="text-xl font-bold">MantisNXT</span>
                </div>
              )}
            </div>
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarData.navMain} label={null} />
        <NavProjects projects={sidebarData.projects} />
        {sidebarData.navSecondary.length ? (
          <NavSecondary items={sidebarData.navSecondary} className="mt-auto" />
        ) : null}
      </SidebarContent>
      <SidebarFooter className="space-y-2 border-t border-sidebar-border pt-2">
        <NavUser user={sidebarData.user} />
        <SystemProcessingMeter />
      </SidebarFooter>
    </Sidebar>
  );
}
