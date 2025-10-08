"use client"

import React, { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import SelfContainedLayout from '@/components/layout/SelfContainedLayout'
import { BuildSafeErrorBoundary, SafeLazyWrapper } from '@/components/ui/BuildSafeErrorBoundary'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Brain,
  BarChart3,
  Building2,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Activity,
  Maximize2,
  Minimize2,
  AlertTriangle
} from 'lucide-react'

// Lazy-load AI components with fallbacks to prevent build failures
const RealTimeAnalyticsDashboard = dynamic(
  () => import('@/components/analytics/RealTimeAnalyticsDashboard').catch(() => ({
    default: () => <BasicAnalyticsFallback type="dashboard" />
  })),
  {
    loading: () => <AnalyticsLoadingSkeleton />,
    ssr: false
  }
)

const AISupplierDiscovery = dynamic(
  () => import('@/components/suppliers/AISupplierDiscovery').catch(() => ({
    default: () => <BasicAnalyticsFallback type="supplier" />
  })),
  {
    loading: () => <AnalyticsLoadingSkeleton />,
    ssr: false
  }
)

const AIChatInterface = dynamic(
  () => import('@/components/ai/ChatInterface').catch(() => ({
    default: () => <BasicAnalyticsFallback type="chat" />
  })),
  {
    loading: () => <AnalyticsLoadingSkeleton />,
    ssr: false
  }
)

const AIInsightCards = dynamic(
  () => import('@/components/ai/InsightCards').catch(() => ({
    default: () => <BasicAnalyticsFallback type="insights" />
  })),
  {
    loading: () => <AnalyticsLoadingSkeleton />,
    ssr: false
  }
)

const PredictiveCharts = dynamic(
  () => import('@/components/analytics/PredictiveCharts').catch(() => ({
    default: () => <BasicAnalyticsFallback type="charts" />
  })),
  {
    loading: () => <AnalyticsLoadingSkeleton />,
    ssr: false
  }
)

