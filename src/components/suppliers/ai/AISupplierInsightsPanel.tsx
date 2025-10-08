"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  Target,
  Zap,
  BarChart3,
  PieChart,
  Activity,
  DollarSign,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Download,
  Share,
  Bookmark,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Loader2,
  RefreshCw,
  Lightbulb,
  Search,
  Filter,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { format } from 'date-fns'

// AI Chat Types
interface AIChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    type?: 'insight' | 'recommendation' | 'query_result' | 'analysis'
    confidence?: number
    sources?: string[]
    relatedSuppliers?: string[]
    actionable?: boolean
    suggestedActions?: string[]
  }
  isTyping?: boolean
}

interface AISupplierContext {
  currentSupplier?: string
  activeConversation?: string
  recentQueries: string[]
  preferences: {
    analysisDepth: 'quick' | 'detailed' | 'comprehensive'
    focusAreas: string[]
    alertThresholds: Record<string, number>
  }
}

interface AIInsightCard {
  id: string
  type: 'risk' | 'opportunity' | 'performance' | 'cost' | 'relationship'
  title: string
  summary: string
  details: string
  confidence: number
  impact: 'low' | 'medium' | 'high'
  urgency: 'low' | 'medium' | 'high'
  dataPoints: Array<{
    metric: string
    value: number | string
    trend: 'up' | 'down' | 'stable'
    context: string
  }>
  recommendations: string[]
  relatedSuppliers: Array<{
    id: string
    name: string
    relationship: string
  }>
  sourceData: string[]
  createdAt: Date
  lastUpdated: Date
  viewCount: number
  isBookmarked: boolean
  userFeedback?: 'helpful' | 'not_helpful'
}

interface AISupplierInsightsPanelProps {
  supplierId?: string
  onInsightAction?: (insight: AIInsightCard, action: string) => void
  onNavigateToSupplier?: (supplierId: string) => void
  className?: string
}

