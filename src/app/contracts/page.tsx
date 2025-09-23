"use client"

import React, { useState } from "react"
import SelfContainedLayout from '@/components/layout/SelfContainedLayout'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Building2,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Upload,
  Download,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Plus,
  Star,
  TrendingUp,
  DollarSign,
  Users,
  Award,
  Shield,
  Bell,
  Settings,
  Menu,
  X,
  Home,
  ShoppingCart,
  Package,
  CreditCard,
  MessageSquare,
  LogOut,
  PenTool,
  FileSignature,
  Archive,
  History,
  Target,
  BarChart3,
  AlertCircle,
  Zap,
  Globe,
  Lock,
  Unlock,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  MoreHorizontal
} from "lucide-react"

// Contract lifecycle statuses
const CONTRACT_STATUSES = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: FileText },
  review: { label: "Under Review", color: "bg-yellow-100 text-yellow-700", icon: Eye },
  active: { label: "Active", color: "bg-green-100 text-green-700", icon: CheckCircle },
  renewal: { label: "Up for Renewal", color: "bg-blue-100 text-blue-700", icon: RefreshCw },
  expired: { label: "Expired", color: "bg-red-100 text-red-700", icon: Clock },
  terminated: { label: "Terminated", color: "bg-red-100 text-red-700", icon: X }
}

// Risk levels
const RISK_LEVELS = {
  low: { label: "Low Risk", color: "bg-green-100 text-green-700", icon: CheckCircle },
  medium: { label: "Medium Risk", color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle },
  high: { label: "High Risk", color: "bg-red-100 text-red-700", icon: AlertCircle }
}

// Contract templates
const CONTRACT_TEMPLATES = [
  { id: 1, name: "Standard Service Agreement", category: "Services", description: "General service contract template" },
  { id: 2, name: "Supply Agreement", category: "Procurement", description: "Goods and materials supply contract" },
  { id: 3, name: "NDA Template", category: "Legal", description: "Non-disclosure agreement template" },
  { id: 4, name: "Software License", category: "Technology", description: "Software licensing agreement" },
  { id: 5, name: "Consulting Agreement", category: "Professional", description: "Professional consulting services" }
]

// Mock contract data
const mockContracts = [
  {
    id: 1,
    title: "IT Services Contract",
    supplier: "TechCorp Solutions",
    status: "active",
    value: 250000,
    startDate: "2024-01-15",
    endDate: "2025-01-14",
    progress: 68,
    risk: "low",
    documents: 12,
    milestones: { completed: 3, total: 5 },
    performance: 94,
    autoRenewal: true,
    lastModified: "2024-09-15",
    signedBy: "John Smith",
    category: "Technology"
  },
  {
    id: 2,
    title: "Manufacturing Supply Agreement",
    supplier: "Global Manufacturing Ltd",
    status: "renewal",
    value: 500000,
    startDate: "2023-06-01",
    endDate: "2024-12-31",
    progress: 85,
    risk: "medium",
    documents: 8,
    milestones: { completed: 7, total: 8 },
    performance: 87,
    autoRenewal: false,
    lastModified: "2024-09-10",
    signedBy: "Sarah Johnson",
    category: "Manufacturing"
  },
  {
    id: 3,
    title: "Consulting Services Contract",
    supplier: "Strategic Advisors Inc",
    status: "draft",
    value: 75000,
    startDate: "2024-10-01",
    endDate: "2025-03-31",
    progress: 15,
    risk: "low",
    documents: 3,
    milestones: { completed: 0, total: 4 },
    performance: null,
    autoRenewal: false,
    lastModified: "2024-09-20",
    signedBy: null,
    category: "Professional"
  },
  {
    id: 4,
    title: "Logistics Partnership",
    supplier: "FastTrack Logistics",
    status: "active",
    value: 180000,
    startDate: "2024-03-01",
    endDate: "2025-02-28",
    progress: 42,
    risk: "high",
    documents: 15,
    milestones: { completed: 2, total: 6 },
    performance: 76,
    autoRenewal: true,
    lastModified: "2024-09-18",
    signedBy: "Mike Davis",
    category: "Logistics"
  }
]

