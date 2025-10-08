// AI-enhanced supplier management types
export * from './ai'

export interface AISupplierRecommendation {
  id: string
  supplier: {
    id?: string
    name: string
    category?: string
    website?: string
    email?: string
    phone?: string
    address?: string
    primaryContact?: {
      name: string
      email: string
      phone: string
      role: string
    }
    businessInfo?: {
      legalName?: string
      taxId?: string
      registrationNumber?: string
      employeeCount?: number
      annualRevenue?: number
      establishedYear?: number
    }
    geographic_region?: string
    primary_category?: string
  }

  // AI Analysis Results
  confidenceScore: number // 0-100
  matchReasons: string[]
  riskFactors: string[]

  // Predicted Performance Metrics
  predictedPerformance: {
    deliveryReliability: number // 0-100
    qualityScore: number // 0-100
    costEffectiveness: number // 0-100
    relationshipPotential: number // 0-100
    overallRating: number // 0-5
  }

  // Market Intelligence
  marketIntelligence: {
    competitorAnalysis: string
    industryPosition: 'leader' | 'challenger' | 'follower' | 'niche'
    growthTrend: 'increasing' | 'stable' | 'declining'
    marketShare?: number // 0-100
    industryRanking?: number
    reputationScore?: number // 0-100
  }

  // AI-Generated Insights
  aiInsights: string[]

  // Recommendation Classification
  recommendationType: 'perfect_match' | 'good_alternative' | 'cost_effective' | 'innovative' | 'strategic'

  // Financial Analysis
  estimatedSavings?: number
  costAnalysis?: {
    currentCost?: number
    projectedCost?: number
    savingsPercentage?: number
    roi?: number
  }

  // Implementation Assessment
  implementationComplexity: 'low' | 'medium' | 'high'
  integrationEffort?: {
    timeToOnboard: number // days
    resourcesRequired: string[]
    technicalComplexity: 'simple' | 'moderate' | 'complex'
  }

  // Metadata
  generatedAt: Date
  lastUpdated: Date
  dataSourcesUsed: string[]
  algorithmVersion: string
}

export interface AISupplierInsight {
  id: string
  supplierId?: string
  type: 'opportunity' | 'risk' | 'trend' | 'recommendation' | 'anomaly' | 'performance'
  category: 'cost' | 'quality' | 'delivery' | 'relationship' | 'compliance' | 'sustainability' | 'market'

  // Content
  title: string
  description: string
  details: string

  // Confidence and Impact
  confidence: number // 0-100
  impact: 'low' | 'medium' | 'high' | 'critical'
  urgency: 'low' | 'medium' | 'high' | 'immediate'

  // Evidence and Analysis
  evidencePoints: Array<{
    type: 'metric' | 'trend' | 'comparison' | 'external'
    description: string
    value?: string | number
    source: string
    reliability: number // 0-100
  }>

  // Recommendations and Actions
  actionable: boolean
  suggestedActions: Array<{
    action: string
    priority: 'low' | 'medium' | 'high'
    effort: 'minimal' | 'moderate' | 'significant'
    expectedOutcome: string
    timeframe: string
  }>

  // Related Data
  relatedSuppliers: string[]
  relatedMetrics: string[]
  affectedStakeholders: string[]

  // Financial Impact
  potentialValue?: number
  costImplications?: number

  // Metadata
  dataPoints: Record<string, any>
  sourceData: string[]
  timestamp: Date
  expiresAt?: Date
  isBookmarked?: boolean
  viewCount: number
  userFeedback?: {
    helpful: number
    notHelpful: number
    comments: string[]
  }
}

export interface AIPredictiveModel {
  id: string
  name: string
  type: 'demand_forecast' | 'cost_prediction' | 'risk_assessment' | 'performance_forecast' | 'market_analysis'
  description: string

  // Model Performance
  accuracy: number // 0-100
  precision: number // 0-100
  recall: number // 0-100
  f1Score: number // 0-100

  // Training Information
  trainingData: {
    samples: number
    features: string[]
    timeRange: {
      from: Date
      to: Date
    }
    lastTrained: Date
  }

  // Model Configuration
  algorithm: string
  hyperparameters: Record<string, any>
  version: string

  // Predictions
  predictions: Array<{
    id: string
    targetVariable: string
    predictedValue: number
    confidenceInterval: [number, number]
    predictionDate: Date
    horizonDays: number
    factors: Array<{
      factor: string
      importance: number
      impact: 'positive' | 'negative' | 'neutral'
    }>
  }>

  // Performance Metrics
  performanceHistory: Array<{
    date: Date
    accuracy: number
    prediction: number
    actual?: number
    error?: number
  }>

  // Status
  status: 'active' | 'training' | 'validation' | 'deprecated'
  lastPrediction: Date
  nextUpdate: Date
}

