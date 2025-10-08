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
  Bell,
  Building2,
  ChevronDown,
  CreditCard,
  DollarSign,
  FileText,
  Home,
  LayoutDashboard,
  MessageSquare,
  Package,
  Search,
  Settings,
  ShoppingCart,
  TrendingUp,
  Users,
  User,
  LogOut,
  HelpCircle
} from "lucide-react"

interface ViewportAdminLayoutProps {
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
        title: "Dashboard v1",
        url: "/dashboard-v1",
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
        title: "Purchase Orders",
        url: "/purchase-orders",
        icon: ShoppingCart,
        isActive: false,
        badge: "12",
      },
      {
        title: "Inventory",
        url: "/inventory",
        icon: Package,
        isActive: false,
      },
    ],
  },
  {
    title: "Financial",
    items: [
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
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <SidebarTrigger className="-ml-1" />
      <SidebarSeparator orientation="vertical" className="mr-2 h-4" />

      {/* Breadcrumbs */}
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/">
                <Home className="h-3 w-3" />
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

      {/* Compact Search */}
      <div className="relative ml-auto flex-1 md:max-w-48">
        <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search..."
          className="pl-7 h-8 text-sm"
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
            <Bell className="h-3 w-3" />
            <Badge className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-xs">
              3
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Contract expiring</p>
              <p className="text-xs text-muted-foreground">
                TechCorp contract expires in 7 days
              </p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

const ViewportAdminLayout: React.FC<ViewportAdminLayoutProps> = ({
  children,
  breadcrumbs = [],
}) => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <AdminSidebar />
        <SidebarInset className="flex flex-col overflow-hidden">
          <AdminHeader breadcrumbs={breadcrumbs} />
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

export default ViewportAdminLayout
