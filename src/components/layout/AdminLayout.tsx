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
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart,
  Bell,
  Bot,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Database,
  DollarSign,
  FileText,
  Gift,
  Heart,
  HelpCircle,
  Home,
  Layout,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Package,
  Pin,
  Plug,
  PieChart,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react"
import ChatAssistant from "@/components/ai/assistant/ChatAssistant"
import { ThemeToggle } from "@/components/ui/theme-toggle"

interface AdminLayoutProps {
  children: React.ReactNode
  currentPage?: string
  breadcrumbs?: Array<{
    label: string
    href?: string
  }>
}

// Navigation structure with collapsible groups
const sidebarNavigation = [
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
    collapsible: true,
    items: [
      {
        title: "Dashboard",
        url: "/suppliers",
        icon: Building2,
      },
      {
        title: "Performance",
        url: "/suppliers/performance",
        icon: TrendingUp,
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
    ],
  },
  {
    title: "Inventory",
    collapsible: true,
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
    collapsible: true,
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
    collapsible: true,
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
    collapsible: true,
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
        title: "Conversations",
        url: "/admin/ai/conversations",
        icon: MessageSquare,
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
        title: "Anomaly Detection",
        url: "/admin/ai/anomalies",
        icon: AlertTriangle,
      },
      {
        title: "Alerts",
        url: "/admin/ai/alerts",
        icon: Bell,
      },
      {
        title: "Metrics",
        url: "/admin/ai/metrics",
        icon: PieChart,
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
    collapsible: true,
    items: [
      {
        title: "Overview",
        url: "/integrations",
        icon: Plug,
      },
      {
        title: "WooCommerce",
        url: "/integrations/woocommerce",
        icon: ShoppingBag,
      },
      {
        title: "Odoo ERP",
        url: "/integrations/odoo",
        icon: Database,
      },
    ],
  },
  {
    title: "Administration",
    collapsible: true,
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

const AdminSidebar: React.FC = () => {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/'

  // Flattened items for search and active detection
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

  // Persisted pinned items
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

  // Collapsible state for groups
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      return JSON.parse(localStorage.getItem('ui.openGroups') || '{}')
    } catch {
      return {}
    }
  })

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ui.openGroups', JSON.stringify(openGroups))
    }
  }, [openGroups])

  const toggleGroup = React.useCallback((title: string) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }))
  }, [])

  const groups = query ? filtered : sidebarNavigation

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-base font-semibold tracking-tight">MantisNXT</span>
            <span className="text-xs text-muted-foreground">Procurement Platform</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarRail />

      <SidebarContent className="px-2 py-2">
        {/* Quick search */}
        <SidebarGroup className="py-0">
          <SidebarGroupContent>
            <div className="px-1 group-data-[collapsible=icon]:hidden">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="h-9 pl-8 text-sm"
                />
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Pinned */}
        {pinned.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold">
              <Pin className="h-3.5 w-3.5 mr-1" />
              Pinned
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {allItems.filter(i => pinned.includes(i.title)).map(item => {
                  const ActiveIcon = item.icon
                  const isActive = pathname === item.url
                  return (
                    <SidebarMenuItem key={`pinned-${item.title}`}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <a href={item.url} className="flex items-center gap-3">
                          <ActiveIcon className="h-4 w-4" />
                          <span className="flex-1">{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                      <SidebarMenuAction
                        aria-label="Unpin"
                        title="Unpin"
                        onClick={() => togglePin(item.title)}
                        showOnHover
                      >
                        <X className="h-3.5 w-3.5" />
                      </SidebarMenuAction>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Navigation sections with collapsible groups */}
        {groups.map((section) => {
          const isCollapsible = section.collapsible
          const isOpen = openGroups[section.title] !== false // default to open

          if (isCollapsible) {
            return (
              <Collapsible
                key={section.title}
                open={isOpen}
                onOpenChange={() => toggleGroup(section.title)}
                className="group/collapsible"
              >
                <SidebarGroup>
                  <SidebarGroupLabel asChild>
                    <CollapsibleTrigger className="flex w-full items-center justify-between text-xs font-semibold hover:bg-accent rounded-md px-2">
                      <span>{section.title}</span>
                      <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {section.items.map((item) => {
                          const Icon = item.icon
                          const isActive = pathname === item.url
                          return (
                            <SidebarMenuItem key={item.title}>
                              <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                                <a href={item.url} className="flex items-center gap-3">
                                  <Icon className="h-4 w-4" />
                                  <span className="flex-1">{item.title}</span>
                                  {item.badge && (
                                    <Badge variant="secondary" className="h-5 min-w-[20px] rounded-full px-1.5 text-xs">
                                      {item.badge}
                                    </Badge>
                                  )}
                                </a>
                              </SidebarMenuButton>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <SidebarMenuAction showOnHover aria-label="More">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </SidebarMenuAction>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent side="right" align="start" className="w-48">
                                  <DropdownMenuItem onClick={() => togglePin(item.title)}>
                                    <Pin className="h-4 w-4 mr-2" />
                                    {pinned.includes(item.title) ? 'Unpin' : 'Pin to top'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <a href={item.url}>
                                      <ChevronRight className="h-4 w-4 mr-2" />
                                      Open
                                    </a>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </SidebarMenuItem>
                          )
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )
          }

          // Non-collapsible group
          return (
            <SidebarGroup key={section.title}>
              <SidebarGroupLabel className="text-xs font-semibold">{section.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.url
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                          <a href={item.url} className="flex items-center gap-3">
                            <Icon className="h-4 w-4" />
                            <span className="flex-1">{item.title}</span>
                            {item.badge && (
                              <Badge variant="secondary" className="h-5 min-w-[20px] rounded-full px-1.5 text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </a>
                        </SidebarMenuButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuAction showOnHover aria-label="More">
                              <MoreHorizontal className="h-4 w-4" />
                            </SidebarMenuAction>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start" className="w-48">
                            <DropdownMenuItem onClick={() => togglePin(item.title)}>
                              <Pin className="h-4 w-4 mr-2" />
                              {pinned.includes(item.title) ? 'Unpin' : 'Pin to top'}
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={item.url}>
                                <ChevronRight className="h-4 w-4 mr-2" />
                                Open
                              </a>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-accent">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                    <AvatarFallback className="rounded-lg">JD</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">John Doe</span>
                    <span className="truncate text-xs text-muted-foreground">john@example.com</span>
                  </div>
                  <ChevronDown className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/admin/users">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/admin/settings/general">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/billing">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Billing
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
        
        {/* Theme Toggle in footer */}
        <div className="px-2 py-1 group-data-[collapsible=icon]:hidden">
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

const AdminHeader: React.FC<{
  breadcrumbs?: Array<{ label: string; href?: string }>
}> = ({ breadcrumbs = [] }) => {
  const [assistantOpen, setAssistantOpen] = React.useState(false)
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
              <p className="text-muted-foreground">
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

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* AI Assistant */}
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAssistantOpen(true)} title="Open AI Assistant">
        <Bot className="h-4 w-4" />
      </Button>
      <Dialog open={assistantOpen} onOpenChange={setAssistantOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>AI Assistant</DialogTitle>
            <p className="sr-only">Ask quick questions about your data.</p>
          </DialogHeader>
          <ChatAssistant />
        </DialogContent>
      </Dialog>
    </header>
  )
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  breadcrumbs = [],
}) => {
  return (
    <SidebarProvider defaultOpen={false}>
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
