"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Activity,
  Award,
  BarChart,
  Bell,
  Bot,
  BookOpen,
  Building2,
  ChevronDown,
  CreditCard,
  Database,
  DollarSign,
  FileText,
  Gift,
  Heart,
  Home,
  Layout,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MessageSquare,
  Package,
  Plug,
  Settings,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  User,
  UserCheck,
  Users,
} from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"

// Navigation structure
const navigationGroups = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/",
        icon: LayoutDashboard,
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
    ],
  },
  {
    title: "Suppliers",
    items: [
      {
        title: "Supplier Dashboard",
        url: "/suppliers",
        icon: Building2,
      },
      {
        title: "Inventory Portfolio",
        url: "/nxt-spp",
        icon: Package,
      },
      {
        title: "Directory",
        url: "/directories/suppliers",
        icon: Building2,
      },
      {
        title: "Performance",
        url: "/suppliers/performance",
        icon: TrendingUp,
      },
    ],
  },
  {
    title: "Inventory",
    items: [
      {
        title: "Management",
        url: "/inventory",
        icon: Package,
      },
      {
        title: "Pricing & Optimization",
        url: "/operations/pricing",
        icon: DollarSign,
      },
      {
        title: "Categories",
        url: "/catalog/categories",
        icon: Layout,
      },
    ],
  },
  {
    title: "Customers",
    items: [
      {
        title: "All Customers",
        url: "/customers",
        icon: Users,
      },
      {
        title: "Add Customer",
        url: "/customers/new",
        icon: UserCheck,
      },
    ],
  },
  {
    title: "Loyalty & Rewards",
    items: [
      {
        title: "Programs",
        url: "/admin/loyalty/programs",
        icon: Award,
      },
      {
        title: "Rewards",
        url: "/admin/loyalty/rewards",
        icon: Gift,
      },
      {
        title: "Rules",
        url: "/admin/loyalty/rules",
        icon: Settings,
      },
      {
        title: "Redemptions",
        url: "/admin/loyalty/redemptions",
        icon: ShoppingCart,
      },
      {
        title: "Analytics",
        url: "/admin/loyalty/analytics",
        icon: BarChart,
      },
    ],
  },
  {
    title: "AI Services",
    items: [
      {
        title: "Configuration",
        url: "/admin/ai/config",
        icon: Settings,
      },
      {
        title: "Assistant",
        url: "/admin/ai/assistant",
        icon: Bot,
      },
      {
        title: "Predictions",
        url: "/admin/ai/predictions",
        icon: TrendingUp,
      },
      {
        title: "Forecasts",
        url: "/admin/ai/forecasts",
        icon: Activity,
      },
      {
        title: "Alerts",
        url: "/admin/ai/alerts",
        icon: Bell,
      },
      {
        title: "Dashboards",
        url: "/admin/ai/dashboards",
        icon: Layout,
      },
      {
        title: "Health Monitor",
        url: "/admin/ai/health",
        icon: Heart,
      },
    ],
  },
  {
    title: "Communication",
    items: [
      {
        title: "Messages",
        url: "/messages",
        icon: MessageSquare,
        badge: "3",
      },
    ],
  },
  {
    title: "Integrations",
    items: [
      {
        title: "All Integrations",
        url: "/integrations",
        icon: Plug,
      },
      {
        title: "WooCommerce",
        url: "/integrations/woocommerce",
        icon: ShoppingBag,
      },
      {
        title: "Odoo",
        url: "/integrations/odoo",
        icon: Database,
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        title: "Users",
        url: "/admin/users",
        icon: Users,
      },
      {
        title: "Organizations",
        url: "/admin/organizations",
        icon: Building2,
      },
      {
        title: "Roles & Permissions",
        url: "/admin/roles",
        icon: Settings,
      },
      {
        title: "Audit Logs",
        url: "/admin/audit",
        icon: FileText,
      },
      {
        title: "Security",
        url: "/admin/security",
        icon: Settings,
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        title: "Help Center",
        url: "/help",
        icon: BookOpen,
      },
      {
        title: "Contact Support",
        url: "/support",
        icon: LifeBuoy,
      },
    ],
  },
]

export function ModernAppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" className="border-r">
      {/* Sidebar Header - Logo & Brand */}
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-base font-semibold tracking-tight">MantisNXT</span>
            <span className="text-xs text-muted-foreground">Procurement</span>
          </div>
        </div>
      </SidebarHeader>

      {/* Sidebar Content - Navigation */}
      <SidebarContent className="px-2">
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.url
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={item.url} className="flex items-center gap-3">
                          <item.icon className="h-4 w-4" />
                          <span className="flex-1">{item.title}</span>
                          {item.badge && (
                            <Badge
                              variant="secondary"
                              className="ml-auto h-5 min-w-[20px] rounded-full px-1.5 text-xs"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Sidebar Footer - User Menu */}
      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-12 hover:bg-accent">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                      <span className="text-sm font-medium">John Doe</span>
                      <span className="text-xs text-muted-foreground">john@example.com</span>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
        
        {/* Theme Toggle */}
        <div className="px-2 py-1">
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

