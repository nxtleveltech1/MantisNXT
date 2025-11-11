"use client"

import * as React from "react"
import Link from "next/link"
import {
  Activity,
  Bot,
  Building2,
  DollarSign,
  Gift,
  Layout,
  LayoutDashboard,
  MessageSquare,
  Package,
  Plug,
  TrendingUp,
  Users,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "John Doe",
    email: "admin@mantisnxt.com",
    avatar: "/avatars/jd.jpg",
  },
  navMain: [
    {
      title: "Dashboard (AI)",
      url: "/",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: TrendingUp,
    },
    {
      title: "System Health",
      url: "/system-health",
      icon: Activity,
    },
    {
      title: "Suppliers",
      url: "/suppliers",
      icon: Building2,
      items: [
        {
          title: "Supplier Dashboard",
          url: "/suppliers",
        },
        {
          title: "Supplier Inventory Portfolio",
          url: "/nxt-spp",
        },
        {
          title: "Supplier Directory",
          url: "/directories/suppliers",
        },
        {
          title: "Performance",
          url: "/suppliers/performance",
        },
      ],
    },
    {
      title: "Inventory",
      url: "/inventory",
      icon: Package,
      items: [
        {
          title: "Inventory Overview",
          url: "/inventory",
        },
        {
          title: "Locations",
          url: "/inventory/locations",
        },
        {
          title: "Pricing & Optimization",
          url: "/operations/pricing",
        },
      ],
    },
    {
      title: "Categories",
      url: "/catalog/categories",
      icon: Layout,
      items: [
        {
          title: "Dashboard",
          url: "/catalog/categories",
        },
        {
          title: "AI Categorization",
          url: "/catalog/categories/ai-categorization",
        },
        {
          title: "Categories",
          url: "/catalog/categories/categories",
        },
        {
          title: "Tags",
          url: "/catalog/categories/tags",
        },
        {
          title: "Analytics",
          url: "/catalog/categories/analytics",
        },
        {
          title: "Exceptions",
          url: "/catalog/categories/exceptions",
        },
      ],
    },
    {
      title: "Customers",
      url: "/customers",
      icon: Users,
      items: [
        {
          title: "All Customers",
          url: "/customers",
        },
        {
          title: "Add Customer",
          url: "/customers/new",
        },
      ],
    },
    {
      title: "Loyalty",
      url: "/admin/loyalty/programs",
      icon: Gift,
      items: [
        {
          title: "Programs",
          url: "/admin/loyalty/programs",
        },
        {
          title: "Rewards",
          url: "/admin/loyalty/rewards",
        },
        {
          title: "Rules",
          url: "/admin/loyalty/rules",
        },
        {
          title: "Redemptions",
          url: "/admin/loyalty/redemptions",
        },
        {
          title: "Analytics",
          url: "/admin/loyalty/analytics",
        },
      ],
    },
    {
      title: "AI Services",
      url: "/admin/ai/config",
      icon: Bot,
      items: [
        {
          title: "Configuration",
          url: "/admin/ai/config",
        },
        {
          title: "Assistant",
          url: "/admin/ai/assistant",
        },
        {
          title: "Predictions",
          url: "/admin/ai/predictions",
        },
        {
          title: "Forecasts",
          url: "/admin/ai/forecasts",
        },
        {
          title: "Alerts",
          url: "/admin/ai/alerts",
        },
        {
          title: "Dashboards",
          url: "/admin/ai/dashboards",
        },
        {
          title: "Health Monitor",
          url: "/admin/ai/health",
        },
      ],
    },
    {
      title: "Financial",
      url: "/financial/invoices",
      icon: DollarSign,
      items: [
        {
          title: "Invoices",
          url: "/financial/invoices",
        },
        {
          title: "Payments",
          url: "/financial/payments",
        },
      ],
    },
    {
      title: "Communication",
      url: "/communication/messages",
      icon: MessageSquare,
      items: [
        {
          title: "Messages",
          url: "/communication/messages",
        },
        {
          title: "Notifications",
          url: "/communication/notifications",
        },
      ],
    },
    {
      title: "System Integration",
      url: "/system/integrations",
      icon: Plug,
      items: [
        {
          title: "Integrations",
          url: "/system/integrations",
        },
        {
          title: "API Settings",
          url: "/system/api",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "/support",
      icon: MessageSquare,
    },
  ],
  projects: [
    {
      name: "Procurement Ops",
      url: "/suppliers",
      icon: Building2,
    },
    {
      name: "Customer Success",
      url: "/customers",
      icon: Users,
    },
    {
      name: "AI Initiatives",
      url: "/admin/ai/config",
      icon: Bot,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <span className="text-lg font-bold">N</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">MantisNXT</span>
                  <span className="truncate text-xs text-muted-foreground">Procurement</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} label={null} />
        <NavProjects projects={data.projects} />
        {data.navSecondary.length ? (
          <NavSecondary items={data.navSecondary} className="mt-auto" />
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}