// Dashboard statistics
const dashboardStats = {
  totalContracts: 127,
  activeContracts: 89,
  expiringContracts: 12,
  totalValue: 12500000,
  avgPerformance: 88,
  complianceScore: 95,
  pendingRenewals: 8,
  documentsManaged: 1247
}

// Sidebar navigation items
const sidebarItems = [
  { icon: Home, label: "Dashboard", href: "/", active: false },
  { icon: Building2, label: "Suppliers", href: "/suppliers", badge: "22" },
  { icon: Users, label: "Add Supplier", href: "/suppliers/new" },
  { icon: ShoppingCart, label: "Purchase Orders", href: "/purchase-orders", badge: "12" },
  { icon: FileText, label: "Contracts", href: "/contracts", badge: "5", active: true },
  { icon: Package, label: "Inventory", href: "/inventory" },
  { icon: CreditCard, label: "Invoices", href: "/invoices", badge: "8" },
  { icon: DollarSign, label: "Payments", href: "/payments" },
  { icon: MessageSquare, label: "Messages", href: "/messages", badge: "3" }
]

export default function ContractsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedTab, setSelectedTab] = useState("overview")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [riskFilter, setRiskFilter] = useState("all")
  const [selectedContracts, setSelectedContracts] = useState<number[]>([])
  const [expandedContract, setExpandedContract] = useState<number | null>(null)

  // Filter contracts based on search and filters
  const filteredContracts = mockContracts.filter(contract => {
    const matchesSearch = contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || contract.status === statusFilter
    const matchesRisk = riskFilter === "all" || contract.risk === riskFilter
    return matchesSearch && matchesStatus && matchesRisk
  })

  const handleSelectContract = (contractId: number) => {
    setSelectedContracts(prev =>
      prev.includes(contractId)
        ? prev.filter(id => id !== contractId)
        : [...prev, contractId]
    )
  }

  const handleSelectAll = () => {
    setSelectedContracts(
      selectedContracts.length === filteredContracts.length
        ? []
        : filteredContracts.map(c => c.id)
    )
  }

  const getContractProgress = (contract: any) => {
    const today = new Date()
    const start = new Date(contract.startDate)
    const end = new Date(contract.endDate)
    const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    const elapsedDays = (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    return Math.min(Math.max((elapsedDays / totalDays) * 100, 0), 100)
  }

  const getDaysUntilExpiry = (endDate: string) => {
    const today = new Date()
    const end = new Date(endDate)
    const diffTime = end.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <SelfContainedLayout title="Contracts" breadcrumbs={[]}>
      <div className="space-y-6">
        {/* Sidebar Header */}
        <div className="h-16 border-b flex items-center justify-between px-4">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center">
                <Building2 className="h-4 w-4" />
              </div>
              <span className="font-semibold">MantisNXT</span>
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

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          {sidebarItems.map((item, index) => (
            <a
              key={index}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 hover:bg-gray-100 transition-colors ${
                item.active ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-600' : ''
              }`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="text-sm flex-1">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </a>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t p-2">
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 w-full">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
              <span className="text-xs font-semibold">JD</span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">John Doe</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">Contract Management</h1>
            <Badge variant="outline" className="text-xs">
              {dashboardStats.totalContracts} Total Contracts
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Contract
            </Button>
            <Button variant="outline" size="icon" className="relative h-8 w-8">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                {dashboardStats.pendingRenewals}
              </span>
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
            {/* Tab Navigation */}
            <div className="bg-white border-b px-6 py-3">
              <TabsList className="grid w-full max-w-2xl grid-cols-6">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="contracts" className="text-xs">Contracts</TabsTrigger>
                <TabsTrigger value="templates" className="text-xs">Templates</TabsTrigger>
                <TabsTrigger value="compliance" className="text-xs">Compliance</TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
                <TabsTrigger value="workflow" className="text-xs">Workflow</TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Overview Tab */}
              <TabsContent value="overview" className="p-6 space-y-6">
                {/* Dashboard Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Total Value</p>
                          <p className="text-2xl font-bold">R{(dashboardStats.totalValue / 1000000).toFixed(1)}M</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Active Contracts</p>
                          <p className="text-2xl font-bold">{dashboardStats.activeContracts}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Expiring Soon</p>
                          <p className="text-2xl font-bold">{dashboardStats.expiringContracts}</p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-yellow-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Compliance Score</p>
                          <p className="text-2xl font-bold">{dashboardStats.complianceScore}%</p>
                        </div>
                        <Shield className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions & Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button className="w-full justify-start gap-2" variant="outline">
                        <Plus className="h-4 w-4" />
                        Create New Contract
                      </Button>
                      <Button className="w-full justify-start gap-2" variant="outline">
                        <FileText className="h-4 w-4" />
                        Use Template
                      </Button>
                      <Button className="w-full justify-start gap-2" variant="outline">
                        <Upload className="h-4 w-4" />
                        Upload Document
                      </Button>
                      <Button className="w-full justify-start gap-2" variant="outline">
                        <RefreshCw className="h-4 w-4" />
                        Renewal Reminders
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Contracts Requiring Attention */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Requires Attention
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {mockContracts
                          .filter(c => c.status === "renewal" || c.risk === "high" || getDaysUntilExpiry(c.endDate) < 30)
                          .slice(0, 3)
                          .map((contract) => (
                          <div key={contract.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{contract.title}</p>
                                <p className="text-xs text-gray-500">{contract.supplier}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={CONTRACT_STATUSES[contract.status as keyof typeof CONTRACT_STATUSES].color}>
                                {CONTRACT_STATUSES[contract.status as keyof typeof CONTRACT_STATUSES].label}
                              </Badge>
                              <Button size="sm" variant="outline">
                                Review
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Performance Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Performance Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">Average Performance</span>
                          <span className="text-sm font-medium">{dashboardStats.avgPerformance}%</span>
                        </div>
                        <Progress value={dashboardStats.avgPerformance} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">Compliance Score</span>
                          <span className="text-sm font-medium">{dashboardStats.complianceScore}%</span>
                        </div>
                        <Progress value={dashboardStats.complianceScore} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">On-Time Deliveries</span>
                          <span className="text-sm font-medium">91%</span>
                        </div>
                        <Progress value={91} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Contracts Management Tab */}
              <TabsContent value="contracts" className="p-6 space-y-6">
                {/* Search and Filters */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search contracts..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-48">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          {Object.entries(CONTRACT_STATUSES).map(([key, status]) => (
                            <SelectItem key={key} value={key}>{status.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={riskFilter} onValueChange={setRiskFilter}>
                        <SelectTrigger className="w-full md:w-48">
                          <SelectValue placeholder="Filter by risk" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Risk Levels</SelectItem>
                          {Object.entries(RISK_LEVELS).map(([key, risk]) => (
                            <SelectItem key={key} value={key}>{risk.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" className="gap-2">
                        <Filter className="h-4 w-4" />
                        More Filters
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Bulk Actions */}
                {selectedContracts.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {selectedContracts.length} contracts selected
                        </span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="gap-2">
                            <Download className="h-4 w-4" />
                            Export
                          </Button>
                          <Button size="sm" variant="outline" className="gap-2">
                            <Archive className="h-4 w-4" />
                            Archive
                          </Button>
                          <Button size="sm" variant="outline" className="gap-2">
                            <Bell className="h-4 w-4" />
                            Set Reminders
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Contracts List */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Contract Portfolio</CardTitle>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedContracts.length === filteredContracts.length}
                          onCheckedChange={handleSelectAll}
                        />
                        <span className="text-sm text-gray-500">Select All</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-2">
                      {filteredContracts.map((contract) => {
                        const StatusIcon = CONTRACT_STATUSES[contract.status as keyof typeof CONTRACT_STATUSES].icon
                        const RiskIcon = RISK_LEVELS[contract.risk as keyof typeof RISK_LEVELS].icon
                        const daysUntilExpiry = getDaysUntilExpiry(contract.endDate)
                        const timeProgress = getContractProgress(contract)

                        return (
                          <div key={contract.id} className="border-b last:border-b-0">
                            <div className="p-4 hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-4">
                                <Checkbox
                                  checked={selectedContracts.includes(contract.id)}
                                  onCheckedChange={() => handleSelectContract(contract.id)}
                                />

                                <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4">
                                  {/* Contract Info */}
                                  <div className="md:col-span-2">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h3 className="font-medium text-sm">{contract.title}</h3>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setExpandedContract(
                                          expandedContract === contract.id ? null : contract.id
                                        )}
                                      >
                                        {expandedContract === contract.id ?
                                          <ChevronDown className="h-4 w-4" /> :
                                          <ChevronRight className="h-4 w-4" />
                                        }
                                      </Button>
                                    </div>
                                    <p className="text-xs text-gray-500">{contract.supplier}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge className={CONTRACT_STATUSES[contract.status as keyof typeof CONTRACT_STATUSES].color}>
                                        <StatusIcon className="h-3 w-3 mr-1" />
                                        {CONTRACT_STATUSES[contract.status as keyof typeof CONTRACT_STATUSES].label}
                                      </Badge>
                                      <Badge className={RISK_LEVELS[contract.risk as keyof typeof RISK_LEVELS].color}>
                                        <RiskIcon className="h-3 w-3 mr-1" />
                                        {RISK_LEVELS[contract.risk as keyof typeof RISK_LEVELS].label}
                                      </Badge>
                                    </div>
                                  </div>

                                  {/* Value & Dates */}
                                  <div>
                                    <p className="text-sm font-medium">R{contract.value.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {daysUntilExpiry > 0 ? `${daysUntilExpiry} days left` : 'Expired'}
                                    </p>
                                  </div>

                                  {/* Progress */}
                                  <div>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-xs text-gray-500">Progress</span>
                                      <span className="text-xs">{Math.round(timeProgress)}%</span>
                                    </div>
                                    <Progress value={timeProgress} className="h-1" />
                                    <p className="text-xs text-gray-500 mt-1">
                                      {contract.milestones.completed}/{contract.milestones.total} milestones
                                    </p>
                                  </div>

                                  {/* Performance */}
                                  <div>
                                    {contract.performance ? (
                                      <>
                                        <div className="flex items-center gap-1">
                                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                          <span className="text-sm font-medium">{contract.performance}%</span>
                                        </div>
                                        <p className="text-xs text-gray-500">Performance Score</p>
                                      </>
                                    ) : (
                                      <p className="text-xs text-gray-400">Not started</p>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-1">
                                    <Button size="sm" variant="outline" className="h-7 w-7 p-0">
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 w-7 p-0">
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 w-7 p-0">
                                      <Download className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 w-7 p-0">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {/* Expanded Details */}
                              {expandedContract === contract.id && (
                                <div className="mt-4 pt-4 border-t bg-gray-50 -mx-4 px-4 pb-4">
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                      <h4 className="font-medium text-sm mb-2">Documents</h4>
                                      <p className="text-xs text-gray-600">{contract.documents} files</p>
                                      <div className="flex gap-1 mt-1">
                                        <Button size="sm" variant="outline" className="text-xs">
                                          View All
                                        </Button>
                                        <Button size="sm" variant="outline" className="text-xs">
                                          Upload
                                        </Button>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-sm mb-2">Signatures</h4>
                                      <p className="text-xs text-gray-600">
                                        {contract.signedBy ? `Signed by ${contract.signedBy}` : 'Pending signatures'}
                                      </p>
                                      <div className="flex gap-1 mt-1">
                                        <Button size="sm" variant="outline" className="text-xs">
                                          <PenTool className="h-3 w-3 mr-1" />
                                          Sign
                                        </Button>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-sm mb-2">Renewal</h4>
                                      <p className="text-xs text-gray-600">
                                        {contract.autoRenewal ? 'Auto-renewal enabled' : 'Manual renewal'}
                                      </p>
                                      <div className="flex gap-1 mt-1">
                                        <Button size="sm" variant="outline" className="text-xs">
                                          Configure
                                        </Button>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-sm mb-2">Audit Trail</h4>
                                      <p className="text-xs text-gray-600">
                                        Last modified: {new Date(contract.lastModified).toLocaleDateString()}
                                      </p>
                                      <div className="flex gap-1 mt-1">
                                        <Button size="sm" variant="outline" className="text-xs">
                                          <History className="h-3 w-3 mr-1" />
                                          History
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Templates Tab */}
              <TabsContent value="templates" className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Contract Templates</h2>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Template
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {CONTRACT_TEMPLATES.map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-gray-600 mb-4">{template.description}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1">
                            Preview
                          </Button>
                          <Button size="sm" className="flex-1">
                            Use Template
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Template Categories */}
                <Card>
                  <CardHeader>
                    <CardTitle>Template Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {['Services', 'Procurement', 'Legal', 'Technology', 'Professional', 'Manufacturing'].map((category) => (
                        <div key={category} className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <p className="font-medium text-sm">{category}</p>
                          <p className="text-xs text-gray-500">
                            {CONTRACT_TEMPLATES.filter(t => t.category === category).length} templates
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Compliance Tab */}
              <TabsContent value="compliance" className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Compliance Score</p>
                          <p className="text-2xl font-bold">{dashboardStats.complianceScore}%</p>
                        </div>
                        <Shield className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Risk Alerts</p>
                          <p className="text-2xl font-bold">3</p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-yellow-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Audit Ready</p>
                          <p className="text-2xl font-bold">89%</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Compliance Checklist */}
                <Card>
                  <CardHeader>
                    <CardTitle>Compliance Checklist</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { item: "Contract approval workflows", completed: true },
                        { item: "Digital signature compliance", completed: true },
                        { item: "Data retention policies", completed: true },
                        { item: "Risk assessment documentation", completed: false },
                        { item: "Vendor due diligence", completed: false },
                        { item: "Performance monitoring", completed: true }
                      ].map((check, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <Checkbox checked={check.completed} />
                          <span className={`text-sm ${check.completed ? 'text-gray-600' : 'text-gray-800 font-medium'}`}>
                            {check.item}
                          </span>
                          {check.completed && <CheckCircle className="h-4 w-4 text-green-500" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Assessment */}
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Assessment Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(RISK_LEVELS).map(([level, config]) => {
                        const count = mockContracts.filter(c => c.risk === level).length
                        const RiskIcon = config.icon
                        return (
                          <div key={level} className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <RiskIcon className="h-4 w-4" />
                              <span className="font-medium">{config.label}</span>
                            </div>
                            <p className="text-2xl font-bold">{count}</p>
                            <p className="text-xs text-gray-500">contracts</p>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Contract Value Trends */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Contract Value Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Chart visualization would go here</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Performance Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm">Average Contract Performance</span>
                            <span className="text-sm font-medium">{dashboardStats.avgPerformance}%</span>
                          </div>
                          <Progress value={dashboardStats.avgPerformance} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm">On-Time Delivery Rate</span>
                            <span className="text-sm font-medium">91%</span>
                          </div>
                          <Progress value={91} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm">Renewal Success Rate</span>
                            <span className="text-sm font-medium">85%</span>
                          </div>
                          <Progress value={85} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Category Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Contract Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {['Technology', 'Manufacturing', 'Professional', 'Logistics'].map((category) => {
                          const count = mockContracts.filter(c => c.category === category).length
                          const percentage = (count / mockContracts.length) * 100
                          return (
                            <div key={category}>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm">{category}</span>
                                <span className="text-sm">{count} contracts</span>
                              </div>
                              <Progress value={percentage} className="h-2" />
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Export Options */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Export & Reports</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button className="w-full justify-start gap-2" variant="outline">
                        <Download className="h-4 w-4" />
                        Export Contract Summary
                      </Button>
                      <Button className="w-full justify-start gap-2" variant="outline">
                        <FileText className="h-4 w-4" />
                        Generate Performance Report
                      </Button>
                      <Button className="w-full justify-start gap-2" variant="outline">
                        <BarChart3 className="h-4 w-4" />
                        Analytics Dashboard PDF
                      </Button>
                      <Button className="w-full justify-start gap-2" variant="outline">
                        <Shield className="h-4 w-4" />
                        Compliance Report
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Workflow Tab */}
              <TabsContent value="workflow" className="p-6 space-y-6">
                {/* Workflow Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contract Lifecycle Workflow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      {[
                        { stage: "Draft", icon: FileText, count: 5 },
                        { stage: "Review", icon: Eye, count: 3 },
                        { stage: "Approval", icon: CheckCircle, count: 2 },
                        { stage: "Signature", icon: PenTool, count: 1 },
                        { stage: "Active", icon: Zap, count: 89 },
                        { stage: "Renewal", icon: RefreshCw, count: 8 }
                      ].map((stage) => {
                        const StageIcon = stage.icon
                        return (
                          <div key={stage.stage} className="text-center p-3 border rounded-lg">
                            <StageIcon className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                            <p className="font-medium text-sm">{stage.stage}</p>
                            <p className="text-2xl font-bold">{stage.count}</p>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Automated Reminders */}
                <Card>
                  <CardHeader>
                    <CardTitle>Automated Reminders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { type: "Renewal Notice", days: "30 days before expiry", enabled: true },
                        { type: "Performance Review", days: "Quarterly", enabled: true },
                        { type: "Milestone Check", days: "Monthly", enabled: false },
                        { type: "Compliance Audit", days: "Annually", enabled: true }
                      ].map((reminder, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Bell className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="font-medium text-sm">{reminder.type}</p>
                              <p className="text-xs text-gray-500">{reminder.days}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox checked={reminder.enabled} />
                            <Button size="sm" variant="outline">
                              Configure
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Digital Signature Integration */}
                <Card>
                  <CardHeader>
                    <CardTitle>Digital Signature Integration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <FileSignature className="h-5 w-5 text-blue-500" />
                          <span className="font-medium">DocuSign</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">Industry-leading e-signature platform</p>
                        <Button size="sm" variant="outline" className="w-full">
                          Configure Integration
                        </Button>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Lock className="h-5 w-5 text-green-500" />
                          <span className="font-medium">Adobe Sign</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">Secure digital signature solution</p>
                        <Button size="sm" variant="outline" className="w-full">
                          Configure Integration
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Document Management */}
                <Card>
                  <CardHeader>
                    <CardTitle>Document Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-3">Version Control</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <History className="h-4 w-4 text-blue-500" />
                            <span className="text-sm">Automatic version tracking</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Copy className="h-4 w-4 text-blue-500" />
                            <span className="text-sm">Document comparison</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Archive className="h-4 w-4 text-blue-500" />
                            <span className="text-sm">Historical archive</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-3">Storage & Security</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-green-500" />
                            <span className="text-sm">256-bit encryption</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Cloud backup</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Access controls</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </main>
      </div>

      {/* Floating Action Button */}
      <Button
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg"
        size="icon"
      >
        <Plus className="h-5 w-5" />
      </Button>
    </SelfContainedLayout>
  )
}