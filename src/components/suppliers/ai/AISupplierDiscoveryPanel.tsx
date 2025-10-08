"use client"

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Brain,
  Search,
  Sparkles,
  TrendingUp,
  Target,
  MapPin,
  Star,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  MessageSquare,
  Filter,
  Zap,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Supplier } from '@/types/supplier'
import type { AISupplierRecommendation, AISupplierInsight } from '@/types/ai-supplier'

interface AISupplierRecommendation {
  id: string
  supplier: Partial<Supplier>
  confidenceScore: number
  matchReasons: string[]
  riskFactors: string[]
  predictedPerformance: {
    deliveryReliability: number
    qualityScore: number
    costEffectiveness: number
    relationshipPotential: number
  }
  marketIntelligence: {
    competitorAnalysis: string
    industryPosition: string
    growthTrend: 'increasing' | 'stable' | 'declining'
    marketShare: number
  }
  aiInsights: string[]
  recommendationType: 'perfect_match' | 'good_alternative' | 'cost_effective' | 'innovative'
  estimatedSavings?: number
  implementationComplexity: 'low' | 'medium' | 'high'
}

interface AISupplierInsight {
  id: string
  type: 'opportunity' | 'risk' | 'trend' | 'recommendation'
  title: string
  description: string
  impact: 'low' | 'medium' | 'high'
  confidence: number
  actionable: boolean
  suggestedActions: string[]
  relatedSuppliers: string[]
  dataPoints: Record<string, any>
  timestamp: Date
}

interface AISupplierDiscoveryPanelProps {
  onSupplierRecommend?: (supplier: AISupplierRecommendation) => void
  onInsightAction?: (insight: AISupplierInsight, action: string) => void
  className?: string
}

