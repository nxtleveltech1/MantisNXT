"use client"

import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Target,
  Lightbulb,
  BarChart3,
  Zap,
  Star,
  Award,
  ShieldCheck,
  Clock,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  RefreshCw,
  Filter,
  Eye,
  Bookmark,
  BookmarkCheck,
  Share,
  Download,
  Bell,
  X,
  Plus,
  Gauge,
  Activity,
  Building2,
  Package,
  Users,
  Globe,
  Calculator,
  Database,
  PieChart,
  FileText,
  Crown,
  Loader2,
  Info,
  ExternalLink,
  ThumbsUp,
  ThumbsDown
} from "lucide-react"

// Enhanced AI Insight Types
interface AIInsight {
  id: string
  type: 'opportunity' | 'risk' | 'trend' | 'anomaly' | 'prediction' | 'recommendation'
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  summary: string
  impact: {
    financial: number
    operational: string
    timeline: string
    probability: number
  }
  confidence: number
  dataPoints: number
  sources: string[]
  category: string
  subcategory?: string
  tags: string[]
  actions: {
    primary: ActionItem
    secondary: ActionItem[]
  }
  metrics: {
    [key: string]: {
      current: number
      target?: number
      trend: 'up' | 'down' | 'stable'
      unit: string
      formatted?: string
    }
  }
  visualization?: {
    type: 'chart' | 'gauge' | 'progress' | 'comparison'
    data: any
    config?: any
  }
  relatedInsights: string[]
  createdAt: string
  updatedAt: string
  expiresAt?: string
  status: 'new' | 'viewed' | 'bookmarked' | 'actioned' | 'dismissed'
  aiModel: string
  version: string
}

interface ActionItem {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  action: string
  data?: any
  urgency: 'immediate' | 'this_week' | 'this_month' | 'planned'
  estimatedEffort: 'low' | 'medium' | 'high'
  estimatedValue: number
}

interface AIInsightCardsProps {
  insights?: AIInsight[]
  onInsightAction?: (insightId: string, action: ActionItem) => void
  onInsightStatusChange?: (insightId: string, status: AIInsight['status']) => void
  onRefresh?: () => void
  compactMode?: boolean
  maxCards?: number
  filterBy?: {
    type?: AIInsight['type'][]
    priority?: AIInsight['priority'][]
    category?: string[]
  }
}

