"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  Brain,
  MessageSquare,
  BarChart3,
  Building2,
  Sparkles,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Menu,
  X,
  Maximize2,
  Minimize2,
  ChevronUp,
  ChevronDown,
  Activity,
  Zap,
  Target,
  Search,
  Filter
} from "lucide-react"
import AIChatInterface from "./ChatInterface"
import AIInsightCards from "./InsightCards"
import PredictiveCharts from "../analytics/PredictiveCharts"
import dynamic from 'next/dynamic'
const AISupplierDiscovery = dynamic(
  () => import('../suppliers/AISupplierDiscovery'),
  {
    loading: () => <div className="animate-pulse h-96 bg-gray-100 rounded-lg" />,
    ssr: false
  }
)

interface MobileAIInterfaceProps {
  compactMode?: boolean
  enableSwipeGestures?: boolean
}

const MobileAIInterface: React.FC<MobileAIInterfaceProps> = ({
  compactMode = false,
  enableSwipeGestures = true
}) => {
  const [activeSection, setActiveSection] = useState<'chat' | 'insights' | 'charts' | 'discovery'>('chat')
  const [isExpanded, setIsExpanded] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [touchStartX, setTouchStartX] = useState(0)
  const [touchStartY, setTouchStartY] = useState(0)

  // Touch gesture handling for mobile swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
    setTouchStartY(e.touches[0].clientY)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!enableSwipeGestures) return

    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const deltaX = touchEndX - touchStartX
    const deltaY = touchEndY - touchStartY

    // Only process horizontal swipes (ignore vertical scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      const sections = ['chat', 'insights', 'charts', 'discovery'] as const
      const currentIndex = sections.indexOf(activeSection)

      if (deltaX > 0 && currentIndex > 0) {
        // Swipe right - go to previous section
        setActiveSection(sections[currentIndex - 1])
      } else if (deltaX < 0 && currentIndex < sections.length - 1) {
        // Swipe left - go to next section
        setActiveSection(sections[currentIndex + 1])
      }
    }
  }

  // Quick action items for mobile
  const quickActions = [
    {
      id: 'ask_ai',
      label: 'Ask AI',
      icon: Brain,
      color: 'bg-purple-500',
      action: () => setActiveSection('chat')
    },
    {
      id: 'view_insights',
      label: 'Insights',
      icon: Sparkles,
      color: 'bg-green-500',
      action: () => setActiveSection('insights')
    },
    {
      id: 'predictions',
      label: 'Forecasts',
      icon: TrendingUp,
      color: 'bg-blue-500',
      action: () => setActiveSection('charts')
    },
    {
      id: 'find_suppliers',
      label: 'Find Suppliers',
      icon: Building2,
      color: 'bg-orange-500',
      action: () => setActiveSection('discovery')
    }
  ]

  // Section navigation tabs
  const navigationTabs = [
    {
      id: 'chat' as const,
      label: 'AI Chat',
      icon: MessageSquare,
      color: 'text-purple-600',
      activeColor: 'bg-purple-500 text-white'
    },
    {
      id: 'insights' as const,
      label: 'Insights',
      icon: Sparkles,
      color: 'text-green-600',
      activeColor: 'bg-green-500 text-white'
    },
    {
      id: 'charts' as const,
      label: 'Charts',
      icon: BarChart3,
      color: 'text-blue-600',
      activeColor: 'bg-blue-500 text-white'
    },
    {
      id: 'discovery' as const,
      label: 'Discovery',
      icon: Building2,
      color: 'text-orange-600',
      activeColor: 'bg-orange-500 text-white'
    }
  ]

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 relative">
      {/* Mobile Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl text-white"
              >
                <Brain className="h-5 w-5" />
              </motion.div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">AI Assistant</h1>
                <p className="text-xs text-gray-600">Procurement Intelligence</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 text-xs">
                <Activity className="h-3 w-3 mr-1" />
                Live
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="md:hidden"
                aria-label={isExpanded ? "Minimize interface" : "Expand interface"}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="px-2 pb-2">
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            {navigationTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeSection === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-md transition-all duration-200 ${
                    isActive ? tab.activeColor : 'text-gray-600 hover:bg-white/50'
                  }`}
                  aria-label={`Switch to ${tab.label}`}
                  role="tab"
                  aria-selected={isActive}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className="flex-1 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeSection === 'chat' && (
              <div className="h-full p-4">
                <AIChatInterface
                  compactMode={compactMode}
                  enableVoice={true}
                  enableFileUpload={false} // Disabled for mobile
                  onActionTrigger={(action) => {
                    console.log('Mobile chat action:', action)
                    // Handle navigation to other sections based on chat actions
                    if (action.action === 'view_insights') setActiveSection('insights')
                    if (action.action === 'view_charts') setActiveSection('charts')
                    if (action.action === 'find_suppliers') setActiveSection('discovery')
                  }}
                />
              </div>
            )}

            {activeSection === 'insights' && (
              <div className="h-full p-4 overflow-y-auto">
                <AIInsightCards
                  compactMode={true}
                  maxCards={compactMode ? 3 : 6}
                  onInsightAction={(insightId, action) => {
                    console.log('Mobile insight action:', insightId, action)
                  }}
                  onInsightStatusChange={(id, status) => {
                    console.log('Mobile insight status:', id, status)
                  }}
                />
              </div>
            )}

            {activeSection === 'charts' && (
              <div className="h-full p-4 overflow-y-auto">
                <PredictiveCharts
                  compactMode={true}
                  onChartSelect={(chartId) => console.log('Mobile chart selected:', chartId)}
                  onAnomalyClick={(anomaly) => console.log('Mobile anomaly clicked:', anomaly)}
                  realTimeUpdate={true}
                />
              </div>
            )}

            {activeSection === 'discovery' && (
              <div className="h-full p-4 overflow-y-auto">
                <AISupplierDiscovery
                  compactMode={true}
                  onSupplierSelect={(supplier) => {
                    console.log('Mobile supplier selected:', supplier)
                  }}
                  onSupplierBookmark={(id) => {
                    console.log('Mobile supplier bookmarked:', id)
                  }}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Quick Actions Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {showQuickActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="absolute bottom-16 right-0 space-y-3"
            >
              {quickActions.map((action, index) => {
                const Icon = action.icon
                return (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => {
                      action.action()
                      setShowQuickActions(false)
                    }}
                    className={`flex items-center gap-3 px-4 py-3 ${action.color} text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200`}
                    aria-label={action.label}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium whitespace-nowrap">
                      {action.label}
                    </span>
                  </motion.button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={() => setShowQuickActions(!showQuickActions)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          aria-label="Quick actions menu"
        >
          <motion.div
            animate={{ rotate: showQuickActions ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {showQuickActions ? <X className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
          </motion.div>
        </Button>
      </div>

      {/* Mobile Gesture Indicators */}
      {enableSwipeGestures && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-30">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm"
          >
            ← Swipe to navigate →
          </motion.div>
        </div>
      )}

      {/* Accessibility Enhancements */}
      <div className="sr-only">
        <div role="tabpanel" aria-labelledby={`${activeSection}-tab`}>
          Current section: {navigationTabs.find(t => t.id === activeSection)?.label}
        </div>
        <div aria-live="polite" aria-atomic="true">
          {/* Screen reader announcements for section changes */}
        </div>
      </div>

      {/* Mobile-specific styles and interactions */}
      <style jsx global>{`
        /* Disable text selection on touch interfaces */
        @media (hover: none) {
          .mobile-ai-interface * {
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -khtml-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
          }

          /* Enable selection for input fields */
          .mobile-ai-interface input,
          .mobile-ai-interface textarea {
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
          }
        }

        /* Smooth scrolling */
        .mobile-ai-interface {
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }

        /* Touch-friendly tap targets */
        .mobile-ai-interface button,
        .mobile-ai-interface [role="button"] {
          min-height: 44px;
          min-width: 44px;
        }

        /* Reduce motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          .mobile-ai-interface * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  )
}

export default MobileAIInterface