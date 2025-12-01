'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Brain,
  Search,
  Sparkles,
  TrendingUp,
  Building2,
  MapPin,
  Star,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Award,
  ShieldCheck,
  Zap,
  Target,
  BarChart3,
  Eye,
  Heart,
  Loader2,
  Lightbulb,
  Database,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

// AI Enhanced Types
interface AISupplierRecommendation {
  id: string;
  name: string;
  legalName: string;
  industry: string;
  location: {
    country: string;
    city: string;
    region: string;
    coordinates: { lat: number; lng: number };
  };
  aiMatchScore: number;
  confidenceLevel: number;
  reasoning: string[];
  keyStrengths: string[];
  potentialRisks: string[];
  estimatedSavings: number;
  performancePreview: {
    deliveryRating: number;
    qualityScore: number;
    sustainabilityRating: number;
    innovationIndex: number;
  };
  marketIntelligence: {
    marketPosition: 'leader' | 'challenger' | 'follower';
    pricingTier: 'premium' | 'competitive' | 'budget';
    growthTrend: number;
    marketShare: number;
  };
  complianceStatus: {
    certifications: string[];
    riskLevel: 'low' | 'medium' | 'high';
    lastAudit: string;
    complianceScore: number;
  };
  contactRecommendation: {
    bestTimeToContact: string;
    preferredChannel: 'email' | 'phone' | 'platform';
    keyPersona: string;
    approachStrategy: string;
  };
  tags: string[];
  status: 'available' | 'exclusive' | 'preferred' | 'restricted';
  lastUpdated: string;
}

interface AIInsight {
  id: string;
  type: 'market_trend' | 'cost_opportunity' | 'risk_alert' | 'performance_insight';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  recommendation: string;
  data: unknown;
  createdAt: string;
}

interface AISupplierDiscoveryProps {
  onSupplierSelect?: (supplier: AISupplierRecommendation) => void;
  onSupplierBookmark?: (supplierId: string) => void;
  initialQuery?: string;
  compactMode?: boolean;
}

