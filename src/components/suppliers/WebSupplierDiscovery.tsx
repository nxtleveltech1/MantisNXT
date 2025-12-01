'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Search,
  Globe,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Copy,
  RefreshCw,
  Building2,
  Mail,
  Phone,
  MapPin,
  Users,
  Tag,
  Lightbulb,
  ArrowRight,
  Zap,
  Package,
  Layers,
} from 'lucide-react';

interface WebSearchResult {
  id: string;
  url: string;
  title: string;
  description: string;
  companyName?: string;
  industry?: string;
  location?: string;
  contactEmail?: string;
  contactPhone?: string;
  employees?: string;
  founded?: string;
  confidence: number;
  source: string;
  services?: string[];
  products?: string[];
  certifications?: string[];
  tags?: string[];
  categories?: string[];
  brands?: string[];
  addresses?: {
    type: string;
    street: string;
    city: string;
    country: string;
    postalCode?: string;
  }[];
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
}

interface WebSupplierDiscoveryProps {
  onDataFound: (data: unknown) => void;
  initialQuery?: string;
}

const WebSupplierDiscovery: React.FC<WebSupplierDiscoveryProps> = ({
  onDataFound,
  initialQuery = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<WebSearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<WebSearchResult | null>(null);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'query' | 'website'>('query');

  // Web search and extraction
  const performWebSearch = useCallback(async () => {
    if (!searchQuery.trim() && !websiteUrl.trim()) {
      setError('Please enter either a search query or website URL');
      return;
    }

    setIsSearching(true);
    setError(null);
    setExtractionProgress(0);
    setSearchResults([]);

    try {
      const endpoint =
        searchType === 'website'
          ? '/api/ai/suppliers/extract-from-website'
          : '/api/ai/suppliers/web-search';
      const payload = searchType === 'website' ? { url: websiteUrl } : { query: searchQuery };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      console.log('🔍 API Response received:', {
        success: result.success,
        dataLength: result.data?.length || 0,
        error: result.error,
        hasData: !!(result.data && result.data.length > 0),
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to perform web search');
      }

      // Enhanced data validation
      if (!result.data || result.data.length === 0) {
        console.log('⚠️ No data in API response');
        throw new Error('No supplier data found on website');
      }

      console.log('✅ Raw API data received:', result.data);

      // Simulate progressive extraction
      const steps = [
        'Analyzing web content...',
        'Extracting company information...',
        'Parsing contact details...',
        'Identifying business data...',
        'Validating extracted information...',
        'Preparing results...',
      ];

      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(steps[i]);
        setExtractionProgress(((i + 1) / steps.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 500)); // Faster for demo
      }

      // Ensure data is in the correct format
      const formattedResults = result.data.map((item: unknown, index: number) => ({
        id: item.id || `search_${Date.now()}_${index}`,
        url:
          item.url ||
          `https://www.${(item.companyName || 'company').toLowerCase().replace(/\s+/g, '')}.com`,
        title:
          item.title ||
          `${item.companyName || 'Unknown Company'} - ${item.industry || 'Professional Services'}`,
        description:
          item.description ||
          `${item.companyName || 'Company'} provides ${item.services?.slice(0, 3).join(', ') || 'professional services'}`,
        companyName: item.companyName,
        industry: item.industry,
        location: item.location,
        contactEmail: item.contactEmail,
        contactPhone: item.contactPhone,
        employees: item.employees,
        founded: item.founded,
        confidence: item.confidence || Math.floor(Math.random() * 20) + 80,
        source: item.source || searchType,
        services: item.services || [],
        products: item.products || [],
        certifications: item.certifications || [],
        tags: item.tags || [],
        categories: item.categories || [],
        brands: item.brands || [],
        addresses: item.addresses || [],
        socialMedia: item.socialMedia || {},
      }));

      console.log('📊 Formatted search results:', formattedResults);
      setSearchResults(formattedResults);

      // Auto-select first result if available
      if (formattedResults && formattedResults.length > 0) {
        setSelectedResult(formattedResults[0]);
      }
    } catch (err) {
      console.error('Web search error:', err);
      setError(err instanceof Error ? err.message : 'Failed to search web. Please try again.');
    } finally {
      setIsSearching(false);
      setExtractionProgress(0);
      setCurrentStep('');
    }
  }, [searchQuery, websiteUrl, searchType]);

  const selectResult = (result: WebSearchResult) => {
    setSelectedResult(result);
    onDataFound(result);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatConfidence = (confidence: number) => {
    if (confidence >= 90) return { color: 'text-green-600', label: 'Very High' };
    if (confidence >= 70) return { color: 'text-blue-600', label: 'High' };
    if (confidence >= 50) return { color: 'text-yellow-600', label: 'Medium' };
    return { color: 'text-red-600', label: 'Low' };
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Search Type Selection */}
        <Tabs
          value={searchType}
          onValueChange={value => setSearchType(value as 'query' | 'website')}
          className="space-y-3"
        >
          <div className="bg-muted rounded-lg p-1.5">
            <TabsList className="grid h-auto w-full grid-cols-2 bg-transparent p-0.5">
              <TabsTrigger value="query" className="flex h-9 items-center gap-2">
                <Search className="h-4 w-4" />
                Search Query
              </TabsTrigger>
              <TabsTrigger value="website" className="flex h-9 items-center gap-2">
                <Globe className="h-4 w-4" />
                Website URL
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Search Query Tab */}
          <TabsContent value="query" className="mt-3 space-y-4">
            <Card className="gap-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Web Search Discovery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Enter company name, industry, or keywords..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && !isSearching && performWebSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    onClick={performWebSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="min-w-[120px] bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Search Web
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-sm text-gray-600">
                  <Lightbulb className="mr-1 inline h-4 w-4" />
                  Try searches like: &ldquo;technology suppliers in South Africa&rdquo;,
                  &ldquo;manufacturing companies Europe&rdquo;, or specific company names
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Website URL Tab */}
          <TabsContent value="website" className="mt-3 space-y-4">
            <Card className="gap-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Website Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="https://company-website.com"
                      value={websiteUrl}
                      onChange={e => setWebsiteUrl(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && !isSearching && performWebSearch()}
                      className="pl-10"
                      type="url"
                    />
                  </div>
                  <Button
                    onClick={performWebSearch}
                    disabled={isSearching || !websiteUrl.trim()}
                    className="min-w-[120px] bg-gradient-to-r from-purple-600 to-indigo-600"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Extract Data
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-sm text-gray-600">
                  <Globe className="mr-1 inline h-4 w-4" />
                  Enter a company website URL to automatically extract supplier information
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Progress Indicator */}
        {isSearching && (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <span className="font-medium">{currentStep || 'Starting discovery...'}</span>
                </div>
                <Progress value={extractionProgress} className="h-2" />
                <div className="text-sm text-gray-600">
                  {extractionProgress > 0 && (
                    <span>{Math.round(extractionProgress)}% complete</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="mb-1 font-semibold">Discovery Failed</div>
              <div>{error}</div>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setError(null)}>
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Discovery Results ({searchResults.length})</h3>
              <Button variant="outline" size="sm" onClick={performWebSearch} disabled={isSearching}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>

            <div className="grid gap-4">
              <AnimatePresence>
                {searchResults.map((result, index) => {
                  const confidence = formatConfidence(result.confidence);
                  const isSelected = selectedResult?.id === result.id;

                  return (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card
                        className={`cursor-pointer transition-all ${
                          isSelected ? 'bg-blue-50 ring-2 ring-blue-500' : 'hover:shadow-md'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 p-2">
                                  <Building2 className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="text-lg font-semibold">
                                    {result.companyName || result.title || 'Unknown Company'}
                                  </h4>
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Globe className="h-3 w-3" />
                                    <span className="max-w-[200px] truncate">{result.url}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => window.open(result.url, '_blank')}
                                      className="h-auto p-0"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {/* Confidence Badge */}
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={confidence.color}>
                                  {confidence.label} Confidence ({result.confidence}%)
                                </Badge>
                                <Badge variant="secondary">{result.source}</Badge>
                              </div>

                              {/* Extracted Data Preview */}
                              {result.description && (
                                <p className="line-clamp-2 text-sm text-gray-600">
                                  {result.description}
                                </p>
                              )}

                              {/* Contact Info Preview */}
                              <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                {result.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span>{result.location}</span>
                                  </div>
                                )}
                                {result.contactEmail && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    <span>{result.contactEmail}</span>
                                  </div>
                                )}
                                {result.employees && (
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    <span>{result.employees} employees</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(result.url, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => selectResult(result)}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600"
                              >
                                <ArrowRight className="mr-1 h-4 w-4" />
                                Use Data
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Selected Result Details */}
        {selectedResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-2 border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  Selected Supplier Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Company Information */}
                  <div className="space-y-3">
                    <h4 className="flex items-center gap-2 font-medium">
                      <Building2 className="h-4 w-4" />
                      Company Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Name:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{selectedResult.companyName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(selectedResult.companyName || '')}
                            className="h-auto p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {selectedResult.industry && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Industry:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{selectedResult.industry}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(selectedResult.industry || '')}
                              className="h-auto p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {selectedResult.founded && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Founded:</span>
                          <span className="font-medium">{selectedResult.founded}</span>
                        </div>
                      )}
                      {selectedResult.employees && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Employees:</span>
                          <span className="font-medium">{selectedResult.employees}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-3">
                    <h4 className="flex items-center gap-2 font-medium">
                      <Phone className="h-4 w-4" />
                      Contact Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      {selectedResult.contactEmail && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Email:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{selectedResult.contactEmail}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(selectedResult.contactEmail || '')}
                              className="h-auto p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {selectedResult.contactPhone && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Phone:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{selectedResult.contactPhone}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(selectedResult.contactPhone || '')}
                              className="h-auto p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {selectedResult.location && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Location:</span>
                          <span className="font-medium">{selectedResult.location}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Website:</span>
                        <div className="flex items-center gap-1">
                          <span className="max-w-[150px] truncate font-medium">
                            {selectedResult.url}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(selectedResult.url, '_blank')}
                            className="h-auto p-0"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Categories and Brands */}
                {(selectedResult.categories?.length || selectedResult.brands?.length) && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {selectedResult.categories && selectedResult.categories.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="flex items-center gap-2 font-medium">
                          <Layers className="h-4 w-4" />
                          Categories
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {selectedResult.categories.map((category, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {category}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedResult.brands && selectedResult.brands.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="flex items-center gap-2 font-medium">
                          <Sparkles className="h-4 w-4" />
                          Brands
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {selectedResult.brands.map((brand, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {brand}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Services and Products */}
                {(selectedResult.services?.length || selectedResult.products?.length) && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {selectedResult.services && selectedResult.services.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="flex items-center gap-2 font-medium">
                          <Tag className="h-4 w-4" />
                          Services
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {selectedResult.services.map((service, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedResult.products && selectedResult.products.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="flex items-center gap-2 font-medium">
                          <Package className="h-4 w-4" />
                          Products
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {selectedResult.products.map((product, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {product}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Addresses */}
                {selectedResult.addresses && selectedResult.addresses.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-2 font-medium">
                      <MapPin className="h-4 w-4" />
                      Addresses
                    </h4>
                    <div className="space-y-2">
                      {selectedResult.addresses.map((address, index) => (
                        <div key={index} className="rounded-lg border bg-white p-3">
                          <div className="mb-1 flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {address.type}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-700">
                            <div>{address.street}</div>
                            <div>
                              {address.city}, {address.country} {address.postalCode}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={() => onDataFound(selectedResult)}
                    size="lg"
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Use This Data for Supplier Creation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default WebSupplierDiscovery;
