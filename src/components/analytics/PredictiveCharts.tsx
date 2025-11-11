"use client"

import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TooltipProvider,
} from "@/components/ui/tooltip"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  Bar,
  ScatterChart,
  Scatter,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Dot
} from 'recharts'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  AlertTriangle,
  Clock,
  RefreshCw,
  Download,
  Maximize2,
  Minimize2,
  Database,
  Sparkles
} from "lucide-react"

// Types for Predictive Analytics
interface PredictiveDataPoint {
  period: string
  actual?: number
  predicted: number
  confidence: {
    lower: number
    upper: number
  }
  anomaly?: boolean
  factors?: {
    seasonality: number
    trend: number
    external: number
  }
}

interface AnomalyDetection {
  id: string
  period: string
  value: number
  expectedValue: number
  deviation: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  factors: string[]
  confidence: number
}

interface PredictiveChart {
  id: string
  title: string
  description: string
  type: 'line' | 'area' | 'bar' | 'composed' | 'scatter'
  category: string
  data: PredictiveDataPoint[]
  anomalies: AnomalyDetection[]
  metrics: {
    accuracy: number
    trendDirection: 'up' | 'down' | 'stable'
    volatility: number
    nextPeriodPrediction: number
    confidence: number
  }
  insights: {
    key: string
    trend: string
    risk: string
    opportunity: string
  }
  timeRange: string
  unit: string
  updatedAt: string
}

interface PredictiveChartsProps {
  charts?: PredictiveChart[]
  onChartSelect?: (chartId: string) => void
  onAnomalyClick?: (anomaly: AnomalyDetection) => void
  onRefresh?: () => void
  realTimeUpdate?: boolean
  compactMode?: boolean
}

