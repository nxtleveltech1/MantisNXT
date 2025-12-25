// UPDATE: [2025-12-25] Enhanced with multiple providers, ETAs, cost breakdowns, fastest/cheapest indicators

'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  Truck, 
  Zap, 
  DollarSign,
  CalendarDays,
  Package,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DeliveryCostQuote } from '@/types/logistics';

interface CostComparisonProps {
  quotes: DeliveryCostQuote[];
  selectedQuoteId?: string;
  onQuoteSelect: (quoteId: string) => void;
}

export function CostComparison({ quotes, selectedQuoteId, onQuoteSelect }: CostComparisonProps) {
  // Determine cheapest and fastest quotes
  const { sortedQuotes, cheapestId, fastestId } = useMemo(() => {
    if (quotes.length === 0) {
      return { sortedQuotes: [], cheapestId: null, fastestId: null };
    }

    const sorted = [...quotes].sort((a, b) => a.cost - b.cost);
    const cheapest = sorted[0];
    
    // Find fastest based on estimated_delivery_days (lower is faster)
    const fastest = [...quotes].sort((a, b) => {
      const daysA = a.estimated_delivery_days ?? 999;
      const daysB = b.estimated_delivery_days ?? 999;
      return daysA - daysB;
    })[0];

    return {
      sortedQuotes: sorted,
      cheapestId: cheapest?.id,
      fastestId: fastest?.id !== cheapest?.id ? fastest?.id : null,
    };
  }, [quotes]);

  if (quotes.length === 0) {
    return null;
  }

  const formatCurrency = (amount: number, currency = 'ZAR') => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDeliveryTime = (days?: number, eta?: string) => {
    if (eta) return eta;
    if (days === undefined || days === null) return 'Unknown';
    if (days === 0) return 'Today';
    if (days <= 0.5) return 'Same day';
    if (days === 1) return 'Tomorrow';
    return `${Math.ceil(days)} days`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Delivery Options
        </CardTitle>
        <CardDescription>
          {quotes.length} option{quotes.length !== 1 ? 's' : ''} available - select your preferred courier
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedQuotes.map((quote) => {
            const isSelected = quote.id === selectedQuoteId;
            const isCheapest = quote.id === cheapestId;
            const isFastest = quote.id === fastestId;

            return (
              <div
                key={quote.id}
                className={cn(
                  'relative p-4 border rounded-lg cursor-pointer transition-all duration-200',
                  isSelected 
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                    : 'hover:border-muted-foreground/30 hover:bg-muted/30'
                )}
                onClick={() => onQuoteSelect(quote.id)}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {/* Header with provider name and badges */}
                  <div className="flex items-center gap-2 flex-wrap pr-8">
                    {/* Provider logo placeholder */}
                    {quote.courier_image ? (
                      <img 
                        src={quote.courier_image} 
                        alt={quote.courier_name || 'Courier'} 
                        className="h-8 w-8 object-contain rounded"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <h4 className="font-semibold">
                        {quote.courier_name || quote.service_name || 'Courier Service'}
                      </h4>
                      {quote.service_code && (
                        <p className="text-xs text-muted-foreground">{quote.service_code}</p>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex gap-1.5">
                      {isCheapest && (
                        <Badge 
                          variant="outline" 
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                        >
                          <DollarSign className="h-3 w-3 mr-1" />
                          Best Price
                        </Badge>
                      )}
                      {isFastest && (
                        <Badge 
                          variant="outline" 
                          className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          Fastest
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {/* Total Cost */}
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">
                        Total Cost
                      </div>
                      <div className="text-lg font-bold text-primary">
                        {formatCurrency(quote.cost, quote.currency)}
                      </div>
                    </div>

                    {/* Delivery ETA */}
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-xs uppercase tracking-wide flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Delivery
                      </div>
                      <div className="font-medium">
                        {formatDeliveryTime(quote.estimated_delivery_days, quote.delivery_eta)}
                      </div>
                      {quote.estimated_delivery_date && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(quote.estimated_delivery_date).toLocaleDateString('en-ZA', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      )}
                    </div>

                    {/* Cost Breakdown - Base */}
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">
                        Base Rate
                      </div>
                      <div className="font-medium">
                        {quote.base_cost 
                          ? formatCurrency(quote.base_cost, quote.currency) 
                          : '-'}
                      </div>
                    </div>

                    {/* Cost Breakdown - Extras */}
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">
                        Fees & VAT
                      </div>
                      <div className="font-medium">
                        {formatCurrency(
                          (quote.fuel_surcharge || 0) + 
                          (quote.insurance_cost || 0) + 
                          (quote.other_fees || 0) + 
                          (quote.vat_amount || 0),
                          quote.currency
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Cost Breakdown (visible on larger screens or when selected) */}
                  {isSelected && (quote.fuel_surcharge || quote.insurance_cost || quote.vat_amount) && (
                    <div className="pt-3 mt-3 border-t border-dashed">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        {quote.base_cost && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Base:</span>
                            <span>{formatCurrency(quote.base_cost, quote.currency)}</span>
                          </div>
                        )}
                        {quote.fuel_surcharge && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Fuel:</span>
                            <span>{formatCurrency(quote.fuel_surcharge, quote.currency)}</span>
                          </div>
                        )}
                        {quote.insurance_cost && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Insurance:</span>
                            <span>{formatCurrency(quote.insurance_cost, quote.currency)}</span>
                          </div>
                        )}
                        {quote.vat_amount && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">VAT:</span>
                            <span>{formatCurrency(quote.vat_amount, quote.currency)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pickup ETA if available */}
                  {quote.pickup_eta && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Pickup:</span> {quote.pickup_eta}
                    </div>
                  )}
                </div>

                {/* Select indicator for non-selected */}
                {!isSelected && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Footer */}
        {selectedQuoteId && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Selected delivery will be added to your quotation
              </span>
              <Badge variant="secondary" className="text-base">
                {formatCurrency(
                  sortedQuotes.find(q => q.id === selectedQuoteId)?.cost || 0
                )}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
