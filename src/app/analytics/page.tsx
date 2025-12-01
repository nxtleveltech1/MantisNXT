'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import AppLayout from '@/components/layout/AppLayout';
import { BuildSafeErrorBoundary, SafeLazyWrapper } from '@/components/ui/BuildSafeErrorBoundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Brain,
  BarChart3,
  Building2,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Activity,
  AlertTriangle,
} from 'lucide-react';

// Lazy-load AI components with fallbacks to prevent build failures
const RealTimeAnalyticsDashboard = dynamic(
  () =>
    import('@/components/analytics/RealTimeAnalyticsDashboard').catch(() => ({
      default: () => <BasicAnalyticsFallback type="dashboard" />,
    })),
  {
    loading: () => <AnalyticsLoadingSkeleton />,
    ssr: false,
  }
);

const AISupplierDiscovery = dynamic(
  () =>
    import('@/components/suppliers/AISupplierDiscovery').catch(() => ({
      default: () => <BasicAnalyticsFallback type="supplier" />,
    })),
  {
    loading: () => <AnalyticsLoadingSkeleton />,
    ssr: false,
  }
);

const AIChatInterface = dynamic(
  () =>
    import('@/components/ai/ChatInterface').catch(() => ({
      default: () => <BasicAnalyticsFallback type="chat" />,
    })),
  {
    loading: () => <AnalyticsLoadingSkeleton />,
    ssr: false,
  }
);

const AIInsightCards = dynamic(
  () =>
    import('@/components/ai/InsightCards').catch(() => ({
      default: () => <BasicAnalyticsFallback type="insights" />,
    })),
  {
    loading: () => <AnalyticsLoadingSkeleton />,
    ssr: false,
  }
);

const PredictiveCharts = dynamic(
  () =>
    import('@/components/analytics/PredictiveCharts').catch(() => ({
      default: () => <BasicAnalyticsFallback type="charts" />,
    })),
  {
    loading: () => <AnalyticsLoadingSkeleton />,
    ssr: false,
  }
);

// Loading skeleton component
function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 w-3/4 rounded bg-gray-200"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-8 w-1/2 rounded bg-gray-200"></div>
                <div className="h-3 rounded bg-gray-200"></div>
                <div className="h-3 w-2/3 rounded bg-gray-200"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Basic fallback components when AI components fail to load
