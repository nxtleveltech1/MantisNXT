import { useState, useEffect, useCallback, useReducer } from 'react'
import type {
  AISupplierState,
  AISupplierAction,
  UseAISupplierOptions,
  UseAISupplierReturn,
  AISupplierRecommendation,
  AISupplierInsight
} from '@/types/ai-supplier'

// Initial state
const initialAISupplierState: AISupplierState = {
  recommendations: [],
  recommendationsLoading: false,
  recommendationsError: null,

  insights: [],
  insightsLoading: false,
  insightsError: null,

  predictions: [],
  predictionsLoading: false,
  predictionsError: null,

  anomalies: [],
  anomaliesLoading: false,
  anomaliesError: null,

  marketIntelligence: [],
  marketIntelligenceLoading: false,
  marketIntelligenceError: null,

  riskProfiles: {},
  riskProfilesLoading: false,
  riskProfilesError: null,

  chatMessages: [],
  isTyping: false,
  chatContext: {
    preferences: {}
  },

  aiConfig: {
    enabledFeatures: ['recommendations', 'insights', 'chat', 'anomaly_detection'],
    analysisDepth: 'standard',
    autoRefresh: true,
    alertThresholds: {
      risk_score: 75,
      confidence_threshold: 70,
      anomaly_severity: 3
    },
    modelVersions: {}
  },

  performanceMetrics: {
    apiLatency: 0,
    modelAccuracy: {},
    userSatisfaction: 0,
    usageStatistics: {}
  }
}

// Reducer function
function aiSupplierReducer(state: AISupplierState, action: AISupplierAction): AISupplierState {
  switch (action.type) {
    case 'FETCH_RECOMMENDATIONS_START':
      return {
        ...state,
        recommendationsLoading: true,
        recommendationsError: null
      }

    case 'FETCH_RECOMMENDATIONS_SUCCESS':
      return {
        ...state,
        recommendations: action.payload,
        recommendationsLoading: false,
        recommendationsError: null
      }

    case 'FETCH_RECOMMENDATIONS_ERROR':
      return {
        ...state,
        recommendationsLoading: false,
        recommendationsError: action.payload
      }

    case 'FETCH_INSIGHTS_START':
      return {
        ...state,
        insightsLoading: true,
        insightsError: null
      }

    case 'FETCH_INSIGHTS_SUCCESS':
      return {
        ...state,
        insights: action.payload,
        insightsLoading: false,
        insightsError: null
      }

    case 'FETCH_INSIGHTS_ERROR':
      return {
        ...state,
        insightsLoading: false,
        insightsError: action.payload
      }

    case 'ADD_CHAT_MESSAGE':
      return {
        ...state,
        chatMessages: [
          ...state.chatMessages,
          {
            id: Date.now().toString(),
            role: action.payload.role,
            content: action.payload.content,
            timestamp: new Date(),
            metadata: action.payload.metadata
          }
        ]
      }

    case 'SET_TYPING':
      return {
        ...state,
        isTyping: action.payload
      }

    case 'UPDATE_AI_CONFIG':
      return {
        ...state,
        aiConfig: {
          ...state.aiConfig,
          ...action.payload
        }
      }

    case 'BOOKMARK_INSIGHT':
      return {
        ...state,
        insights: state.insights.map(insight =>
          insight.id === action.payload.insightId
            ? { ...insight, isBookmarked: action.payload.bookmarked }
            : insight
        )
      }

    case 'PROVIDE_INSIGHT_FEEDBACK':
      return {
        ...state,
        insights: state.insights.map(insight =>
          insight.id === action.payload.insightId
            ? {
                ...insight,
                userFeedback: {
                  ...insight.userFeedback,
                  [action.payload.feedback === 'helpful' ? 'helpful' : 'notHelpful']:
                    (insight.userFeedback?.[action.payload.feedback === 'helpful' ? 'helpful' : 'notHelpful'] ?? 0) + 1
                }
              }
            : insight
        )
      }

    case 'CLEAR_RECOMMENDATIONS':
      return {
        ...state,
        recommendations: []
      }

    case 'CLEAR_INSIGHTS':
      return {
        ...state,
        insights: []
      }

    case 'CLEAR_CHAT':
      return {
        ...state,
        chatMessages: []
      }

    default:
      return state
  }
}

