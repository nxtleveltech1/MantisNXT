'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { SupplierOffer } from '@/types/supplier-comparison';
import {
  Award,
  Building2,
  Check,
  Clock,
  Package,
  Star,
  TrendingDown,
} from 'lucide-react';

interface SupplierComparisonCardProps {
  offer: SupplierOffer;
  isSelected?: boolean;
  onSelect?: (offer: SupplierOffer) => void;
  showSelectButton?: boolean;
  compact?: boolean;
}

/**
 * Card component displaying a single supplier's offering for a SKU.
 * Shows price, stock, discount, lead time, and allows selection for purchasing.
 */
export function SupplierComparisonCard({
  offer,
  isSelected = false,
  onSelect,
  showSelectButton = true,
  compact = false,
}: SupplierComparisonCardProps) {
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: offer.currency || 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'strategic':
        return 'bg-violet-500/10 text-violet-600 border-violet-500/20';
      case 'preferred':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'approved':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'conditional':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStockStatus = () => {
    if (offer.stock_on_hand === null || offer.stock_on_hand === undefined) {
      return { label: 'Unknown', variant: 'outline' as const, color: 'text-muted-foreground' };
    }
    if (offer.stock_on_hand === 0) {
      return { label: 'Out of Stock', variant: 'destructive' as const, color: 'text-destructive' };
    }
    if (offer.stock_on_hand < 10) {
      return { label: 'Low Stock', variant: 'secondary' as const, color: 'text-amber-600' };
    }
    return { label: 'In Stock', variant: 'default' as const, color: 'text-emerald-600' };
  };

  const stockStatus = getStockStatus();
  const hasDiscount = offer.base_discount && offer.base_discount > 0;
  const effectivePrice = offer.cost_after_discount ?? offer.current_price;

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between rounded-lg border p-3 transition-colors',
          isSelected && 'border-primary bg-primary/5',
          offer.is_best_price && !isSelected && 'border-emerald-500/50 bg-emerald-500/5'
        )}
      >
        <div className="flex items-center gap-3">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{offer.supplier_name}</span>
              {offer.is_best_price && (
                <Badge variant="secondary" className="h-5 gap-1 text-xs">
                  <Award className="h-3 w-3" />
                  Best
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className={stockStatus.color}>{stockStatus.label}</span>
              {offer.lead_time_days && (
                <>
                  <span>•</span>
                  <span>{offer.lead_time_days}d lead</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            {hasDiscount && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground line-through">
                {formatCurrency(offer.current_price)}
              </div>
            )}
            <div className="font-semibold">{formatCurrency(effectivePrice)}</div>
          </div>
          {showSelectButton && onSelect && (
            <Button
              size="sm"
              variant={isSelected ? 'default' : 'outline'}
              onClick={() => onSelect(offer)}
              className="h-8"
            >
              {isSelected ? <Check className="h-4 w-4" /> : 'Select'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all',
        isSelected && 'ring-2 ring-primary',
        offer.is_best_price && !isSelected && 'ring-1 ring-emerald-500/50'
      )}
    >
      {/* Best Price Badge */}
      {offer.is_best_price && (
        <div className="absolute right-0 top-0">
          <div className="bg-emerald-500 px-3 py-1 text-xs font-medium text-white">
            <Award className="mr-1 inline h-3 w-3" />
            Best Price
          </div>
        </div>
      )}

      <CardContent className="p-4">
        {/* Header: Supplier Info */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{offer.supplier_name}</h4>
                {offer.is_preferred_supplier && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      </TooltipTrigger>
                      <TooltipContent>Preferred Supplier</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="flex items-center gap-2">
                {offer.supplier_code && (
                  <span className="text-xs text-muted-foreground">{offer.supplier_code}</span>
                )}
                {offer.supplier_tier && (
                  <Badge variant="outline" className={cn('h-5 text-xs', getTierColor(offer.supplier_tier))}>
                    {offer.supplier_tier}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Price Section */}
        <div className="mb-4 rounded-lg bg-muted/50 p-3">
          <div className="flex items-end justify-between">
            <div>
              {hasDiscount && (
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground line-through">
                    {formatCurrency(offer.current_price)}
                  </span>
                  <Badge variant="secondary" className="h-5 gap-1 text-xs text-emerald-600">
                    <TrendingDown className="h-3 w-3" />
                    {offer.base_discount}% off
                  </Badge>
                </div>
              )}
              <div className="text-2xl font-bold">{formatCurrency(effectivePrice)}</div>
              {offer.uom && (
                <div className="text-xs text-muted-foreground">per {offer.uom}</div>
              )}
            </div>
          </div>
        </div>

        {/* Availability Info */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          {/* Stock */}
          <div className="flex items-center gap-2">
            <Package className={cn('h-4 w-4', stockStatus.color)} />
            <div>
              <div className={cn('text-sm font-medium', stockStatus.color)}>
                {stockStatus.label}
              </div>
              {offer.stock_on_hand !== null && offer.stock_on_hand !== undefined && (
                <div className="text-xs text-muted-foreground">
                  {offer.stock_on_hand.toLocaleString()} available
                </div>
              )}
            </div>
          </div>

          {/* Lead Time */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">
                {offer.lead_time_days ? `${offer.lead_time_days} days` : '—'}
              </div>
              <div className="text-xs text-muted-foreground">Lead time</div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        {(offer.pack_size || offer.minimum_order_qty) && (
          <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {offer.pack_size && (
              <span className="rounded bg-muted px-2 py-1">Pack: {offer.pack_size}</span>
            )}
            {offer.minimum_order_qty && (
              <span className="rounded bg-muted px-2 py-1">
                MOQ: {offer.minimum_order_qty}
              </span>
            )}
          </div>
        )}

        {/* Select Button */}
        {showSelectButton && onSelect && (
          <Button
            className="w-full"
            variant={isSelected ? 'default' : 'outline'}
            onClick={() => onSelect(offer)}
          >
            {isSelected ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Selected
              </>
            ) : (
              'Select This Supplier'
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

