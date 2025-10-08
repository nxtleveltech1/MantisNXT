"use client"

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Brain,
  Sparkles,
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle,
  Star,
  BarChart3,
  MessageSquare,
  Lightbulb,
  Settings,
  RefreshCw,
  Download,
  Plus,
  Eye,
  Activity,
  DollarSign,
  Clock,
  Zap,
  Loader2
} from 'lucide-react'

// Import existing supplier dashboard
import EnhancedSupplierDashboard from './EnhancedSupplierDashboard'

// Import new AI components
import {
  AISupplierDiscoveryPanel,
  AISupplierInsightsPanel,
  AIPredictiveAnalyticsDashboard,
  useAISupplier,
  useAISupplierRecommendations,
  useAISupplierInsights
} from './ai'

import type {
  AISupplierRecommendation,
  AISupplierInsight
} from '@/types/ai-supplier'

interface AIEnhancedSupplierDashboardProps {
  onSupplierSelect?: (supplier: any) => void
  className?: string
}

export default function AIEnhancedSupplierDashboard({
  onSupplierSelect,
  className
}: AIEnhancedSupplierDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showAIPanel, setShowAIPanel] = useState(true)
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null)
  const [aiMode, setAiMode] = useState<'standard' | 'enhanced' | 'expert'>('enhanced')

  // AI hooks for different functionalities
  const {
    state: aiState,
    refreshAll: refreshAI
  } = useAISupplier({
    supplierId: selectedSupplier || undefined,
    autoFetch: true,
    enableRealTimeUpdates: true,
    analysisDepth: aiMode === 'expert' ? 'comprehensive' : 'standard'
  })

  const {
    recommendations,
    loading: recommendationsLoading,
    search: searchSuppliers
  } = useAISupplierRecommendations()

  const {
    insights,
    loading: insightsLoading,
    refresh: refreshInsights,
    bookmark: bookmarkInsight,
    provideFeedback: provideInsightFeedback
  } = useAISupplierInsights(selectedSupplier || undefined)

  // Handle AI-driven supplier recommendation
  const handleSupplierRecommend = useCallback((recommendation: AISupplierRecommendation) => {
    console.log('AI Supplier Recommendation:', recommendation)
    // Integration with existing supplier selection logic
    if (onSupplierSelect) {
      onSupplierSelect({
        id: recommendation.supplier.id || `ai_rec_${recommendation.id}`,
        name: recommendation.supplier.name,
        category: recommendation.supplier.category,
        aiRecommendation: true,
        confidenceScore: recommendation.confidenceScore,
        recommendationType: recommendation.recommendationType
      })
    }
  }, [onSupplierSelect])

  // Handle insight actions
  const handleInsightAction = useCallback(async (insight: AISupplierInsight, action: string) => {
    console.log('Insight Action:', { insight: insight.id, action })

    // Example actions based on insight type
    switch (action) {
      case 'view_supplier':
        if (insight.relatedSuppliers.length > 0) {
          setSelectedSupplier(insight.relatedSuppliers[0])
          setActiveTab('dashboard')
        }
        break
      case 'generate_report':
        // Trigger report generation
        console.log('Generating report for insight:', insight.title)
        break
      case 'schedule_review':
        // Schedule supplier review
        console.log('Scheduling review based on insight:', insight.title)
        break
      default:
        console.log('Unknown action:', action)
    }
  }, [])

  // Calculate AI enhancement summary
  const aiSummary = {
    totalRecommendations: recommendations.length,
    highConfidenceRecs: recommendations.filter(r => r.confidenceScore >= 80).length,
    totalInsights: insights.length,
    criticalInsights: insights.filter(i => i.impact === 'high' || i.impact === 'critical').length,
    aiAccuracy: 94, // This would come from the AI service
    modelVersion: aiState.aiConfig.modelVersions.recommendation || 'v2.1'
  }

  return (
    <TooltipProvider>
      <div className={`space-y-6 ${className}`}>
        {/* AI Enhancement Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 rounded-lg border">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                AI-Enhanced Supplier Management
              </h2>
              <p className="text-sm text-gray-600">
                Powered by advanced AI • Model v{aiSummary.modelVersion} • {aiSummary.aiAccuracy}% accuracy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* AI Mode Selector */}
            <select
              value={aiMode}
              onChange={(e) => setAiMode(e.target.value as any)}
              className="px-3 py-1 text-sm border rounded-md bg-white"
            >
              <option value="standard">Standard AI</option>
              <option value="enhanced">Enhanced AI</option>
              <option value="expert">Expert AI</option>
            </select>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAIPanel(!showAIPanel)}
                >
                  {showAIPanel ? <Eye className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showAIPanel ? 'Hide AI Panel' : 'Show AI Panel'}
              </TooltipContent>
            </Tooltip>

            <Button
              variant="outline"
              size="sm"
              onClick={refreshAI}
              disabled={aiState.recommendationsLoading || aiState.insightsLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${
                aiState.recommendationsLoading || aiState.insightsLoading ? 'animate-spin' : ''
              }`} />
              Refresh AI
            </Button>
          </div>
        </div>

        {/* AI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">AI Recommendations</p>
                  <p className="text-2xl font-bold text-purple-900">{aiSummary.totalRecommendations}</p>
                  <p className="text-xs text-purple-600">
                    {aiSummary.highConfidenceRecs} high confidence
                  </p>
                </div>
                <Target className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">AI Insights</p>
                  <p className="text-2xl font-bold text-blue-900">{aiSummary.totalInsights}</p>
                  <p className="text-xs text-blue-600">
                    {aiSummary.criticalInsights} critical
                  </p>
                </div>
                <Lightbulb className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Model Accuracy</p>
                  <p className="text-2xl font-bold text-green-900">{aiSummary.aiAccuracy}%</p>
                  <p className="text-xs text-green-600">Last 30 days</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600">Active Models</p>
                  <p className="text-2xl font-bold text-orange-900">4</p>
                  <p className="text-xs text-orange-600">Recommendations, Insights, Risk, Chat</p>
                </div>
                <Activity className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard with AI Integration */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Dashboard Area */}
          <div className={showAIPanel ? "lg:col-span-8" : "lg:col-span-12"}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="dashboard">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="ai-discovery">
                  <Target className="h-4 w-4 mr-2" />
                  AI Discovery
                </TabsTrigger>
                <TabsTrigger value="ai-analytics">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  AI Analytics
                </TabsTrigger>
                <TabsTrigger value="ai-chat">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  AI Assistant
                </TabsTrigger>
              </TabsList>

              {/* Enhanced Traditional Dashboard */}
              <TabsContent value="dashboard">
                <div className="space-y-4">
                  {/* AI Enhancement Overlay for Traditional Dashboard */}
                  {selectedSupplier && insights.length > 0 && (
                    <Card className="border-blue-200 bg-blue-50/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Sparkles className="h-4 w-4 text-blue-600" />
                          AI Insights for Current Supplier
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {insights.slice(0, 3).map((insight) => (
                            <div key={insight.id} className="p-3 bg-white rounded-lg border">
                              <div className="flex items-center justify-between mb-2">
                                <Badge className={
                                  insight.impact === 'high' ? 'bg-red-100 text-red-800' :
                                  insight.impact === 'medium' ? 'bg-orange-100 text-orange-800' :
                                  'bg-green-100 text-green-800'
                                }>
                                  {insight.impact.toUpperCase()}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {insight.confidence}% confidence
                                </span>
                              </div>
                              <h4 className="font-medium text-sm mb-1">{insight.title}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {insight.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Original Enhanced Supplier Dashboard */}
                  <EnhancedSupplierDashboard
                    onSupplierSelect={(supplier) => {
                      setSelectedSupplier(supplier.id)
                      onSupplierSelect?.(supplier)
                    }}
                  />
                </div>
              </TabsContent>

              {/* AI Discovery Tab */}
              <TabsContent value="ai-discovery">
                <AISupplierDiscoveryPanel
                  onSupplierRecommend={handleSupplierRecommend}
                  onInsightAction={handleInsightAction}
                />
              </TabsContent>

              {/* AI Analytics Tab */}
              <TabsContent value="ai-analytics">
                <AIPredictiveAnalyticsDashboard />
              </TabsContent>

              {/* AI Chat Tab */}
              <TabsContent value="ai-chat">
                <AISupplierInsightsPanel
                  supplierId={selectedSupplier || undefined}
                  onInsightAction={handleInsightAction}
                  onNavigateToSupplier={(supplierId) => {
                    setSelectedSupplier(supplierId)
                    setActiveTab('dashboard')
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* AI Side Panel */}
          {showAIPanel && (
            <div className="lg:col-span-4">
              <div className="space-y-4 sticky top-6">
                {/* Quick AI Actions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-600" />
                      Quick AI Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => searchSuppliers('sustainable packaging suppliers')}
                      disabled={recommendationsLoading}
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Find Sustainable Suppliers
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        setActiveTab('ai-analytics')
                      }}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Analyze Market Trends
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        setActiveTab('ai-chat')
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Ask AI Assistant
                    </Button>
                  </CardContent>
                </Card>

                {/* Recent AI Recommendations */}
                {recommendations.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-purple-600" />
                          Recent Recommendations
                        </div>
                        <Badge variant="outline">{recommendations.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {recommendations.slice(0, 3).map((rec) => (
                          <div key={rec.id} className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                               onClick={() => handleSupplierRecommend(rec)}>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-sm">{rec.supplier.name}</h4>
                              <Badge className={
                                rec.confidenceScore >= 90 ? 'bg-green-100 text-green-800' :
                                rec.confidenceScore >= 70 ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {rec.confidenceScore}%
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {rec.supplier.category} • {rec.supplier.geographic_region}
                            </p>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              <span className="text-xs text-green-700">
                                {rec.matchReasons[0]}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Critical AI Insights */}
                {insights.filter(i => i.impact === 'high' || i.impact === 'critical').length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          Critical Insights
                        </div>
                        <Badge variant="destructive">
                          {insights.filter(i => i.impact === 'high' || i.impact === 'critical').length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {insights
                          .filter(i => i.impact === 'high' || i.impact === 'critical')
                          .slice(0, 3)
                          .map((insight) => (
                            <div key={insight.id} className="p-3 border rounded-lg bg-red-50/50">
                              <div className="flex items-center justify-between mb-2">
                                <Badge className="bg-red-100 text-red-800 text-xs">
                                  {insight.impact.toUpperCase()}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {insight.confidence}%
                                </span>
                              </div>
                              <h4 className="font-medium text-sm mb-1">{insight.title}</h4>
                              <p className="text-xs text-muted-foreground">
                                {insight.description}
                              </p>
                              {insight.actionable && insight.suggestedActions.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-2 w-full text-xs"
                                  onClick={() => handleInsightAction(insight, insight.suggestedActions[0].action)}
                                >
                                  {insight.suggestedActions[0].action}
                                </Button>
                              )}
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Performance Status */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4 text-green-600" />
                      AI System Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Model Accuracy</span>
                        <span className="font-medium">{aiSummary.aiAccuracy}%</span>
                      </div>
                      <Progress value={aiSummary.aiAccuracy} className="h-2" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Response Time</span>
                        <span className="font-medium">1.2s avg</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Last updated: 2 min ago</span>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Online</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}