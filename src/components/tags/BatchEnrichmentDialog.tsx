'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface BatchEnrichmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productIds: string[];
  onComplete?: () => void;
}

export function BatchEnrichmentDialog({
  open,
  onOpenChange,
  productIds,
  onComplete,
}: BatchEnrichmentDialogProps) {
  const [isEnriching, setIsEnriching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [applyChanges, setApplyChanges] = useState(false);
  const [webResearchEnabled, setWebResearchEnabled] = useState(true);
  const [results, setResults] = useState<{ success: number; failed: number }>({
    success: 0,
    failed: 0,
  });

  const handleEnrich = async () => {
    if (productIds.length === 0) {
      toast.error('No products selected');
      return;
    }

    setIsEnriching(true);
    setProgress(0);
    setResults({ success: 0, failed: 0 });

    try {
      const response = await fetch('/api/tags/enrich/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds,
          applyChanges,
          webResearchEnabled,
        }),
      });

      if (!response.ok) {
        // Handle HTTP errors
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If response is not JSON, use status text
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.success) {
        setProgress(100);
        setResults({ success: data.count || 0, failed: productIds.length - (data.count || 0) });
        toast.success(`Enriched ${data.count || 0} product(s) successfully`);
        if (onComplete) {
          onComplete();
        }
        setTimeout(() => {
          onOpenChange(false);
        }, 2000);
      } else {
        setResults({ success: 0, failed: productIds.length });
        toast.error(data.message || 'Failed to enrich products');
      }
    } catch (error) {
      setResults({ success: 0, failed: productIds.length });
      const errorMessage = error instanceof Error ? error.message : 'Failed to enrich products';
      toast.error(errorMessage);
      console.error('Enrichment error:', error);
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Batch Product Enrichment
          </DialogTitle>
          <DialogDescription>
            Enrich {productIds.length} product(s) with AI: correct names, generate descriptions, and
            suggest tags
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="batch-apply-changes"
                checked={applyChanges}
                onCheckedChange={checked => setApplyChanges(checked === true)}
                disabled={isEnriching}
              />
              <Label htmlFor="batch-apply-changes">Apply changes to database</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="batch-web-research"
                checked={webResearchEnabled}
                onCheckedChange={checked => setWebResearchEnabled(checked === true)}
                disabled={isEnriching}
              />
              <Label htmlFor="batch-web-research">Enable web research</Label>
            </div>
          </div>

          {isEnriching && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Enriching products...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {!isEnriching && results.success > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">
                  Successfully enriched {results.success} product(s)
                </span>
              </div>
              {results.failed > 0 && (
                <div className="mt-2 text-sm text-green-600">
                  {results.failed} product(s) failed to enrich
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isEnriching}>
            Cancel
          </Button>
          <Button onClick={handleEnrich} disabled={isEnriching || productIds.length === 0}>
            {isEnriching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enriching...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Start Enrichment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