const PredictiveCharts: React.FC<PredictiveChartsProps> = ({
  charts = [],
  onChartSelect,
  onAnomalyClick,
  onRefresh,
  realTimeUpdate = true,
  compactMode = false
}) => {
  // State Management
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<string>('6m')
  const [selectedChart, setSelectedChart] = useState<string | null>(null)
  const [isAnimating, setIsAnimating] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mock predictive charts data
  const mockCharts: PredictiveChart[] = [
    {
      id: 'spend_forecast',
      title: 'Spend Forecast & Anomaly Detection',
      description: 'AI-powered spend prediction with confidence intervals and anomaly detection',
      type: 'composed',
      category: 'Financial',
      data: [
        {
          period: 'Jan',
          actual: 280000,
          predicted: 285000,
          confidence: { lower: 275000, upper: 295000 }
        },
        {
          period: 'Feb',
          actual: 295000,
          predicted: 290000,
          confidence: { lower: 280000, upper: 300000 }
        },
        {
          period: 'Mar',
          actual: 310000,
          predicted: 305000,
          confidence: { lower: 295000, upper: 315000 },
          anomaly: true
        },
        {
          period: 'Apr',
          actual: 275000,
          predicted: 320000,
          confidence: { lower: 310000, upper: 330000 },
          anomaly: true
        },
        {
          period: 'May',
          predicted: 335000,
          confidence: { lower: 325000, upper: 345000 }
        },
        {
          period: 'Jun',
          predicted: 350000,
          confidence: { lower: 340000, upper: 360000 }
        },
        {
          period: 'Jul',
          predicted: 365000,
          confidence: { lower: 350000, upper: 380000 }
        }
      ],
      anomalies: [
        {
          id: 'anomaly_1',
          period: 'Mar',
          value: 310000,
          expectedValue: 305000,
          deviation: 1.6,
          severity: 'medium',
          factors: ['Seasonal demand increase', 'New supplier onboarding'],
          confidence: 87
        },
        {
          id: 'anomaly_2',
          period: 'Apr',
          value: 275000,
          expectedValue: 320000,
          deviation: -14.1,
          severity: 'high',
          factors: ['Delayed procurement', 'Budget freeze'],
          confidence: 92
        }
      ],
      metrics: {
        accuracy: 94.2,
        trendDirection: 'up',
        volatility: 12.5,
        nextPeriodPrediction: 335000,
        confidence: 89
      },
      insights: {
        key: '12% growth trend identified',
        trend: 'Consistent upward trajectory with seasonal variations',
        risk: 'April anomaly suggests potential budget constraints',
        opportunity: 'Q3 forecast shows optimal procurement window'
      },
      timeRange: '6 months',
      unit: 'USD',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'supplier_performance',
      title: 'Supplier Performance Prediction',
      description: 'Predictive analysis of supplier performance metrics with risk indicators',
      type: 'line',
      category: 'Performance',
      data: [
        {
          period: 'Week 1',
          actual: 95.2,
          predicted: 95.0,
          confidence: { lower: 93.5, upper: 96.5 }
        },
        {
          period: 'Week 2',
          actual: 94.8,
          predicted: 94.5,
          confidence: { lower: 93.0, upper: 96.0 }
        },
        {
          period: 'Week 3',
          actual: 96.1,
          predicted: 96.0,
          confidence: { lower: 94.5, upper: 97.5 }
        },
        {
          period: 'Week 4',
          actual: 93.2,
          predicted: 95.5,
          confidence: { lower: 94.0, upper: 97.0 },
          anomaly: true
        },
        {
          period: 'Week 5',
          predicted: 94.8,
          confidence: { lower: 93.0, upper: 96.5 }
        },
        {
          period: 'Week 6',
          predicted: 95.5,
          confidence: { lower: 94.0, upper: 97.0 }
        }
      ],
      anomalies: [
        {
          id: 'perf_anomaly_1',
          period: 'Week 4',
          value: 93.2,
          expectedValue: 95.5,
          deviation: -2.4,
          severity: 'medium',
          factors: ['Supply chain disruption', 'Quality control issues'],
          confidence: 91
        }
      ],
      metrics: {
        accuracy: 96.8,
        trendDirection: 'stable',
        volatility: 3.2,
        nextPeriodPrediction: 94.8,
        confidence: 94
      },
      insights: {
        key: 'Overall performance stable with minor fluctuations',
        trend: 'Performance maintaining above 94% threshold',
        risk: 'Week 4 dip requires supplier attention',
        opportunity: 'Consistent performance enables expansion'
      },
      timeRange: '6 weeks',
      unit: '%',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'demand_forecast',
      title: 'Demand Forecasting',
      description: 'AI-driven demand prediction with seasonal pattern recognition',
      type: 'area',
      category: 'Inventory',
      data: [
        {
          period: 'Q1',
          actual: 1250,
          predicted: 1240,
          confidence: { lower: 1200, upper: 1280 }
        },
        {
          period: 'Q2',
          actual: 1380,
          predicted: 1375,
          confidence: { lower: 1330, upper: 1420 }
        },
        {
          period: 'Q3',
          actual: 1520,
          predicted: 1510,
          confidence: { lower: 1460, upper: 1560 }
        },
        {
          period: 'Q4',
          predicted: 1680,
          confidence: { lower: 1620, upper: 1740 }
        },
        {
          period: 'Q1 Next',
          predicted: 1420,
          confidence: { lower: 1360, upper: 1480 }
        }
      ],
      anomalies: [],
      metrics: {
        accuracy: 97.3,
        trendDirection: 'up',
        volatility: 8.7,
        nextPeriodPrediction: 1680,
        confidence: 91
      },
      insights: {
        key: '24% seasonal growth pattern identified',
        trend: 'Strong seasonal demand with Q4 peak',
        risk: 'Inventory shortfall risk in Q4',
        opportunity: 'Pre-position inventory for seasonal demand'
      },
      timeRange: '5 quarters',
      unit: 'units',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'risk_matrix',
      title: 'Supply Chain Risk Prediction',
      description: 'Predictive risk assessment with multi-factor analysis',
      type: 'scatter',
      category: 'Risk',
      data: [
        {
          period: 'Current',
          actual: 6.2,
          predicted: 6.0,
          confidence: { lower: 5.5, upper: 6.5 }
        },
        {
          period: 'Next Month',
          predicted: 5.8,
          confidence: { lower: 5.2, upper: 6.4 }
        },
        {
          period: 'Month 2',
          predicted: 5.5,
          confidence: { lower: 4.8, upper: 6.2 }
        },
        {
          period: 'Month 3',
          predicted: 5.2,
          confidence: { lower: 4.5, upper: 5.9 }
        }
      ],
      anomalies: [],
      metrics: {
        accuracy: 88.5,
        trendDirection: 'down',
        volatility: 15.3,
        nextPeriodPrediction: 5.8,
        confidence: 85
      },
      insights: {
        key: 'Risk declining through diversification',
        trend: 'Steady improvement in risk profile',
        risk: 'External factors may impact timeline',
        opportunity: 'Accelerated risk reduction possible'
      },
      timeRange: '4 months',
      unit: 'risk score',
      updatedAt: new Date().toISOString()
    }
  ]

  // Use provided charts or mock data
  const workingCharts = charts.length > 0 ? charts : mockCharts

  // Filter charts by category
  const filteredCharts = useMemo(() => {
    if (selectedCategory === 'all') return workingCharts
    return workingCharts.filter(chart => chart.category === selectedCategory)
  }, [workingCharts, selectedCategory])

  // Get unique categories
  const categories = useMemo(() => {
    const cats = ['all', ...new Set(workingCharts.map(chart => chart.category))]
    return cats
  }, [workingCharts])

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: unknown) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((pld: unknown, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: pld.color }}
              />
              <span className="text-gray-600">{pld.name}:</span>
              <span className="font-medium text-gray-900">
                {typeof pld.value === 'number' ? pld.value.toLocaleString() : pld.value}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  // Custom anomaly dot
  const AnomalyDot = (props: unknown) => {
    const { cx, cy, payload } = props
    if (payload.anomaly) {
      return (
        <Dot
          cx={cx}
          cy={cy}
          r={6}
          fill="#ef4444"
          stroke="#dc2626"
          strokeWidth={2}
          className="animate-pulse cursor-pointer"
          onClick={() => {
            const anomaly = mockCharts[0].anomalies.find(a => a.period === payload.period)
            if (anomaly) onAnomalyClick?.(anomaly)
          }}
        />
      )
    }
    return null
  }

  // Render chart based on type
  const renderChart = (chart: PredictiveChart) => {
    const colors = {
      actual: '#3b82f6',
      predicted: '#10b981',
      confidence: '#e5e7eb',
      anomaly: '#ef4444'
    }

    switch (chart.type) {
      case 'composed':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                dataKey="confidence.upper"
                fill={colors.confidence}
                stroke="none"
                name="Confidence Band"
                fillOpacity={0.3}
              />
              <Area
                dataKey="confidence.lower"
                fill="#ffffff"
                stroke="none"
                fillOpacity={1}
              />
              <Bar dataKey="actual" fill={colors.actual} name="Actual" opacity={0.8} />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke={colors.predicted}
                strokeWidth={3}
                name="Predicted"
                dot={<AnomalyDot />}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="actual"
                stroke={colors.actual}
                strokeWidth={2}
                name="Actual"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke={colors.predicted}
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Predicted"
                dot={<AnomalyDot />}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="confidence.upper"
                stackId="1"
                stroke="none"
                fill={colors.confidence}
                fillOpacity={0.3}
                name="Confidence Range"
              />
              <Area
                type="monotone"
                dataKey="confidence.lower"
                stackId="1"
                stroke="none"
                fill="#ffffff"
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke={colors.actual}
                fill={colors.actual}
                fillOpacity={0.6}
                name="Actual"
              />
              <Area
                type="monotone"
                dataKey="predicted"
                stroke={colors.predicted}
                fill="none"
                strokeWidth={3}
                strokeDasharray="5 5"
                name="Predicted"
              />
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Scatter dataKey="actual" fill={colors.actual} name="Current Risk" />
              <Scatter dataKey="predicted" fill={colors.predicted} name="Predicted Risk" />
              <ReferenceLine y={7} stroke="#ef4444" strokeDasharray="3 3" label="High Risk Threshold" />
              <ReferenceLine y={4} stroke="#10b981" strokeDasharray="3 3" label="Low Risk Threshold" />
            </ScatterChart>
          </ResponsiveContainer>
        )

      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke={colors.predicted}
                strokeWidth={2}
                name="Predicted"
              />
            </LineChart>
          </ResponsiveContainer>
        )
    }
  }

  // Get trend icon
  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-blue-600" />
    }
  }

  // Handle refresh
  const handleRefresh = async () => {
    setLoading(true)
    try {
      await onRefresh?.()
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (err) {
      setError("Failed to refresh charts. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh effect
  useEffect(() => {
    if (realTimeUpdate) {
      const interval = setInterval(() => {
        // Simulate real-time updates
        console.log("Updating predictive charts...")
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [realTimeUpdate])

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="h-6 w-6 text-purple-600" />
              Predictive Analytics
            </h2>
            <p className="text-gray-600">
              AI-powered forecasting with anomaly detection and confidence intervals
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3m">3 Months</SelectItem>
                <SelectItem value="6m">6 Months</SelectItem>
                <SelectItem value="1y">1 Year</SelectItem>
                <SelectItem value="2y">2 Years</SelectItem>
              </SelectContent>
            </Select>

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

        {/* Charts Grid */}
        <div className={`grid gap-6 ${
          compactMode
            ? 'grid-cols-1 xl:grid-cols-2'
            : 'grid-cols-1 xl:grid-cols-2'
        }`}>
          <AnimatePresence>
            {filteredCharts.map((chart, index) => (
              <motion.div
                key={chart.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg">
                            <BarChart3 className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{chart.title}</CardTitle>
                            <p className="text-sm text-gray-600">{chart.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {chart.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {chart.metrics.accuracy}% accurate
                          </Badge>
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            {getTrendIcon(chart.metrics.trendDirection)}
                            {chart.metrics.trendDirection}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedChart(selectedChart === chart.id ? null : chart.id)}
                        >
                          {selectedChart === chart.id ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Chart Visualization */}
                    <div className="w-full">
                      {renderChart(chart)}
                    </div>

                    {/* Anomalies Alert */}
                    {chart.anomalies.length > 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium text-red-800">
                            {chart.anomalies.length} Anomal{chart.anomalies.length === 1 ? 'y' : 'ies'} Detected
                          </span>
                        </div>
                        <div className="space-y-1">
                          {chart.anomalies.slice(0, 2).map((anomaly, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-red-700">
                                {anomaly.period}: {anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation.toFixed(1)}% deviation
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {anomaly.confidence}% sure
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Metrics */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-gray-900">
                          {chart.metrics.confidence}%
                        </div>
                        <div className="text-xs text-gray-600">Confidence</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-gray-900">
                          {chart.metrics.volatility.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600">Volatility</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-gray-900">
                          {typeof chart.metrics.nextPeriodPrediction === 'number'
                            ? chart.metrics.nextPeriodPrediction.toLocaleString()
                            : chart.metrics.nextPeriodPrediction
                          }
                        </div>
                        <div className="text-xs text-gray-600">Next Period</div>
                      </div>
                    </div>

                    {/* AI Insights */}
                    <div className="space-y-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800">AI Insights</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="font-medium text-blue-700">Key Finding:</span>
                          <p className="text-blue-600 mt-1">{chart.insights.key}</p>
                        </div>
                        <div>
                          <span className="font-medium text-blue-700">Trend:</span>
                          <p className="text-blue-600 mt-1">{chart.insights.trend}</p>
                        </div>
                        <div>
                          <span className="font-medium text-orange-700">Risk:</span>
                          <p className="text-orange-600 mt-1">{chart.insights.risk}</p>
                        </div>
                        <div>
                          <span className="font-medium text-green-700">Opportunity:</span>
                          <p className="text-green-600 mt-1">{chart.insights.opportunity}</p>
                        </div>
                      </div>
                    </div>

                    {/* Footer Info */}
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>Updated {new Date(chart.updatedAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Database className="h-3 w-3" />
                        <span>{chart.timeRange}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredCharts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="mx-auto w-24 h-24 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="h-12 w-12 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Charts Available</h3>
            <p className="text-gray-600 mb-4">
              {loading ? 'Loading predictive analytics...' : 'No charts match your current filters.'}
            </p>
            {!loading && (
              <Button
                onClick={handleRefresh}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Charts
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  )
}

export default PredictiveCharts