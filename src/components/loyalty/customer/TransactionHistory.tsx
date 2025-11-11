/**
 * TransactionHistory - Points transaction history
 *
 * Features:
 * - Timeline view
 * - Filter by type
 * - Date range picker
 * - Search by description
 * - Transaction details popover
 * - Running balance
 * - Pagination
 *
 * API: GET /api/v1/customers/[id]/loyalty/transactions
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Download,
  Search,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ActivityFeedItem } from './shared/ActivityFeedItem';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface TransactionHistoryProps {
  customerId: string;
}

interface Transaction {
  id: string;
  transaction_type: string;
  points: number;
  description: string;
  reference_type?: string;
  reference_id?: string;
  running_balance: number;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export function TransactionHistory({ customerId }: TransactionHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [transactionType, setTransactionType] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<{
    from?: string;
    to?: string;
  }>({});

  const { data, isLoading } = useQuery({
    queryKey: [
      'loyalty-transactions',
      customerId,
      transactionType,
      dateRange,
      page,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');

      if (transactionType !== 'all') {
        params.append('transaction_type', transactionType);
      }
      if (dateRange.from) {
        params.append('from_date', dateRange.from);
      }
      if (dateRange.to) {
        params.append('to_date', dateRange.to);
      }

      const response = await fetch(
        `/api/v1/customers/${customerId}/loyalty/transactions?${params}`
      );
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
  });

  const transactions = (data?.data || []) as Transaction[];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  // Filter transactions by search query
  const filteredTransactions = transactions.filter((transaction) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      transaction.description.toLowerCase().includes(query) ||
      transaction.reference_id?.toLowerCase().includes(query)
    );
  });

  const handleExport = () => {
    // TODO: Implement CSV/PDF export
    console.log('Export transactions');
  };

  // Map transaction types to activity types
  const mapTransactionType = (type: string): unknown => {
    const typeMap: Record<string, string> = {
      earn: 'earn',
      purchase: 'purchase',
      redeem: 'redeem',
      expire: 'expire',
      referral: 'referral',
      bonus: 'bonus',
      adjustment: 'earn',
    };
    return typeMap[type] || 'earn';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Transaction History</h2>
          <p className="text-muted-foreground">
            View all your points activity
          </p>
        </div>

        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Search */}
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Transaction Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={transactionType} onValueChange={setTransactionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="earn">Earned</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="redeem">Redeemed</SelectItem>
                  <SelectItem value="expire">Expired</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Calendar className="h-4 w-4" />
                    {dateRange.from && dateRange.to
                      ? `${format(new Date(dateRange.from), 'MMM d')} - ${format(new Date(dateRange.to), 'MMM d')}`
                      : 'Select dates'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>From Date</Label>
                      <Input
                        type="date"
                        value={dateRange.from || ''}
                        onChange={(e) =>
                          setDateRange({ ...dateRange, from: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>To Date</Label>
                      <Input
                        type="date"
                        value={dateRange.to || ''}
                        onChange={(e) =>
                          setDateRange({ ...dateRange, to: e.target.value })
                        }
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange({})}
                      className="w-full"
                    >
                      Clear
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Loading transactions...</p>
          </div>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center space-y-4">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="font-medium">No transactions found</p>
              <p className="text-sm text-muted-foreground">
                Your transaction history will appear here
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              {filteredTransactions.map((transaction, index) => (
                <div key={transaction.id}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full text-left hover:bg-muted/50 rounded-lg transition-colors">
                        <ActivityFeedItem
                          type={mapTransactionType(transaction.transaction_type)}
                          points={transaction.points}
                          description={transaction.description}
                          date={transaction.created_at}
                        />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="start">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold mb-1">
                            Transaction Details
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {transaction.description}
                          </p>
                        </div>

                        <Separator />

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Type</span>
                            <span className="font-medium capitalize">
                              {transaction.transaction_type}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Points</span>
                            <span
                              className={cn(
                                'font-semibold',
                                transaction.points > 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              )}
                            >
                              {transaction.points > 0 ? '+' : ''}
                              {transaction.points.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Balance After
                            </span>
                            <span className="font-medium">
                              {transaction.running_balance.toLocaleString()}
                            </span>
                          </div>
                          {transaction.reference_id && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Reference
                              </span>
                              <span className="font-mono text-xs">
                                {transaction.reference_id}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date</span>
                            <span>
                              {format(
                                new Date(transaction.created_at),
                                'MMM d, yyyy h:mm a'
                              )}
                            </span>
                          </div>
                        </div>

                        {transaction.metadata &&
                          Object.keys(transaction.metadata).length > 0 && (
                            <>
                              <Separator />
                              <div className="space-y-2 text-sm">
                                <p className="text-muted-foreground font-medium">
                                  Additional Info
                                </p>
                                {Object.entries(transaction.metadata).map(
                                  ([key, value]) => (
                                    <div
                                      key={key}
                                      className="flex justify-between"
                                    >
                                      <span className="text-muted-foreground capitalize">
                                        {key.replace(/_/g, ' ')}
                                      </span>
                                      <span>{String(value)}</span>
                                    </div>
                                  )
                                )}
                              </div>
                            </>
                          )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {index < filteredTransactions.length - 1 && (
                    <Separator className="my-1" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1} to{' '}
            {Math.min(page * 20, total)} of {total} transactions
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
