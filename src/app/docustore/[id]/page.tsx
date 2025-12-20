'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  FileText,
  Link as LinkIcon,
  Plus,
  Trash2,
  History,
  Tag,
  Calendar,
  User,
  Clock,
  ExternalLink,
  FileCheck,
  FileWarning,
  Loader2,
  MoreHorizontal,
  Settings2,
  Share2,
  Archive,
  RefreshCw,
  FileCode,
  FileUp,
  FileDown
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { DocumentWithRelations, DocumentVersion, DocumentArtifact } from '@/lib/services/docustore/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params?.id as string;

  const [document, setDocument] = useState<DocumentWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingGeneratingPdf] = useState(false);
  const [editingMetadata, setEditingMetadata] = useState(false);
  const [metadataForm, setMetadataForm] = useState({
    title: '',
    description: '',
    document_type: '',
    tags: ''
  });

  useEffect(() => {
    if (documentId) {
      fetchDocument();
    }
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/docustore/${documentId}?include_relations=true`);
      const result = await response.json();

      if (result.success) {
        setDocument(result.data);
        setMetadataForm({
          title: result.data.title || '',
          description: result.data.description || '',
          document_type: result.data.document_type || '',
          tags: result.data.tags?.join(', ') || ''
        });
      } else {
        toast.error(result.error || 'Failed to fetch document');
        router.push('/docustore');
      }
    } catch (error) {
      console.error('Error fetching document:', error);
      toast.error('Error loading document');
      router.push('/docustore');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMetadata = async () => {
    try {
      const response = await fetch(`/api/v1/docustore/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: metadataForm.title,
          description: metadataForm.description,
          document_type: metadataForm.document_type,
          tags: metadataForm.tags.split(',').map(t => t.trim()).filter(Boolean)
        })
      });
      
      const result = await response.json();
      if (result.success) {
        toast.success('Metadata updated successfully');
        setDocument(prev => prev ? { ...prev, ...result.data } : null);
        setEditingMetadata(false);
      } else {
        toast.error(result.error || 'Failed to update metadata');
      }
    } catch (error) {
      toast.error('Error updating document');
    }
  };

  const handleDownload = async (type: 'current' | 'version' | 'artifact', id?: string) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('type', type);
      if (type === 'version' && id) queryParams.set('version_id', id);
      if (type === 'artifact' && id) queryParams.set('artifact_id', id);

      toast.loading('Preparing download...');
      const response = await fetch(`/api/v1/docustore/${documentId}/download?${queryParams.toString()}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        
        // Find filename
        let filename = document?.title || 'download';
        if (type === 'version' && id) {
          filename = document?.versions?.find(v => v.id === id)?.original_filename || filename;
        } else if (type === 'artifact' && id) {
          filename = document?.artifacts?.find(a => a.id === id)?.filename || filename;
        } else if (document?.current_version) {
          filename = document.current_version.original_filename;
        }
        
        a.download = filename;
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
        toast.dismiss();
        toast.success('Download started');
      } else {
        toast.dismiss();
        toast.error('Failed to download file');
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error downloading file:', error);
      toast.error('Error downloading file');
    }
  };

  const handleGeneratePdf = async () => {
    try {
      setGeneratingGeneratingPdf(true);
      toast.loading('Generating PDF record...');
      const response = await fetch(`/api/v1/docustore/${documentId}/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'docustore_record' })
      });
      
      const result = await response.json();
      if (result.success) {
        toast.dismiss();
        toast.success('PDF record generated successfully');
        fetchDocument(); // Refresh to show new artifact
      } else {
        toast.dismiss();
        toast.error(result.error || 'Failed to generate PDF');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Error generating PDF');
    } finally {
      setGeneratingGeneratingPdf(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document and all its versions?')) return;

    try {
      const response = await fetch(`/api/v1/docustore/${documentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Document deleted successfully');
        router.push('/docustore');
      } else {
        toast.error('Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Error deleting document');
    }
  };

  if (loading) {
    return (
      <AppLayout title="Loading..." breadcrumbs={[{ label: 'DocuStore', href: '/docustore' }]}>
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!document) {
    return (
      <AppLayout title="Not Found" breadcrumbs={[{ label: 'DocuStore', href: '/docustore' }]}>
        <div className="text-center py-20 bg-muted/10 rounded-lg border-2 border-dashed">
          <FileWarning className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">Document Not Found</h2>
          <p className="text-muted-foreground mb-6">The document you're looking for doesn't exist or has been removed.</p>
          <Button variant="outline" onClick={() => router.push('/docustore')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to DocuStore
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={document.title}
      breadcrumbs={[
        { label: 'DocuStore', href: '/docustore' },
        { label: document.title },
      ]}
    >
      <div className="max-w-6xl mx-auto space-y-6 pb-10">
        {/* Top Navigation & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/docustore')} className="-ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Repository
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleGeneratePdf} disabled={generatingPdf}>
              {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCode className="mr-2 h-4 w-4" />}
              Generate Record PDF
            </Button>
            {document.current_version && (
              <Button size="sm" onClick={() => handleDownload('current')} className="shadow-sm">
                <Download className="mr-2 h-4 w-4" />
                Download Current
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Document Options</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setEditingMetadata(true)}>
                  <Tag className="mr-2 h-4 w-4" /> Edit Metadata
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="mr-2 h-4 w-4" /> Share Link
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Archive className="mr-2 h-4 w-4" /> Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Document Card */}
          <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 pb-6">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold">{document.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {document.document_type || 'untyped'}
                      </Badge>
                      <Badge variant={document.status === 'active' ? 'default' : 'secondary'} className="capitalize text-[10px]">
                        {document.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {document.description && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Description</Label>
                  <p className="text-sm leading-relaxed">{document.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-2">
                <div className="space-y-1.5">
                  <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold flex items-center">
                    <Calendar className="h-3 w-3 mr-1" /> Created
                  </span>
                  <p className="text-xs font-medium">{formatDate(document.created_at)}</p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold flex items-center">
                    <RefreshCw className="h-3 w-3 mr-1" /> Updated
                  </span>
                  <p className="text-xs font-medium">{formatDate(document.updated_at)}</p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold flex items-center">
                    <History className="h-3 w-3 mr-1" /> Versions
                  </span>
                  <p className="text-xs font-medium">{document.versions?.length || 0}</p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold flex items-center">
                    <FileCheck className="h-3 w-3 mr-1" /> Artifacts
                  </span>
                  <p className="text-xs font-medium">{document.artifacts?.length || 0}</p>
                </div>
              </div>

              {document.tags && document.tags.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Tags</Label>
                  <div className="flex gap-2 flex-wrap">
                    {document.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[10px] h-6">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Version/Stats Card */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileUp className="h-4 w-4 text-primary" /> Current Version
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {document.current_version ? (
                <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded bg-background border flex items-center justify-center">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" title={document.current_version.original_filename}>
                        {document.current_version.original_filename}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        v{document.current_version.version_number} • {(document.current_version.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <Button variant="outline" size="sm" className="h-8 text-[10px]" onClick={() => handleDownload('current')}>
                      <Download className="h-3 w-3 mr-1.5" /> Download
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-[10px]" onClick={() => router.push(`/docustore/${documentId}/new-version`)}>
                      <Plus className="h-3 w-3 mr-1.5" /> New Version
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 bg-muted/20 rounded-lg border border-dashed">
                  <p className="text-xs text-muted-foreground mb-3">No files uploaded yet</p>
                  <Button size="sm" className="h-8 text-[10px]" onClick={() => router.push(`/docustore/${documentId}/new-version`)}>
                    <FileUp className="h-3 w-3 mr-1.5" /> Upload Initial File
                  </Button>
                </div>
              )}

              <Separator />
              
              <div className="space-y-3">
                <Label className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Ownership</Label>
                <div className="flex items-center gap-2 text-xs">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px]">
                    <User className="h-3 w-3" />
                  </div>
                  <span className="font-medium">System Administrator</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for detailed info */}
        <Tabs defaultValue="versions" className="space-y-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="versions" className="text-xs data-[state=active]:bg-background">
              <History className="mr-2 h-3.5 w-3.5" />
              Version History ({document.versions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="links" className="text-xs data-[state=active]:bg-background">
              <LinkIcon className="mr-2 h-3.5 w-3.5" />
              Entity Links ({document.links?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="artifacts" className="text-xs data-[state=active]:bg-background">
              <FileCheck className="mr-2 h-3.5 w-3.5" />
              Artifacts ({document.artifacts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs data-[state=active]:bg-background">
              <Clock className="mr-2 h-3.5 w-3.5" />
              Audit Log
            </TabsTrigger>
          </TabsList>

          {/* Versions Tab */}
          <TabsContent value="versions">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-0">
                <CardTitle className="text-lg">Document Versions</CardTitle>
                <CardDescription>Comprehensive timeline of all file updates</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pt-4">
                {document.versions && document.versions.length > 0 ? (
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-[100px] pl-6">Version</TableHead>
                        <TableHead>Filename</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Uploaded By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {document.versions.map(version => (
                        <TableRow key={version.id} className={version.id === document.current_version_id ? "bg-primary/5" : ""}>
                          <TableCell className="pl-6 font-mono text-xs">
                            <div className="flex items-center gap-2">
                              <Badge variant={version.id === document.current_version_id ? "default" : "outline"} className="h-5 py-0 px-1.5">
                                v{version.version_number}
                              </Badge>
                              {version.id === document.current_version_id && (
                                <span className="text-[10px] text-primary font-bold uppercase">Current</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-medium">{version.original_filename}</TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">
                            {(version.file_size / 1024 / 1024).toFixed(2)} MB
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px] h-4 py-0 uppercase">
                              {version.storage_provider}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[10px]">
                            {version.uploaded_by || 'System'}
                          </TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">
                            {formatDateTime(version.created_at)}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDownload('version', version.id)}
                              title="Download this version"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileUp className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No versions uploaded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Links Tab */}
          <TabsContent value="links">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Platform Entity Links</CardTitle>
                    <CardDescription>Connections to other modules and records</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-[10px]">
                    <Plus className="mr-1.5 h-3 w-3" /> Add Entity Link
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-0 pt-4">
                {document.links && document.links.length > 0 ? (
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="pl-6">Entity Type</TableHead>
                        <TableHead>Entity ID</TableHead>
                        <TableHead>Link Context</TableHead>
                        <TableHead>Date Added</TableHead>
                        <TableHead className="text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {document.links.map(link => (
                        <TableRow key={link.id}>
                          <TableCell className="pl-6">
                            <Badge variant="outline" className="capitalize text-[10px] h-5">
                              {link.entity_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-[10px] text-primary hover:underline cursor-pointer">
                            <div className="flex items-center gap-1">
                              {link.entity_id}
                              <ExternalLink className="h-2.5 w-2.5" />
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{link.link_type}</TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">{formatDate(link.created_at)}</TableCell>
                          <TableCell className="text-right pr-6">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <LinkIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No entity links defined</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Artifacts Tab */}
          <TabsContent value="artifacts">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-0">
                <CardTitle className="text-lg">Generated Artifacts</CardTitle>
                <CardDescription>Official PDF records and system exports</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pt-4">
                {document.artifacts && document.artifacts.length > 0 ? (
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="pl-6">Artifact Type</TableHead>
                        <TableHead>Filename</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Generated By</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {document.artifacts.map(artifact => (
                        <TableRow key={artifact.id}>
                          <TableCell className="pl-6">
                            <Badge variant="secondary" className="uppercase text-[9px] h-5">
                              {artifact.artifact_type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-medium">{artifact.filename}</TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">
                            {(artifact.file_size / 1024 / 1024).toFixed(2)} MB
                          </TableCell>
                          <TableCell className="text-[10px]">{artifact.generated_by || 'System'}</TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">{formatDateTime(artifact.created_at)}</TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDownload('artifact', artifact.id)}
                              title="Download artifact"
                            >
                              <FileDown className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileCode className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No artifacts generated yet</p>
                    <Button variant="outline" size="sm" className="mt-4 h-8" onClick={handleGeneratePdf} disabled={generatingPdf}>
                      Generate Record PDF
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Audit Trail</CardTitle>
                <CardDescription>Immutable log of document lifecycle events</CardDescription>
              </CardHeader>
              <CardContent>
                {document.events && document.events.length > 0 ? (
                  <div className="relative space-y-0 before:absolute before:inset-0 before:left-[11px] before:h-full before:w-0.5 before:bg-muted ml-1">
                    {document.events.map((event, idx) => (
                      <div key={event.id} className="relative flex items-start gap-4 pb-8 last:pb-0">
                        <div className={`mt-1.5 h-6 w-6 rounded-full border-4 border-background z-10 flex items-center justify-center
                          ${idx === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`} 
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="uppercase text-[9px] font-bold h-5">
                              {event.event_type.replace('_', ' ')}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDateTime(event.created_at)}
                            </span>
                          </div>
                          <div className="text-xs font-medium">
                            {event.event_type === 'uploaded' ? 'Document created and initial version uploaded' :
                             event.event_type === 'version_created' ? `New version v${(event.metadata as any)?.version_number || ''} added` :
                             event.event_type === 'pdf_generated' ? 'System artifact PDF generated' :
                             `Action performed by ${event.user_id || 'System'}`}
                          </div>
                          {Object.keys(event.metadata).length > 0 && event.event_type !== 'version_created' && (
                            <div className="text-[10px] text-muted-foreground bg-muted/30 p-2 rounded mt-1 overflow-x-auto font-mono">
                              {JSON.stringify(event.metadata)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No activity history available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Metadata Dialog */}
        <Dialog open={editingMetadata} onOpenChange={setEditingMetadata}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Document Metadata</DialogTitle>
              <DialogDescription>
                Update the core information for this document record.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input 
                  id="edit-title" 
                  value={metadataForm.title} 
                  onChange={e => setMetadataForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Document Type</Label>
                <Input 
                  id="edit-type" 
                  placeholder="e.g. invoice, contract, certificate"
                  value={metadataForm.document_type} 
                  onChange={e => setMetadataForm(prev => ({ ...prev, document_type: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Description</Label>
                <Textarea 
                  id="edit-desc" 
                  rows={3}
                  value={metadataForm.description} 
                  onChange={e => setMetadataForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tags">Tags (comma separated)</Label>
                <Input 
                  id="edit-tags" 
                  value={metadataForm.tags} 
                  onChange={e => setMetadataForm(prev => ({ ...prev, tags: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingMetadata(false)}>Cancel</Button>
              <Button onClick={handleUpdateMetadata}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}