export default function AISupplierDiscoveryPanel({
  onSupplierRecommend,
  onInsightAction,
  className
}: AISupplierDiscoveryPanelProps) {
  // State management
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [recommendations, setRecommendations] = useState<AISupplierRecommendation[]>([])
  const [insights, setInsights] = useState<AISupplierInsight[]>([])
  const [activeTab, setActiveTab] = useState('discover')
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // AI-powered search functionality
  const handleAISearch = useCallback(async (query: string) => {
    if (!query.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch('/api/ai/suppliers/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          context: 'supplier_discovery',
          includeMarketIntelligence: true,
          includePredictiveAnalysis: true
        })
      })

      if (!response.ok) throw new Error('Search failed')

      const { recommendations: newRecs, insights: newInsights } = await response.json()
      setRecommendations(newRecs)
      setInsights(newInsights)

      // Update search history
      setSearchHistory(prev => [query, ...prev.filter(q => q !== query)].slice(0, 5))
    } catch (error) {
      console.error('AI search error:', error)
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Auto-insights generation
  useEffect(() => {
    const generateMarketInsights = async () => {
      setIsAnalyzing(true)
      try {
        const response = await fetch('/api/ai/suppliers/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analysisType: 'market_opportunities',
            includeRiskAssessment: true
          })
        })

        if (response.ok) {
          const { insights } = await response.json()
          setInsights(prev => [...insights, ...prev])
        }
      } catch (error) {
        console.error('Auto-insights error:', error)
      } finally {
        setIsAnalyzing(false)
      }
    }

    generateMarketInsights()
  }, [])

  const getRecommendationTypeColor = (type: AISupplierRecommendation['recommendationType']) => {
    const colors = {
      perfect_match: 'bg-green-500',
      good_alternative: 'bg-blue-500',
      cost_effective: 'bg-orange-500',
      innovative: 'bg-purple-500'
    }
    return colors[type]
  }

  const getRecommendationTypeLabel = (type: AISupplierRecommendation['recommendationType']) => {
    const labels = {
      perfect_match: 'Perfect Match',
      good_alternative: 'Good Alternative',
      cost_effective: 'Cost Effective',
      innovative: 'Innovative Option'
    }
    return labels[type]
  }

  const getInsightIcon = (type: AISupplierInsight['type']) => {
    const icons = {
      opportunity: TrendingUp,
      risk: AlertCircle,
      trend: Target,
      recommendation: Sparkles
    }
    const Icon = icons[type]
    return <Icon className="h-4 w-4" />
  }

  const getImpactColor = (impact: string) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-orange-600',
      high: 'text-red-600'
    }
    return colors[impact as keyof typeof colors] || 'text-gray-600'
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Supplier Discovery
            {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* AI Search Interface */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Describe what type of supplier you need... (e.g., 'sustainable packaging suppliers in South Africa')"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAISearch(searchQuery)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={() => handleAISearch(searchQuery)}
                disabled={isSearching}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isSearching ? 'Searching...' : 'AI Search'}
              </Button>
            </div>

            {/* Search History */}
            {searchHistory.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {searchHistory.map((query, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="cursor-pointer text-xs"
                    onClick={() => setSearchQuery(query)}
                  >
                    {query}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="discover">
                <Target className="h-4 w-4 mr-2" />
                Discover
              </TabsTrigger>
              <TabsTrigger value="recommendations">
                <Star className="h-4 w-4 mr-2" />
                Recommendations ({recommendations.length})
              </TabsTrigger>
              <TabsTrigger value="insights">
                <Brain className="h-4 w-4 mr-2" />
                Insights ({insights.length})
              </TabsTrigger>
            </TabsList>

            {/* Discovery Tab */}
            <TabsContent value="discover" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Smart Matching</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      AI analyzes your requirements against supplier capabilities, performance data, and market intelligence.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Predictive Analytics</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Get predictions on supplier performance, cost savings, and relationship potential.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {recommendations.length === 0 && !isSearching && (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Use AI search to discover suppliers that match your specific needs</p>
                </div>
              )}
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations" className="space-y-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {recommendations.map((rec) => (
                    <Card key={rec.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                              {rec.supplier.name?.[0] || 'S'}
                            </div>
                            <div>
                              <CardTitle className="text-lg">{rec.supplier.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {rec.supplier.primary_category} • {rec.supplier.geographic_region}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <Badge
                                className={`${getRecommendationTypeColor(rec.recommendationType)} text-white`}
                              >
                                {getRecommendationTypeLabel(rec.recommendationType)}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {rec.confidenceScore}% confidence
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Confidence Score */}
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>AI Confidence</span>
                            <span>{rec.confidenceScore}%</span>
                          </div>
                          <Progress value={rec.confidenceScore} className="h-2" />
                        </div>

                        {/* Predicted Performance */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm font-medium mb-2">Predicted Performance</div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span>Delivery:</span>
                                <span className="font-medium">{rec.predictedPerformance.deliveryReliability}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Quality:</span>
                                <span className="font-medium">{rec.predictedPerformance.qualityScore}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Cost Effectiveness:</span>
                                <span className="font-medium">{rec.predictedPerformance.costEffectiveness}%</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-medium mb-2">Market Intelligence</div>
                            <div className="text-xs space-y-1">
                              <div>Position: {rec.marketIntelligence.industryPosition}</div>
                              <div>Growth: {rec.marketIntelligence.growthTrend}</div>
                              <div>Market Share: {rec.marketIntelligence.marketShare}%</div>
                            </div>
                          </div>
                        </div>

                        {/* Match Reasons */}
                        <div>
                          <div className="text-sm font-medium mb-2">Why This Match?</div>
                          <div className="flex flex-wrap gap-1">
                            {rec.matchReasons.map((reason, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Risk Factors */}
                        {rec.riskFactors.length > 0 && (
                          <div>
                            <div className="text-sm font-medium mb-2">Risk Considerations</div>
                            <div className="flex flex-wrap gap-1">
                              {rec.riskFactors.map((risk, index) => (
                                <Badge key={index} variant="outline" className="text-xs border-orange-200">
                                  <AlertCircle className="h-3 w-3 mr-1 text-orange-500" />
                                  {risk}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* AI Insights */}
                        {rec.aiInsights.length > 0 && (
                          <div>
                            <div className="text-sm font-medium mb-2">AI Insights</div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              {rec.aiInsights.map((insight, index) => (
                                <div key={index} className="flex items-start gap-2">
                                  <Sparkles className="h-3 w-3 mt-1 text-purple-500" />
                                  <span>{insight}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => onSupplierRecommend?.(rec)}
                          >
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {/* Handle contact supplier */}}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Contact
                          </Button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <ThumbsUp className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Good recommendation</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <ThumbsDown className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Not relevant</TooltipContent>
                          </Tooltip>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="space-y-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {insights.map((insight) => (
                    <Card key={insight.id} className="border-l-4 border-l-purple-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            {getInsightIcon(insight.type)}
                            <div>
                              <h4 className="font-medium">{insight.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {insight.description}
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <div className={`font-medium ${getImpactColor(insight.impact)}`}>
                              {insight.impact.toUpperCase()} IMPACT
                            </div>
                            <div className="text-muted-foreground">
                              {insight.confidence}% confidence
                            </div>
                          </div>
                        </div>

                        {insight.actionable && insight.suggestedActions.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Suggested Actions:</div>
                            <div className="space-y-1">
                              {insight.suggestedActions.map((action, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onInsightAction?.(insight, action)}
                                  >
                                    {action}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground mt-3">
                          {new Date(insight.timestamp).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}