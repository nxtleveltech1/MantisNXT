"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  MessageCircle,
  Send,
  Mic,
  MicOff,
  Paperclip,
  Sparkles,
  User,
  Bot,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Share,
  MoreHorizontal,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Building2,
  TrendingUp,
  DollarSign,
  Package,
  BarChart3,
  Lightbulb,
  Search,
  Filter,
  Download,
  FileText,
  Zap,
  Target,
  Star,
  Clock,
  Globe,
  ArrowRight,
  RefreshCw,
  Maximize2,
  Minimize2,
  Settings,
  HelpCircle,
  BookOpen,
  Database,
  ShieldCheck,
  Award
} from "lucide-react"

// Types for AI Chat System
interface ChatMessage {
  id: string
  content: string
  type: 'user' | 'ai' | 'system'
  timestamp: Date
  metadata?: {
    confidence?: number
    sources?: string[]
    actions?: ChatAction[]
    suggestions?: string[]
    context?: any
  }
  reactions?: {
    helpful?: boolean
    accurate?: boolean
  }
}

interface ChatAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  action: string
  data?: any
  variant?: 'default' | 'primary' | 'secondary' | 'destructive'
}

interface QuickPrompt {
  id: string
  text: string
  category: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

interface AIContext {
  currentProject?: string
  recentQueries?: string[]
  userPreferences?: {
    verbosity: 'concise' | 'detailed' | 'comprehensive'
    focusAreas: string[]
    alertThreshold: number
  }
  sessionData?: any
}

interface AIChatInterfaceProps {
  onActionTrigger?: (action: ChatAction) => void
  initialContext?: AIContext
  compactMode?: boolean
  enableVoice?: boolean
  enableFileUpload?: boolean
}

const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
  onActionTrigger,
  initialContext,
  compactMode = false,
  enableVoice = true,
  enableFileUpload = true
}) => {
  // State Management
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [context, setContext] = useState<AIContext>(initialContext || {})
  const [isExpanded, setIsExpanded] = useState(!compactMode)
  const [error, setError] = useState<string | null>(null)
  const [typingIndicator, setTypingIndicator] = useState(false)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const speechRecognition = useRef<any>(null)

  // Quick prompts for common queries
  const quickPrompts: QuickPrompt[] = [
    {
      id: 'supplier_analysis',
      text: 'Analyze our top suppliers performance',
      category: 'Analysis',
      icon: BarChart3,
      description: 'Get comprehensive supplier performance analytics'
    },
    {
      id: 'cost_optimization',
      text: 'Find cost optimization opportunities',
      category: 'Optimization',
      icon: DollarSign,
      description: 'Identify potential savings in procurement'
    },
    {
      id: 'risk_assessment',
      text: 'Show current supply chain risks',
      category: 'Risk',
      icon: AlertTriangle,
      description: 'Review and assess supply chain vulnerabilities'
    },
    {
      id: 'market_trends',
      text: 'What are the latest market trends?',
      category: 'Intelligence',
      icon: TrendingUp,
      description: 'Get current market intelligence and trends'
    },
    {
      id: 'supplier_recommendation',
      text: 'Recommend new suppliers for technology products',
      category: 'Discovery',
      icon: Building2,
      description: 'AI-powered supplier discovery and recommendations'
    },
    {
      id: 'compliance_check',
      text: 'Check compliance status across suppliers',
      category: 'Compliance',
      icon: ShieldCheck,
      description: 'Review supplier compliance and certifications'
    }
  ]

  // Initialize chat with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        content: `Hello! I'm your AI procurement assistant. I can help you with supplier analysis, cost optimization, market intelligence, and much more.

How can I assist you today?`,
        type: 'ai',
        timestamp: new Date(),
        metadata: {
          confidence: 100,
          suggestions: [
            "Analyze supplier performance",
            "Find cost savings opportunities",
            "Check supply chain risks",
            "Discover new suppliers"
          ]
        }
      }
      setMessages([welcomeMessage])
    }
  }, [messages.length])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typingIndicator])

  // Initialize speech recognition
  useEffect(() => {
    if (enableVoice && 'webkitSpeechRecognition' in window) {
      speechRecognition.current = new (window as any).webkitSpeechRecognition()
      speechRecognition.current.continuous = false
      speechRecognition.current.interimResults = false
      speechRecognition.current.lang = 'en-US'

      speechRecognition.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInputMessage(transcript)
        setIsListening(false)
      }

      speechRecognition.current.onerror = () => {
        setIsListening(false)
        setError("Voice recognition error. Please try again.")
      }
    }
  }, [enableVoice])

  // Process AI message with simulated AI responses
  const processAIMessage = useCallback(async (userMessage: string) => {
    setIsProcessing(true)
    setTypingIndicator(true)
    setError(null)

    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Generate contextual AI response based on user input
      let aiResponse = ""
      let actions: ChatAction[] = []
      let suggestions: string[] = []
      const confidence = 85

      // Analyze user intent and generate appropriate response
      if (userMessage.toLowerCase().includes('supplier') && userMessage.toLowerCase().includes('performance')) {
        aiResponse = `I've analyzed your supplier performance data. Here's what I found:

**Top Performing Suppliers:**
• TechFlow Solutions - 94% performance score, 98.2% on-time delivery
• Global Component Systems - 87% performance score, excellent quality rating

**Key Insights:**
• Overall supplier performance has improved 12% over the last quarter
• On-time delivery rates are averaging 95.2% across all suppliers
• Quality scores show consistent upward trend

**Recommendations:**
• Consider expanding relationship with TechFlow Solutions
• Review underperforming suppliers for potential replacement
• Implement performance-based incentives`

        actions = [
          {
            id: 'view_full_report',
            label: 'View Full Report',
            icon: FileText,
            action: 'open_supplier_report',
            variant: 'primary'
          },
          {
            id: 'export_data',
            label: 'Export Data',
            icon: Download,
            action: 'export_performance_data',
            variant: 'secondary'
          }
        ]

        suggestions = [
          "Show me risk analysis for these suppliers",
          "Compare costs with market benchmarks",
          "Find alternative suppliers"
        ]

      } else if (userMessage.toLowerCase().includes('cost') && userMessage.toLowerCase().includes('optimization')) {
        aiResponse = `I've identified several cost optimization opportunities:

**Immediate Opportunities:**
💰 **Supplier Consolidation** - Save $180,000 annually
   - Consolidate 3 technology suppliers into 2
   - Volume discount potential: 12-15%

💰 **Contract Renegotiation** - Save $95,000 annually
   - 5 contracts up for renewal in Q1
   - Market rates have decreased 8% on average

💰 **Inventory Optimization** - Save $67,000 annually
   - Reduce safety stock by 15% using demand forecasting
   - Optimize reorder points for top 50 SKUs

**Total Potential Savings: $342,000**`

        actions = [
          {
            id: 'create_action_plan',
            label: 'Create Action Plan',
            icon: Target,
            action: 'create_optimization_plan',
            variant: 'primary'
          },
          {
            id: 'schedule_meetings',
            label: 'Schedule Negotiations',
            icon: Clock,
            action: 'schedule_supplier_meetings',
            variant: 'secondary'
          }
        ]

        suggestions = [
          "Show me detailed savings breakdown",
          "Create implementation timeline",
          "Analyze risk of consolidation"
        ]

      } else if (userMessage.toLowerCase().includes('risk')) {
        aiResponse = `**Supply Chain Risk Analysis:**

🚨 **High Priority Risks:**
• Single source dependency for critical components (3 suppliers)
• Geographic concentration in Southeast Asia (65% of suppliers)
• 2 suppliers with credit rating downgrades

⚠️ **Medium Priority Risks:**
• Currency exposure (EUR/USD fluctuations affecting 12 suppliers)
• Regulatory compliance gaps (2 suppliers pending certifications)

✅ **Low Risk Areas:**
• Supplier financial stability overall good
• Strong backup supplier network for 80% of categories
• Excellent compliance track record

**Risk Score: Medium (6.2/10)**`

        actions = [
          {
            id: 'create_mitigation_plan',
            label: 'Create Mitigation Plan',
            icon: ShieldCheck,
            action: 'create_risk_plan',
            variant: 'primary'
          },
          {
            id: 'assess_alternatives',
            label: 'Find Alternative Suppliers',
            icon: Search,
            action: 'search_alternative_suppliers',
            variant: 'secondary'
          }
        ]

        suggestions = [
          "Show detailed risk scores by category",
          "Create supplier diversification plan",
          "Set up risk monitoring alerts"
        ]

      } else {
        // Generic helpful response
        aiResponse = `I understand you're looking for assistance with procurement and supplier management. I can help you with:

• **Supplier Analysis** - Performance metrics, ratings, and comparisons
• **Cost Optimization** - Identify savings opportunities and negotiate better terms
• **Risk Management** - Assess and mitigate supply chain risks
• **Market Intelligence** - Latest trends, pricing, and supplier insights
• **Procurement Planning** - Strategic sourcing and supplier discovery

What specific area would you like me to focus on?`

        suggestions = [
          "Analyze supplier performance",
          "Find cost savings opportunities",
          "Check supply chain risks",
          "Discover new suppliers"
        ]
      }

      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        content: aiResponse,
        type: 'ai',
        timestamp: new Date(),
        metadata: {
          confidence,
          actions,
          suggestions
        }
      }

      setMessages(prev => [...prev, aiMessage])

    } catch (err) {
      setError("I encountered an error processing your request. Please try again.")
      console.error("AI processing error:", err)
    } finally {
      setIsProcessing(false)
      setTypingIndicator(false)
    }
  }, [])

  // Send message handler
  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isProcessing) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      type: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage("")

    // Process AI response
    await processAIMessage(userMessage.content)
  }, [inputMessage, isProcessing, processAIMessage])

  // Handle quick prompt selection
  const handleQuickPrompt = (prompt: QuickPrompt) => {
    setInputMessage(prompt.text)
    inputRef.current?.focus()
  }

  // Handle voice input
  const toggleVoiceInput = () => {
    if (!speechRecognition.current) return

    if (isListening) {
      speechRecognition.current.stop()
      setIsListening(false)
    } else {
      speechRecognition.current.start()
      setIsListening(true)
    }
  }

  // Handle message reactions
  const handleReaction = (messageId: string, reaction: 'helpful' | 'accurate') => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId
        ? {
            ...msg,
            reactions: {
              ...msg.reactions,
              [reaction]: !msg.reactions?.[reaction]
            }
          }
        : msg
    ))
  }

  // Handle action triggers
  const handleActionTrigger = (action: ChatAction) => {
    onActionTrigger?.(action)

    // Add system message for action
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      content: `Action triggered: ${action.label}`,
      type: 'system',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, systemMessage])
  }

  return (
    <TooltipProvider>
      <div className={`flex flex-col ${isExpanded ? 'h-[600px]' : 'h-96'} bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="p-2 bg-white/20 rounded-lg backdrop-blur-sm"
              >
                <Brain className="h-5 w-5" />
              </motion.div>
              <div>
                <h2 className="font-bold text-lg">AI Assistant</h2>
                <p className="text-indigo-100 text-sm">Procurement Intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                <Sparkles className="h-3 w-3 mr-1" />
                Online
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-white hover:bg-white/20"
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="m-4 border-red-200 bg-red-50">
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

        {/* Messages Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl rounded-tr-sm'
                        : message.type === 'system'
                        ? 'bg-gray-100 text-gray-600 rounded-lg text-center text-sm py-2'
                        : 'bg-gray-50 text-gray-800 rounded-2xl rounded-tl-sm'
                    } p-4 shadow-lg`}>
                      {/* Message Header */}
                      <div className="flex items-center gap-2 mb-2">
                        {message.type === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : message.type === 'ai' ? (
                          <Bot className="h-4 w-4 text-indigo-600" />
                        ) : null}
                        <span className="text-xs opacity-70">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                        {message.metadata?.confidence && (
                          <Badge variant="outline" className="text-xs">
                            {message.metadata.confidence}% confident
                          </Badge>
                        )}
                      </div>

                      {/* Message Content */}
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>

                      {/* AI Message Actions */}
                      {message.type === 'ai' && message.metadata?.actions && message.metadata.actions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {message.metadata.actions.map((action) => (
                            <Button
                              key={action.id}
                              variant={action.variant || "outline"}
                              size="sm"
                              onClick={() => handleActionTrigger(action)}
                              className="text-xs"
                            >
                              <action.icon className="h-3 w-3 mr-1" />
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}

                      {/* Suggestions */}
                      {message.type === 'ai' && message.metadata?.suggestions && message.metadata.suggestions.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-600 mb-2">You might also ask:</p>
                          <div className="flex flex-wrap gap-1">
                            {message.metadata.suggestions.map((suggestion, i) => (
                              <Button
                                key={i}
                                variant="ghost"
                                size="sm"
                                onClick={() => setInputMessage(suggestion)}
                                className="text-xs h-auto py-1 px-2 text-gray-600 hover:text-gray-800"
                              >
                                "{suggestion}"
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Message Actions */}
                      {message.type === 'ai' && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReaction(message.id, 'helpful')}
                                  className={`h-6 w-6 p-0 ${message.reactions?.helpful ? 'text-green-600' : 'text-gray-400'}`}
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
                                  onClick={() => handleReaction(message.id, 'accurate')}
                                  className={`h-6 w-6 p-0 ${message.reactions?.accurate ? 'text-red-600' : 'text-gray-400'}`}
                                >
                                  <ThumbsDown className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Not helpful</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigator.clipboard.writeText(message.content)}
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing Indicator */}
              <AnimatePresence>
                {typingIndicator && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex justify-start"
                  >
                    <div className="bg-gray-100 rounded-2xl rounded-tl-sm p-4 shadow-lg">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-indigo-600" />
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.2
                              }}
                              className="w-2 h-2 bg-indigo-400 rounded-full"
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">AI is thinking...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Quick Prompts (when no conversation yet) */}
          {messages.length <= 1 && (
            <div className="p-4 border-t">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Start:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {quickPrompts.slice(0, 4).map((prompt) => (
                  <Button
                    key={prompt.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickPrompt(prompt)}
                    className="justify-start text-left h-auto py-2"
                  >
                    <prompt.icon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-xs">{prompt.text}</div>
                      <div className="text-xs text-gray-500">{prompt.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  placeholder="Ask me anything about procurement, suppliers, or analytics..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={isProcessing}
                  className="pr-20 py-6 text-sm border-2 border-gray-200 focus:border-indigo-400 rounded-xl"
                  aria-label="Chat message input"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                  {enableVoice && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleVoiceInput}
                          disabled={isProcessing}
                          className={`h-8 w-8 p-0 ${isListening ? 'text-red-500' : 'text-gray-400'}`}
                        >
                          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Voice input</TooltipContent>
                    </Tooltip>
                  )}
                  {enableFileUpload && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isProcessing}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Attach file</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isProcessing}
                className="px-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              AI assistant may make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default AIChatInterface