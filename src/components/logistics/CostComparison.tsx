'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Truck } from 'lucide-react';
import type { DeliveryCostQuote } from '@/types/logistics';

interface CostComparisonProps {
  quotes: DeliveryCostQuote[];
  selectedQuoteId?: string;
  onQuoteSelect: (quoteId: string) => void;
}

export function CostComparison({ quotes, selectedQuoteId, onQuoteSelect }: CostComparisonProps) {
  if (quotes.length === 0) {
    return null;
  }

  // Sort quotes by cost
  const sortedQuotes = [...quotes].sort((a, b) => a.cost - b.cost);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Cost Comparison</CardTitle>
        <CardDescription>Compare quotes from different courier providers</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedQuotes.map((quote, index) => {
            const isSelected = quote.id === selectedQuoteId;
            const isCheapest = index === 0;

            return (
              <div
                key={quote.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  isSelected ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => onQuoteSelect(quote.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">
                        {quote.courier_provider_id ? `Provider ${quote.courier_provider_id}` : 'Unknown Provider'}
                      </h4>
                      {isCheapest && (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          Best Price
                        </Badge>
                      )}
                      {isSelected && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                          Selected
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Cost</div>
                        <div className="font-bold text-lg">{quote.currency} {quote.cost.toFixed(2)}</div>
                      </div>
                      {quote.estimated_delivery_days !== undefined && (
                        <div>
                          <div className="text-gray-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Est. Delivery
                          </div>
                          <div className="font-medium">
                            {quote.estimated_delivery_days === 0.5
                              ? 'Same day'
                              : quote.estimated_delivery_days === 1
                                ? '1 day'
                                : `${quote.estimated_delivery_days} days`}
                          </div>
                        </div>
                      )}
                      {quote.base_cost && (
                        <div>
                          <div className="text-gray-600">Base Cost</div>
                          <div className="font-medium">{quote.currency} {quote.base_cost.toFixed(2)}</div>
                        </div>
                      )}
                      {quote.fuel_surcharge && (
                        <div>
                          <div className="text-gray-600">Fuel Surcharge</div>
                          <div className="font-medium">{quote.currency} {quote.fuel_surcharge.toFixed(2)}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ml-4">
                    {isSelected ? (
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Button size="sm" variant="outline">
                        Select
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}




