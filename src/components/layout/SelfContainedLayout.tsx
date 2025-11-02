"use client"

import React, { useState, ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bell,
  Building2,
  ChevronDown,
  CreditCard,
  Database,
  DollarSign,
  FileText,
  Home,
  LayoutDashboard,
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
  Menu,
  X,
  ChevronRight,
  Upload,
  BookOpen,
  UserCheck
} from 'lucide-react'

interface SelfContainedLayoutProps {
  children: ReactNode
  title?: string
  breadcrumbs?: Array<{
    label: string
    href?: string
  }>
}

interface NavigationItem {
  title: string
  url: string
  icon: React.ComponentType<any>
  isActive?: boolean
  badge?: string
}

interface NavigationGroup {
  title: string
  items: NavigationItem[]
}

const navigationGroups: NavigationGroup[] = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard (AI)",
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
        icon: Settings,
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
      },
      {
        title: "Customers",
        url: "/directories/customers",
        icon: UserCheck,
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
        badge: "247",
      },
      {
        title: "Add Supplier",
        url: "/suppliers/new",
        icon: Users,
      },
      {
        title: "Upload Pricelist",
        url: "/suppliers/pricelist-upload",
        icon: Upload,
      },
      {
        title: "Performance",
        url: "/suppliers/performance",
        icon: TrendingUp,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        title: "Supplier Inventory Portfolio",
        url: "/nxt-spp",
        icon: Package,
      },
      {
        title: "Inventory Management",
        url: "/inventory",
        icon: Package,
      },
      {
        title: "Pricing & Optimization",
        url: "/operations/pricing",
        icon: TrendingUp,
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
      },
      {
        title: "Add Customer",
        url: "/customers/new",
        icon: UserCheck,
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
    title: "Modules Coming",
    items: [
      {
        title: "Purchase Orders",
        url: "/purchase-orders",
        icon: ShoppingCart,
        badge: "12",
      },
      {
        title: "Invoices",
        url: "/invoices",
        icon: CreditCard,
        badge: "8",
      },
      {
        title: "Payments",
        url: "/payments",
        icon: DollarSign,
      },
    ],
  },
]

const SelfContainedLayout: React.FC<SelfContainedLayoutProps> = ({
  children,
  title = "Dashboard",
  breadcrumbs = [],
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "Overview": true,
    "Business Directories": true,
    "Supplier Management": true,
    "Operations": true,
    "Customer Engagement": true,
    "Financial": true,
    "Communication": true,
    "System Integration": true,
    "Modules Coming": false,
  })
  const pathname = usePathname()

  // Helper function to check if navigation item is active
  const isActiveRoute = (url: string) => {
    if (url === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(url)
  }

  // Toggle group expansion
  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900">MantisNXT</span>
                <span className="text-xs text-gray-500">Procurement</span>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          {navigationGroups.map((group) => {
            const isExpanded = expandedGroups[group.title] !== false
            const hasItems = group.items.length > 0

            return (
              <div key={group.title} className="mb-2">
                {sidebarOpen && (
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <span>{group.title}</span>
                    {hasItems && (
                      <ChevronRight
                        className={cn(
                          "h-3 w-3 transition-transform",
                          isExpanded && "rotate-90"
                        )}
                      />
                    )}
                  </button>
                )}
                {isExpanded && hasItems && (
                  <div className="space-y-1 mt-1">
                    {group.items.map((item) => {
                      const isActive = isActiveRoute(item.url)
                      return (
                        <Link
                          key={item.title}
                          href={item.url}
                          className={cn(
                            "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-blue-50 text-blue-700"
                              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                          )}
                        >
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          {sidebarOpen && (
                            <>
                              <span className="flex-1">{item.title}</span>
                              {item.badge && (
                                <Badge
                                  variant={isActive ? "default" : "secondary"}
                                  className="h-5 min-w-5 text-xs"
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* User Profile */}
        <div className="border-t border-gray-200 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 p-3",
                  !sidebarOpen && "px-2"
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <User className="h-4 w-4" />
                </div>
                {sidebarOpen && (
                  <>
                    <div className="flex flex-1 flex-col text-left">
                      <span className="text-sm font-medium text-gray-900">John Doe</span>
                      <span className="text-xs text-gray-500">Administrator</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">John Doe</p>
                  <p className="text-xs text-gray-500">john.doe@company.com</p>
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
        </div>
      </div>

      {/* Main Content */}
      <div
        className={cn(
          "transition-all duration-300",
          sidebarOpen ? "ml-64" : "ml-16"
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-6">
            {/* Breadcrumbs */}
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
              {breadcrumbs.length > 0 && (
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <ChevronRight className="h-4 w-4" />
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={index}>
                      {crumb.href ? (
                        <Link
                          href={crumb.href}
                          className="hover:text-gray-700"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="text-gray-900">{crumb.label}</span>
                      )}
                      {index < breadcrumbs.length - 1 && (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="w-64 pl-9"
                  defaultValue=""
                />
              </div>

              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="relative">
                    <Bell className="h-4 w-4" />
                    <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs">
                      3
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="max-h-64 overflow-y-auto">
                    <DropdownMenuItem className="flex-col items-start">
                      <div className="font-medium">Contract expiring soon</div>
                      <div className="text-xs text-gray-500">
                        TechCorp Solutions contract expires in 7 days
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex-col items-start">
                      <div className="font-medium">New supplier application</div>
                      <div className="text-xs text-gray-500">
                        Global Manufacturing Inc. submitted application
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex-col items-start">
                      <div className="font-medium">Payment overdue</div>
                      <div className="text-xs text-gray-500">
                        Invoice #INV-2024-001 is 3 days overdue
                      </div>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Settings */}
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default SelfContainedLayout