const AIInsightCards: React.FC<AIInsightCardsProps> = ({
  insights = [],
  onInsightAction,
  onInsightStatusChange,
  onRefresh,
  compactMode = false,
  maxCards,
  filterBy
}) => {
  // State Management
  const [loading, setLoading] = useState(false)
  const [selectedInsights, setSelectedInsights] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'priority' | 'confidence' | 'impact' | 'date'>('priority')
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')
  const [error, setError] = useState<string | null>(null)

  // Mock insights data for demonstration
  const mockInsights: AIInsight[] = [
    {
      id: 'insight_001',
      type: 'opportunity',
      priority: 'high',
      title: 'Supplier Consolidation Opportunity',
      description: 'AI analysis identifies potential 18% cost reduction through strategic supplier consolidation in technology category.',
      summary: 'Consolidate 5 technology suppliers into 2 primary partners for significant volume discounts and reduced management overhead.',
      impact: {
        financial: 275000,
        operational: 'Reduced vendor management complexity by 60%',
        timeline: '6 months',
        probability: 87
      },
      confidence: 91,
      dataPoints: 124,
      sources: ['Purchase Orders 2024', 'Supplier Performance Data', 'Market Price Analysis'],
      category: 'Cost Optimization',
      subcategory: 'Vendor Management',
      tags: ['cost-reduction', 'vendor-consolidation', 'technology'],
      actions: {
        primary: {
          id: 'create_consolidation_plan',
          label: 'Create Consolidation Plan',
          description: 'Generate detailed supplier consolidation strategy',
          icon: Target,
          action: 'create_plan',
          urgency: 'this_week',
          estimatedEffort: 'medium',
          estimatedValue: 275000
        },
        secondary: [
          {
            id: 'analyze_suppliers',
            label: 'Analyze Current Suppliers',
            description: 'Deep dive into current supplier performance',
            icon: BarChart3,
            action: 'analyze_suppliers',
            urgency: 'immediate',
            estimatedEffort: 'low',
            estimatedValue: 0
          },
          {
            id: 'market_research',
            label: 'Market Research',
            description: 'Research alternative suppliers and pricing',
            icon: Globe,
            action: 'market_research',
            urgency: 'this_week',
            estimatedEffort: 'high',
            estimatedValue: 50000
          }
        ]
      },
      metrics: {
        currentSuppliers: {
          current: 5,
          target: 2,
          trend: 'down',
          unit: 'suppliers',
          formatted: '5 → 2 suppliers'
        },
        potentialSavings: {
          current: 275000,
          trend: 'up',
          unit: 'USD',
          formatted: '$275K annually'
        },
        managementReduction: {
          current: 60,
          trend: 'up',
          unit: '%',
          formatted: '60% reduction'
        }
      },
      visualization: {
        type: 'chart',
        data: [
          { category: 'Current Cost', value: 1500000 },
          { category: 'Optimized Cost', value: 1225000 },
          { category: 'Savings', value: 275000 }
        ]
      },
      relatedInsights: ['insight_002', 'insight_005'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'new',
      aiModel: 'Claude-3.5-Sonnet',
      version: '1.0'
    },
    {
      id: 'insight_002',
      type: 'risk',
      priority: 'critical',
      title: 'Single Source Dependency Risk',
      description: 'Critical risk identified: 3 essential components have single supplier dependency, creating potential supply chain vulnerability.',
      summary: '65% of critical components sourced from single suppliers in Southeast Asia region.',
      impact: {
        financial: 150000,
        operational: 'Potential 2-week production halt risk',
        timeline: 'Immediate action required',
        probability: 73
      },
      confidence: 88,
      dataPoints: 89,
      sources: ['Supplier Database', 'Risk Assessment Report', 'Geographic Analysis'],
      category: 'Supply Chain Risk',
      subcategory: 'Dependency Risk',
      tags: ['single-source', 'critical-components', 'geographic-risk'],
      actions: {
        primary: {
          id: 'diversify_suppliers',
          label: 'Diversify Supplier Base',
          description: 'Identify and qualify alternative suppliers',
          icon: ShieldCheck,
          action: 'diversify_suppliers',
          urgency: 'immediate',
          estimatedEffort: 'high',
          estimatedValue: 150000
        },
        secondary: [
          {
            id: 'risk_assessment',
            label: 'Detailed Risk Assessment',
            description: 'Comprehensive supply chain risk analysis',
            icon: AlertTriangle,
            action: 'risk_assessment',
            urgency: 'immediate',
            estimatedEffort: 'medium',
            estimatedValue: 25000
          },
          {
            id: 'contingency_plan',
            label: 'Create Contingency Plan',
            description: 'Develop emergency sourcing procedures',
            icon: FileText,
            action: 'contingency_plan',
            urgency: 'this_week',
            estimatedEffort: 'medium',
            estimatedValue: 75000
          }
        ]
      },
      metrics: {
        riskScore: {
          current: 8.2,
          target: 4.0,
          trend: 'down',
          unit: '/10',
          formatted: '8.2/10 High Risk'
        },
        singleSourceItems: {
          current: 3,
          target: 0,
          trend: 'stable',
          unit: 'items',
          formatted: '3 critical items'
        },
        geographicConcentration: {
          current: 65,
          target: 30,
          trend: 'stable',
          unit: '%',
          formatted: '65% concentration'
        }
      },
      visualization: {
        type: 'gauge',
        data: { value: 82, max: 100, zones: [{ min: 0, max: 40, color: 'green' }, { min: 40, max: 70, color: 'yellow' }, { min: 70, max: 100, color: 'red' }] }
      },
      relatedInsights: ['insight_001', 'insight_003'],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'new',
      aiModel: 'Claude-3.5-Sonnet',
      version: '1.0'
    },
    {
      id: 'insight_003',
      type: 'prediction',
      priority: 'medium',
      title: 'Price Increase Forecast',
      description: 'AI predicts 12-15% price increase in semiconductor components over next 6 months based on market trends and supplier communications.',
      summary: 'Global supply constraints and increased demand driving significant price pressures in electronics category.',
      impact: {
        financial: 89000,
        operational: 'Budget planning adjustment needed',
        timeline: '3-6 months',
        probability: 79
      },
      confidence: 84,
      dataPoints: 156,
      sources: ['Market Intelligence', 'Supplier Communications', 'Industry Reports'],
      category: 'Market Intelligence',
      subcategory: 'Price Forecasting',
      tags: ['price-increase', 'semiconductors', 'market-trends'],
      actions: {
        primary: {
          id: 'strategic_buying',
          label: 'Strategic Forward Buying',
          description: 'Secure inventory before price increases',
          icon: Package,
          action: 'forward_buying',
          urgency: 'this_month',
          estimatedEffort: 'medium',
          estimatedValue: 45000
        },
        secondary: [
          {
            id: 'contract_negotiation',
            label: 'Negotiate Fixed Pricing',
            description: 'Lock in current prices with suppliers',
            icon: FileText,
            action: 'negotiate_contracts',
            urgency: 'this_week',
            estimatedEffort: 'high',
            estimatedValue: 89000
          },
          {
            id: 'alternative_suppliers',
            label: 'Find Alternative Suppliers',
            description: 'Source competitive alternatives',
            icon: Building2,
            action: 'find_alternatives',
            urgency: 'this_month',
            estimatedEffort: 'high',
            estimatedValue: 35000
          }
        ]
      },
      metrics: {
        predictedIncrease: {
          current: 13.5,
          trend: 'up',
          unit: '%',
          formatted: '13.5% increase'
        },
        timelineMonths: {
          current: 4.5,
          trend: 'stable',
          unit: 'months',
          formatted: '4.5 months'
        },
        affectedSpend: {
          current: 680000,
          trend: 'up',
          unit: 'USD',
          formatted: '$680K annual spend'
        }
      },
      visualization: {
        type: 'chart',
        data: [
          { month: 'Current', price: 100 },
          { month: 'Month 1', price: 102 },
          { month: 'Month 2', price: 105 },
          { month: 'Month 3', price: 108 },
          { month: 'Month 4', price: 112 },
          { month: 'Month 5', price: 115 }
        ]
      },
      relatedInsights: ['insight_002', 'insight_004'],
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'viewed',
      aiModel: 'Claude-3.5-Sonnet',
      version: '1.0'
    }
  ]

  // Use provided insights or mock data
  const workingInsights = insights.length > 0 ? insights : mockInsights

  // Filter insights based on filterBy prop
  const filteredInsights = useMemo(() => {
    let filtered = workingInsights

    if (filterBy?.type && filterBy.type.length > 0) {
      filtered = filtered.filter(insight => filterBy.type!.includes(insight.type))
    }

    if (filterBy?.priority && filterBy.priority.length > 0) {
      filtered = filtered.filter(insight => filterBy.priority!.includes(insight.priority))
    }

    if (filterBy?.category && filterBy.category.length > 0) {
      filtered = filtered.filter(insight => filterBy.category!.includes(insight.category))
    }

    return filtered
  }, [workingInsights, filterBy])

  // Sort insights
  const sortedInsights = useMemo(() => {
    return [...filteredInsights].sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        case 'confidence':
          return b.confidence - a.confidence
        case 'impact':
          return b.impact.financial - a.impact.financial
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        default:
          return 0
      }
    })
  }, [filteredInsights, sortBy])

  // Apply max cards limit
  const displayInsights = maxCards ? sortedInsights.slice(0, maxCards) : sortedInsights

  // Get insight type icon and color
  const getInsightTypeIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'opportunity':
        return { icon: Lightbulb, color: 'from-green-500 to-emerald-600' }
      case 'risk':
        return { icon: AlertTriangle, color: 'from-red-500 to-rose-600' }
      case 'trend':
        return { icon: TrendingUp, color: 'from-blue-500 to-indigo-600' }
      case 'anomaly':
        return { icon: Activity, color: 'from-yellow-500 to-amber-600' }
      case 'prediction':
        return { icon: Brain, color: 'from-purple-500 to-violet-600' }
      case 'recommendation':
        return { icon: Target, color: 'from-indigo-500 to-blue-600' }
      default:
        return { icon: Info, color: 'from-gray-500 to-slate-600' }
    }
  }

  // Get priority color
  const getPriorityColor = (priority: AIInsight['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  // Handle insight action
  const handleInsightAction = (insight: AIInsight, action: ActionItem) => {
    onInsightAction?.(insight.id, action)

    // Update insight status to actioned
    onInsightStatusChange?.(insight.id, 'actioned')
  }

  // Handle insight status change
  const handleStatusChange = (insightId: string, status: AIInsight['status']) => {
    onInsightStatusChange?.(insightId, status)
  }

  // Format financial impact
  const formatFinancialImpact = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    } else {
      return `$${amount.toLocaleString()}`
    }
  }

  // Refresh insights
  const handleRefresh = async () => {
    setLoading(true)
    try {
      await onRefresh?.()
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (err) {
      setError("Failed to refresh insights. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header with Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-600" />
              AI Insights
            </h2>
            <p className="text-gray-600">
              {displayInsights.length} insights • Updated {new Date().toLocaleTimeString()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Sort by {sortBy}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Sort Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortBy('priority')}>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Priority
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('confidence')}>
                  <Star className="h-4 w-4 mr-2" />
                  Confidence
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('impact')}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Financial Impact
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('date')}>
                  <Clock className="h-4 w-4 mr-2" />
                  Date Created
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="font-semibold mb-1">Error</div>
              <div>{error}</div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setError(null)}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Insights Grid */}
        <div className={`grid gap-6 ${
          compactMode
            ? 'grid-cols-1 lg:grid-cols-2'
            : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
        }`}>
          <AnimatePresence>
            {displayInsights.map((insight, index) => {
              const { icon: TypeIcon, color } = getInsightTypeIcon(insight.type)

              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="group"
                >
                  <Card className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${
                    insight.priority === 'critical' ? 'ring-2 ring-red-200' : ''
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-xl bg-gradient-to-r ${color} text-white shadow-lg`}>
                            <TypeIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant="outline"
                                className={`text-xs font-medium ${getPriorityColor(insight.priority)}`}
                              >
                                {insight.priority.toUpperCase()}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {insight.confidence}% confident
                              </Badge>
                            </div>
                            <CardTitle className="text-lg leading-tight">
                              {insight.title}
                            </CardTitle>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleStatusChange(insight.id, 'bookmarked')}>
                              <Bookmark className="h-4 w-4 mr-2" />
                              Bookmark
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Share className="h-4 w-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Export
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleStatusChange(insight.id, 'dismissed')}>
                              <X className="h-4 w-4 mr-2" />
                              Dismiss
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Description */}
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {insight.summary}
                      </p>

                      {/* Key Metrics */}
                      <div className="space-y-3">
                        {Object.entries(insight.metrics).slice(0, 2).map(([key, metric]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {metric.formatted || `${metric.current}${metric.unit}`}
                              </span>
                              {metric.trend === 'up' && <ArrowUp className="h-3 w-3 text-green-500" />}
                              {metric.trend === 'down' && <ArrowDown className="h-3 w-3 text-red-500" />}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Impact Summary */}
                      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-800">Impact</span>
                          <Badge variant="outline" className="text-xs">
                            {insight.impact.probability}% likely
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-700">Financial</span>
                            <span className="font-bold text-blue-900">
                              {formatFinancialImpact(insight.impact.financial)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-700">Timeline</span>
                            <span className="font-medium text-blue-800">
                              {insight.impact.timeline}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Confidence Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">AI Confidence</span>
                          <span className="font-medium">{insight.confidence}%</span>
                        </div>
                        <Progress value={insight.confidence} className="h-2" />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{insight.dataPoints} data points</span>
                          <span>{insight.sources.length} sources</span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1">
                        {insight.tags.slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {insight.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{insight.tags.length - 3}
                          </Badge>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 pt-2">
                        <Button
                          onClick={() => handleInsightAction(insight, insight.actions.primary)}
                          className={`w-full bg-gradient-to-r ${color} hover:opacity-90 text-white`}
                        >
                          {React.createElement(insight.actions.primary.icon, { className: "h-4 w-4 mr-2" })}
                          {insight.actions.primary.label}
                        </Button>

                        {insight.actions.secondary.length > 0 && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleInsightAction(insight, insight.actions.secondary[0])}
                              className="flex-1"
                            >
                              {React.createElement(insight.actions.secondary[0].icon, { className: "h-3 w-3 mr-1" })}
                              {insight.actions.secondary[0].label}
                            </Button>
                            {insight.actions.secondary.length > 1 && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  {insight.actions.secondary.slice(1).map((action) => (
                                    <DropdownMenuItem
                                      key={action.id}
                                      onClick={() => handleInsightAction(insight, action)}
                                    >
                                      {React.createElement(action.icon, { className: "h-4 w-4 mr-2" })}
                                      {action.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <Brain className="h-3 w-3" />
                          <span>{insight.aiModel}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(insight.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {displayInsights.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="mx-auto w-24 h-24 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="h-12 w-12 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Insights Available</h3>
            <p className="text-gray-600 mb-4">
              {loading ? 'Loading AI insights...' : 'No insights match your current filters.'}
            </p>
            {!loading && (
              <Button onClick={handleRefresh} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Insights
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default AIInsightCards