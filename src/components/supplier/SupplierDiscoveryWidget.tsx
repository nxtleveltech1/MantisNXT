/**
 * Supplier Discovery Widget
 * Auto-populate supplier forms with AI-discovered information
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, RefreshCcw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useSupplierDiscovery } from '@/hooks/useSupplierDiscovery';
import { DiscoveredSupplierData } from '@/lib/supplier-discovery/types';

interface SupplierDiscoveryWidgetProps {
  onSupplierFound?: (data: DiscoveredSupplierData) => void;
  onAutoFill?: (data: DiscoveredSupplierData) => void;
  className?: string;
}

export function SupplierDiscoveryWidget({
  onSupplierFound,
  onAutoFill,
  className = ''
}: SupplierDiscoveryWidgetProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const {
    isLoading,
    data,
    error,
    processingTime,
    sourcesUsed,
    confidence,
    discoverSupplier,
    refreshSupplier,
    clearState
  } = useSupplierDiscovery();

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    await discoverSupplier({
      supplierName: searchTerm.trim()
    });
  };

  const handleRefresh = async () => {
    if (!searchTerm.trim()) return;

    await refreshSupplier({
      supplierName: searchTerm.trim()
    });
  };

  const handleAutoFill = () => {
    if (data && onAutoFill) {
      onAutoFill(data);
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.85) return 'bg-green-500';
    if (confidence >= 0.7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.85) return 'High Confidence';
    if (confidence >= 0.7) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            AI Supplier Discovery
          </CardTitle>
          <CardDescription>
            Automatically find and populate supplier information using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="supplier-search">Supplier Name</Label>
              <Input
                id="supplier-search"
                placeholder="Enter supplier name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                disabled={isLoading}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={handleSearch}
                disabled={isLoading || !searchTerm.trim()}
                className="min-w-[100px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Discover
                  </>
                )}
              </Button>
              {data && (
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  size="sm"
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {data && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Supplier information discovered successfully!
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant="secondary"
                    className={`${getConfidenceColor(confidence)} text-white`}
                  >
                    {getConfidenceLabel(confidence)} ({Math.round(confidence * 100)}%)
                  </Badge>
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {processingTime}ms
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {data && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Discovered Information</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? 'Hide Details' : 'Show Details'}
                </Button>
                <Button onClick={handleAutoFill} size="sm">
                  Auto-Fill Form
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Company Name</Label>
                <p className="text-sm text-gray-700">{data.supplierName}</p>
              </div>
              {data.registrationNumber && (
                <div>
                  <Label className="text-sm font-medium">Registration Number</Label>
                  <p className="text-sm text-gray-700">{data.registrationNumber}</p>
                </div>
              )}
              {data.contactInfo.phone && (
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <p className="text-sm text-gray-700">{data.contactInfo.phone}</p>
                </div>
              )}
              {data.contactInfo.email && (
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-gray-700">{data.contactInfo.email}</p>
                </div>
              )}
              {data.contactInfo.website && (
                <div>
                  <Label className="text-sm font-medium">Website</Label>
                  <a
                    href={data.contactInfo.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {data.contactInfo.website}
                  </a>
                </div>
              )}
              {data.businessInfo.industry && (
                <div>
                  <Label className="text-sm font-medium">Industry</Label>
                  <p className="text-sm text-gray-700">{data.businessInfo.industry}</p>
                </div>
              )}
            </div>

            {/* Address */}
            {(data.address.street || data.address.city) && (
              <div>
                <Label className="text-sm font-medium">Address</Label>
                <p className="text-sm text-gray-700">
                  {[
                    data.address.street,
                    data.address.city,
                    data.address.province,
                    data.address.postalCode,
                    data.address.country
                  ].filter(Boolean).join(', ')}
                </p>
              </div>
            )}

            {/* Compliance */}
            {(data.compliance.beeRating || data.compliance.vatNumber) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.compliance.beeRating && (
                  <div>
                    <Label className="text-sm font-medium">BEE Rating</Label>
                    <p className="text-sm text-gray-700">{data.compliance.beeRating}</p>
                  </div>
                )}
                {data.compliance.vatNumber && (
                  <div>
                    <Label className="text-sm font-medium">VAT Number</Label>
                    <p className="text-sm text-gray-700">{data.compliance.vatNumber}</p>
                  </div>
                )}
              </div>
            )}

            {/* Detailed Information */}
            {showDetails && (
              <div className="border-t pt-4 space-y-4">
                <div>
                  <Label className="text-sm font-medium">Confidence Scores</Label>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(data.confidence.individual).map(([field, score]) => (
                      <div key={field} className="text-center">
                        <div className="text-xs text-gray-500 capitalize">
                          {field.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div className="text-sm font-medium">
                          {Math.round(score * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {sourcesUsed.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">
                      Data Sources ({sourcesUsed.length})
                    </Label>
                    <div className="mt-2 space-y-1">
                      {sourcesUsed.map((source, index) => (
                        <div key={index} className="text-xs text-gray-600">
                          {source}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">Discovery Metadata</Label>
                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    <div>Discovered: {new Date(data.discoveredAt).toLocaleString()}</div>
                    <div>Processing Time: {processingTime}ms</div>
                    <div>Overall Confidence: {Math.round(confidence * 100)}%</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}