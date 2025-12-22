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
  Archive,
  CheckSquare,
  Truck,
  MapPin,
  Route,
  Store,
  Wrench,
  Calendar,
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
import { useModuleVisibility } from '@/hooks/useModuleVisibility';
import { useAuth } from '@/lib/auth/auth-context';
import { isAdmin } from '@/lib/auth/auth-helper';

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
      title: 'Project Management',
      url: '/project-management',
      icon: CheckSquare,
      items: [
        {
          title: 'Tasks',
          url: '/project-management',
        },
        {
          title: 'Settings',
          url: '/project-management/settings',
        },
      ],
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
      title: 'Sales Channels',
      url: '/sales-channels',
      icon: Store,
      items: [
        {
          title: 'WooCommerce',
          url: '/sales-channels?channel=woocommerce',
        },
        {
          title: 'WhatsApp',
          url: '/sales-channels?channel=whatsapp',
        },
        {
          title: 'Facebook',
          url: '/sales-channels?channel=facebook',
        },
        {
          title: 'Instagram',
          url: '/sales-channels?channel=instagram',
        },
        {
          title: 'TikTok',
          url: '/sales-channels?channel=tiktok',
        },
      ],
    },
    {
      title: 'Courier Logistics',
      url: '/logistics/dashboard',
      icon: Truck,
      items: [
        {
          title: 'Dashboard',
          url: '/logistics/dashboard',
        },
        {
          title: 'Deliveries',
          url: '/logistics/deliveries',
        },
        {
          title: 'New Delivery',
          url: '/logistics/deliveries/new',
        },
        {
          title: 'Courier Providers',
          url: '/logistics/couriers',
        },
        {
          title: 'Route Planning',
          url: '/logistics/routes',
        },
        {
          title: 'Tracking',
          url: '/logistics/tracking',
        },
        {
          title: 'Reports',
          url: '/logistics/reports',
        },
        {
          title: 'Settings',
          url: '/logistics/settings',
        },
      ],
    },
    {
      title: 'Rentals',
      url: '/rentals',
      icon: Calendar,
      items: [
        {
          title: 'Dashboard',
          url: '/rentals',
        },
        {
          title: 'Equipment',
          url: '/rentals/equipment',
        },
        {
          title: 'Reservations',
          url: '/rentals/reservations',
        },
        {
          title: 'New Reservation',
          url: '/rentals/reservations/new',
        },
        {
          title: 'Packages',
          url: '/rentals/packages',
        },
        {
          title: 'Damage Reports',
          url: '/rentals/damage',
        },
      ],
    },
    {
      title: 'Repairs Workshop',
      url: '/repairs',
      icon: Wrench,
      items: [
        {
          title: 'Dashboard',
          url: '/repairs',
        },
        {
          title: 'Repair Orders',
          url: '/repairs/orders',
        },
        {
          title: 'New Repair Order',
          url: '/repairs/orders/new',
        },
        {
          title: 'Technicians',
          url: '/repairs/technicians',
        },
        {
          title: 'Preventive Maintenance',
          url: '/repairs/preventive-maintenance',
        },
        {
          title: 'Parts Inventory',
          url: '/repairs/parts',
        },
      ],
    },
    {
      title: 'DocuStore',
      url: '/docustore',
      icon: Archive,
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
      url: '/financial',
      icon: DollarSign,
      items: [
        {
          title: 'Dashboard',
          url: '/financial',
        },
        {
          title: 'Accounts Payable',
          url: '/financial/ap/invoices',
          items: [
            {
              title: 'Vendor Invoices',
              url: '/financial/ap/invoices',
            },
            {
              title: 'Payments',
              url: '/financial/ap/payments',
            },
            {
              title: 'Aging Report',
              url: '/financial/ap/aging',
            },
            {
              title: 'Credit Notes',
              url: '/financial/ap/credit-notes',
            },
          ],
        },
        {
          title: 'Accounts Receivable',
          url: '/financial/ar/invoices',
          items: [
            {
              title: 'Customer Invoices',
              url: '/financial/ar/invoices',
            },
            {
              title: 'Receipts',
              url: '/financial/ar/receipts',
            },
            {
              title: 'Aging Report',
              url: '/financial/ar/aging',
            },
            {
              title: 'Credit Notes',
              url: '/financial/ar/credit-notes',
            },
          ],
        },
        {
          title: 'General Ledger',
          url: '/financial/gl/accounts',
          items: [
            {
              title: 'Chart of Accounts',
              url: '/financial/gl/accounts',
            },
            {
              title: 'Journal Entries',
              url: '/financial/gl/journal-entries',
            },
            {
              title: 'Trial Balance',
              url: '/financial/gl/trial-balance',
            },
            {
              title: 'Period Management',
              url: '/financial/gl/periods',
            },
          ],
        },
        {
          title: 'Cash Management',
          url: '/financial/cash/bank-accounts',
          items: [
            {
              title: 'Bank Accounts',
              url: '/financial/cash/bank-accounts',
            },
            {
              title: 'Reconciliation',
              url: '/financial/cash/reconciliation',
            },
            {
              title: 'Cash Forecast',
              url: '/financial/cash/forecast',
            },
            {
              title: 'Petty Cash',
              url: '/financial/cash/petty-cash',
            },
          ],
        },
        {
          title: 'Financial Reports',
          url: '/financial/reports/balance-sheet',
          items: [
            {
              title: 'Balance Sheet',
              url: '/financial/reports/balance-sheet',
            },
            {
              title: 'Income Statement',
              url: '/financial/reports/income-statement',
            },
            {
              title: 'Cash Flow',
              url: '/financial/reports/cash-flow',
            },
            {
              title: 'Custom Reports',
              url: '/financial/reports/custom',
            },
          ],
        },
        {
          title: 'Budgeting',
          url: '/financial/budget/versions',
          items: [
            {
              title: 'Budget Versions',
              url: '/financial/budget/versions',
            },
            {
              title: 'Budget vs Actual',
              url: '/financial/budget/variance',
            },
            {
              title: 'Forecasts',
              url: '/financial/budget/forecasts',
            },
          ],
        },
        {
          title: 'Tax Management',
          url: '/financial/tax/config',
          items: [
            {
              title: 'Tax Configuration',
              url: '/financial/tax/config',
            },
            {
              title: 'Tax Returns',
              url: '/financial/tax/returns',
            },
            {
              title: 'Tax Reports',
              url: '/financial/tax/reports',
            },
          ],
        },
        {
          title: 'Fixed Assets',
          url: '/financial/assets/register',
          items: [
            {
              title: 'Asset Register',
              url: '/financial/assets/register',
            },
            {
              title: 'Depreciation',
              url: '/financial/assets/depreciation',
            },
            {
              title: 'Disposals',
              url: '/financial/assets/disposals',
            },
          ],
        },
        {
          title: 'Cost Accounting',
          url: '/financial/cost/centers',
          items: [
            {
              title: 'Cost Centers',
              url: '/financial/cost/centers',
            },
            {
              title: 'Allocations',
              url: '/financial/cost/allocations',
            },
            {
              title: 'Project Costing',
              url: '/financial/cost/projects',
            },
          ],
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
        {
          title: 'Module Visibility',
          url: '/admin/settings/module-visibility',
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

// Mapping between sidebar item titles and module visibility keys
const MODULE_KEY_MAP: Record<string, keyof import('@/lib/services/ModuleVisibilityService').ModuleVisibilitySettings> = {
  'Dashboard (AI)': 'dashboard',
  'Analytics': 'analytics',
  'System Health': 'systemHealth',
  'Project Management': 'projectManagement',
  'Suppliers': 'suppliers',
  'Product Management': 'productManagement',
  'Customers': 'customers',
  'Sales Services': 'salesServices',
  'Sales Channels': 'salesChannels',
  'Courier Logistics': 'courierLogistics',
  'Rentals': 'rentals',
  'Repairs Workshop': 'repairsWorkshop',
  'DocuStore': 'docustore',
  'AI Services': 'aiServices',
  'Financial': 'financial',
  'System Integration': 'systemIntegration',
  'Administration': 'administration',
  'Support': 'support',
};

const PROJECT_KEY_MAP: Record<string, keyof import('@/lib/services/ModuleVisibilityService').ModuleVisibilitySettings> = {
  'Loyalty': 'loyalty',
  'Communication': 'communication',
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [logoError, setLogoError] = useState(false);
  const { settings } = useModuleVisibility();
  const { user, hasRole } = useAuth();
  const userIsAdmin = hasRole('admin') || hasRole('super_admin');

  // Filter navMain items based on visibility settings
  const filteredNavMain = React.useMemo(() => {
    return sidebarData.navMain.filter(item => {
      const moduleKey = MODULE_KEY_MAP[item.title];
      if (!moduleKey) return true; // Show items without mapping (fallback)
      
      // Administration is always visible to admins
      if (moduleKey === 'administration' && userIsAdmin) {
        return true;
      }
      
      return settings[moduleKey] !== false;
    });
  }, [settings, userIsAdmin]);

  // Filter navSecondary items based on visibility settings
  const filteredNavSecondary = React.useMemo(() => {
    return sidebarData.navSecondary.filter(item => {
      const moduleKey = MODULE_KEY_MAP[item.title];
      if (!moduleKey) return true; // Show items without mapping (fallback)
      
      // Administration is always visible to admins
      if (moduleKey === 'administration' && userIsAdmin) {
        return true;
      }
      
      return settings[moduleKey] !== false;
    });
  }, [settings, userIsAdmin]);

  // Filter projects based on visibility settings
  const filteredProjects = React.useMemo(() => {
    return sidebarData.projects.filter(project => {
      const moduleKey = PROJECT_KEY_MAP[project.name];
      if (!moduleKey) return true; // Show items without mapping (fallback)
      return settings[moduleKey] !== false;
    });
  }, [settings]);

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
                  onError={(e) => {
                    console.warn('Logo failed to load, using fallback');
                    setLogoError(true);
                  }}
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
        <NavMain items={filteredNavMain} label={null} />
        {filteredProjects.length > 0 && <NavProjects projects={filteredProjects} />}
        {filteredNavSecondary.length > 0 ? (
          <NavSecondary items={filteredNavSecondary} className="mt-auto" />
        ) : null}
      </SidebarContent>
      <SidebarFooter className="space-y-2 border-t border-sidebar-border pt-2">
        <NavUser user={sidebarData.user} />
        <SystemProcessingMeter />
      </SidebarFooter>
    </Sidebar>
  );
}