const AISupplierDiscovery: React.FC<AISupplierDiscoveryProps> = ({
  onSupplierSelect,
  onSupplierBookmark,
  initialQuery = '',
  compactMode = false,
}) => {
  // State Management
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [aiProcessing, setAIProcessing] = useState(false);
  const [recommendations, setRecommendations] = useState<AISupplierRecommendation[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<AISupplierRecommendation | null>(null);
  const [filters, setFilters] = useState({
    industry: '',
    location: '',
    tier: '',
    riskLevel: '',
    minMatchScore: 70,
  });
  const [sortBy, setSortBy] = useState<'match_score' | 'savings' | 'performance' | 'risk'>(
    'match_score'
  );
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [bookmarkedSuppliers, setBookmarkedSuppliers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('recommendations');

  // AI-powered search with auto-suggestions
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Simulate AI processing and recommendations
  const performAISearch = useCallback(async (query: string) => {
    setAIProcessing(true);
    setError(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock AI recommendations
      const mockRecommendations: AISupplierRecommendation[] = [
        {
          id: 'ai_sup_001',
          name: 'TechFlow Solutions',
          legalName: 'TechFlow Solutions Pty Ltd',
          industry: 'Technology Components',
          location: {
            country: 'South Africa',
            city: 'Cape Town',
            region: 'Western Cape',
            coordinates: { lat: -33.9249, lng: 18.4241 },
          },
          aiMatchScore: 94,
          confidenceLevel: 89,
          reasoning: [
            'Perfect alignment with your technology procurement requirements',
            'Exceptional delivery performance (98.2% on-time)',
            'Strong sustainability credentials matching your ESG goals',
            'Competitive pricing with 15% cost reduction potential',
          ],
          keyStrengths: [
            'Advanced manufacturing capabilities',
            'ISO 27001 certified security processes',
            'Carbon-neutral operations',
            '24/7 technical support',
          ],
          potentialRisks: ['Single facility dependency', 'Limited backup suppliers'],
          estimatedSavings: 180000,
          performancePreview: {
            deliveryRating: 4.9,
            qualityScore: 4.7,
            sustainabilityRating: 4.8,
            innovationIndex: 4.6,
          },
          marketIntelligence: {
            marketPosition: 'challenger',
            pricingTier: 'competitive',
            growthTrend: 15.2,
            marketShare: 8.5,
          },
          complianceStatus: {
            certifications: ['ISO 9001', 'ISO 14001', 'ISO 27001', 'B-BBEE Level 2'],
            riskLevel: 'low',
            lastAudit: '2024-08-15',
            complianceScore: 96,
          },
          contactRecommendation: {
            bestTimeToContact: 'Tuesday-Thursday, 9AM-11AM SAST',
            preferredChannel: 'email',
            keyPersona: 'Technical Decision Maker',
            approachStrategy: 'Lead with sustainability and innovation focus',
          },
          tags: ['AI-Recommended', 'Sustainability Leader', 'Innovation Partner'],
          status: 'available',
          lastUpdated: new Date().toISOString(),
        },
        {
          id: 'ai_sup_002',
          name: 'Global Component Systems',
          legalName: 'Global Component Systems International',
          industry: 'Industrial Components',
          location: {
            country: 'Germany',
            city: 'Munich',
            region: 'Bavaria',
            coordinates: { lat: 48.1351, lng: 11.582 },
          },
          aiMatchScore: 87,
          confidenceLevel: 82,
          reasoning: [
            'Strong quality heritage with German engineering excellence',
            'Proven track record with similar enterprises',
            'Competitive pricing for premium quality',
            'EU compliance reduces regulatory risk',
          ],
          keyStrengths: [
            'Industry 4.0 manufacturing',
            'Premium quality standards',
            'European regulatory compliance',
            'Strong R&D investment',
          ],
          potentialRisks: ['Currency exchange rate exposure', 'Longer lead times due to distance'],
          estimatedSavings: 95000,
          performancePreview: {
            deliveryRating: 4.4,
            qualityScore: 4.9,
            sustainabilityRating: 4.3,
            innovationIndex: 4.8,
          },
          marketIntelligence: {
            marketPosition: 'leader',
            pricingTier: 'premium',
            growthTrend: 8.1,
            marketShare: 22.3,
          },
          complianceStatus: {
            certifications: ['ISO 9001', 'CE Marking', 'REACH Compliance'],
            riskLevel: 'low',
            lastAudit: '2024-07-22',
            complianceScore: 94,
          },
          contactRecommendation: {
            bestTimeToContact: 'Monday-Friday, 2PM-4PM CET',
            preferredChannel: 'platform',
            keyPersona: 'Engineering Specialist',
            approachStrategy: 'Emphasize precision and quality requirements',
          },
          tags: ['Premium Quality', 'European Excellence', 'R&D Leader'],
          status: 'preferred',
          lastUpdated: new Date().toISOString(),
        },
      ];

      setRecommendations(mockRecommendations);

      // Mock AI insights
      const mockInsights: AIInsight[] = [
        {
          id: 'insight_001',
          type: 'cost_opportunity',
          title: 'Significant Cost Reduction Opportunity',
          description:
            'AI analysis indicates potential 18% cost reduction through strategic supplier consolidation',
          impact: 'high',
          confidence: 91,
          recommendation:
            'Consider bundling requirements with TechFlow Solutions for volume discounts',
          data: { potentialSavings: 275000, timeframe: '6 months' },
          createdAt: new Date().toISOString(),
        },
        {
          id: 'insight_002',
          type: 'market_trend',
          title: 'Market Trend Alert: Supply Chain Diversification',
          description:
            'Industry trend shows 35% increase in supply chain diversification initiatives',
          impact: 'medium',
          confidence: 84,
          recommendation: 'Consider geographic diversification with European suppliers',
          data: { trend: '+35%', timeline: 'Q4 2024' },
          createdAt: new Date().toISOString(),
        },
      ];

      setInsights(mockInsights);
    } catch (err) {
      setError('AI search failed. Please try again.');
      console.error('AI search error:', err);
    } finally {
      setAIProcessing(false);
    }
  }, []);

  // Search suggestions based on input
  const updateSearchSuggestions = useCallback((query: string) => {
    if (query.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const suggestions = [
      'Technology components with sustainability focus',
      'Industrial automation suppliers in Europe',
      'Cost-effective software licensing partners',
      'Green energy equipment manufacturers',
      'Automotive parts suppliers with ISO certification',
    ].filter(suggestion => suggestion.toLowerCase().includes(query.toLowerCase()));

    setSearchSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);
  }, []);

  // Handle search input changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    updateSearchSuggestions(value);
  };

  // Execute AI search
  const executeSearch = () => {
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      performAISearch(searchQuery);
    }
  };

  // Filter and sort recommendations
  const filteredAndSortedRecommendations = useMemo(() => {
    const filtered = recommendations.filter(supplier => {
      return (
        (!filters.industry || supplier.industry.includes(filters.industry)) &&
        (!filters.location || supplier.location.country.includes(filters.location)) &&
        (!filters.riskLevel || supplier.complianceStatus.riskLevel === filters.riskLevel) &&
        supplier.aiMatchScore >= filters.minMatchScore
      );
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'savings':
          return b.estimatedSavings - a.estimatedSavings;
        case 'performance':
          return b.performancePreview.deliveryRating - a.performancePreview.deliveryRating;
        case 'risk':
          const riskOrder = { low: 0, medium: 1, high: 2 };
          return riskOrder[a.complianceStatus.riskLevel] - riskOrder[b.complianceStatus.riskLevel];
        default:
          return b.aiMatchScore - a.aiMatchScore;
      }
    });
  }, [recommendations, filters, sortBy]);

  // Get match score color
  const getMatchScoreColor = (score: number): string => {
    if (score >= 90) return 'from-green-500 to-emerald-600';
    if (score >= 80) return 'from-blue-500 to-indigo-600';
    if (score >= 70) return 'from-yellow-500 to-orange-600';
    return 'from-red-500 to-pink-600';
  };

  // Get performance indicator color
  const getPerformanceColor = (score: number): string => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 4.0) return 'text-blue-600';
    if (score >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* AI-Powered Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-8 text-white shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="rounded-xl bg-white/20 p-3 backdrop-blur-sm"
              >
                <Brain className="h-8 w-8" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold">AI Supplier Discovery</h1>
                <p className="text-lg text-purple-100">Intelligent matching with market insights</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="border-white/30 bg-white/20 text-white">
              <Sparkles className="mr-1 h-4 w-4" />
              AI Powered
            </Badge>
            <Badge variant="secondary" className="border-white/30 bg-white/20 text-white">
              <Database className="mr-1 h-4 w-4" />
              {recommendations.length} Found
            </Badge>
          </div>
        </div>
      </motion.div>
      {/* AI Search Interface */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Intelligent Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Describe what you're looking for (e.g., 'sustainable tech suppliers in Africa')"
                    value={searchQuery}
                    onChange={e => handleSearchChange(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && executeSearch()}
                    className="rounded-xl border-2 border-gray-200 py-6 pl-10 text-lg focus:border-purple-500"
                    aria-label="AI supplier search"
                  />
                  {aiProcessing && (
                    <div className="absolute top-3 right-3">
                      <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                    </div>
                  )}
                </div>
                <Button
                  onClick={executeSearch}
                  disabled={!searchQuery.trim() || aiProcessing}
                  size="lg"
                  className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 text-white hover:from-purple-700 hover:to-indigo-700"
                >
                  {aiProcessing ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Brain className="mr-2 h-5 w-5" />
                  )}
                  AI Search
                </Button>
              </div>

              {/* Search Suggestions */}
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-10 mt-2 w-full rounded-xl border-2 border-gray-200 bg-white shadow-xl"
                  >
                    {searchSuggestions.map((suggestion, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ backgroundColor: '#f3f4f6' }}
                        className="cursor-pointer border-b border-gray-100 px-4 py-3 last:border-b-0"
                        onClick={() => {
                          setSearchQuery(suggestion);
                          setShowSuggestions(false);
                          performAISearch(suggestion);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-purple-500" />
                          <span className="text-sm">{suggestion}</span>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Filters and Sort */}
            <div className="flex flex-wrap gap-3">
              <Select
                value={filters.industry}
                onValueChange={value => setFilters({ ...filters, industry: value })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="Services">Services</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.location}
                onValueChange={value => setFilters({ ...filters, location: value })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="South Africa">South Africa</SelectItem>
                  <SelectItem value="Europe">Europe</SelectItem>
                  <SelectItem value="Asia">Asia</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={value => setSortBy(value as unknown)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="match_score">AI Match Score</SelectItem>
                  <SelectItem value="savings">Estimated Savings</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="risk">Risk Level</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-2">
                <span className="text-sm text-gray-600">Min Match:</span>
                <span className="text-sm font-medium">{filters.minMatchScore}%</span>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={filters.minMatchScore}
                  onChange={e =>
                    setFilters({ ...filters, minMatchScore: parseInt(e.target.value) })
                  }
                  className="w-20"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Error State */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="mb-1 font-semibold">AI Search Error</div>
            <div>{error}</div>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Recommendations
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Market Insights
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Comparison
          </TabsTrigger>
        </TabsList>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations">
          {aiProcessing ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 gap-6 lg:grid-cols-2"
            >
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gray-200"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-3/4 rounded bg-gray-200"></div>
                          <div className="h-3 w-1/2 rounded bg-gray-200"></div>
                        </div>
                      </div>
                      <div className="h-24 rounded bg-gray-200"></div>
                      <div className="flex gap-2">
                        <div className="h-6 w-20 rounded bg-gray-200"></div>
                        <div className="h-6 w-20 rounded bg-gray-200"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <AnimatePresence>
                {filteredAndSortedRecommendations.map((supplier, index) => (
                  <motion.div
                    key={supplier.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="group border-0 shadow-lg transition-all duration-300 hover:shadow-xl">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-gradient-to-r from-purple-100 to-indigo-100 p-3">
                              <Building2 className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                              <CardTitle className="text-lg leading-tight">
                                {supplier.name}
                              </CardTitle>
                              <p className="text-sm text-gray-600">{supplier.industry}</p>
                              <div className="mt-1 flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {supplier.location.city}, {supplier.location.country}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div
                              className={`rounded-full bg-gradient-to-r px-3 py-1 ${getMatchScoreColor(supplier.aiMatchScore)} text-sm font-bold text-white`}
                            >
                              {supplier.aiMatchScore}% Match
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newBookmarks = bookmarkedSuppliers.includes(supplier.id)
                                  ? bookmarkedSuppliers.filter(id => id !== supplier.id)
                                  : [...bookmarkedSuppliers, supplier.id];
                                setBookmarkedSuppliers(newBookmarks);
                                onSupplierBookmark?.(supplier.id);
                              }}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <Heart
                                className={`h-4 w-4 ${bookmarkedSuppliers.includes(supplier.id) ? 'fill-current text-red-500' : ''}`}
                              />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* AI Confidence and Key Insights */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">AI Confidence</span>
                            <span className="font-medium">{supplier.confidenceLevel}%</span>
                          </div>
                          <Progress value={supplier.confidenceLevel} className="h-2" />
                        </div>

                        {/* Performance Preview */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Delivery</span>
                            <span
                              className={`flex items-center gap-1 font-medium ${getPerformanceColor(supplier.performancePreview.deliveryRating)}`}
                            >
                              <Star className="h-3 w-3 fill-current" />
                              {supplier.performancePreview.deliveryRating}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Quality</span>
                            <span
                              className={`flex items-center gap-1 font-medium ${getPerformanceColor(supplier.performancePreview.qualityScore)}`}
                            >
                              <Award className="h-3 w-3" />
                              {supplier.performancePreview.qualityScore}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Sustainability</span>
                            <span
                              className={`flex items-center gap-1 font-medium ${getPerformanceColor(supplier.performancePreview.sustainabilityRating)}`}
                            >
                              <ShieldCheck className="h-3 w-3" />
                              {supplier.performancePreview.sustainabilityRating}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Innovation</span>
                            <span
                              className={`flex items-center gap-1 font-medium ${getPerformanceColor(supplier.performancePreview.innovationIndex)}`}
                            >
                              <Zap className="h-3 w-3" />
                              {supplier.performancePreview.innovationIndex}
                            </span>
                          </div>
                        </div>

                        {/* Estimated Savings */}
                        <div className="rounded-lg bg-green-50 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-green-700">
                              Potential Savings
                            </span>
                            <span className="text-lg font-bold text-green-800">
                              ${(supplier.estimatedSavings / 1000).toFixed(0)}k
                            </span>
                          </div>
                        </div>

                        {/* Key Strengths */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">Key Strengths</h4>
                          <div className="flex flex-wrap gap-1">
                            {supplier.keyStrengths.slice(0, 2).map((strength, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {strength}
                              </Badge>
                            ))}
                            {supplier.keyStrengths.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{supplier.keyStrengths.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSupplier(supplier)}
                            className="flex-1"
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => onSupplierSelect?.(supplier)}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                          >
                            <ArrowRight className="mr-1 h-4 w-4" />
                            Connect
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Market Insights Tab */}
        <TabsContent value="insights">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {insights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`rounded-xl p-3 ${
                          insight.type === 'cost_opportunity'
                            ? 'bg-green-100 text-green-600'
                            : insight.type === 'market_trend'
                              ? 'bg-blue-100 text-blue-600'
                              : insight.type === 'risk_alert'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-purple-100 text-purple-600'
                        }`}
                      >
                        {insight.type === 'cost_opportunity' && <DollarSign className="h-5 w-5" />}
                        {insight.type === 'market_trend' && <TrendingUp className="h-5 w-5" />}
                        {insight.type === 'risk_alert' && <AlertTriangle className="h-5 w-5" />}
                        {insight.type === 'performance_insight' && (
                          <BarChart3 className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{insight.title}</h3>
                          <Badge
                            variant={
                              insight.impact === 'high'
                                ? 'destructive'
                                : insight.impact === 'medium'
                                  ? 'default'
                                  : 'secondary'
                            }
                          >
                            {insight.impact} impact
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{insight.description}</p>
                        <div className="rounded-lg bg-blue-50 p-3">
                          <h4 className="mb-1 text-sm font-medium text-blue-800">Recommendation</h4>
                          <p className="text-sm text-blue-700">{insight.recommendation}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{insight.confidence}% confidence</span>
                          <span>{new Date(insight.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Supplier Comparison Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-2 py-3 text-left">Supplier</th>
                      <th className="px-2 py-3 text-center">AI Match</th>
                      <th className="px-2 py-3 text-center">Savings</th>
                      <th className="px-2 py-3 text-center">Performance</th>
                      <th className="px-2 py-3 text-center">Risk</th>
                      <th className="px-2 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedRecommendations.slice(0, 5).map((supplier, index) => (
                      <tr key={supplier.id} className="border-b hover:bg-gray-50">
                        <td className="px-2 py-4">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-purple-100 p-2">
                              <Building2 className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <div className="font-medium">{supplier.name}</div>
                              <div className="text-sm text-gray-500">
                                {supplier.location.country}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-4 text-center">
                          <div
                            className={`rounded-full bg-gradient-to-r px-2 py-1 ${getMatchScoreColor(supplier.aiMatchScore)} text-sm font-medium text-white`}
                          >
                            {supplier.aiMatchScore}%
                          </div>
                        </td>
                        <td className="px-2 py-4 text-center">
                          <div className="font-medium text-green-600">
                            ${(supplier.estimatedSavings / 1000).toFixed(0)}k
                          </div>
                        </td>
                        <td className="px-2 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-4 w-4 fill-current text-yellow-500" />
                            <span>{supplier.performancePreview.deliveryRating}</span>
                          </div>
                        </td>
                        <td className="px-2 py-4 text-center">
                          <Badge
                            variant={
                              supplier.complianceStatus.riskLevel === 'low'
                                ? 'default'
                                : supplier.complianceStatus.riskLevel === 'medium'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                          >
                            {supplier.complianceStatus.riskLevel}
                          </Badge>
                        </td>
                        <td className="px-2 py-4 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSupplier(supplier)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Supplier Detail Dialog */}
      {selectedSupplier && (
        <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
          <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2">
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
                {selectedSupplier.name} - AI Analysis
              </DialogTitle>
              <DialogDescription>
                Comprehensive AI-powered supplier analysis and recommendations
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* AI Matching Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Matching Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="text-center">
                      <div
                        className={`bg-gradient-to-r text-3xl font-bold ${getMatchScoreColor(selectedSupplier.aiMatchScore)} bg-clip-text text-transparent`}
                      >
                        {selectedSupplier.aiMatchScore}%
                      </div>
                      <div className="text-sm text-gray-600">Match Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {selectedSupplier.confidenceLevel}%
                      </div>
                      <div className="text-sm text-gray-600">Confidence Level</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        ${(selectedSupplier.estimatedSavings / 1000).toFixed(0)}k
                      </div>
                      <div className="text-sm text-gray-600">Potential Savings</div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    <h4 className="font-medium">AI Reasoning</h4>
                    <div className="space-y-2">
                      {selectedSupplier.reasoning.map((reason, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                          <span className="text-sm text-gray-700">{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(selectedSupplier.performancePreview).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                            <span className="font-medium">{value}/5</span>
                          </div>
                          <Progress value={(value / 5) * 100} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Market Intelligence</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Market Position</span>
                        <Badge variant="outline" className="capitalize">
                          {selectedSupplier.marketIntelligence.marketPosition}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Pricing Tier</span>
                        <Badge variant="outline" className="capitalize">
                          {selectedSupplier.marketIntelligence.pricingTier}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Growth Trend</span>
                        <span className="text-sm font-medium text-green-600">
                          +{selectedSupplier.marketIntelligence.growthTrend}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Market Share</span>
                        <span className="text-sm font-medium">
                          {selectedSupplier.marketIntelligence.marketShare}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Contact Recommendation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    AI Contact Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-gray-600">Best Time to Contact</span>
                        <div className="font-medium">
                          {selectedSupplier.contactRecommendation.bestTimeToContact}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Preferred Channel</span>
                        <div className="font-medium capitalize">
                          {selectedSupplier.contactRecommendation.preferredChannel}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-gray-600">Key Persona</span>
                        <div className="font-medium">
                          {selectedSupplier.contactRecommendation.keyPersona}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Approach Strategy</span>
                        <div className="font-medium">
                          {selectedSupplier.contactRecommendation.approachStrategy}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => onSupplierSelect?.(selectedSupplier)}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Connect with Supplier
                </Button>
                <Button variant="outline" className="flex-1">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Company Profile
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AISupplierDiscovery;