export interface AIAnomalyDetection {
  id: string
  type: 'cost_spike' | 'performance_drop' | 'demand_anomaly' | 'supplier_risk' | 'quality_issue' | 'delivery_delay'

  // Anomaly Details
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence: number // 0-100

  // Detection Information
  detectedAt: Date
  detectionMethod: string
  threshold: number
  actualValue: number
  expectedValue: number
  deviation: number

  // Affected Entities
  affectedSuppliers: string[]
  affectedCategories: string[]
  affectedMetrics: string[]

  // Impact Assessment
  impactMetrics: {
    financial?: {
      estimatedCost: number
      currency: string
    }
    operational?: {
      affectedOrders: number
      delayDays?: number
      qualityImpact?: number
    }
    strategic?: {
      riskLevel: 'low' | 'medium' | 'high'
      complianceIssue: boolean
      reputationImpact: 'minimal' | 'moderate' | 'significant'
    }
  }

  // Root Cause Analysis
  rootCauseAnalysis?: {
    primaryCause: string
    contributingFactors: string[]
    confidence: number
    analysisMethod: string
  }

  // Response and Resolution
  suggestedActions: Array<{
    action: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    category: 'immediate' | 'short_term' | 'long_term'
    resourcesNeeded: string[]
    expectedOutcome: string
  }>

  // Status Tracking
  status: 'new' | 'acknowledged' | 'investigating' | 'resolving' | 'resolved' | 'dismissed'
  assignedTo?: string
  resolvedAt?: Date
  resolution?: string

  // Historical Context
  similarAnomalies: Array<{
    anomalyId: string
    similarity: number
    resolution: string
    outcome: string
  }>
}

export interface AIMarketIntelligence {
  id: string
  category: string
  region: string

  // Market Analysis
  marketSize: {
    value: number
    currency: string
    year: number
    source: string
  }

  growthTrend: {
    rate: number // percentage
    direction: 'growing' | 'stable' | 'declining'
    drivers: string[]
    forecast: Array<{
      year: number
      projectedValue: number
      confidence: number
    }>
  }

  // Competitive Landscape
  competitiveAnalysis: {
    marketLeaders: Array<{
      name: string
      marketShare: number
      strengths: string[]
      weaknesses: string[]
    }>
    marketConcentration: 'fragmented' | 'moderate' | 'concentrated'
    barrierToEntry: 'low' | 'medium' | 'high'
    competitiveIntensity: 'low' | 'medium' | 'high'
  }

  // Price Intelligence
  pricingTrends: {
    averagePrice: number
    priceRange: [number, number]
    priceTrend: 'increasing' | 'stable' | 'decreasing'
    pricingFactors: string[]
    benchmarks: Array<{
      segment: string
      averagePrice: number
      topPercentile: number
      bottomPercentile: number
    }>
  }

  // Supplier Landscape
  supplierAnalysis: {
    totalSuppliers: number
    newEntrants: number
    exitingSuppliers: number
    certificationTrends: string[]
    geographicDistribution: Record<string, number>
    capabilityGaps: string[]
  }

  // Risk Assessment
  marketRisks: Array<{
    risk: string
    probability: 'low' | 'medium' | 'high'
    impact: 'low' | 'medium' | 'high'
    mitigation: string[]
  }>

  // Opportunities
  opportunities: Array<{
    opportunity: string
    potential: 'low' | 'medium' | 'high'
    timeframe: 'short_term' | 'medium_term' | 'long_term'
    requirements: string[]
    expectedBenefits: string[]
  }>

  // Data Sources and Quality
  dataSources: string[]
  dataQuality: number // 0-100
  lastUpdated: Date
  nextUpdate: Date
  confidenceLevel: number // 0-100
}

export interface AISupplierRiskProfile {
  supplierId: string
  overallRiskScore: number // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical'

  // Risk Categories
  riskCategories: {
    financial: {
      score: number
      factors: string[]
      creditRating?: string
      financialStability: 'stable' | 'concerning' | 'unstable'
    }
    operational: {
      score: number
      factors: string[]
      capacityRisk: 'low' | 'medium' | 'high'
      qualityRisk: 'low' | 'medium' | 'high'
      deliveryRisk: 'low' | 'medium' | 'high'
    }
    strategic: {
      score: number
      factors: string[]
      dependencyLevel: 'low' | 'medium' | 'high'
      replaceability: 'easy' | 'moderate' | 'difficult'
      strategicImportance: 'low' | 'medium' | 'high' | 'critical'
    }
    compliance: {
      score: number
      factors: string[]
      regulatoryCompliance: boolean
      certificationStatus: 'current' | 'expiring' | 'expired'
      auditResults: string[]
    }
    geopolitical: {
      score: number
      factors: string[]
      countryRisk: 'low' | 'medium' | 'high'
      politicalStability: 'stable' | 'moderate' | 'unstable'
      tradeRestrictions: boolean
    }
    environmental: {
      score: number
      factors: string[]
      sustainabilityScore?: number
      environmentalIncidents: number
      carbonFootprint?: number
    }
  }

