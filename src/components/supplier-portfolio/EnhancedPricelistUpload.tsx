'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  FileUp,
  CheckCircle2,
  AlertCircle,
  Info,
  TrendingUp,
  Sparkles,
  ArrowRight,
  X,
  Download,
  AlertTriangle,
  Loader2,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUploadPricelist, useMergeUpload } from '@/hooks/useNeonSpp';
import { useQuery } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import type { PricelistValidationResult, MergeResult, Supplier } from '@/types/nxt-spp';

// Step definitions
const STEPS = [
  { id: 1, name: 'Upload', description: 'Select file and supplier' },
  { id: 2, name: 'Validate', description: 'Validate data quality' },
  { id: 3, name: 'Review', description: 'Review validation results' },
  { id: 4, name: 'Merge', description: 'Merge to catalog' },
  { id: 5, name: 'Complete', description: 'Upload complete' },
];

interface EnhancedPricelistUploadProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onComplete: (result: MergeResult) => Promise<void>;
  defaultSupplierId?: string;
  autoValidate?: boolean;
  autoMerge?: boolean;
}

export function EnhancedPricelistUpload({
  open = false,
  onOpenChange,
  onComplete,
  defaultSupplierId,
  autoValidate = false,
  autoMerge = false,
}: EnhancedPricelistUploadProps) {
  // Hooks
  const { toast } = useToast();
  const uploadMutation = useUploadPricelist();
  const mergeMutation = useMergeUpload();

  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [supplierId, setSupplierId] = useState<string>(defaultSupplierId || '');
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<PricelistValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationProgress, setValidationProgress] = useState(0);
  const [applyRules, setApplyRules] = useState(false);
  const [aiActive, setAiActive] = useState(false);
  const [aiInfo, setAiInfo] = useState<{
    enabled: boolean;
    defaultProvider: string;
    enableFallback: boolean;
  } | null>(null);
  const [events, setEvents] = useState<
    Array<{ action: string; status: string; started_at: string; finished_at?: string }>
  >([]);
  const [es, setEs] = useState<EventSource | null>(null);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('transformation');
  const [ruleOrder, setRuleOrder] = useState(0);
  const [ruleBlocking, setRuleBlocking] = useState(false);
  const [ruleJson, setRuleJson] = useState('{}');
  const [nlInstruction, setNlInstruction] = useState('');
  const [supplierSearchOpen, setSupplierSearchOpen] = useState(false);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  // Selection integration removed from NXT-SPP workflow

  // Normalize validation result to ensure errors and warnings are always arrays
  const normalizeValidationResult = (validation: any): PricelistValidationResult | null => {
    try {
      if (!validation) return null;

      // Handle nested structure from agent route
      if (validation.totals) {
        const errorsCount =
          typeof validation.totals.errors === 'number'
            ? validation.totals.errors
            : Array.isArray(validation.totals.errors)
              ? validation.totals.errors.length
              : 0;
        const warningsCount =
          typeof validation.totals.warnings === 'number'
            ? validation.totals.warnings
            : Array.isArray(validation.totals.warnings)
              ? validation.totals.warnings.length
              : 0;

        return {
          upload_id: validation.upload_id || uploadId || '',
          status:
            validation.status ||
            (errorsCount > 0 ? 'invalid' : warningsCount > 0 ? 'warning' : 'valid'),
          total_rows: validation.totals.rows || validation.totals.total_rows || 0,
          valid_rows: validation.totals.valid || validation.totals.valid_rows || 0,
          invalid_rows: errorsCount,
          errors: Array.isArray(validation.errors) ? validation.errors : [],
          warnings: Array.isArray(validation.warnings) ? validation.warnings : [],
          summary: validation.summary || {
            new_products: 0,
            updated_prices: 0,
            discontinued_products: 0,
            unmapped_categories: 0,
          },
        };
      }

      // Handle direct validation result
      return {
        upload_id: validation.upload_id || uploadId || '',
        status: validation.status || 'valid',
        total_rows: validation.total_rows || 0,
        valid_rows: validation.valid_rows || 0,
        invalid_rows: validation.invalid_rows || 0,
        errors: Array.isArray(validation.errors) ? validation.errors : [],
        warnings: Array.isArray(validation.warnings) ? validation.warnings : [],
        summary: validation.summary || {
          new_products: 0,
          updated_prices: 0,
          discontinued_products: 0,
          unmapped_categories: 0,
        },
      };
    } catch (e) {
      console.error('Error normalizing validation result:', e, validation);
      return null;
    }
  };

  // Load suppliers query
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', 'active'],
    queryFn: async () => {
      // Use /api/suppliers with status=active filter (v3 API)
      const response = await fetch('/api/suppliers?status=active&limit=1000');
      if (!response.ok) {
        console.error('Failed to fetch suppliers:', response.status);
        throw new Error('Failed to fetch suppliers');
      }
      const data = await response.json();
      // Handle v3 API response format with pagination: {success, data, pagination}
      const supplierList =
        data.success && data.data
          ? data.data
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : [];
      // Map supplier data to match expected format (id instead of supplier_id)
      return supplierList.map((s: unknown) => ({
        ...s,
        id: s.id || s.supplier_id, // Ensure id field exists
        supplier_id: s.supplier_id || s.id, // Keep supplier_id for compatibility
        code: s.code || s.supplier_code,
        active: s.active ?? s.status === 'active',
      })) as Supplier[];
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const suppliers = Array.isArray(suppliersData) ? suppliersData : [];
  const loading = uploadMutation.isPending || mergeMutation.isPending;

  // Filter suppliers based on search query
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchQuery) return suppliers;
    const query = supplierSearchQuery.toLowerCase().trim();
    return suppliers.filter(supplier => {
      const name = (supplier.name || '').toLowerCase();
      const code = (supplier.code || '').toLowerCase();
      return name.includes(query) || code.includes(query);
    });
  }, [suppliers, supplierSearchQuery]);

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  // Selections list no longer needed here

  // Reset state
  const resetState = useCallback(() => {
    setCurrentStep(1);
    setFile(null);
    setSupplierId(defaultSupplierId || '');
    setUploadId(null);
    setValidationResult(null);
    setError(null);
    setValidationProgress(0);
    setSupplierSearchOpen(false);
    setSupplierSearchQuery('');
    uploadMutation.reset();
    mergeMutation.reset();
  }, [defaultSupplierId, uploadMutation, mergeMutation]);

  // Handle file drop
  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFileType(droppedFile)) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please upload a valid Excel (.xlsx, .xls) or CSV file');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFileType(selectedFile)) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please upload a valid Excel (.xlsx, .xls) or CSV file');
    }
  }, []);

  const isValidFileType = (file: File) => {
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];
    return validTypes.includes(file.type) || file.name.match(/\.(xlsx|xls|csv)$/i);
  };

  // Step 1: Upload file
  const handleUpload = async () => {
    if (!file || !supplierId) {
      setError('Please select both a file and a supplier');
      return;
    }

    setError(null);

    try {
      // Get supplier's default currency or fall back to ZAR
      const selectedSupplier = suppliers.find(s => s.id === supplierId);
      const currency =
        selectedSupplier?.default_currency || (selectedSupplier as unknown)?.currency || 'ZAR';

      const uploadRes = await uploadMutation.mutateAsync({
        file,
        supplier_id: supplierId,
        filename: file.name,
        currency: currency,
        allow_ai_fallback: aiInfo?.enableFallback ?? true,
      });
      const newUploadId = uploadRes?.upload_id;
      if (!newUploadId) {
        throw new Error('Upload failed: No upload ID returned');
      }
      setUploadId(newUploadId);
      if (uploadRes?.validation) {
        const normalized = normalizeValidationResult(uploadRes.validation);
        if (normalized) {
          setValidationResult(normalized);
          setCurrentStep(3);
        } else {
          setCurrentStep(2);
        }
      } else {
        setCurrentStep(2);
      }
      setAiActive(true);
      try {
        if (es) {
          es.close();
          setEs(null);
        }
        const src = new EventSource(`/api/spp/events?upload_id=${newUploadId}`);
        src.addEventListener('audit', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            setEvents(prev => [
              ...prev,
              {
                action: data.action,
                status: data.status,
                started_at: data.started_at,
                finished_at: data.finished_at,
              },
            ]);
            const status = String(data.status);
            const action = String(data.action);
            const pct =
              action === 'upload'
                ? 10
                : action === 'ai_review'
                  ? status === 'completed'
                    ? 30
                    : 25
                  : action === 'extraction'
                    ? status === 'completed'
                      ? 70
                      : 60
                    : action === 'validation'
                      ? status === 'completed'
                        ? 100
                        : 90
                      : validationProgress;
            setValidationProgress(pct);
          } catch {}
        });
        setEs(src);
      } catch {}

      toast({
        title: 'Upload successful',
        description: 'Pricelist uploaded successfully',
      });

      if (autoValidate && !uploadRes.validation) {
        await handleValidate(newUploadId);
      }
    } catch (err) {
      let message = 'Upload failed';
      try {
        if (err instanceof Error) {
          message = err.message || 'Upload failed';
        } else if (typeof err === 'string') {
          message = err;
        } else if (err && typeof err === 'object' && 'message' in err) {
          message = String(err.message) || 'Upload failed';
        }
      } catch (e) {
        console.error('Error parsing error message:', e, err);
        message = 'Upload failed';
      }
      setError(message);
      toast({
        title: 'Upload failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  // Step 2: Validate
  const handleValidate = async (uploadIdToValidate?: string) => {
    const idToUse = uploadIdToValidate || uploadId;
    if (!idToUse) return;

    setError(null);
    setValidationProgress(0);

    try {
      // Simulate progressive validation
      const progressInterval = setInterval(() => {
        setValidationProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/spp/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate',
          upload_id: idToUse,
          supplier_id: supplierId,
          allow_ai_fallback: aiInfo?.enableFallback ?? true,
        }),
      });

      clearInterval(progressInterval);
      setValidationProgress(100);

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      const result = await response.json();
      const normalized = normalizeValidationResult(result?.data);
      setValidationResult(normalized);
      setCurrentStep(3);

      toast({
        title: 'Validation complete',
        description: `Validated ${result?.data?.valid_rows || 0} of ${result?.data?.total_rows || 0} rows`,
      });

      // Auto-merge if enabled and validation passed
      if (autoMerge && result?.data?.status === 'valid') {
        await handleMerge();
      }
    } catch (err) {
      let message = 'Validation failed';
      try {
        if (err instanceof Error) {
          message = err.message || 'Validation failed';
        } else if (typeof err === 'string') {
          message = err;
        } else if (err && typeof err === 'object' && 'message' in err) {
          message = String(err.message) || 'Validation failed';
        }
      } catch (e) {
        console.error('Error parsing error message:', e, err);
        message = 'Validation failed';
      }
      setError(message);
      toast({
        title: 'Validation failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadStatus = async () => {
      try {
        const res = await fetch('/api/ai/status');
        if (!res.ok) return;
        const data = await res.json();
        const info = data?.data || data;
        if (!cancelled)
          setAiInfo({
            enabled: !!info.enabled,
            defaultProvider: String(info.defaultProvider || ''),
            enableFallback: !!info.enableFallback,
          });
      } catch {}
    };
    if (open || aiActive) {
      loadStatus();
    }
    return () => {
      cancelled = true;
    };
  }, [open, aiActive]);

  // Step 4: Merge
  const handleMerge = async (skipInvalidRows?: boolean) => {
    if (!uploadId) return;

    setError(null);
    setCurrentStep(4); // Show loading state

    try {
      const result = await mergeMutation.mutateAsync(
        skipInvalidRows ? { uploadId, skipInvalidRows: true } : uploadId
      );
      setCurrentStep(5);

      toast({
        title: 'Merge successful',
        description: `Created ${result.products_created} products, updated ${result.products_updated} products`,
      });
    } catch (err) {
      let message = 'Merge failed';
      try {
        if (err instanceof Error) {
          message = err.message || 'Merge failed';
        } else if (typeof err === 'string') {
          message = err;
        } else if (err && typeof err === 'object' && 'message' in err) {
          message = String(err.message) || 'Merge failed';
        }
      } catch (e) {
        console.error('Error parsing error message:', e, err);
        message = 'Merge failed';
      }
      setError(message);
      setCurrentStep(3); // Go back to review step
      toast({
        title: 'Merge failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  // Handle close
  const handleClose = () => {
    if (currentStep === 5 && mergeMutation.data) {
      onComplete(mergeMutation.data);
    }
    onOpenChange?.(false);
    setTimeout(resetState, 300);
    if (es) {
      es.close();
      setEs(null);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file-upload">Pricelist File</Label>
              <div
                onDrop={handleFileDrop}
                onDragOver={e => e.preventDefault()}
                className={cn(
                  'rounded-lg border-2 border-dashed p-8 text-center transition-colors',
                  file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                )}
              >
                {file ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
                    <div className="font-medium">{file.name}</div>
                    <div className="text-muted-foreground text-sm">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setFile(null)}>
                      <X className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    <FileUp className="text-muted-foreground mx-auto h-12 w-12" />
                    <div className="mt-4">
                      <Label htmlFor="file-input" className="cursor-pointer">
                        <div className="text-sm font-medium text-blue-600 hover:text-blue-700">
                          Click to upload or drag and drop
                        </div>
                      </Label>
                      <Input
                        id="file-input"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <div className="text-muted-foreground mt-2 text-xs">
                        Excel (.xlsx, .xls) or CSV files only
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Supplier Selection */}
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Popover open={supplierSearchOpen} onOpenChange={setSupplierSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="supplier"
                    variant="outline"
                    role="combobox"
                    aria-expanded={supplierSearchOpen}
                    className="w-full justify-between"
                  >
                    <span className="truncate">
                      {selectedSupplier
                        ? `${selectedSupplier.name}${selectedSupplier.code ? ` (${selectedSupplier.code})` : ''}`
                        : 'Select supplier'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search suppliers by name or code..."
                      value={supplierSearchQuery}
                      onValueChange={setSupplierSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {suppliers.length === 0
                          ? 'No suppliers found'
                          : 'No suppliers match your search'}
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredSuppliers.map(supplier => (
                          <CommandItem
                            key={supplier.id}
                            value={supplier.id}
                            onSelect={() => {
                              setSupplierId(supplier.id);
                              setSupplierSearchOpen(false);
                              setSupplierSearchQuery('');
                            }}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                supplierId === supplier.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <span className="truncate">
                              {supplier.name}
                              {supplier.code && (
                                <span className="text-muted-foreground"> ({supplier.code})</span>
                              )}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="apply-rules"
                type="checkbox"
                checked={applyRules}
                onChange={e => setApplyRules(e.target.checked)}
              />
              <Label htmlFor="apply-rules">Apply active supplier rules during processing</Label>
            </div>

            {aiInfo && (
              <div className="flex items-center gap-2">
                <input
                  id="ai-fallback"
                  type="checkbox"
                  checked={aiInfo.enableFallback}
                  onChange={e => {
                    const newAiInfo = { ...aiInfo, enableFallback: e.target.checked };
                    setAiInfo(newAiInfo);
                  }}
                />
                <Label htmlFor="ai-fallback">Allow AI fallback when no rules configured</Label>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setRuleDialogOpen(true)}>
                Create Rule
              </Button>
            </div>

            {/* Currency Info */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {supplierId
                  ? (() => {
                      const selectedSupplier = suppliers.find(s => s.id === supplierId);
                      const currency =
                        selectedSupplier?.default_currency ||
                        (selectedSupplier as unknown)?.currency ||
                        'ZAR';
                      return `Prices will be imported in ${currency}. The system will automatically map columns and validate data.`;
                    })()
                  : 'Prices will be imported in ZAR (South African Rand). The system will automatically map columns and validate data.'}
              </AlertDescription>
            </Alert>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="py-8 text-center">
              <Loader2 className="mx-auto h-16 w-16 animate-spin text-blue-600" />
              <div className="mt-4 text-lg font-medium">Validating Upload...</div>
              <div className="text-muted-foreground mt-2 text-sm">
                Checking data quality and mapping fields
              </div>
              {uploadId && (
                <div className="text-muted-foreground mt-2 text-xs">
                  Upload ID: <span className="font-mono">{uploadId}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => navigator.clipboard.writeText(uploadId!)}
                  >
                    Copy
                  </Button>
                </div>
              )}
              <Progress value={validationProgress} className="mx-auto mt-4 max-w-md" />
              <div className="text-muted-foreground mt-2 text-xs">
                {validationProgress}% complete
              </div>
              {aiActive && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Badge variant="secondary">AI Agent Active</Badge>
                  {aiInfo && (
                    <span className="text-muted-foreground text-xs">
                      Provider: {aiInfo.defaultProvider}{' '}
                      {aiInfo.enableFallback ? '(fallback enabled)' : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Agent Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {events.map((ev, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded border p-2 text-xs"
                      >
                        <div className="font-medium">{ev.action}</div>
                        <Badge variant={ev.status === 'failed' ? 'destructive' : 'outline'}>
                          {ev.status}
                        </Badge>
                      </div>
                    ))}
                    {events.length === 0 && (
                      <div className="text-muted-foreground text-xs">No events yet</div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {validationResult && (
              <>
                {aiActive && (
                  <Alert>
                    <AlertDescription>
                      AI Agent processed document review, extraction, validation and rules
                      application
                    </AlertDescription>
                  </Alert>
                )}
                {uploadId && (
                  <div className="text-muted-foreground text-xs">
                    Upload ID: <span className="font-mono">{uploadId}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2"
                      onClick={() => navigator.clipboard.writeText(uploadId!)}
                    >
                      Copy
                    </Button>
                  </div>
                )}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Audit Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-32">
                      <div className="space-y-2">
                        {events.map((ev, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded border p-2 text-xs"
                          >
                            <div className="font-medium">{ev.action}</div>
                            <Badge variant={ev.status === 'failed' ? 'destructive' : 'outline'}>
                              {ev.status}
                            </Badge>
                          </div>
                        ))}
                        {events.length === 0 && (
                          <div className="text-muted-foreground text-xs">No audit events</div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-muted-foreground text-sm font-medium">
                        Total Rows
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{validationResult.total_rows}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-muted-foreground text-sm font-medium">
                        Valid Rows
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {validationResult.valid_rows}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-muted-foreground text-sm font-medium">
                        Errors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {validationResult.invalid_rows}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Validation Status */}
                <Alert
                  className={cn(
                    validationResult.status === 'valid' && 'border-green-200 bg-green-50',
                    validationResult.status === 'invalid' && 'border-red-200 bg-red-50',
                    validationResult.status === 'warning' && 'border-yellow-200 bg-yellow-50'
                  )}
                >
                  {validationResult.status === 'valid' && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  {validationResult.status === 'invalid' && (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  {validationResult.status === 'warning' && (
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  )}
                  <AlertDescription>
                    {validationResult.status === 'valid' &&
                      'All data validated successfully. Ready to merge.'}
                    {validationResult.status === 'invalid' &&
                      `Found ${(validationResult.errors || []).length} errors that must be fixed before merging.`}
                    {validationResult.status === 'warning' &&
                      `Validation passed with ${(validationResult.warnings || []).length} warnings.`}
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  {uploadId && (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!uploadId) return;
                        try {
                          const res = await fetch('/api/spp/agent', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'apply_rules_and_validate',
                              upload_id: uploadId,
                              supplier_id: supplierId,
                              allow_ai_fallback: aiInfo?.enableFallback ?? true,
                            }),
                          });
                          if (!res.ok) throw new Error('Failed to queue rule processing');
                          toast({ title: 'Queued', description: 'Rule-based processing queued' });
                          await handleValidate(uploadId);
                        } catch (e) {
                          const message = e instanceof Error ? e.message : 'Failed to apply rules';
                          setError(message);
                          toast({
                            title: 'Apply rules failed',
                            description: message,
                            variant: 'destructive',
                          });
                        }
                      }}
                    >
                      Apply Active Rules
                    </Button>
                  )}
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 rounded-lg border p-3">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-muted-foreground text-sm">New Products</div>
                      <div className="font-medium">
                        {validationResult.summary?.new_products || 0}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border p-3">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="text-muted-foreground text-sm">Price Updates</div>
                      <div className="font-medium">
                        {validationResult.summary?.updated_prices || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Errors */}
                {(validationResult.errors || []).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        Validation Errors ({(validationResult.errors || []).length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {(validationResult.errors || []).slice(0, 10).map((error, idx) => (
                            <div
                              key={idx}
                              className="rounded border border-red-200 bg-red-50 p-2 text-sm"
                            >
                              <span className="font-medium">Row {error.row_num}:</span>{' '}
                              {error.message}
                              {error.field && (
                                <span className="text-muted-foreground">
                                  {' '}
                                  (field: {error.field})
                                </span>
                              )}
                            </div>
                          ))}
                          {(validationResult.errors || []).length > 10 && (
                            <div className="text-muted-foreground py-2 text-center text-sm">
                              + {(validationResult.errors || []).length - 10} more errors
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                      <Button variant="outline" size="sm" className="mt-3">
                        <Download className="mr-2 h-4 w-4" />
                        Download Error Report
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Warnings */}
                {(validationResult.warnings || []).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        Warnings ({(validationResult.warnings || []).length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {(validationResult.warnings || []).slice(0, 5).map((warning, idx) => (
                            <div
                              key={idx}
                              className="rounded border border-yellow-200 bg-yellow-50 p-2 text-sm"
                            >
                              <span className="font-medium">Row {warning.row_num}:</span>{' '}
                              {warning.message}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="py-8 text-center">
              <Loader2 className="mx-auto h-16 w-16 animate-spin text-blue-600" />
              <div className="mt-4 text-lg font-medium">Merging to Catalog...</div>
              <div className="text-muted-foreground mt-2 text-sm">
                Creating supplier products and updating price history
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            {mergeMutation.data && (
              <>
                <div className="py-6 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </div>
                  <div className="mt-4 text-lg font-medium">Upload Complete!</div>
                  <div className="text-muted-foreground mt-2 text-sm">
                    Successfully merged pricelist to catalog
                  </div>
                </div>

                {/* Merge Statistics */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-muted-foreground text-sm font-medium">
                        Products Created
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {mergeMutation.data.products_created}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-muted-foreground text-sm font-medium">
                        Products Updated
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {mergeMutation.data.products_updated}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-muted-foreground text-sm font-medium">
                        Prices Updated
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {mergeMutation.data.prices_updated}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Next Steps */}
                <Alert>
                  <ArrowRight className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Next Step:</strong> Review updated products in the catalog. This upload
                    updated pricing and created any missing products.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Toaster richColors position="top-right" />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-auto">
          <DialogHeader>
            <DialogTitle>Upload Supplier Pricelist</DialogTitle>
            <DialogDescription>
              The single canonical system for uploading all supplier pricelists
            </DialogDescription>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="py-4">
            <div className="flex items-center justify-between">
              {STEPS.map((step, idx) => (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full font-medium transition-colors',
                        currentStep > step.id && 'bg-green-600 text-white',
                        currentStep === step.id && 'bg-blue-600 text-white',
                        currentStep < step.id && 'bg-gray-200 text-gray-600'
                      )}
                    >
                      {currentStep > step.id ? <CheckCircle2 className="h-6 w-6" /> : step.id}
                    </div>
                    <div className="mt-2 text-center text-xs font-medium">{step.name}</div>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={cn(
                        'mx-2 h-1 flex-1 transition-colors',
                        currentStep > step.id ? 'bg-green-600' : 'bg-gray-200'
                      )}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step Content */}
          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex justify-between border-t pt-4">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              {currentStep === 5 ? 'Close' : 'Cancel'}
            </Button>

            <div className="flex gap-2">
              {currentStep === 1 && (
                <Button onClick={handleUpload} disabled={!file || !supplierId || loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload & Validate
                </Button>
              )}
              {currentStep === 3 && validationResult && (
                <>
                  {validationResult.status === 'invalid' ? (
                    <>
                      <Button variant="outline" onClick={() => setCurrentStep(1)}>
                        Fix & Re-upload
                      </Button>
                      <Button onClick={() => handleMerge(true)} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Proceed with {validationResult.valid_rows} of {validationResult.total_rows}
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => handleMerge(false)} disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Merge to Catalog
                    </Button>
                  )}
                </>
              )}
              {currentStep === 5 && (
                <Button onClick={handleClose}>
                  Close
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Supplier Rule</DialogTitle>
            <DialogDescription>Generate and save a rule before uploading.</DialogDescription>
          </DialogHeader>
          {ruleError && (
            <Alert variant="destructive">
              <AlertDescription>{ruleError}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={ruleName} onChange={e => setRuleName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={ruleType} onValueChange={setRuleType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="validation">validation</SelectItem>
                  <SelectItem value="transformation">transformation</SelectItem>
                  <SelectItem value="approval">approval</SelectItem>
                  <SelectItem value="notification">notification</SelectItem>
                  <SelectItem value="enforcement">enforcement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input
                type="number"
                value={ruleOrder}
                onChange={e => setRuleOrder(parseInt(e.target.value || '0'))}
              />
            </div>
            <div className="space-y-2">
              <Label>Blocking</Label>
              <Button
                variant={ruleBlocking ? 'default' : 'outline'}
                onClick={() => setRuleBlocking(v => !v)}
              >
                {ruleBlocking ? 'Yes' : 'No'}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Natural-language Instruction</Label>
            <Textarea
              rows={6}
              value={nlInstruction}
              onChange={e => setNlInstruction(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Rule Config (JSON)</Label>
            <Textarea rows={8} value={ruleJson} onChange={e => setRuleJson(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  setRuleError(null);
                  if (!supplierId) {
                    throw new Error('Select supplier first');
                  }
                  if (!nlInstruction || nlInstruction.length < 10) {
                    throw new Error('Enter natural-language instruction');
                  }
                  const res = await fetch('/api/suppliers/nlp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ supplier_id: supplierId, instruction: nlInstruction }),
                  });
                  const data = await res.json();
                  if (!data.success) throw new Error(data.error || 'Failed to synthesize rule');
                  setRuleJson(JSON.stringify(data.data, null, 2));
                } catch (e) {
                  setRuleError(e instanceof Error ? e.message : 'Failed to synthesize rule');
                }
              }}
            >
              Generate with AI
            </Button>
            <Button
              onClick={async () => {
                try {
                  setRuleError(null);
                  if (!supplierId) {
                    throw new Error('Select supplier first');
                  }
                  const parsed = JSON.parse(ruleJson);
                  const body = {
                    supplier_id: supplierId,
                    rule_name: ruleName || 'Generated Rule',
                    rule_type: ruleType,
                    trigger_event: 'pricelist_upload',
                    execution_order: ruleOrder,
                    rule_config: parsed,
                    is_blocking: ruleBlocking,
                  };
                  const res = await fetch(`/api/suppliers/${supplierId}/rules`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                  });
                  if (!res.ok) {
                    const t = await res.json();
                    throw new Error(t.error || 'Failed to save rule');
                  }
                  setRuleDialogOpen(false);
                } catch (e) {
                  setRuleError(e instanceof Error ? e.message : 'Failed to save rule');
                }
              }}
            >
              Save Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
