'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  FileText, 
  Download, 
  Trash2, 
  Eye, 
  RefreshCw, 
  Filter, 
  MoreVertical, 
  FileStack,
  Tags,
  Calendar,
  Archive,
  CheckSquare,
  Square
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import JSZip from 'jszip';

interface Document {
  id: string;
  title: string;
  description?: string | null;
  document_type?: string | null;
  tags: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export default function DocuStorePage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('document_type', typeFilter);
      params.set('limit', '100');

      const response = await fetch(`/api/v1/docustore?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setDocuments(result.data);
      } else {
        toast.error(result.error || 'Failed to fetch documents');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Error loading documents');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDocuments();
    setRefreshing(false);
    toast.success('Documents refreshed');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/v1/docustore/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDocuments(prev => prev.filter(d => d.id !== id));
        toast.success('Document deleted successfully');
      } else {
        toast.error('Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Error deleting document');
    }
  };

  const toggleSelectAll = () => {
    if (selectedDocs.length === documents.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(documents.map(d => d.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedDocs(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedDocs.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedDocs.length} documents?`)) return;
    
    toast.promise(
      Promise.all(selectedDocs.map(id => 
        fetch(`/api/v1/docustore/${id}`, { method: 'DELETE' })
      )),
      {
        loading: 'Deleting documents...',
        success: () => {
          setDocuments(prev => prev.filter(d => !selectedDocs.includes(d.id)));
          setSelectedDocs([]);
          return 'Documents deleted successfully';
        },
        error: 'Failed to delete some documents',
      }
    );
  };

  const handleBulkExport = async () => {
    if (selectedDocs.length === 0) return;
    
    const zip = new JSZip();
    const folder = zip.folder("docustore-export");
    
    toast.loading(`Preparing export for ${selectedDocs.length} documents...`);
    
    try {
      for (const id of selectedDocs) {
        const doc = documents.find(d => d.id === id);
        if (!doc) continue;
        
        // Fetch document detail to get current version
        const response = await fetch(`/api/v1/docustore/${id}`);
        const result = await response.json();
        
        if (result.success && result.data.current_version) {
          const downloadResponse = await fetch(`/api/v1/docustore/${id}/download?type=current`);
          if (downloadResponse.ok) {
            const blob = await downloadResponse.blob();
            folder?.file(`${doc.title}_${result.data.current_version.original_filename}`, blob);
          }
        }
      }
      
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `docustore-export-${new Date().toISOString().split('T')[0]}.zip`;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
      
      toast.dismiss();
      toast.success('Export completed successfully');
      setSelectedDocs([]);
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to export documents');
      console.error(error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocuments();
  };

  const documentTypes = useMemo(() => {
    const types = new Set(documents.map(d => d.document_type).filter(Boolean));
    return Array.from(types) as string[];
  }, [documents]);

  return (
    <AppLayout title="DocuStore" breadcrumbs={[{ label: 'DocuStore' }]}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">DocuStore</h1>
            <p className="text-muted-foreground mt-1">
              Centralized platform document storage and management
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => router.push('/docustore/new')} size="sm" className="bg-primary shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </div>
        </div>

        {/* Filters & Actions Card */}
        <Card className="border-none shadow-sm bg-muted/30">
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, description or tags..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground flex items-center">
                    <Filter className="h-3 w-3 mr-1" /> Status:
                  </span>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px] h-9 bg-background">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                      <SelectItem value="deleted">Deleted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground flex items-center">
                    <FileStack className="h-3 w-3 mr-1" /> Type:
                  </span>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[150px] h-9 bg-background">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {documentTypes.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" size="sm" variant="secondary" className="h-9 px-4">
                  Apply Filters
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Bulk Actions Bar */}
        {selectedDocs.length > 0 && (
          <div className="flex items-center justify-between p-3 px-4 bg-primary/5 border border-primary/20 rounded-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3 text-sm font-medium">
              <Badge variant="default" className="rounded-full px-2">
                {selectedDocs.length}
              </Badge>
              <span>Documents Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8" onClick={handleBulkExport}>
                <Download className="h-4 w-4 mr-2" />
                Export Selected
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
              <DropdownMenuSeparator className="h-4 w-px bg-primary/20" />
              <Button variant="ghost" size="sm" className="h-8" onClick={() => setSelectedDocs([])}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Documents Content */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="pb-0 pt-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">Repository Documents</CardTitle>
              <div className="text-sm text-muted-foreground">
                Showing {documents.length} entries
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 mt-4">
            {loading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-20 px-4 bg-muted/10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground opacity-50" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No documents found</h3>
                <p className="text-muted-foreground max-w-xs mx-auto mb-6">
                  {searchTerm || statusFilter !== 'active' || typeFilter !== 'all' 
                    ? "Try adjusting your filters to find what you're looking for." 
                    : "Your document repository is currently empty. Start by uploading your first document."}
                </p>
                <Button
                  variant="outline"
                  onClick={() => router.push('/docustore/new')}
                  className="shadow-sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Your First Document
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[40px] pl-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={toggleSelectAll}
                        >
                          {selectedDocs.length === documents.length ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead className="font-semibold">Title & Description</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Tags</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Modified</TableHead>
                      <TableHead className="text-right pr-4 font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map(doc => (
                      <TableRow key={doc.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="pl-4">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => toggleSelect(doc.id)}
                          >
                            {selectedDocs.includes(doc.id) ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4 opacity-50" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <div
                              className="font-medium text-primary hover:underline cursor-pointer flex items-center gap-2"
                              onClick={() => router.push(`/docustore/${doc.id}`)}
                            >
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              {doc.title}
                            </div>
                            {doc.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">
                                {doc.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {doc.document_type ? (
                            <Badge variant="secondary" className="capitalize font-normal">
                              {doc.document_type}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap max-w-[200px]">
                            {doc.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="outline" className="text-[10px] h-5 py-0 px-1.5 bg-background">
                                {tag}
                              </Badge>
                            ))}
                            {doc.tags.length > 2 && (
                              <Badge variant="outline" className="text-[10px] h-5 py-0 px-1.5 bg-background">
                                +{doc.tags.length - 2}
                              </Badge>
                            )}
                            {doc.tags.length === 0 && (
                              <span className="text-muted-foreground italic text-xs">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={doc.status === 'active' ? 'success' : doc.status === 'archived' ? 'warning' : 'destructive'}
                            className="capitalize rounded-full text-[10px] font-medium"
                          >
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            {formatDate(doc.updated_at || doc.created_at)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex justify-end items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => router.push(`/docustore/${doc.id}`)}
                              title="View Detail"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => router.push(`/docustore/${doc.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download Current
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive Document
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDelete(doc.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Permanently
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