function BasicAnalyticsFallback({ type }: { type: string }) {
  const getContent = () => {
    switch (type) {
      case 'dashboard':
        return {
          title: 'Analytics Dashboard',
          description:
            'Basic analytics data is available. AI-enhanced features are temporarily unavailable.',
          icon: BarChart3,
        };
      case 'supplier':
        return {
          title: 'Supplier Management',
          description:
            'Supplier data is available. AI discovery features are temporarily unavailable.',
          icon: Building2,
        };
      case 'chat':
        return {
          title: 'AI Assistant',
          description:
            'AI chat features are temporarily unavailable. Please use manual navigation.',
          icon: MessageSquare,
        };
      case 'insights':
        return {
          title: 'AI Insights',
          description:
            'AI-generated insights are temporarily unavailable. Manual analysis tools are available.',
          icon: Sparkles,
        };
      case 'charts':
        return {
          title: 'Predictive Analytics',
          description:
            'Advanced predictive features are temporarily unavailable. Basic charts are available.',
          icon: TrendingUp,
        };
      default:
        return {
          title: 'Feature Unavailable',
          description: 'This feature is temporarily unavailable.',
          icon: AlertTriangle,
        };
    }
  };

  const content = getContent();
  const Icon = content.icon;

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <Icon className="h-8 w-8 text-amber-600" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-amber-900">{content.title}</h3>
        <p className="text-amber-700">{content.description}</p>
        <div className="mt-4">
          <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800">
            Safe Mode Active
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [chatVisible, setChatVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Handle AI chat actions with error handling
  const handleChatAction = useCallback((action: unknown) => {
    try {
      console.log('Chat action triggered:', action);
      switch (action.action) {
        case 'open_supplier_report':
          setActiveTab('suppliers');
          break;
        case 'view_predictions':
          setActiveTab('predictions');
          break;
        case 'show_insights':
          setActiveTab('insights');
          break;
        default:
          console.log('Unhandled action:', action);
      }
    } catch (error) {
      console.error('Chat action error:', error);
    }
  }, []);

  // Handle supplier selection with error handling
  const handleSupplierSelect = useCallback((supplier: unknown) => {
    try {
      setSelectedSupplier(supplier);
      console.log('Supplier selected:', supplier);
    } catch (error) {
      console.error('Supplier selection error:', error);
    }
  }, []);

  // Handle insight actions with error handling
  const handleInsightAction = useCallback((insightId: string, action: unknown) => {
    try {
      console.log('Insight action:', insightId, action);
    } catch (error) {
      console.error('Insight action error:', error);
    }
  }, []);

  return (
    <BuildSafeErrorBoundary level="page">
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
          <div className="container mx-auto space-y-8 px-4 py-8">
            {/* Header */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <h1 className="flex items-center gap-3 text-4xl font-bold text-gray-900">
                  <div className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 p-3 text-white">
                    <Brain className="h-8 w-8" />
                  </div>
                  AI-Enhanced Analytics
                </h1>
                <p className="text-lg text-gray-600">
                  Intelligent procurement insights with predictive analytics and supplier
                  intelligence
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="border-green-300 bg-green-100 text-green-800">
                  <Activity className="mr-1 h-4 w-4" />
                  Live Data
                </Badge>
                <Button
                  onClick={() => setChatVisible(!chatVisible)}
                  className={`${
                    chatVisible
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                      : 'border-indigo-200 bg-white text-indigo-600'
                  } transition-all duration-200`}
                  variant={chatVisible ? 'default' : 'outline'}
                  aria-label={chatVisible ? 'Hide AI Assistant' : 'Show AI Assistant'}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  AI Assistant
                </Button>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
              {/* Left Content - Analytics Tabs */}
              <div
                className={`${chatVisible ? 'lg:col-span-3' : 'lg:col-span-4'} transition-all duration-300`}
              >
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList
                    className="grid w-full grid-cols-4 rounded-xl border border-gray-200 bg-white/80 p-1 shadow-lg backdrop-blur-sm"
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
                      className="space-y-6 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
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
                      className="space-y-6 rounded-lg focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:outline-none"
                      role="tabpanel"
                      id="predictions-panel"
                      aria-labelledby="predictions-tab"
                    >
                      <SafeLazyWrapper level="component">
                        <PredictiveCharts
                          onChartSelect={chartId => console.log('Chart selected:', chartId)}
                          onAnomalyClick={anomaly => console.log('Anomaly clicked:', anomaly)}
                          onRefresh={() => console.log('Charts refreshed')}
                          realTimeUpdate={true}
                        />
                      </SafeLazyWrapper>
                    </TabsContent>

                    <TabsContent
                      value="insights"
                      className="space-y-6 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none"
                      role="tabpanel"
                      id="insights-panel"
                      aria-labelledby="insights-tab"
                    >
                      <SafeLazyWrapper level="component">
                        <AIInsightCards
                          onInsightAction={handleInsightAction}
                          onInsightStatusChange={(id, status) =>
                            console.log('Insight status changed:', id, status)
                          }
                          onRefresh={() => console.log('Insights refreshed')}
                        />
                      </SafeLazyWrapper>
                    </TabsContent>

                    <TabsContent
                      value="suppliers"
                      className="space-y-6 rounded-lg focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none"
                      role="tabpanel"
                      id="suppliers-panel"
                      aria-labelledby="suppliers-tab"
                    >
                      <SafeLazyWrapper level="component">
                        <AISupplierDiscovery
                          onSupplierSelect={handleSupplierSelect}
                          onSupplierBookmark={id => console.log('Supplier bookmarked:', id)}
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
              <a
                href="#main-content"
                className="sr-only rounded bg-blue-600 px-4 py-2 text-white focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
              >
                Skip to main content
              </a>
              <a
                href="#ai-assistant"
                className="sr-only rounded bg-purple-600 px-4 py-2 text-white focus:not-sr-only focus:absolute focus:top-4 focus:right-4"
              >
                Skip to AI assistant
              </a>
            </div>
          </div>
        </div>
      </AppLayout>
    </BuildSafeErrorBoundary>
  );
}