export function useAISupplier(options: UseAISupplierOptions = {}): UseAISupplierReturn {
  const {
    supplierId,
    autoFetch = true,
    enableRealTimeUpdates = false,
    analysisDepth = 'standard'
  } = options

  const [state, dispatch] = useReducer(aiSupplierReducer, {
    ...initialAISupplierState,
    aiConfig: {
      ...initialAISupplierState.aiConfig,
      analysisDepth
    },
    chatContext: {
      ...initialAISupplierState.chatContext,
      supplierId
    }
  })

  // Fetch AI recommendations
  const fetchRecommendations = useCallback(async (
    query?: string,
    filters?: Record<string, any>
  ) => {
    dispatch({ type: 'FETCH_RECOMMENDATIONS_START' })

    try {
      const response = await fetch('/api/ai/suppliers/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query || '',
          filters: filters || {},
          analysisDepth: state.aiConfig.analysisDepth,
          includeMarketIntelligence: true,
          includePredictiveAnalysis: true,
          supplierId
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const { recommendations } = await response.json()
      dispatch({
        type: 'FETCH_RECOMMENDATIONS_SUCCESS',
        payload: recommendations || []
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch recommendations'
      dispatch({
        type: 'FETCH_RECOMMENDATIONS_ERROR',
        payload: errorMessage
      })
      console.error('AI recommendations error:', error)
    }
  }, [state.aiConfig.analysisDepth, supplierId])

  // Fetch AI insights
  const fetchInsights = useCallback(async (
    targetSupplierId?: string,
    categories?: string[]
  ) => {
    dispatch({ type: 'FETCH_INSIGHTS_START' })

    try {
      const response = await fetch('/api/ai/suppliers/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: targetSupplierId || supplierId,
          categories: categories || ['all'],
          analysisDepth: state.aiConfig.analysisDepth,
          includeMarketContext: true,
          includeRiskAssessment: true
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const { insights } = await response.json()
      dispatch({
        type: 'FETCH_INSIGHTS_SUCCESS',
        payload: insights || []
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch insights'
      dispatch({
        type: 'FETCH_INSIGHTS_ERROR',
        payload: errorMessage
      })
      console.error('AI insights error:', error)
    }
  }, [supplierId, state.aiConfig.analysisDepth])

  // Send chat message
  const sendChatMessage = useCallback(async (message: string) => {
    if (!message.trim()) return

    // Add user message to chat
    dispatch({
      type: 'ADD_CHAT_MESSAGE',
      payload: { role: 'user', content: message.trim() }
    })

    dispatch({ type: 'SET_TYPING', payload: true })

    try {
      const response = await fetch('/api/ai/suppliers/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          context: {
            supplierId,
            conversationHistory: state.chatMessages.slice(-5),
            preferences: state.chatContext.preferences,
            analysisDepth: state.aiConfig.analysisDepth
          }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const { response: aiResponse, metadata, suggestions } = await response.json()

      // Add AI response to chat
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        payload: {
          role: 'assistant',
          content: aiResponse,
          metadata: {
            ...metadata,
            suggestions,
            confidence: metadata?.confidence || 95,
            processingTime: metadata?.processingTime || 0
          }
        }
      })

      // If the response includes new insights or recommendations, update them
      if (metadata?.newInsights) {
        dispatch({
          type: 'FETCH_INSIGHTS_SUCCESS',
          payload: [...state.insights, ...metadata.newInsights]
        })
      }

      if (metadata?.newRecommendations) {
        dispatch({
          type: 'FETCH_RECOMMENDATIONS_SUCCESS',
          payload: [...state.recommendations, ...metadata.newRecommendations]
        })
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        payload: {
          role: 'assistant',
          content: `I apologize, but I encountered an error: ${errorMessage}. Please try again.`,
          metadata: { type: 'error' }
        }
      })
      console.error('Chat message error:', error)
    } finally {
      dispatch({ type: 'SET_TYPING', payload: false })
    }
  }, [supplierId, state.chatMessages, state.chatContext.preferences, state.aiConfig.analysisDepth, state.insights, state.recommendations])

  // Bookmark insight
  const bookmarkInsight = useCallback(async (insightId: string) => {
    const insight = state.insights.find(i => i.id === insightId)
    if (!insight) return

    const newBookmarkState = !insight.isBookmarked

    // Optimistically update UI
    dispatch({
      type: 'BOOKMARK_INSIGHT',
      payload: { insightId, bookmarked: newBookmarkState }
    })

    try {
      const response = await fetch('/api/ai/suppliers/insights/bookmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insightId,
          bookmarked: newBookmarkState,
          userId: 'current-user' // Replace with actual user ID
        })
      })

      if (!response.ok) {
        // Revert on failure
        dispatch({
          type: 'BOOKMARK_INSIGHT',
          payload: { insightId, bookmarked: !newBookmarkState }
        })
        throw new Error('Failed to bookmark insight')
      }
    } catch (error) {
      console.error('Bookmark error:', error)
    }
  }, [state.insights])

  // Provide insight feedback
  const provideInsightFeedback = useCallback(async (
    insightId: string,
    feedback: 'helpful' | 'notHelpful'
  ) => {
    // Optimistically update UI
    dispatch({
      type: 'PROVIDE_INSIGHT_FEEDBACK',
      payload: { insightId, feedback }
    })

    try {
      const response = await fetch('/api/ai/suppliers/insights/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insightId,
          feedback,
          userId: 'current-user' // Replace with actual user ID
        })
      })

      if (!response.ok) {
        throw new Error('Failed to provide feedback')
      }
    } catch (error) {
      console.error('Feedback error:', error)
      // Could implement revert logic here if needed
    }
  }, [])

  // Clear functions
  const clearRecommendations = useCallback(() => {
    dispatch({ type: 'CLEAR_RECOMMENDATIONS' })
  }, [])

  const clearInsights = useCallback(() => {
    dispatch({ type: 'CLEAR_INSIGHTS' })
  }, [])

  const clearChat = useCallback(() => {
    dispatch({ type: 'CLEAR_CHAT' })
  }, [])

  // Refresh all data
  const refreshAll = useCallback(async () => {
    const promises = []

    if (state.aiConfig.enabledFeatures.includes('recommendations')) {
      promises.push(fetchRecommendations())
    }

    if (state.aiConfig.enabledFeatures.includes('insights')) {
      promises.push(fetchInsights())
    }

    await Promise.allSettled(promises)
  }, [
    fetchRecommendations,
    fetchInsights,
    state.aiConfig.enabledFeatures
  ])

  // Auto-fetch on mount and when supplierId changes
  useEffect(() => {
    if (autoFetch && supplierId) {
      refreshAll()
    }
  }, [autoFetch, supplierId, refreshAll])

  // Real-time updates via WebSocket or polling
  useEffect(() => {
    if (!enableRealTimeUpdates || !supplierId) return

    let intervalId: NodeJS.Timeout

    if (state.aiConfig.autoRefresh) {
      // Poll for updates every 5 minutes
      intervalId = setInterval(() => {
        refreshAll()
      }, 5 * 60 * 1000)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [enableRealTimeUpdates, supplierId, state.aiConfig.autoRefresh, refreshAll])

  // Initialize welcome message for chat
  useEffect(() => {
    if (state.chatMessages.length === 0 && state.aiConfig.enabledFeatures.includes('chat')) {
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        payload: {
          role: 'assistant',
          content: `Hello! I'm your AI Supplier Intelligence Assistant. I can help you with:

• **Supplier Analysis** - Performance, risk, and cost analysis
• **Market Insights** - Industry trends and competitive intelligence
• **Recommendations** - Data-driven supplier optimization suggestions
• **Q&A** - Answer specific questions about your suppliers

${supplierId ? 'I can see we\'re focusing on a specific supplier. ' : ''}What would you like to explore today?`,
          metadata: {
            type: 'welcome',
            actionable: false
          }
        }
      })
    }
  }, [state.chatMessages.length, state.aiConfig.enabledFeatures, supplierId])

  return {
    state,
    fetchRecommendations,
    fetchInsights,
    sendChatMessage,
    bookmarkInsight,
    provideInsightFeedback,
    clearRecommendations,
    clearInsights,
    clearChat,
    refreshAll
  }
}

