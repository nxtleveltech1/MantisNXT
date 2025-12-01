'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  data: any;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExtractionPreviewDialog({ isOpen, data, onConfirm, onCancel }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!data) return null;

  const { summary = {}, products = [] } = data;
  const validRows = products.filter((p: any) => p.is_valid).length;
  const invalidRows = products.filter((p: any) => !p.is_valid).length;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Preview Extracted Data</span>
            <Badge>{Math.round((summary.confidence || 0) * 100)}% Confidence</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4 rounded-lg bg-gray-50 p-3">
            <div>
              <div className="text-xs text-gray-500">Total Rows</div>
              <div className="font-semibold">{products.length}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Valid</div>
              <div className="font-semibold text-green-600">{validRows}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Invalid</div>
              <div className="font-semibold text-red-600">{invalidRows}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Confidence</div>
              <div className="font-semibold">{Math.round((summary.confidence || 0) * 100)}%</div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Valid Rows (Sample)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="border-b">
                    <tr>
                      <th className="p-2 text-left">Row</th>
                      <th className="p-2 text-left">SKU</th>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products
                      .filter((p: any) => p.is_valid)
                      .slice(0, 5)
                      .map((product: any) => (
                        <tr key={product.row_num} className="border-b">
                          <td className="p-2">{product.row_num}</td>
                          <td className="p-2 font-mono">{product.supplier_sku}</td>
                          <td className="p-2">{product.name}</td>
                          <td className="p-2">
                            {product.currency} {product.price}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {invalidRows > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  Invalid Rows
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {invalidRows} row(s) have validation errors and will be skipped.
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setIsSubmitting(true);
              onConfirm();
            }}
            disabled={isSubmitting || validRows === 0}
          >
            {isSubmitting ? 'Processing...' : `Continue with ${validRows} rows`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
