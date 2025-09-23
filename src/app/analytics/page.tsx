"use client"

import React, { useState, useMemo } from 'react'
import SelfContainedLayout from '@/components/layout/SelfContainedLayout'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ComposedChart
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Clock,
  Shield,
  Target,
  Brain,
  BarChart3,
  Download,
  Filter,
  Calendar,
  Users,
  Package,
  CreditCard,
  FileText,
  Zap,
  Award,
  Activity,
  PieChart as PieChartIcon,
  Settings,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  Star,
  Building2,
  Lightbulb,
  Info,
  Search,
  ChevronDown,
  ChevronUp,
  FileDown,
  Bell,
  Calculator,
  Archive,
  Gauge,
  Eye
} from 'lucide-react'

// Enhanced Mock Data for Comprehensive Analytics
const generateEnhancedMockData = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return {
    // AI-Powered Spend Analysis
    spendAnalysis: months.map((month, index) => ({
      month,
      actual: 850000 + Math.random() * 200000,
      budget: 900000 + index * 15000,
      forecast: 820000 + Math.random() * 150000,
      aiPrediction: 830000 + Math.random() * 180000,
      trend: Math.random() > 0.5 ? 'up' : 'down',
      variance: (Math.random() - 0.5) * 25
    })),

    // Category spend breakdown
    categorySpend: [
      { category: 'Technology', amount: 3200000, percentage: 36.5, suppliers: 52, trend: 15.2, budget: 3000000 },
      { category: 'Manufacturing', amount: 2400000, percentage: 27.4, suppliers: 28, trend: -3.1, budget: 2500000 },
      { category: 'Services', amount: 1800000, percentage: 20.5, suppliers: 75, trend: 8.7, budget: 1700000 },
      { category: 'Raw Materials', amount: 980000, percentage: 11.2, suppliers: 15, trend: 12.3, budget: 900000 },
      { category: 'Logistics', amount: 420000, percentage: 4.8, suppliers: 22, trend: -1.5, budget: 450000 }
    ],

    // Supplier Performance Metrics
    supplierPerformance: [
      { name: 'TechCorp Solutions', score: 95, onTime: 98, quality: 97, cost: 92, risk: 'low', spend: 1450000, contracts: 8, renewals: 2, category: 'Technology' },
      { name: 'Global Manufacturing', score: 89, onTime: 91, quality: 94, cost: 88, risk: 'medium', spend: 1180000, contracts: 12, renewals: 3, category: 'Manufacturing' },
      { name: 'EcoSupply Chain', score: 82, onTime: 85, quality: 87, cost: 95, risk: 'high', spend: 850000, contracts: 6, renewals: 1, category: 'Services' },
      { name: 'Innovation Partners', score: 93, onTime: 96, quality: 95, cost: 90, risk: 'low', spend: 920000, contracts: 5, renewals: 0, category: 'Technology' },
      { name: 'Premium Components', score: 87, onTime: 89, quality: 92, cost: 93, risk: 'medium', spend: 740000, contracts: 9, renewals: 4, category: 'Raw Materials' },
      { name: 'Logistics Express', score: 84, onTime: 87, quality: 89, cost: 96, risk: 'medium', spend: 420000, contracts: 3, renewals: 1, category: 'Logistics' }
    ],

    // Contract Performance & Renewals
    contractAnalysis: [
      { supplier: 'TechCorp Solutions', contract: 'TC-2024-01', value: 1200000, expires: '2024-12-15', status: 'renewal_due', performance: 95, risk: 'low', daysToExpiry: 45 },
      { supplier: 'Global Manufacturing', contract: 'GM-2024-03', value: 850000, expires: '2024-11-30', status: 'under_review', performance: 89, risk: 'medium', daysToExpiry: 30 },
      { supplier: 'EcoSupply Chain', contract: 'ES-2024-02', value: 650000, expires: '2024-10-20', status: 'expired', performance: 82, risk: 'high', daysToExpiry: -10 },
      { supplier: 'Innovation Partners', contract: 'IP-2024-05', value: 950000, expires: '2025-03-10', status: 'active', performance: 93, risk: 'low', daysToExpiry: 120 },
      { supplier: 'Premium Components', contract: 'PC-2024-04', value: 720000, expires: '2025-01-25', status: 'active', performance: 87, risk: 'medium', daysToExpiry: 85 }
    ],

    // Cost Savings Opportunities
    costSavings: [
      { opportunity: 'Vendor Consolidation', potential: 450000, effort: 'medium', timeline: '4 months', confidence: 88, category: 'Strategic', priority: 'high' },
      { opportunity: 'Contract Renegotiation', potential: 280000, effort: 'low', timeline: '2 months', confidence: 94, category: 'Tactical', priority: 'high' },
      { opportunity: 'Process Automation', potential: 520000, effort: 'high', timeline: '8 months', confidence: 76, category: 'Technology', priority: 'medium' },
      { opportunity: 'Volume Discounts', potential: 220000, effort: 'low', timeline: '1 month', confidence: 92, category: 'Tactical', priority: 'high' },
      { opportunity: 'Alternative Sourcing', potential: 380000, effort: 'medium', timeline: '5 months', confidence: 81, category: 'Strategic', priority: 'medium' },
      { opportunity: 'Inventory Optimization', potential: 340000, effort: 'medium', timeline: '6 months', confidence: 84, category: 'Operational', priority: 'medium' }
    ],

    // Procurement Cycle Time Analysis
    procurementCycle: [
      { stage: 'Requisition', avgDays: 2.1, target: 2.0, current: 2.3, trend: 'stable', volume: 450 },
      { stage: 'Approval', avgDays: 1.5, target: 1.2, current: 1.8, trend: 'up', volume: 420 },
      { stage: 'Sourcing', avgDays: 7.8, target: 6.5, current: 8.2, trend: 'up', volume: 380 },
      { stage: 'Negotiation', avgDays: 4.9, target: 4.0, current: 5.1, trend: 'stable', volume: 340 },
      { stage: 'PO Creation', avgDays: 1.1, target: 0.8, current: 1.3, trend: 'down', volume: 320 },
      { stage: 'Delivery', avgDays: 11.5, target: 10.0, current: 12.1, trend: 'up', volume: 310 },
      { stage: 'Invoice Processing', avgDays: 3.2, target: 2.5, current: 3.5, trend: 'up', volume: 300 }
    ],

    // Inventory Optimization
    inventoryMetrics: [
      { category: 'Electronics', turnover: 6.8, target: 8.0, optimization: 18, stockValue: 2400000, daysOnHand: 45, reorderPoint: 180000 },
      { category: 'Components', turnover: 5.2, target: 6.5, optimization: 22, stockValue: 1800000, daysOnHand: 62, reorderPoint: 120000 },
      { category: 'Raw Materials', turnover: 8.4, target: 7.5, optimization: -8, stockValue: 3200000, daysOnHand: 38, reorderPoint: 250000 },
      { category: 'Finished Goods', turnover: 4.9, target: 6.0, optimization: 25, stockValue: 2900000, daysOnHand: 68, reorderPoint: 200000 },
      { category: 'Packaging', turnover: 7.1, target: 7.0, optimization: -2, stockValue: 450000, daysOnHand: 42, reorderPoint: 35000 }
    ],

    // Payment Processing Efficiency
    paymentMetrics: {
      avgProcessingDays: 2.8,
      target: 2.0,
      onTimePayments: 94.2,
      earlyPaymentCapture: 87.5,
      automationRate: 76.3,
      exceptionRate: 8.9,
      discountCapture: 285000,
      costPerTransaction: 12.50,
      monthlyVolume: 1847,
      digitalPayments: 82.4,
      manualIntervention: 17.6
    },

    // Compliance & Audit Readiness
    complianceScores: [
      { area: 'Regulatory Compliance', score: 96, target: 95, status: 'excellent', lastAudit: '2024-08-15', nextReview: '2024-11-15', findings: 0 },
      { area: 'Data Privacy (GDPR)', score: 89, target: 90, status: 'good', lastAudit: '2024-07-20', nextReview: '2024-10-20', findings: 2 },
      { area: 'Environmental Standards', score: 98, target: 95, status: 'excellent', lastAudit: '2024-09-01', nextReview: '2024-12-01', findings: 0 },
      { area: 'Financial Controls', score: 93, target: 92, status: 'excellent', lastAudit: '2024-08-30', nextReview: '2024-11-30', findings: 1 },
      { area: 'Security Protocols', score: 87, target: 90, status: 'needs_attention', lastAudit: '2024-07-10', nextReview: '2024-10-10', findings: 3 },
      { area: 'Supplier Code of Conduct', score: 91, target: 88, status: 'excellent', lastAudit: '2024-08-05', nextReview: '2024-11-05', findings: 1 }
    ],

    // Risk Assessment
    riskAnalysis: [
      { category: 'Financial Risk', score: 28, trend: -8, critical: 2, high: 6, medium: 12, low: 18, impact: 'High' },
      { category: 'Operational Risk', score: 35, trend: 3, critical: 1, high: 9, medium: 18, low: 25, impact: 'Medium' },
      { category: 'Compliance Risk', score: 22, trend: -12, critical: 1, high: 4, medium: 8, low: 15, impact: 'High' },
      { category: 'Cyber Security Risk', score: 31, trend: -5, critical: 2, high: 7, medium: 15, low: 20, impact: 'Critical' },
      { category: 'Supply Chain Risk', score: 42, trend: 8, critical: 3, high: 12, medium: 20, low: 28, impact: 'High' },
      { category: 'Geopolitical Risk', score: 38, trend: 15, critical: 2, high: 10, medium: 16, low: 22, impact: 'Medium' }
    ],

    // KPIs
    kpis: {
      totalSpend: 8750000,
      totalSpendChange: 12.8,
      avgSavings: 15.2,
      avgSavingsChange: 3.4,
      supplierCount: 247,
      supplierCountChange: -2.1,
      onTimeDelivery: 93.8,
      onTimeDeliveryChange: 2.6,
      qualityScore: 95.4,
      qualityScoreChange: 1.2,
      costVariance: -1.8,
      costVarianceChange: 2.1,
      riskScore: 32.5,
      riskScoreChange: -6.8,
      contractCompliance: 97.2,
      contractComplianceChange: 3.1,
      cycleTime: 32.5,
      cycleTimeChange: -8.2,
      inventoryTurnover: 6.2,
      inventoryTurnoverChange: 4.5
    }
  }
}