  // Risk Events and History
  riskEvents: Array<{
    event: string
    date: Date
    severity: 'low' | 'medium' | 'high' | 'critical'
    impact: string
    resolution?: string
    lessons: string[]
  }>

  // Mitigation Strategies
  mitigationStrategies: Array<{
    risk: string
    strategy: string
    effectiveness: 'low' | 'medium' | 'high'
    cost: 'low' | 'medium' | 'high'
    timeframe: string
    owner: string
  }>

  // Monitoring and Alerts
  riskIndicators: Array<{
    indicator: string
    currentValue: number
    threshold: number
    trend: 'improving' | 'stable' | 'worsening'
    alertLevel: 'green' | 'yellow' | 'red'
  }>

  // Assessment Metadata
  lastAssessment: Date
  nextReview: Date
  assessmentMethod: string
  confidence: number // 0-100
  dataQuality: number // 0-100
}

// State Management Types
export interface AISupplierState {
  // Discovery and Recommendations
  recommendations: AISupplierRecommendation[]
  recommendationsLoading: boolean
  recommendationsError: string | null

  // Insights and Analytics
  insights: AISupplierInsight[]
  insightsLoading: boolean
  insightsError: string | null

  // Predictions and Models
  predictions: AIPredictiveModel[]
  predictionsLoading: boolean
  predictionsError: string | null

  // Anomaly Detection
  anomalies: AIAnomalyDetection[]
  anomaliesLoading: boolean
  anomaliesError: string | null

  // Market Intelligence
  marketIntelligence: AIMarketIntelligence[]
  marketIntelligenceLoading: boolean
  marketIntelligenceError: string | null

  // Risk Profiles
  riskProfiles: Record<string, AISupplierRiskProfile>
  riskProfilesLoading: boolean
  riskProfilesError: string | null

  // Chat and Interaction
  chatMessages: Array<{
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
    metadata?: Record<string, any>
  }>
  isTyping: boolean
  chatContext: {
    supplierId?: string
    conversationId?: string
    preferences: Record<string, any>
  }

  // Configuration
  aiConfig: {
    enabledFeatures: string[]
    analysisDepth: 'quick' | 'standard' | 'comprehensive'
    autoRefresh: boolean
    alertThresholds: Record<string, number>
    modelVersions: Record<string, string>
  }

  // Performance Metrics
  performanceMetrics: {
    apiLatency: number
    modelAccuracy: Record<string, number>
    userSatisfaction: number
    usageStatistics: Record<string, number>
  }
}

// Action Types for State Management
export type AISupplierAction =
  | { type: 'FETCH_RECOMMENDATIONS_START' }
  | { type: 'FETCH_RECOMMENDATIONS_SUCCESS'; payload: AISupplierRecommendation[] }
  | { type: 'FETCH_RECOMMENDATIONS_ERROR'; payload: string }
  | { type: 'FETCH_INSIGHTS_START' }
  | { type: 'FETCH_INSIGHTS_SUCCESS'; payload: AISupplierInsight[] }
  | { type: 'FETCH_INSIGHTS_ERROR'; payload: string }
  | { type: 'ADD_CHAT_MESSAGE'; payload: { role: 'user' | 'assistant'; content: string; metadata?: any } }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'UPDATE_AI_CONFIG'; payload: Partial<AISupplierState['aiConfig']> }
  | { type: 'BOOKMARK_INSIGHT'; payload: { insightId: string; bookmarked: boolean } }
  | { type: 'PROVIDE_INSIGHT_FEEDBACK'; payload: { insightId: string; feedback: 'helpful' | 'notHelpful' } }
  | { type: 'CLEAR_RECOMMENDATIONS' }
  | { type: 'CLEAR_INSIGHTS' }
  | { type: 'CLEAR_CHAT' }

// Hook Types
export interface UseAISupplierOptions {
  supplierId?: string
  autoFetch?: boolean
  enableRealTimeUpdates?: boolean
  analysisDepth?: 'quick' | 'standard' | 'comprehensive'
}

export interface UseAISupplierReturn {
  // State
  state: AISupplierState

  // Actions
  fetchRecommendations: (query?: string, filters?: Record<string, any>) => Promise<void>
  fetchInsights: (supplierId?: string, categories?: string[]) => Promise<void>
  sendChatMessage: (message: string) => Promise<void>
  bookmarkInsight: (insightId: string) => Promise<void>
  provideInsightFeedback: (insightId: string, feedback: 'helpful' | 'notHelpful') => Promise<void>

  // Utils
  clearRecommendations: () => void
  clearInsights: () => void
  clearChat: () => void
  refreshAll: () => Promise<void>
}