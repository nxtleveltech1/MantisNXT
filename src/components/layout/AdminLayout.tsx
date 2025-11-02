"use client"

import React from "react"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Award,
  Bell,
  Building2,
  ChevronDown,
  CreditCard,
  Database,
  DollarSign,
  FileText,
  Home,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Package,
  Plug,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Users,
  User,
  LogOut,
  HelpCircle,
  BookOpen,
  UserCheck
} from "lucide-react"

interface AdminLayoutProps {
  children: React.ReactNode
  currentPage?: string
  breadcrumbs?: Array<{
    label: string
    href?: string
  }>
}

const sidebarNavigation = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard (AI)",
        url: "/",
        icon: LayoutDashboard,
        isActive: false,
      },
      {
        title: "Analytics",
        url: "/analytics",
        icon: TrendingUp,
        isActive: false,
      },
    ],
  },
  {
    title: "Business Directories",
    items: [
      {
        title: "Suppliers",
        url: "/directories/suppliers",
        icon: Building2,
        isActive: false,
      },
      {
        title: "Customers",
        url: "/directories/customers",
        icon: UserCheck,
        isActive: false,
      },
    ],
  },
  {
    title: "Supplier Management",
    items: [
      {
        title: "All Suppliers",
        url: "/suppliers",
        icon: Building2,
        isActive: false,
        badge: "247",
      },
      {
        title: "Add Supplier",
        url: "/suppliers/new",
        icon: Users,
        isActive: false,
      },
      {
        title: "Performance",
        url: "/suppliers/performance",
        icon: TrendingUp,
        isActive: false,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        title: "Inventory",
        url: "/inventory",
        icon: Package,
        isActive: false,
      },
      {
        title: "Pricing & Optimization",
        url: "/operations/pricing",
        icon: TrendingUp,
        isActive: false,
      },
    ],
  },
  {
    title: "Customer Engagement",
    items: [
      {
        title: "All Customers",
        url: "/customers",
        icon: Users,
        isActive: false,
      },
      {
        title: "Add Customer",
        url: "/customers/new",
        icon: UserCheck,
        isActive: false,
      },
    ],
  },
  {
    title: "Financial",
    items: [
    ],
  },
  {
    title: "Communication",
    items: [
      {
        title: "Messages",
        url: "/messages",
        icon: MessageSquare,
        isActive: false,
        badge: "3",
      },
    ],
  },
  {
    title: "System Integration",
    items: [
      {
        title: "Integrations Overview",
        url: "/integrations",
        icon: Plug,
        isActive: false,
      },
      {
        title: "WooCommerce",
        url: "/integrations/woocommerce",
        icon: ShoppingBag,
        isActive: false,
      },
      {
        title: "Odoo ERP",
        url: "/integrations/odoo",
        icon: Database,
        isActive: false,
      },
    ],
  },
  {
    title: "Modules Coming",
    items: [
      {
        title: "Purchase Orders",
        url: "/purchase-orders",
        icon: ShoppingCart,
        isActive: false,
        badge: "12",
      },
      {
        title: "Invoices",
        url: "/invoices",
        icon: CreditCard,
        isActive: false,
        badge: "8",
      },
      {
        title: "Payments",
        url: "/payments",
        icon: DollarSign,
        isActive: false,
      },
    ],
  },
]

const AdminSidebar: React.FC = () => {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">MantisNXT</span>
            <span className="truncate text-xs text-muted-foreground">
              Supplier Management
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {sidebarNavigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.isActive}
                      tooltip={item.title}
                    >
                      <a href={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {item.badge && (
                          <Badge
                            variant="secondary"
                            className="ml-auto h-5 w-auto min-w-5 text-xs"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">John Doe</span>
                    <span className="truncate text-xs text-muted-foreground">
                      Administrator
                    </span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">John Doe</span>
                      <span className="truncate text-xs text-muted-foreground">
                        john.doe@company.com
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
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
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help & Support
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

const AdminHeader: React.FC<{
  breadcrumbs?: Array<{ label: string; href?: string }>
}> = ({ breadcrumbs = [] }) => {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <SidebarSeparator orientation="vertical" className="mr-2 h-4" />

      {/* Breadcrumbs */}
      <div className="flex flex-1 items-center gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/">
                <Home className="h-4 w-4" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  {crumb.href ? (
                    <BreadcrumbLink href={crumb.href}>
                      {crumb.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Search */}
      <div className="relative ml-auto flex-1 md:max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search suppliers, orders..."
          className="pl-8"
        />
      </div>

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="relative h-8 w-8"
          >
            <Bell className="h-4 w-4" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
              3
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Contract expiring soon</p>
              <p className="text-xs text-muted-foreground">
                TechCorp Solutions contract expires in 7 days
              </p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">New supplier application</p>
              <p className="text-xs text-muted-foreground">
                Global Manufacturing Inc. submitted application
              </p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Payment overdue</p>
              <p className="text-xs text-muted-foreground">
                Invoice #INV-2024-001 is 3 days overdue
              </p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  breadcrumbs = [],
}) => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <SidebarInset>
          <AdminHeader breadcrumbs={breadcrumbs} />
          <main className="flex-1 overflow-auto">
            <div className="flex flex-col gap-4 p-4 md:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

export default AdminLayout
