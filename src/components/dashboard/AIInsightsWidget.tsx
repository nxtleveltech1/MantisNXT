"use client"

/**
 * AI Insights Widget - Dashboard Integration Component
 *
 * Compact AI insights display for main dashboard
 * Features:
 * - Quick AI insights
 * - Recent analysis results
 * - Action recommendations
 * - Chat shortcut
 */

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Brain,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  MessageCircle,
  DollarSign,
  Target,
  Activity,
} from 'lucide-react'

interface QuickInsight {
  id: string
  type: 'opportunity' | 'risk' | 'trend'
  title: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  impact?: number
  confidence: number
}

interface AIInsightsWidgetProps {
  maxInsights?: number
  refreshInterval?: number
  className?: string
}

const AIInsightsWidget: React.FC<AIInsightsWidgetProps> = ({
  maxInsights = 5,
  refreshInterval = 300000, // 5 minutes
  className = '',
}) => {
  const [insights, setInsights] = useState<QuickInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Load insights on mount and refresh interval
  useEffect(() => {
    loadInsights()

    const interval = setInterval(() => {
      loadInsights()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval])

  // Load quick insights from API
  const loadInsights = async () => {
    try {
      setLoading(true)

      const response = await fetch('/api/ai/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: { type: 'portfolio' },
          focusAreas: ['cost', 'risk', 'performance'],
          timeFrame: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
          includeActions: false,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.insights) {
          // Convert to quick insights format
          const quickInsights: QuickInsight[] = data.data.insights
            .slice(0, maxInsights)
            .map((insight: any) => ({
              id: insight.id,
              type: insight.type,
              title: insight.title,
              description: insight.summary,
              priority: insight.priority,
              impact: insight.impact?.financial,
              confidence: insight.confidence,
            }))

          setInsights(quickInsights)
          setLastUpdated(new Date())
        }
      }
    } catch (error) {
      console.error('Failed to load AI insights:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get icon for insight type
  const getInsightIcon = (type: QuickInsight['type']) => {
    switch (type) {
      case 'opportunity':
        return <Lightbulb className="h-4 w-4 text-green-600 dark:text-green-400" />
      case 'risk':
        return <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
      case 'trend':
        return <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      default:
        return <Activity className="h-4 w-4 text-gray-600 dark:text-gray-400" />
    }
  }

  // Get priority color
  const getPriorityColor = (priority: QuickInsight['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
    }
  }

  return (
    <Card className={`border-0 shadow-lg ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            AI Insights
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadInsights}
            disabled={loading}
            className="h-8 w-8 p-0"
            aria-label="Refresh insights"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Sparkles className="h-3 w-3" />
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[300px]">
          {loading && insights.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Loading AI insights...</p>
              </div>
            </div>
          ) : insights.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <Brain className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  No insights available
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadInsights}
                  className="mt-2"
                >
                  Generate Insights
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map(insight => (
                <div
                  key={insight.id}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getPriorityColor(insight.priority)}`}
                        >
                          {insight.priority.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {insight.confidence}% confident
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1 line-clamp-1">
                        {insight.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {insight.description}
                      </p>
                      {insight.impact && insight.impact > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          <DollarSign className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            ${(insight.impact / 1000).toFixed(0)}K impact
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link href="/ai-insights" className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center justify-center gap-2 group"
            >
              <Target className="h-4 w-4" />
              View All Insights
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </Link>
          <Link href="/ai-insights?tab=chat">
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default AIInsightsWidget
