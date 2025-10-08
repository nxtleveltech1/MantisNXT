"use client"

/**
 * AI Chat Interface - Vercel AI SDK v5 Integration
 *
 * Features:
 * - Real-time streaming with useChat hook
 * - Message history persistence
 * - Action buttons and suggestions
 * - Voice input support
 * - File attachment capabilities
 * - Responsive design with accessibility
 */

import React, { useState, useEffect, useRef } from "react"
import { useChat } from 'ai/react'
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Brain,
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
  Loader2,
  AlertTriangle,
  Building2,
  TrendingUp,
  DollarSign,
  BarChart3,
  ShieldCheck,
  Maximize2,
  Minimize2,
  FileText,
  Download,
  Target,
} from "lucide-react"

// Types
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

interface AIChatInterfaceV5Props {
  onActionTrigger?: (action: ChatAction) => void
  compactMode?: boolean
  enableVoice?: boolean
  enableFileUpload?: boolean
  apiEndpoint?: string
  conversationId?: string
}

const AIChatInterfaceV5: React.FC<AIChatInterfaceV5Props> = ({
  onActionTrigger,
  compactMode = false,
  enableVoice = true,
  enableFileUpload = true,
  apiEndpoint = '/api/ai/chat',
  conversationId,
}) => {
  // Vercel AI SDK v5 useChat hook
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error: chatError,
    reload,
    stop,
  } = useChat({
    api: apiEndpoint,
    id: conversationId,
    onError: (error) => {
      console.error('Chat error:', error)
      setError(error.message)
    },
  })

  // Local state
  const [isExpanded, setIsExpanded] = useState(!compactMode)
  const [error, setError] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)

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

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Initialize speech recognition
  useEffect(() => {
    if (enableVoice && 'webkitSpeechRecognition' in window) {
      speechRecognition.current = new (window as any).webkitSpeechRecognition()
      speechRecognition.current.continuous = false
      speechRecognition.current.interimResults = false
      speechRecognition.current.lang = 'en-US'

      speechRecognition.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        handleInputChange({ target: { value: transcript } } as any)
        setIsListening(false)
      }

      speechRecognition.current.onerror = () => {
        setIsListening(false)
        setError("Voice recognition error. Please try again.")
      }
    }
  }, [enableVoice, handleInputChange])

  // Clear error after chat error is resolved
  useEffect(() => {
    if (chatError) {
      setError(chatError.message)
    }
  }, [chatError])

  // Handle quick prompt selection
  const handleQuickPrompt = (prompt: QuickPrompt) => {
    handleInputChange({ target: { value: prompt.text } } as any)
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

  // Handle message reactions (feedback)
  const handleReaction = (messageId: string, reaction: 'helpful' | 'notHelpful') => {
    // Send feedback to analytics endpoint
    fetch('/api/ai/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId,
        reaction,
        conversationId,
      }),
    }).catch(err => console.error('Failed to submit feedback:', err))
  }

  // Copy message to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Could show toast notification here
        console.log('Copied to clipboard')
      })
      .catch(err => console.error('Failed to copy:', err))
  }

  return (
    <TooltipProvider>
      <div className={`flex flex-col ${isExpanded ? 'h-[600px]' : 'h-96'} bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden`}>
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
                {isLoading ? 'Thinking...' : 'Online'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-white hover:bg-white/20"
                aria-label={isExpanded ? 'Minimize chat' : 'Expand chat'}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="m-4 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-300">
              <div className="font-semibold mb-1">Error</div>
              <div>{error}</div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setError(null)
                  reload()
                }}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Messages Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-8"
                >
                  <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-full flex items-center justify-center mb-4">
                    <Brain className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Hello! I'm your AI procurement assistant.
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    I can help you with supplier analysis, cost optimization, market intelligence, and much more.
                  </p>
                </motion.div>
              )}

              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl rounded-tr-sm'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-sm'
                    } p-4 shadow-lg`}>
                      {/* Message Header */}
                      <div className="flex items-center gap-2 mb-2">
                        {message.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        )}
                        <span className="text-xs opacity-70">
                          {new Date(message.createdAt || Date.now()).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Message Content */}
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>

                      {/* Message Actions (AI messages only) */}
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReaction(message.id, 'helpful')}
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-green-600 dark:text-gray-500 dark:hover:text-green-400"
                                  aria-label="Mark as helpful"
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
                                  onClick={() => handleReaction(message.id, 'notHelpful')}
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"
                                  aria-label="Mark as not helpful"
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
                                  onClick={() => copyToClipboard(message.content)}
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                  aria-label="Copy message"
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

              {/* Loading Indicator */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex justify-start"
                  >
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm p-4 shadow-lg">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
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
                              className="w-2 h-2 bg-indigo-400 dark:bg-indigo-500 rounded-full"
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">AI is thinking...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Quick Prompts (when no conversation yet) */}
          {messages.length === 0 && (
            <div className="p-4 border-t dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick Start:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {quickPrompts.slice(0, 4).map((prompt) => (
                  <Button
                    key={prompt.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickPrompt(prompt)}
                    className="justify-start text-left h-auto py-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-600"
                  >
                    <prompt.icon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-xs">{prompt.text}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{prompt.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  placeholder="Ask me anything about procurement, suppliers, or analytics..."
                  value={input}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="pr-20 py-6 text-sm border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-400 dark:focus:border-indigo-500 rounded-xl"
                  aria-label="Chat message input"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                  {enableVoice && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={toggleVoiceInput}
                          disabled={isLoading}
                          className={`h-8 w-8 p-0 ${isListening ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}
                          aria-label="Voice input"
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
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isLoading}
                          className="h-8 w-8 p-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                          aria-label="Attach file"
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
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl disabled:opacity-50"
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              AI assistant may make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default AIChatInterfaceV5
