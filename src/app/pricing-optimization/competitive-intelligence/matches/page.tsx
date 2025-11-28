'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Edit,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Link as LinkIcon,
} from 'lucide-react';

// Mock data structure
interface ProductMatch {
  match_id: string;
  competitor_id: string;
  competitor_name: string;
  competitor_product_id: string;
  competitor_sku?: string;
  competitor_title?: string;
  competitor_url?: string;
  internal_product_id?: string;
  internal_sku?: string;
  upc?: string;
  ean?: string;
  match_confidence: number;
  match_method: 'manual' | 'upc' | 'fuzzy' | 'ai';
  status: 'pending' | 'matched' | 'rejected';
}

export default function ProductMatchesPage() {
  const [matches, setMatches] = useState<ProductMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  React.useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await fetch('/api/v1/pricing-intel/product-matches');
      if (response.ok) {
        const data = await response.json();
        setMatches(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = matches.filter((match) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      match.competitor_name?.toLowerCase().includes(searchLower) ||
      match.competitor_title?.toLowerCase().includes(searchLower) ||
      match.competitor_sku?.toLowerCase().includes(searchLower) ||
      match.internal_sku?.toLowerCase().includes(searchLower) ||
      match.upc?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="mr-1 h-3 w-3" />
            Matched
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <AlertCircle className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      manual: 'bg-blue-500',
      upc: 'bg-purple-500',
      fuzzy: 'bg-orange-500',
      ai: 'bg-pink-500',
    };
    return (
      <Badge variant="outline" className={colors[method] || ''}>
        {method.toUpperCase()}
      </Badge>
    );
  };

  return (
    <AppLayout
      title="Product Matches"
      breadcrumbs={[
        { label: 'Pricing Optimization', href: '/pricing-optimization' },
        {
          label: 'Competitive Intelligence',
          href: '/pricing-optimization/competitive-intelligence',
        },
        { label: 'Product Matches' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product Matches</h1>
            <p className="text-muted-foreground mt-1">
              Match competitor products to your internal catalog
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Product Matches</CardTitle>
                <CardDescription>
                  Manage product mappings between competitors and your catalog
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search matches..."
                  className="w-64 pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMatches.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competitor</TableHead>
                    <TableHead>Competitor Product</TableHead>
                    <TableHead>Internal Product</TableHead>
                    <TableHead>Identifiers</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMatches.map((match) => (
                    <TableRow key={match.match_id}>
                      <TableCell className="font-medium">
                        {match.competitor_name}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{match.competitor_title || 'N/A'}</div>
                          {match.competitor_sku && (
                            <div className="text-xs text-muted-foreground">
                              SKU: {match.competitor_sku}
                            </div>
                          )}
                          {match.competitor_url && (
                            <a
                              href={match.competitor_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              View <LinkIcon className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {match.internal_sku ? (
                          <div className="space-y-1">
                            <div className="font-medium">SKU: {match.internal_sku}</div>
                            {match.internal_product_id && (
                              <div className="text-xs text-muted-foreground">
                                ID: {match.internal_product_id.slice(0, 8)}...
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not matched</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          {match.upc && <div>UPC: {match.upc}</div>}
                          {match.ean && <div>EAN: {match.ean}</div>}
                          {!match.upc && !match.ean && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${match.match_confidence}%` }}
                            />
                          </div>
                          <span className="text-sm">{match.match_confidence}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{getMethodBadge(match.match_method)}</TableCell>
                      <TableCell>{getStatusBadge(match.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No product matches found</p>
                <p className="text-sm text-muted-foreground">
                  {search ? 'Try adjusting your search criteria' : 'Product matches will appear here after scraping jobs collect data'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