export default function AISupplierInsightsPanel({
  supplierId,
  onInsightAction,
  onNavigateToSupplier,
  className
}: AISupplierInsightsPanelProps) {
  // State management
  const [activeTab, setActiveTab] = useState('chat')
  const [messages, setMessages] = useState<AIChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [insights, setInsights] = useState<AIInsightCard[]>([])
  const [context, setContext] = useState<AISupplierContext>({
    recentQueries: [],
    preferences: {
      analysisDepth: 'detailed',
      focusAreas: ['performance', 'cost', 'risk'],
      alertThresholds: {}
    }
  })
  const [selectedInsight, setSelectedInsight] = useState<AIInsightCard | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: AIChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your AI Supplier Intelligence Assistant. I can help you with:

• **Supplier Analysis** - Performance, risk, and cost analysis
• **Market Insights** - Industry trends and competitive intelligence
• **Recommendations** - Data-driven supplier optimization suggestions
• **Q&A** - Answer specific questions about your suppliers

What would you like to explore today?`,
      timestamp: new Date(),
      metadata: {
        type: 'system',
        actionable: false
      }
    }
    setMessages([welcomeMessage])
  }, [])

  // Auto-generate insights
  useEffect(() => {
    generateInsights()
  }, [supplierId])

  const generateInsights = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ai/suppliers/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          analysisType: context.preferences.analysisDepth,
          focusAreas: context.preferences.focusAreas
        })
      })

      if (response.ok) {
        const { insights } = await response.json()
        setInsights(insights)
      }
    } catch (error) {
      console.error('Error generating insights:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: AIChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)

    // Update context
    setContext(prev => ({
      ...prev,
      recentQueries: [inputMessage, ...prev.recentQueries.slice(0, 4)]
    }))

    try {
      const response = await fetch('/api/ai/suppliers/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage,
          context: {
            supplierId,
            conversationHistory: messages.slice(-5),
            preferences: context.preferences
          }
        })
      })

      if (!response.ok) throw new Error('Chat request failed')

      const { response: aiResponse, metadata } = await response.json()

      const assistantMessage: AIChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        metadata
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: AIChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        metadata: { type: 'error' }
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleInsightFeedback = (insight: AIInsightCard, feedback: 'helpful' | 'not_helpful') => {
    setInsights(prev => prev.map(i =>
      i.id === insight.id ? { ...i, userFeedback: feedback } : i
    ))
    // Send feedback to backend
    fetch('/api/ai/suppliers/insights/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        insightId: insight.id,
        feedback,
        userId: 'current-user' // Replace with actual user ID
      })
    }).catch(console.error)
  }

  const handleBookmarkInsight = (insight: AIInsightCard) => {
    setInsights(prev => prev.map(i =>
      i.id === insight.id ? { ...i, isBookmarked: !i.isBookmarked } : i
    ))
  }

  const getInsightIcon = (type: AIInsightCard['type']) => {
    const icons = {
      risk: AlertTriangle,
      opportunity: TrendingUp,
      performance: BarChart3,
      cost: DollarSign,
      relationship: Star
    }
    return icons[type] || Activity
  }

  const getInsightColor = (type: AIInsightCard['type']) => {
    const colors = {
      risk: 'text-red-600 bg-red-50 border-red-200',
      opportunity: 'text-green-600 bg-green-50 border-green-200',
      performance: 'text-blue-600 bg-blue-50 border-blue-200',
      cost: 'text-orange-600 bg-orange-50 border-orange-200',
      relationship: 'text-purple-600 bg-purple-50 border-purple-200'
    }
    return colors[type] || 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const getImpactColor = (impact: string) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-orange-600',
      high: 'text-red-600'
    }
    return colors[impact as keyof typeof colors] || 'text-gray-600'
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    const icons = {
      up: ArrowUpRight,
      down: ArrowDownRight,
      stable: Minus
    }
    return icons[trend]
  }

  const filteredInsights = insights.filter(insight =>
    searchQuery === '' ||
    insight.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    insight.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    insight.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              AI Supplier Intelligence
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generateInsights}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chat">
                <MessageSquare className="h-4 w-4 mr-2" />
                AI Chat
              </TabsTrigger>
              <TabsTrigger value="insights">
                <Lightbulb className="h-4 w-4 mr-2" />
                Insights ({insights.length})
              </TabsTrigger>
            </TabsList>

            {/* AI Chat Tab */}
            <TabsContent value="chat" className="space-y-4">
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputMessage('Analyze supplier performance trends')}
                >
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Performance Analysis
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputMessage('Identify cost optimization opportunities')}
                >
                  <DollarSign className="h-3 w-3 mr-1" />
                  Cost Optimization
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputMessage('Assess supplier risk factors')}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Risk Assessment
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputMessage('Compare suppliers in this category')}
                >
                  <Target className="h-3 w-3 mr-1" />
                  Supplier Comparison
                </Button>
              </div>

              {/* Chat Messages */}
              <ScrollArea className="h-[400px] border rounded-lg p-4 bg-muted/20">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && (
                        <Avatar className="h-8 w-8 border">
                          <AvatarFallback className="bg-purple-100">
                            <Bot className="h-4 w-4 text-purple-600" />
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                        <div className={`rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border shadow-sm'
                        }`}>
                          <div className="text-sm whitespace-pre-wrap">{message.content}</div>

                          {message.metadata?.actionable && message.metadata.suggestedActions && (
                            <div className="mt-3 space-y-1">
                              {message.metadata.suggestedActions.map((action, index) => (
                                <Button
                                  key={index}
                                  size="sm"
                                  variant="outline"
                                  className="mr-2 mb-1 text-xs"
                                >
                                  <Zap className="h-3 w-3 mr-1" />
                                  {action}
                                </Button>
                              ))}
                            </div>
                          )}

                          {message.metadata?.confidence && (
                            <div className="mt-2 text-xs opacity-70">
                              Confidence: {message.metadata.confidence}%
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(message.timestamp, 'HH:mm')}
                        </div>
                      </div>

                      {message.role === 'user' && (
                        <Avatar className="h-8 w-8 border">
                          <AvatarFallback className="bg-blue-100">
                            <User className="h-4 w-4 text-blue-600" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex gap-3 justify-start">
                      <Avatar className="h-8 w-8 border">
                        <AvatarFallback className="bg-purple-100">
                          <Bot className="h-4 w-4 text-purple-600" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-white border rounded-lg p-3 shadow-sm">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-100"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-200"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Ask me anything about your suppliers..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                />
                <Button onClick={handleSendMessage} disabled={isTyping || !inputMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Recent Queries */}
              {context.recentQueries.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Recent Queries</div>
                  <div className="flex flex-wrap gap-1">
                    {context.recentQueries.map((query, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="cursor-pointer text-xs"
                        onClick={() => setInputMessage(query)}
                      >
                        {query.substring(0, 30)}...
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="space-y-4">
              {/* Search and Filters */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search insights..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              {/* Insights List */}
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {filteredInsights.map((insight) => {
                    const Icon = getInsightIcon(insight.type)
                    return (
                      <Card key={insight.id} className={`border-l-4 ${getInsightColor(insight.type)}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3">
                              <Icon className="h-5 w-5 mt-1" />
                              <div className="flex-1">
                                <h4 className="font-medium">{insight.title}</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {insight.summary}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getImpactColor(insight.impact)}>
                                {insight.impact.toUpperCase()}
                              </Badge>
                              <div className="flex gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleBookmarkInsight(insight)}
                                    >
                                      <Bookmark className={`h-4 w-4 ${insight.isBookmarked ? 'fill-current' : ''}`} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Bookmark insight</TooltipContent>
                                </Tooltip>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle className="flex items-center gap-2">
                                        <Icon className="h-5 w-5" />
                                        {insight.title}
                                      </DialogTitle>
                                      <DialogDescription>
                                        Detailed analysis and recommendations
                                      </DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-6">
                                      <div>
                                        <h4 className="font-medium mb-2">Analysis Details</h4>
                                        <p className="text-muted-foreground">{insight.details}</p>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <div className="text-sm font-medium mb-1">Confidence</div>
                                          <Progress value={insight.confidence} className="h-2" />
                                          <div className="text-xs text-muted-foreground mt-1">
                                            {insight.confidence}%
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-sm font-medium mb-1">Impact Level</div>
                                          <Badge className={getImpactColor(insight.impact)}>
                                            {insight.impact.toUpperCase()} IMPACT
                                          </Badge>
                                        </div>
                                      </div>

                                      {insight.dataPoints.length > 0 && (
                                        <div>
                                          <h4 className="font-medium mb-3">Key Data Points</h4>
                                          <div className="space-y-2">
                                            {insight.dataPoints.map((point, index) => {
                                              const TrendIcon = getTrendIcon(point.trend)
                                              return (
                                                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                                  <div>
                                                    <div className="font-medium">{point.metric}</div>
                                                    <div className="text-sm text-muted-foreground">{point.context}</div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <TrendIcon className={`h-4 w-4 ${
                                                      point.trend === 'up' ? 'text-green-600' :
                                                      point.trend === 'down' ? 'text-red-600' :
                                                      'text-gray-600'
                                                    }`} />
                                                    <span className="font-medium">{point.value}</span>
                                                  </div>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      {insight.recommendations.length > 0 && (
                                        <div>
                                          <h4 className="font-medium mb-3">Recommendations</h4>
                                          <div className="space-y-2">
                                            {insight.recommendations.map((rec, index) => (
                                              <div key={index} className="flex items-start gap-2">
                                                <Zap className="h-4 w-4 text-yellow-500 mt-1" />
                                                <span className="text-sm">{rec}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                                        <span>Created: {format(insight.createdAt, 'MMM dd, yyyy')}</span>
                                        <span>Views: {insight.viewCount}</span>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                              {insight.confidence}% confidence • {format(insight.createdAt, 'MMM dd')}
                            </div>
                            <div className="flex gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleInsightFeedback(insight, 'helpful')}
                                    className={insight.userFeedback === 'helpful' ? 'bg-green-100' : ''}
                                  >
                                    <ThumbsUp className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Helpful</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleInsightFeedback(insight, 'not_helpful')}
                                    className={insight.userFeedback === 'not_helpful' ? 'bg-red-100' : ''}
                                  >
                                    <ThumbsDown className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Not helpful</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}

                  {filteredInsights.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No insights found matching your criteria</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}