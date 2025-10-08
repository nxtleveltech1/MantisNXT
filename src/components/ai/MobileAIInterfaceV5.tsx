"use client"

/**
 * Mobile AI Interface - Optimized for mobile devices
 *
 * Features:
 * - Compact chat interface
 * - Swipeable insights
 * - Quick actions
 * - Touch-optimized UI
 * - Bottom sheet design
 */

import React, { useState, useEffect, useRef } from 'react'
import { useChat } from 'ai/react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Brain,
  Send,
  Mic,
  X,
  Sparkles,
  User,
  Bot,
  ChevronDown,
  ChevronUp,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  DollarSign,
  MessageCircle,
  Zap,
} from 'lucide-react'

interface MobileAIInterfaceV5Props {
  onClose?: () => void
  apiEndpoint?: string
  startMinimized?: boolean
}

const MobileAIInterfaceV5: React.FC<MobileAIInterfaceV5Props> = ({
  onClose,
  apiEndpoint = '/api/ai/chat',
  startMinimized = false,
}) => {
  // Vercel AI SDK v5 useChat hook
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useChat({
    api: apiEndpoint,
  })

  // State
  const [isMinimized, setIsMinimized] = useState(startMinimized)
  const [isListening, setIsListening] = useState(false)
  const [insights, setInsights] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'chat' | 'insights'>('chat')

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load quick insights
  useEffect(() => {
    loadQuickInsights()
  }, [])

  const loadQuickInsights = async () => {
    try {
      const response = await fetch('/api/ai/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: { type: 'portfolio' },
          focusAreas: ['cost', 'risk', 'performance'],
          timeFrame: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
          includeActions: false,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setInsights((data.data.insights || []).slice(0, 3))
        }
      }
    } catch (error) {
      console.error('Failed to load insights:', error)
    }
  }

  // Handle drag to minimize
  const handleDragEnd = (_event: any, info: PanInfo) => {
    if (info.offset.y > 100) {
      setIsMinimized(true)
    } else if (info.offset.y < -100) {
      setIsMinimized(false)
    }
  }

  // Quick prompts for mobile
  const quickActions = [
    { id: 1, label: 'Supplier Analysis', icon: TrendingUp },
    { id: 2, label: 'Cost Savings', icon: DollarSign },
    { id: 3, label: 'Risk Check', icon: AlertTriangle },
    { id: 4, label: 'New Ideas', icon: Lightbulb },
  ]

  // Get insight icon
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <Lightbulb className="h-4 w-4 text-green-600" />
      case 'risk':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'trend':
        return <TrendingUp className="h-4 w-4 text-blue-600" />
      default:
        return <Sparkles className="h-4 w-4 text-purple-600" />
    }
  }

  return (
    <AnimatePresence>
      {!isMinimized && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="fixed inset-x-0 bottom-0 z-50 h-[85vh] bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl flex flex-col"
        >
          {/* Drag Handle */}
          <div className="flex items-center justify-center py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <span className="font-semibold">AI Assistant</span>
              {isLoading && (
                <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Thinking
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                aria-label="Minimize"
              >
                <ChevronDown className="h-5 w-5" />
              </Button>
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <MessageCircle className="h-4 w-4 inline mr-2" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'insights'
                  ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Zap className="h-4 w-4 inline mr-2" />
              Insights
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' ? (
              <div className="flex flex-col h-full">
                {/* Messages */}
                <ScrollArea className="flex-1 px-4 py-3">
                  <div className="space-y-3">
                    {messages.length === 0 && (
                      <div className="text-center py-8">
                        <Brain className="h-12 w-12 text-purple-600 dark:text-purple-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Hi! Ask me anything about procurement.
                        </p>
                      </div>
                    )}

                    {messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                            message.role === 'user'
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-sm'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-sm'
                          }`}
                        >
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </div>
                          <div className="text-xs opacity-70 mt-1">
                            {new Date(message.createdAt || Date.now()).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-2xl rounded-tl-sm">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <motion.div
                                  key={i}
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                  className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full"
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Quick Actions */}
                {messages.length === 0 && (
                  <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {quickActions.map(action => (
                        <Button
                          key={action.id}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            handleInputChange({ target: { value: action.label } } as any)
                            inputRef.current?.focus()
                          }}
                          className="flex-shrink-0 text-xs"
                        >
                          <action.icon className="h-3 w-3 mr-1" />
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={handleInputChange}
                      placeholder="Type your message..."
                      disabled={isLoading}
                      className="flex-1 text-sm dark:bg-gray-700 dark:border-gray-600"
                    />
                    <Button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              // Insights Tab
              <ScrollArea className="h-full px-4 py-3">
                <div className="space-y-3">
                  {insights.length === 0 ? (
                    <div className="text-center py-8">
                      <Sparkles className="h-12 w-12 text-purple-600 dark:text-purple-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No insights available
                      </p>
                    </div>
                  ) : (
                    insights.map((insight, index) => (
                      <motion.div
                        key={insight.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="border-0 shadow-md">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {getInsightIcon(insight.type)}
                              <div className="flex-1 min-w-0">
                                <Badge
                                  variant={insight.type === 'opportunity' ? 'default' : 'destructive'}
                                  className="text-xs mb-2"
                                >
                                  {insight.type.toUpperCase()}
                                </Badge>
                                <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                                  {insight.title}
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                  {insight.summary}
                                </p>
                                {insight.impact?.financial > 0 && (
                                  <div className="flex items-center gap-1 mt-2">
                                    <DollarSign className="h-3 w-3 text-blue-600" />
                                    <span className="text-xs font-medium text-blue-600">
                                      ${(insight.impact.financial / 1000).toFixed(0)}K
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </motion.div>
      )}

      {/* Minimized FAB */}
      {isMinimized && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-4 right-4 z-50 w-14 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center"
        >
          <Brain className="h-6 w-6" />
          {isLoading && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          )}
        </motion.button>
      )}
    </AnimatePresence>
  )
}

export default MobileAIInterfaceV5
