'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  Upload,
  Download,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useCompetitors,
  useCreateCompetitor,
  useUpdateCompetitor,
  useDeleteCompetitor,
  type CompetitorProfile,
} from '@/hooks/api/useCompetitiveIntel';
import { useToast } from '@/hooks/use-toast';

const competitorSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  website_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  notes: z.string().optional(),
  default_currency: z.string().optional(),
});

type CompetitorFormData = z.infer<typeof competitorSchema>;

export default function CompetitorsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<CompetitorProfile | null>(null);
  const [deletingCompetitor, setDeletingCompetitor] = useState<CompetitorProfile | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const { data: competitors, isLoading } = useCompetitors();
  const createMutation = useCreateCompetitor();
  const updateMutation = useUpdateCompetitor();
  const deleteMutation = useDeleteCompetitor();

  const form = useForm<CompetitorFormData>({
    resolver: zodResolver(competitorSchema),
    defaultValues: {
      company_name: '',
      website_url: '',
      notes: '',
      default_currency: 'USD',
    },
  });

  React.useEffect(() => {
    if (editingCompetitor) {
      form.reset({
        company_name: editingCompetitor.company_name || '',
        website_url: editingCompetitor.website_url || '',
        notes: editingCompetitor.notes || '',
        default_currency: editingCompetitor.default_currency || 'USD',
      });
    } else {
      form.reset({
        company_name: '',
        website_url: '',
        notes: '',
        default_currency: 'USD',
      });
    }
  }, [editingCompetitor, form]);

  const handleOpenDialog = (competitor?: CompetitorProfile) => {
    if (competitor) {
      setEditingCompetitor(competitor);
    } else {
      setEditingCompetitor(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCompetitor(null);
    form.reset();
  };

  const onSubmit = async (data: CompetitorFormData) => {
    try {
      if (editingCompetitor) {
        await updateMutation.mutateAsync({
          id: editingCompetitor.competitor_id,
          data: {
            ...data,
            website_url: data.website_url || undefined,
          },
        });
        toast({
          title: 'Success',
          description: 'Competitor updated successfully',
        });
      } else {
        await createMutation.mutateAsync({
          ...data,
          website_url: data.website_url || undefined,
        });
        toast({
          title: 'Success',
          description: 'Competitor created successfully',
        });
      }
      handleCloseDialog();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save competitor',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingCompetitor) return;
    try {
      await deleteMutation.mutateAsync({
        id: deletingCompetitor.competitor_id,
      });
      toast({
        title: 'Success',
        description: 'Competitor deleted successfully',
      });
      setDeletingCompetitor(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete competitor',
        variant: 'destructive',
      });
    }
  };

  const handleBulkExport = async () => {
    try {
      const response = await fetch('/api/v1/pricing-intel/competitors/bulk-export?format=excel');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `competitors-export-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({
        title: 'Success',
        description: 'Competitors exported successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to export competitors',
        variant: 'destructive',
      });
    }
  };

  const handleBulkImport = async () => {
    if (!importFile) return;

    setImporting(true);
    try {
      // Parse Excel/CSV file
      const XLSX = await import('xlsx');
      const arrayBuffer = await importFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Map to competitor format
      const competitors = data.map((row: unknown) => {
        const r = row as Record<string, unknown>;
        return {
          company_name: String(r['Company Name'] || r['company_name'] || ''),
          website_url: String(r['Website URL'] || r['website_url'] || ''),
          default_currency: String(r['Currency'] || r['default_currency'] || 'USD'),
          notes: String(r['Notes'] || r['notes'] || ''),
        };
      }).filter(c => c.company_name);

      // Bulk import
      const response = await fetch('/api/v1/pricing-intel/competitors/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitors }),
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error.message);
      }

      toast({
        title: 'Success',
        description: `Imported ${result.data.successful} competitors successfully`,
      });

      setShowBulkImport(false);
      setImportFile(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import competitors',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppLayout
      title="Competitor Management"
      breadcrumbs={[
        { label: 'Pricing Optimization', href: '/pricing-optimization' },
        { label: 'Competitive Intelligence', href: '/pricing-optimization/competitive-intelligence' },
        { label: 'Competitors' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Competitor Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage competitor profiles and data sources
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBulkExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" onClick={() => setShowBulkImport(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Competitor
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Competitors</CardTitle>
            <CardDescription>
              Track and monitor your competitors' pricing and products
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : competitors && competitors.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competitors.map((competitor) => (
                    <TableRow key={competitor.competitor_id}>
                      <TableCell className="font-medium">
                        {competitor.company_name}
                      </TableCell>
                      <TableCell>
                        {competitor.website_url ? (
                          <a
                            href={competitor.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            {competitor.website_url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {competitor.default_currency || 'USD'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={competitor.is_active !== false ? 'default' : 'secondary'}>
                          {competitor.is_active !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(competitor)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingCompetitor(competitor)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No competitors yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first competitor to start tracking pricing intelligence
                </p>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Competitor
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCompetitor ? 'Edit Competitor' : 'Add Competitor'}
              </DialogTitle>
              <DialogDescription>
                {editingCompetitor
                  ? 'Update competitor information'
                  : 'Add a new competitor to track pricing and products'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter company name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="default_currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Currency</FormLabel>
                      <FormControl>
                        <Input placeholder="USD" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes about this competitor"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      editingCompetitor ? 'Update' : 'Create'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deletingCompetitor} onOpenChange={() => setDeletingCompetitor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Competitor</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {deletingCompetitor?.company_name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setDeletingCompetitor(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Import Dialog */}
        <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Bulk Import Competitors</DialogTitle>
              <DialogDescription>
                Upload a CSV or Excel file to import multiple competitors at once
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center"
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
                    setImportFile(file);
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                {importFile ? (
                  <div className="space-y-2">
                    <FileSpreadsheet className="h-12 w-12 text-green-600 mx-auto" />
                    <div className="font-medium">{importFile.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {(importFile.size / 1024).toFixed(2)} KB
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setImportFile(null)}>
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Drag and drop a CSV or Excel file here, or click to browse
                    </p>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      id="bulk-import-file"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('bulk-import-file')?.click()}
                    >
                      Select File
                    </Button>
                  </div>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Expected columns:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Company Name (required)</li>
                  <li>Website URL (optional)</li>
                  <li>Currency (optional, defaults to USD)</li>
                  <li>Notes (optional)</li>
                </ul>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBulkImport(false);
                    setImportFile(null);
                  }}
                  disabled={importing}
                >
                  Cancel
                </Button>
                <Button onClick={handleBulkImport} disabled={!importFile || importing}>
                  {importing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

