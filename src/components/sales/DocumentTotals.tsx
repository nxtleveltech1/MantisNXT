'use client';

interface DocumentTotalsProps {
  subtotal: number;
  totalTax: number;
  total: number;
  currency?: string;
  className?: string;
  label?: string;
}

export function DocumentTotals({ 
  subtotal, 
  totalTax, 
  total, 
  currency = 'ZAR', 
  className,
  label,
}: DocumentTotalsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className={className}>
      {label && (
        <div className="text-sm font-medium text-muted-foreground mb-2">{label}</div>
      )}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal:</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tax:</span>
          <span>{formatCurrency(totalTax)}</span>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <span>Total:</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