// Specialized hooks for specific use cases
export function useAISupplierRecommendations(query?: string, filters?: Record<string, any>) {
  const { state, fetchRecommendations, clearRecommendations } = useAISupplier({
    autoFetch: false
  })

  const search = useCallback(async (searchQuery?: string, searchFilters?: Record<string, any>) => {
    await fetchRecommendations(searchQuery || query, searchFilters || filters)
  }, [fetchRecommendations, query, filters])

  return {
    recommendations: state.recommendations,
    loading: state.recommendationsLoading,
    error: state.recommendationsError,
    search,
    clear: clearRecommendations
  }
}

export function useAISupplierInsights(supplierId?: string, categories?: string[]) {
  const { state, fetchInsights, clearInsights, bookmarkInsight, provideInsightFeedback } = useAISupplier({
    supplierId,
    autoFetch: !!supplierId
  })

  const refreshInsights = useCallback(async (newCategories?: string[]) => {
    await fetchInsights(supplierId, newCategories || categories)
  }, [fetchInsights, supplierId, categories])

  return {
    insights: state.insights,
    loading: state.insightsLoading,
    error: state.insightsError,
    refresh: refreshInsights,
    clear: clearInsights,
    bookmark: bookmarkInsight,
    provideFeedback: provideInsightFeedback
  }
}

export function useAISupplierChat(supplierId?: string) {
  const { state, sendChatMessage, clearChat } = useAISupplier({
    supplierId,
    autoFetch: false
  })

  return {
    messages: state.chatMessages,
    isTyping: state.isTyping,
    sendMessage: sendChatMessage,
    clearChat
  }
}