// Utility Functions

const formatPercent = (value: number) => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

const exportToCSV = (data: any[], filename: string) => {
  if (!data.length) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

const exportToJSON = (data: any, filename: string) => {
  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

interface AnalyticsKPIProps {
  title: string
  value: string | number
  change?: number
  icon: React.ComponentType<any>
  trend?: 'up' | 'down' | 'stable'
  color?: string
  subtitle?: string
  format?: 'currency' | 'percent' | 'number' | 'days'
}

const AnalyticsKPI: React.FC<AnalyticsKPIProps> = ({
  title,
  value,
  change,
  icon: Icon,
  trend = 'stable',
  color = 'blue',
  subtitle,
  format = 'number'
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val

    switch (format) {
      case 'currency': return formatCurrency(val)
      case 'percent': return `${val.toFixed(1)}%`
      case 'days': return `${val.toFixed(1)} days`
      default: return val.toLocaleString()
    }
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-3 w-3 text-green-500" />
      case 'down': return <ArrowDown className="h-3 w-3 text-red-500" />
      default: return <Minus className="h-3 w-3 text-gray-500" />
    }
  }

  const getTrendColor = () => {
    if (change === undefined) return 'text-gray-600'
    switch (trend) {
      case 'up': return change > 0 ? 'text-green-600' : 'text-red-600'
      case 'down': return change > 0 ? 'text-red-600' : 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-gray-600">{title}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{formatValue(value)}</p>
              {change !== undefined && (
                <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}>
                  {getTrendIcon()}
                  <span>{Math.abs(change).toFixed(1)}%</span>
                </div>
              )}
            </div>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-lg bg-${color}-50`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {formatter ?
              formatter(entry.value, entry.dataKey)[0] :
              `${entry.dataKey}: ${entry.value?.toLocaleString()}`
            }
          </p>
        ))}
      </div>
    )
  }
  return null
}

const AnalyticsDashboard: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('6m')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [realTimeEnabled, setRealTimeEnabled] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const mockData = useMemo(() => generateEnhancedMockData(), [selectedTimeRange])

  // AI-Powered Insights Generator
  const generateAIInsights = () => {
    const insights = [
      `Technology spend increased by 15.2% this quarter. Vendor consolidation could achieve R450K savings (88% confidence).`,
      `EcoSupply Chain performance declining (82/100). Recommend supplier development program or sourcing alternatives.`,
      `Payment automation at 76% - increasing to 85% could save R45K annually in processing costs.`,
      `Electronics inventory turnover below target. Optimize stock levels to free up R420K in working capital.`,
      `Contract renewals due for R3.2M in spend. Early negotiation could secure 5-8% cost savings.`,
      `Procurement cycle time 32% above target. Process automation could reduce by 15-20 days.`
    ]
    return insights.slice(0, 3)
  }

  const handleExport = (type: string) => {
    const timestamp = new Date().toISOString().split('T')[0]

    switch (type) {
      case 'spend':
        exportToCSV(mockData.spendAnalysis, `spend-analysis-${timestamp}`)
        break
      case 'suppliers':
        exportToCSV(mockData.supplierPerformance, `supplier-performance-${timestamp}`)
        break
      case 'contracts':
        exportToCSV(mockData.contractAnalysis, `contract-analysis-${timestamp}`)
        break
      case 'savings':
        exportToCSV(mockData.costSavings, `cost-savings-${timestamp}`)
        break
      case 'compliance':
        exportToCSV(mockData.complianceScores, `compliance-scores-${timestamp}`)
        break
      case 'all':
        exportToJSON(mockData, `analytics-dashboard-${timestamp}`)
        break
      default:
        exportToJSON(mockData.kpis, `kpi-dashboard-${timestamp}`)
    }
  }

  const filteredSuppliers = mockData.supplierPerformance.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <SelfContainedLayout title="Analytics Dashboard">
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search suppliers, contracts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">Last Month</SelectItem>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
                <SelectItem value="2y">Last 2 Years</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={realTimeEnabled ? "default" : "outline"}
              onClick={() => setRealTimeEnabled(!realTimeEnabled)}
            >
              <Activity className="h-4 w-4 mr-2" />
              Real-time
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleExport('spend')}>
              <Download className="h-4 w-4 mr-2" />
              Export Spend
            </Button>
            <Button variant="outline" onClick={() => handleExport('all')}>
              <Download className="h-4 w-4 mr-2" />
              Full Report
            </Button>
            <Button onClick={() => setLastUpdated(new Date())}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* AI Insights Banner */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Brain className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 mb-2">AI-Powered Insights</h3>
                <div className="space-y-1">
                  {generateAIInsights().map((insight, index) => (
                    <p key={index} className="text-sm text-blue-700">• {insight}</p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnalyticsKPI
            title="Total Spend"
            value={mockData.kpis.totalSpend}
            change={mockData.kpis.totalSpendChange}
            trend="up"
            icon={DollarSign}
            color="blue"
            format="currency"
            subtitle="YTD Performance"
          />
          <AnalyticsKPI
            title="Cost Savings"
            value={mockData.kpis.avgSavings}
            change={mockData.kpis.avgSavingsChange}
            trend="up"
            icon={Target}
            color="green"
            format="percent"
            subtitle="vs Target"
          />
          <AnalyticsKPI
            title="Cycle Time"
            value={mockData.kpis.cycleTime}
            change={mockData.kpis.cycleTimeChange}
            trend="down"
            icon={Clock}
            color="purple"
            format="days"
            subtitle="Avg P2P Cycle"
          />
          <AnalyticsKPI
            title="Compliance Score"
            value={mockData.kpis.contractCompliance}
            change={mockData.kpis.contractComplianceChange}
            trend="up"
            icon={Shield}
            color="emerald"
            format="percent"
            subtitle="Audit Ready"
          />
        </div>

        {/* Main Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="spend">Spend Analysis</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Enhanced Spend Trend */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    AI-Powered Spend Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={mockData.spendAnalysis}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `R${(value/1000000).toFixed(1)}M`} />
                      <Tooltip content={<CustomTooltip formatter={(value: number) => [`R${(value/1000000).toFixed(1)}M`, '']} />} />
                      <Legend />
                      <Bar dataKey="budget" fill="#E5E7EB" name="Budget" />
                      <Bar dataKey="actual" fill="#3B82F6" name="Actual Spend" />
                      <Line type="monotone" dataKey="forecast" stroke="#EF4444" strokeWidth={2} name="Forecast" />
                      <Line type="monotone" dataKey="aiPrediction" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" name="AI Prediction" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category Breakdown Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5" />
                    Spend by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={mockData.categorySpend}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="amount"
                      >
                        {mockData.categorySpend.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Risk Assessment Dashboard */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockData.riskAnalysis.slice(0, 4).map((risk, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{risk.category}</p>
                          <p className="text-xs text-gray-500">Impact: {risk.impact}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={risk.score > 35 ? 'destructive' : risk.score > 25 ? 'outline' : 'default'}>
                            {risk.score}/50
                          </Badge>
                          <p className={`text-xs ${risk.trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {risk.trend > 0 ? '+' : ''}{risk.trend}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cost Savings Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Cost Savings Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mockData.costSavings.slice(0, 6).map((saving, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm">{saving.opportunity}</h4>
                        <Badge variant={saving.priority === 'high' ? 'default' : 'outline'}>
                          {saving.priority}
                        </Badge>
                      </div>
                      <div className="text-lg font-bold text-green-600 mb-2">
                        {formatCurrency(saving.potential)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                        <span>Effort: {saving.effort}</span>
                        <span>Timeline: {saving.timeline}</span>
                      </div>
                      <Progress value={saving.confidence} className="h-2" />
                      <div className="text-xs text-gray-500 mt-1">{saving.confidence}% confidence</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Spend Analysis Tab */}
          <TabsContent value="spend" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Budget vs Actual Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={mockData.spendAnalysis}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `R${(value/1000000).toFixed(1)}M`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area type="monotone" dataKey="budget" stackId="1" stroke="#94A3B8" fill="#E2E8F0" name="Budget" />
                      <Area type="monotone" dataKey="actual" stackId="2" stroke="#3B82F6" fill="#3B82F6" name="Actual" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockData.categorySpend.map((category, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">{category.category}</span>
                          <Badge variant={category.trend > 0 ? 'default' : 'destructive'}>
                            {formatPercent(category.trend)}
                          </Badge>
                        </div>
                        <div className="text-lg font-bold">{formatCurrency(category.amount)}</div>
                        <div className="text-xs text-gray-600">
                          Budget: {formatCurrency(category.budget)} | {category.suppliers} suppliers
                        </div>
                        <Progress value={(category.amount / category.budget) * 100} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Suppliers Tab */}
          <TabsContent value="suppliers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Supplier Performance Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-center">On-Time %</TableHead>
                        <TableHead className="text-center">Quality %</TableHead>
                        <TableHead className="text-center">Cost Index</TableHead>
                        <TableHead className="text-center">Risk</TableHead>
                        <TableHead className="text-center">Annual Spend</TableHead>
                        <TableHead className="text-center">Contracts</TableHead>
                        <TableHead className="text-center">Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSuppliers.map((supplier, index) => (
                        <TableRow key={index} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{supplier.name}</span>
                              <Eye className="h-4 w-4 text-gray-400 cursor-pointer hover:text-blue-600" />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={supplier.score >= 90 ? 'default' : supplier.score >= 80 ? 'outline' : 'destructive'}>
                              {supplier.score}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{supplier.onTime}%</TableCell>
                          <TableCell className="text-center">{supplier.quality}%</TableCell>
                          <TableCell className="text-center">{supplier.cost}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={supplier.risk === 'low' ? 'default' : supplier.risk === 'medium' ? 'outline' : 'destructive'}>
                              {supplier.risk}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{formatCurrency(supplier.spend)}</TableCell>
                          <TableCell className="text-center">{supplier.contracts}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{supplier.category}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Supplier Performance Radar */}
            <Card>
              <CardHeader>
                <CardTitle>Top Suppliers Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={mockData.supplierPerformance.slice(0, 5)}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar name="Performance Score" dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contract Performance & Renewals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockData.contractAnalysis.map((contract, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1 flex-1">
                        <h4 className="font-medium">{contract.supplier}</h4>
                        <p className="text-sm text-gray-600">Contract: {contract.contract}</p>
                        <p className="text-sm text-gray-600">Expires: {contract.expires}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Performance:</span>
                          <Progress value={contract.performance} className="h-1 w-16" />
                          <span className="text-xs">{contract.performance}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Days to expiry:</span>
                          <span className={`text-xs font-medium ${contract.daysToExpiry < 30 ? 'text-red-600' : contract.daysToExpiry < 90 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {contract.daysToExpiry} days
                          </span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-medium text-lg">{formatCurrency(contract.value)}</div>
                        <Badge
                          variant={
                            contract.status === 'expired' ? 'destructive' :
                            contract.status === 'renewal_due' ? 'outline' :
                            'default'
                          }
                        >
                          {contract.status.replace('_', ' ')}
                        </Badge>
                        <div className="text-xs text-gray-500">{contract.risk} risk</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Operations Tab */}
          <TabsContent value="operations" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Procurement Cycle Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Procurement Cycle Time Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={mockData.procurementCycle}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stage" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="target" fill="#E5E7EB" name="Target (days)" />
                      <Bar dataKey="avgDays" fill="#3B82F6" name="Actual (days)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Inventory Optimization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Inventory Turnover & Optimization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockData.inventoryMetrics.map((item, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium">{item.category}</h4>
                          <Badge variant={item.optimization > 0 ? 'default' : 'destructive'}>
                            {item.optimization > 0 ? '+' : ''}{item.optimization}% potential
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Turnover:</span>
                            <div className="font-bold">{item.turnover}x (target: {item.target}x)</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Days on Hand:</span>
                            <div className="font-bold">{item.daysOnHand} days</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Stock Value:</span>
                            <div className="font-bold">{formatCurrency(item.stockValue)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Reorder Point:</span>
                            <div className="font-bold">{formatCurrency(item.reorderPoint)}</div>
                          </div>
                        </div>
                        <Progress value={(item.turnover / item.target) * 100} className="h-2 mt-3" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Processing Efficiency */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Processing Efficiency Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Processing Time */}
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{mockData.paymentMetrics.avgProcessingDays}</div>
                        <div className="text-sm text-gray-600">Avg Processing Days</div>
                        <div className="text-xs text-gray-500">Target: {mockData.paymentMetrics.target} days</div>
                      </div>
                      <Progress
                        value={(mockData.paymentMetrics.target / mockData.paymentMetrics.avgProcessingDays) * 100}
                        className="h-2"
                      />
                    </div>

                    {/* Performance Metrics */}
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>On-Time Payments</span>
                          <span className="font-medium">{mockData.paymentMetrics.onTimePayments}%</span>
                        </div>
                        <Progress value={mockData.paymentMetrics.onTimePayments} className="h-1" />

                        <div className="flex justify-between text-sm">
                          <span>Early Payment Capture</span>
                          <span className="font-medium">{mockData.paymentMetrics.earlyPaymentCapture}%</span>
                        </div>
                        <Progress value={mockData.paymentMetrics.earlyPaymentCapture} className="h-1" />

                        <div className="flex justify-between text-sm">
                          <span>Automation Rate</span>
                          <span className="font-medium">{mockData.paymentMetrics.automationRate}%</span>
                        </div>
                        <Progress value={mockData.paymentMetrics.automationRate} className="h-1" />
                      </div>
                    </div>

                    {/* Financial Metrics */}
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{formatCurrency(mockData.paymentMetrics.discountCapture)}</div>
                        <div className="text-sm text-gray-600">Discount Captured</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">R{mockData.paymentMetrics.costPerTransaction}</div>
                        <div className="text-sm text-gray-600">Cost per Transaction</div>
                      </div>
                    </div>

                    {/* Volume Metrics */}
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-lg font-bold">{mockData.paymentMetrics.monthlyVolume}</div>
                        <div className="text-sm text-gray-600">Monthly Volume</div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Digital Payments</span>
                          <span className="font-medium">{mockData.paymentMetrics.digitalPayments}%</span>
                        </div>
                        <Progress value={mockData.paymentMetrics.digitalPayments} className="h-1" />

                        <div className="flex justify-between text-sm">
                          <span>Exception Rate</span>
                          <span className="font-medium text-red-600">{mockData.paymentMetrics.exceptionRate}%</span>
                        </div>
                        <Progress value={mockData.paymentMetrics.exceptionRate} className="h-1" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Compliance & Audit Readiness Scores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockData.complianceScores.map((area, index) => (
                      <div key={index} className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">{area.area}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{area.score}%</span>
                            {area.status === 'excellent' && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {area.status === 'needs_attention' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                            {area.status === 'good' && <CheckCircle className="h-4 w-4 text-blue-500" />}
                          </div>
                        </div>
                        <Progress value={area.score} className="h-2" />
                        <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                          <div>
                            <span>Target: {area.target}%</span>
                            {area.findings > 0 && (
                              <span className="text-red-600 ml-2">({area.findings} findings)</span>
                            )}
                          </div>
                          <div className="text-right">Next Review: {area.nextReview}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Analysis Heatmap</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <RadarChart data={mockData.riskAnalysis}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" />
                      <PolarRadiusAxis domain={[0, 50]} />
                      <Radar name="Risk Score" dataKey="score" stroke="#EF4444" fill="#EF4444" fillOpacity={0.3} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Risk Impact Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Impact Matrix & Mitigation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <h4 className="font-semibold text-red-800">Critical</h4>
                    </div>
                    <p className="text-2xl font-bold text-red-900">
                      {mockData.riskAnalysis.reduce((sum, risk) => sum + risk.critical, 0)}
                    </p>
                    <p className="text-sm text-red-700">Immediate action required</p>
                  </div>
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <h4 className="font-semibold text-yellow-800">High</h4>
                    </div>
                    <p className="text-2xl font-bold text-yellow-900">
                      {mockData.riskAnalysis.reduce((sum, risk) => sum + risk.high, 0)}
                    </p>
                    <p className="text-sm text-yellow-700">Monitor closely</p>
                  </div>
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Info className="h-5 w-5 text-orange-600" />
                      <h4 className="font-semibold text-orange-800">Medium</h4>
                    </div>
                    <p className="text-2xl font-bold text-orange-900">
                      {mockData.riskAnalysis.reduce((sum, risk) => sum + risk.medium, 0)}
                    </p>
                    <p className="text-sm text-orange-700">Routine monitoring</p>
                  </div>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h4 className="font-semibold text-green-800">Low</h4>
                    </div>
                    <p className="text-2xl font-bold text-green-900">
                      {mockData.riskAnalysis.reduce((sum, risk) => sum + risk.low, 0)}
                    </p>
                    <p className="text-sm text-green-700">Well controlled</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Recommended Mitigation Actions</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                      <p>Implement enhanced cybersecurity protocols and conduct quarterly security audits</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                      <p>Diversify supplier base to reduce supply chain concentration risk</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <p>Establish geopolitical monitoring system for early warning indicators</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <p>Continue current compliance program with quarterly reviews</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab - Custom Report Builder */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Custom Report Builder & Export Center
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Report Configuration</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Report Type</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select report type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="executive">Executive Summary</SelectItem>
                            <SelectItem value="operational">Operational Review</SelectItem>
                            <SelectItem value="financial">Financial Analysis</SelectItem>
                            <SelectItem value="compliance">Compliance Report</SelectItem>
                            <SelectItem value="supplier">Supplier Performance</SelectItem>
                            <SelectItem value="custom">Custom Report</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Time Period</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select period" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                            <SelectItem value="ytd">Year to Date</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Include Sections</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {[
                            'Executive Summary',
                            'AI-Powered Insights',
                            'Spend Analysis',
                            'Supplier Performance',
                            'Contract Analysis',
                            'Risk Assessment',
                            'Compliance Status',
                            'Cost Savings Opportunities',
                            'Procurement Cycle Analysis',
                            'Inventory Optimization',
                            'Payment Efficiency',
                            'Recommendations'
                          ].map((section) => (
                            <label key={section} className="flex items-center space-x-2">
                              <input type="checkbox" defaultChecked className="rounded" />
                              <span className="text-sm">{section}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Export & Delivery Options</h3>
                    <div className="space-y-3">
                      <Button className="w-full" onClick={() => handleExport('all')}>
                        <Download className="h-4 w-4 mr-2" />
                        Generate Executive Report (JSON)
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => handleExport('spend')}>
                        <FileDown className="h-4 w-4 mr-2" />
                        Export Spend Analysis (CSV)
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => handleExport('suppliers')}>
                        <FileDown className="h-4 w-4 mr-2" />
                        Export Supplier Performance (CSV)
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => handleExport('contracts')}>
                        <FileDown className="h-4 w-4 mr-2" />
                        Export Contract Analysis (CSV)
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => handleExport('compliance')}>
                        <FileDown className="h-4 w-4 mr-2" />
                        Export Compliance Report (CSV)
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => handleExport('savings')}>
                        <FileDown className="h-4 w-4 mr-2" />
                        Export Savings Opportunities (CSV)
                      </Button>
                    </div>

                    <div className="mt-6">
                      <h4 className="font-medium mb-2">Automated Reporting</h4>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Schedule frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Report Preview</h3>
                    <div className="border rounded-lg p-4 bg-gray-50 min-h-[400px]">
                      <div className="space-y-3 text-sm text-gray-600">
                        <div className="border-b pb-2">
                          <h4 className="font-medium text-gray-900">MantisNXT Analytics Dashboard</h4>
                          <p className="text-xs">Executive Summary Report - Q3 2024</p>
                        </div>

                        <div className="space-y-2">
                          <h5 className="font-medium text-gray-800">📊 Key Performance Indicators</h5>
                          <div className="ml-2 space-y-1">
                            <div>• Total Spend: {formatCurrency(mockData.kpis.totalSpend)} ({formatPercent(mockData.kpis.totalSpendChange)})</div>
                            <div>• Cost Savings: {mockData.kpis.avgSavings}% ({formatPercent(mockData.kpis.avgSavingsChange)})</div>
                            <div>• Cycle Time: {mockData.kpis.cycleTime} days ({formatPercent(mockData.kpis.cycleTimeChange)})</div>
                            <div>• Compliance Score: {mockData.kpis.contractCompliance}% ({formatPercent(mockData.kpis.contractComplianceChange)})</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h5 className="font-medium text-gray-800">🤖 AI-Powered Insights</h5>
                          <div className="ml-2 space-y-1">
                            {generateAIInsights().map((insight, index) => (
                              <div key={index} className="text-xs">• {insight}</div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h5 className="font-medium text-gray-800">💰 Top Savings Opportunities</h5>
                          <div className="ml-2 space-y-1">
                            {mockData.costSavings.slice(0, 3).map((saving, index) => (
                              <div key={index} className="text-xs">• {saving.opportunity}: {formatCurrency(saving.potential)} ({saving.confidence}% confidence)</div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h5 className="font-medium text-gray-800">⚠️ Risk Assessment</h5>
                          <div className="ml-2 space-y-1">
                            <div className="text-xs">• Critical Risks: {mockData.riskAnalysis.reduce((sum, risk) => sum + risk.critical, 0)}</div>
                            <div className="text-xs">• High Priority Actions: {mockData.riskAnalysis.reduce((sum, risk) => sum + risk.high, 0)}</div>
                          </div>
                        </div>

                        <div className="border-t pt-2 text-xs text-gray-500">
                          Generated: {new Date().toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Status */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm text-gray-500 pt-6 border-t">
          <div className="flex items-center gap-4">
            <span>Last Updated: {lastUpdated.toLocaleTimeString()}</span>
            {realTimeEnabled && (
              <Badge variant="default" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                Live Updates
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>Data Sources: ERP • Supplier Portal • Financial Systems • Risk Platform</span>
            <Button variant="ghost" size="sm">
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </SelfContainedLayout>
  )
}

export default AnalyticsDashboard