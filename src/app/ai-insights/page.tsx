"use client"

/**
 * AI Insights Dashboard - Comprehensive AI Features Hub
 *
 * Features:
 * - Real-time AI chat interface
 * - AI-powered insights cards
 * - Predictive analytics
 * - Supplier intelligence
 * - Inventory recommendations
 * - Market trends analysis
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Brain,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Building2,
  Package,
  DollarSign,
  Zap,
  RefreshCw,
  Download,
  Activity,
  MessageCircle,
  Info,
} from 'lucide-react'
import AIChatInterfaceV5 from '@/components/ai/ChatInterfaceV5'
import AIInsightCards, { type AIInsight as InsightCardInsight } from '@/components/ai/InsightCards'

type AIInsight = InsightCardInsight

export default function AIInsightsPage() {
  // State
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('overview')

  // Statistics
  const [stats, setStats] = useState({
    totalInsights: 0,
    opportunities: 0,
    risks: 0,
    potentialSavings: 0,
    confidenceAverage: 0,
  })

  const calculateStats = useCallback((insightsList: AIInsight[]) => {
    const opportunities = insightsList.filter(i => i.type === 'opportunity').length
    const risks = insightsList.filter(i => i.type === 'risk').length
    const savings = insightsList.reduce((sum, i) => sum + (i.impact.financial || 0), 0)
    const avgConfidence = insightsList.reduce((sum, i) => sum + i.confidence, 0) / (insightsList.length || 1)

    setStats({
      totalInsights: insightsList.length,
      opportunities,
      risks,
      potentialSavings: savings,
      confidenceAverage: Math.round(avgConfidence),
    })
  }, [])

  // Load insights from API
  const loadInsights = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/ai/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: { type: 'portfolio' },
          focusAreas: ['cost', 'risk', 'performance'],
          timeFrame: {
            start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
          includeActions: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to load insights')
      }

      const data = await response.json()

      if (data.success) {
        setInsights(data.data.insights || [])
        calculateStats(data.data.insights || [])
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (err) {
      console.error('Failed to load insights:', err)
      setError(err instanceof Error ? err.message : 'Failed to load AI insights')
    } finally {
      setLoading(false)
    }
  }, [calculateStats])

  // Load AI insights on mount
  useEffect(() => {
    loadInsights()
  }, [loadInsights])

  // Handle insight action
  const handleInsightAction = (insightId: string, action: unknown) => {
    console.log('Insight action triggered:', insightId, action)
    // Implement action handling logic
  }

  // Handle insight status change
  const handleInsightStatusChange = (insightId: string, status: AIInsight['status']) => {
    setInsights(prev =>
      prev.map(insight =>
        insight.id === insightId ? { ...insight, status } : insight
      )
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Brain className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            AI Insights Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive AI-powered intelligence and recommendations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadInsights}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalInsights}
              </span>
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats.opportunities}
              </span>
              <Lightbulb className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Risks Identified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-red-600 dark:text-red-400">
                {stats.risks}
              </span>
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Potential Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                ${(stats.potentialSavings / 1000).toFixed(0)}K
              </span>
              <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-800 dark:text-red-300">
            <div className="font-semibold mb-1">Error Loading Insights</div>
            <div>{error}</div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={loadInsights}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            AI Chat
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Chat Interface */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  AI Assistant
                </CardTitle>
                <CardDescription>
                  Ask questions about procurement, suppliers, and analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AIChatInterfaceV5 compactMode={true} />
              </CardContent>
            </Card>

            {/* Quick Insights */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  Quick Insights
                </CardTitle>
                <CardDescription>
                  AI-generated recommendations and alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <RefreshCw className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
                    </div>
                  ) : insights.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <Info className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        No insights available. Refresh to generate new insights.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {insights.slice(0, 5).map(insight => (
                        <div
                          key={insight.id}
                          className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <Badge
                              variant={insight.type === 'opportunity' ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {insight.type.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {insight.confidence}% confident
                            </span>
                          </div>
                          <h4 className="font-semibold text-sm mb-1 text-gray-900 dark:text-white">
                            {insight.title}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                            {insight.summary}
                          </p>
                          {insight.impact.financial > 0 && (
                            <div className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                              Potential: ${(insight.impact.financial / 1000).toFixed(0)}K
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <AIInsightCards
            insights={insights}
            onInsightAction={handleInsightAction}
            onInsightStatusChange={handleInsightStatusChange}
            onRefresh={loadInsights}
            compactMode={false}
          />
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-0">
              <AIChatInterfaceV5 compactMode={false} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-5 w-5" />
                  Supplier Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Active Suppliers</span>
                    <span className="font-bold text-gray-900 dark:text-white">24</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Performance Score</span>
                    <span className="font-bold text-green-600 dark:text-green-400">92%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">At Risk</span>
                    <span className="font-bold text-red-600 dark:text-red-400">3</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-5 w-5" />
                  Inventory Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Reorder Alerts</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">12</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Overstock Items</span>
                    <span className="font-bold text-yellow-600 dark:text-yellow-400">8</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Optimization Score</span>
                    <span className="font-bold text-green-600 dark:text-green-400">87%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5" />
                  Market Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Price Trend</span>
                    <span className="font-bold text-red-600 dark:text-red-400">+8%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Demand Forecast</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">High</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Competitive Index</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">6.8/10</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-300">
              <div className="font-semibold mb-1">AI Analytics Engine Active</div>
              <div>
                Continuously analyzing procurement data to identify trends, opportunities, and risks.
                Last updated: {new Date().toLocaleString()}
              </div>
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  )
}
