'use client';

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

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from 'ai/react';
import type { PanInfo } from 'framer-motion';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain,
  Send,
  X,
  Sparkles,
  ChevronDown,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  DollarSign,
  MessageCircle,
  Zap,
} from 'lucide-react';

interface MobileAIInterfaceV5Props {
  onClose?: () => void;
  apiEndpoint?: string;
  startMinimized?: boolean;
}

const MobileAIInterfaceV5: React.FC<MobileAIInterfaceV5Props> = ({
  onClose,
  apiEndpoint = '/api/ai/chat',
  startMinimized = false,
}) => {
  // Vercel AI SDK v5 useChat hook
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: apiEndpoint,
  });

  // State
  const [isMinimized, setIsMinimized] = useState(startMinimized);
  const [isListening, setIsListening] = useState(false);
  const [insights, setInsights] = useState<unknown[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'insights'>('chat');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load quick insights
  useEffect(() => {
    loadQuickInsights();
  }, []);

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
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setInsights((data.data.insights || []).slice(0, 3));
        }
      }
    } catch (error) {
      console.error('Failed to load insights:', error);
    }
  };

  // Handle drag to minimize
  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    if (info.offset.y > 100) {
      setIsMinimized(true);
    } else if (info.offset.y < -100) {
      setIsMinimized(false);
    }
  };

  // Quick prompts for mobile
  const quickActions = [
    { id: 1, label: 'Supplier Analysis', icon: TrendingUp },
    { id: 2, label: 'Cost Savings', icon: DollarSign },
    { id: 3, label: 'Risk Check', icon: AlertTriangle },
    { id: 4, label: 'New Ideas', icon: Lightbulb },
  ];

  // Get insight icon
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <Lightbulb className="h-4 w-4 text-green-600" />;
      case 'risk':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'trend':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      default:
        return <Sparkles className="h-4 w-4 text-purple-600" />;
    }
  };

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
          className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col rounded-t-3xl bg-white shadow-2xl dark:bg-gray-900"
        >
          {/* Drag Handle */}
          <div className="flex items-center justify-center border-b border-gray-200 py-2 dark:border-gray-700">
            <div className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-white dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <span className="font-semibold">AI Assistant</span>
              {isLoading && (
                <Badge
                  variant="secondary"
                  className="border-white/30 bg-white/20 text-xs text-white"
                >
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
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
                  ? 'border-b-2 border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <MessageCircle className="mr-2 inline h-4 w-4" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'insights'
                  ? 'border-b-2 border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Zap className="mr-2 inline h-4 w-4" />
              Insights
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' ? (
              <div className="flex h-full flex-col">
                {/* Messages */}
                <ScrollArea className="flex-1 px-4 py-3">
                  <div className="space-y-3">
                    {messages.length === 0 && (
                      <div className="py-8 text-center">
                        <Brain className="mx-auto mb-3 h-12 w-12 text-purple-600 dark:text-purple-400" />
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
                          className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                            message.role === 'user'
                              ? 'rounded-tr-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                              : 'rounded-tl-sm bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                          }`}
                        >
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </div>
                          <div className="mt-1 text-xs opacity-70">
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
                        <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-2 dark:bg-gray-800">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <motion.div
                                  key={i}
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                  className="h-2 w-2 rounded-full bg-purple-600 dark:bg-purple-400"
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
                  <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {quickActions.map(action => (
                        <Button
                          key={action.id}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            handleInputChange({ target: { value: action.label } } as unknown);
                            inputRef.current?.focus();
                          }}
                          className="flex-shrink-0 text-xs"
                        >
                          <action.icon className="mr-1 h-3 w-3" />
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={handleInputChange}
                      placeholder="Type your message..."
                      disabled={isLoading}
                      className="flex-1 text-sm dark:border-gray-600 dark:bg-gray-700"
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
                    <div className="py-8 text-center">
                      <Sparkles className="mx-auto mb-3 h-12 w-12 text-purple-600 dark:text-purple-400" />
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
                              <div className="min-w-0 flex-1">
                                <Badge
                                  variant={
                                    insight.type === 'opportunity' ? 'default' : 'destructive'
                                  }
                                  className="mb-2 text-xs"
                                >
                                  {insight.type.toUpperCase()}
                                </Badge>
                                <h4 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
                                  {insight.title}
                                </h4>
                                <p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
                                  {insight.summary}
                                </p>
                                {insight.impact?.financial > 0 && (
                                  <div className="mt-2 flex items-center gap-1">
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
          className="fixed right-4 bottom-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg"
        >
          <Brain className="h-6 w-6" />
          {isLoading && (
            <span className="absolute -top-1 -right-1 h-3 w-3 animate-pulse rounded-full bg-green-500" />
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default MobileAIInterfaceV5;