// Loading skeleton component
function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Basic fallback components when AI components fail to load
function BasicAnalyticsFallback({ type }: { type: string }) {
  const getContent = () => {
    switch (type) {
      case 'dashboard':
        return {
          title: 'Analytics Dashboard',
          description: 'Basic analytics data is available. AI-enhanced features are temporarily unavailable.',
          icon: BarChart3
        }
      case 'supplier':
        return {
          title: 'Supplier Management',
          description: 'Supplier data is available. AI discovery features are temporarily unavailable.',
          icon: Building2
        }
      case 'chat':
        return {
          title: 'AI Assistant',
          description: 'AI chat features are temporarily unavailable. Please use manual navigation.',
          icon: MessageSquare
        }
      case 'insights':
        return {
          title: 'AI Insights',
          description: 'AI-generated insights are temporarily unavailable. Manual analysis tools are available.',
          icon: Sparkles
        }
      case 'charts':
        return {
          title: 'Predictive Analytics',
          description: 'Advanced predictive features are temporarily unavailable. Basic charts are available.',
          icon: TrendingUp
        }
      default:
        return {
          title: 'Feature Unavailable',
          description: 'This feature is temporarily unavailable.',
          icon: AlertTriangle
        }
    }
  }

  const content = getContent()
  const Icon = content.icon

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold text-amber-900 mb-2">
          {content.title}
        </h3>
        <p className="text-amber-700">
          {content.description}
        </p>
        <div className="mt-4">
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
            Safe Mode Active
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AnalyticsPage() {
  const [chatVisible, setChatVisible] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Handle AI chat actions with error handling
  const handleChatAction = useCallback((action: any) => {
    try {
      console.log('Chat action triggered:', action)
      switch (action.action) {
        case 'open_supplier_report':
          setActiveTab('suppliers')
          break
        case 'view_predictions':
          setActiveTab('predictions')
          break
        case 'show_insights':
          setActiveTab('insights')
          break
        default:
          console.log('Unhandled action:', action)
      }
    } catch (error) {
      console.error('Chat action error:', error)
    }
  }, [])

  // Handle supplier selection with error handling
  const handleSupplierSelect = useCallback((supplier: any) => {
    try {
      setSelectedSupplier(supplier)
      console.log('Supplier selected:', supplier)
    } catch (error) {
      console.error('Supplier selection error:', error)
    }
  }, [])

  // Handle insight actions with error handling
  const handleInsightAction = useCallback((insightId: string, action: any) => {
    try {
      console.log('Insight action:', insightId, action)
    } catch (error) {
      console.error('Insight action error:', error)
    }
  }, [])

  return (
    <BuildSafeErrorBoundary level="page">
      <SelfContainedLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
          <div className="container mx-auto px-4 py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white">
                    <Brain className="h-8 w-8" />
                  </div>
                  AI-Enhanced Analytics
                </h1>
                <p className="text-lg text-gray-600">
                  Intelligent procurement insights with predictive analytics and supplier intelligence
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
                  <Activity className="h-4 w-4 mr-1" />
                  Live Data
                </Badge>
                <Button
                  onClick={() => setChatVisible(!chatVisible)}
                  className={`${
                    chatVisible
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                      : 'bg-white text-indigo-600 border-indigo-200'
                  } transition-all duration-200`}
                  variant={chatVisible ? 'default' : 'outline'}
                  aria-label={chatVisible ? 'Hide AI Assistant' : 'Show AI Assistant'}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  AI Assistant
                </Button>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Left Content - Analytics Tabs */}
              <div className={`${chatVisible ? 'lg:col-span-3' : 'lg:col-span-4'} transition-all duration-300`}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList
                    className="grid w-full grid-cols-4 bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg rounded-xl p-1"
                    role="tablist"
                    aria-label="Analytics dashboard sections"
                  >
                    <TabsTrigger
                      value="dashboard"
                      className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                      role="tab"
                      aria-controls="dashboard-panel"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Dashboard
                    </TabsTrigger>
                    <TabsTrigger
                      value="predictions"
                      className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white"
                      role="tab"
                      aria-controls="predictions-panel"
                    >
                      <TrendingUp className="h-4 w-4" />
                      Predictions
                    </TabsTrigger>
                    <TabsTrigger
                      value="insights"
                      className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white"
                      role="tab"
                      aria-controls="insights-panel"
                    >
                      <Sparkles className="h-4 w-4" />
                      AI Insights
                    </TabsTrigger>
                    <TabsTrigger
                      value="suppliers"
                      className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white"
                      role="tab"
                      aria-controls="suppliers-panel"
                    >
                      <Building2 className="h-4 w-4" />
                      Discovery
                    </TabsTrigger>
                  </TabsList>

                  <div className="space-y-6">
                    <TabsContent
                      value="dashboard"
                      className="space-y-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-lg"
                      role="tabpanel"
                      id="dashboard-panel"
                      aria-labelledby="dashboard-tab"
                    >
                      <SafeLazyWrapper level="component">
                        <RealTimeAnalyticsDashboard />
                      </SafeLazyWrapper>
                    </TabsContent>

                    <TabsContent
                      value="predictions"
                      className="space-y-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 rounded-lg"
                      role="tabpanel"
                      id="predictions-panel"
                      aria-labelledby="predictions-tab"
                    >
                      <SafeLazyWrapper level="component">
                        <PredictiveCharts
                          onChartSelect={(chartId) => console.log('Chart selected:', chartId)}
                          onAnomalyClick={(anomaly) => console.log('Anomaly clicked:', anomaly)}
                          onRefresh={() => console.log('Charts refreshed')}
                          realTimeUpdate={true}
                        />
                      </SafeLazyWrapper>
                    </TabsContent>

                    <TabsContent
                      value="insights"
                      className="space-y-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-lg"
                      role="tabpanel"
                      id="insights-panel"
                      aria-labelledby="insights-tab"
                    >
                      <SafeLazyWrapper level="component">
                        <AIInsightCards
                          onInsightAction={handleInsightAction}
                          onInsightStatusChange={(id, status) => console.log('Insight status changed:', id, status)}
                          onRefresh={() => console.log('Insights refreshed')}
                        />
                      </SafeLazyWrapper>
                    </TabsContent>

                    <TabsContent
                      value="suppliers"
                      className="space-y-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 rounded-lg"
                      role="tabpanel"
                      id="suppliers-panel"
                      aria-labelledby="suppliers-tab"
                    >
                      <SafeLazyWrapper level="component">
                        <AISupplierDiscovery
                          onSupplierSelect={handleSupplierSelect}
                          onSupplierBookmark={(id) => console.log('Supplier bookmarked:', id)}
                        />
                      </SafeLazyWrapper>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              {/* Right Sidebar - AI Chat */}
              {chatVisible && (
                <div className="lg:col-span-1">
                  <div className="sticky top-8">
                    <SafeLazyWrapper level="component">
                      <AIChatInterface
                        onActionTrigger={handleChatAction}
                        enableVoice={true}
                        enableFileUpload={true}
                        compactMode={false}
                      />
                    </SafeLazyWrapper>
                  </div>
                </div>
              )}
            </div>

            {/* Skip Links for Accessibility */}
            <div className="sr-only">
              <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded">
                Skip to main content
              </a>
              <a href="#ai-assistant" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:right-4 bg-purple-600 text-white px-4 py-2 rounded">
                Skip to AI assistant
              </a>
            </div>
          </div>
        </div>
      </SelfContainedLayout>
    </BuildSafeErrorBoundary>
  )
}