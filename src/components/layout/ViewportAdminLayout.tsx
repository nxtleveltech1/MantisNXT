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
  SidebarMenuAction,
  SidebarMenuBadge,
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
  HelpCircle,
  BookOpen,
  UserCheck
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

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
      // Suppliers directory moved under Suppliers; Customers removed
    ],
  },
  {
    title: "Suppliers",
    items: [
      {
        title: "Supplier Dashboard",
        url: "/suppliers",
        icon: Building2,
        isActive: false,
      },
      {
        title: "Performance",
        url: "/suppliers/performance",
        icon: TrendingUp,
        isActive: false,
      },
      {
        title: "Supplier Inventory Portfolio",
        url: "/nxt-spp",
        icon: Package,
        isActive: false,
      },
      {
        title: "Supplier Directory",
        url: "/directories/suppliers",
        icon: Building2,
        isActive: false,
      },
    ],
  },
  {
    title: "Inventory Management",
    items: [
      { title: "Inventory Management", url: "/inventory", icon: Package, isActive: false },
      { title: "Pricing & Optimization", url: "/operations/pricing", icon: TrendingUp, isActive: false },
      { title: "Category Management", url: "/catalog/categories", icon: Settings, isActive: false },
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
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/'

  const allItems = sidebarNavigation.flatMap(g => g.items)
  const [query, setQuery] = React.useState('')
  const filtered = React.useMemo(() => {
    if (!query) return sidebarNavigation
    const q = query.toLowerCase()
    return sidebarNavigation
      .map(group => ({
        ...group,
        items: group.items.filter(it => it.title.toLowerCase().includes(q))
      }))
      .filter(group => group.items.length)
  }, [query])

  const [pinned, setPinned] = React.useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('ui.pinned') || '[]') } catch { return [] }
  })
  React.useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('ui.pinned', JSON.stringify(pinned))
  }, [pinned])

  const togglePin = React.useCallback((title: string) => {
    setPinned(prev => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title])
  }, [])

  const groups = query ? filtered : sidebarNavigation

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b px-3 py-3">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="size-7" />
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="text-sm font-semibold leading-tight truncate">MantisNXT</div>
            <div className="text-xs text-muted-foreground leading-tight">Procurement Platform</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarRail />

      <SidebarContent className="gap-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="px-2 group-data-[collapsible=icon]:hidden">
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search navigation…" className="h-8" />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {pinned.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Pinned</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {allItems.filter(i => pinned.includes(i.title)).map(item => {
                  const Icon = item.icon
                  const isActive = pathname === item.url
                  return (
                    <SidebarMenuItem key={`pinned-${item.title}`}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <a href={item.url}>
                          <Icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                      <SidebarMenuAction aria-label="Unpin" title="Unpin" onClick={() => togglePin(item.title)} />
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {groups.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.url
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <a href={item.url}>
                          <Icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                      {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-12">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted grid place-items-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                      <div className="text-sm font-medium leading-tight truncate">You</div>
                      <div className="text-xs text-muted-foreground leading-tight truncate">user@example.com</div>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-56">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><a href="/admin/users">Profile</a></DropdownMenuItem>
                <DropdownMenuItem asChild><a href="/admin/settings/general">Settings</a></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 group-data-[collapsible=icon]:hidden">
          <ThemeToggle />
        </div>
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
    <SidebarProvider defaultOpen={false}>
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
