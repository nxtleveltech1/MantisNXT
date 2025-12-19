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
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { DocumentWithRelations } from '@/lib/services/docustore/types';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params?.id as string;

  const [document, setDocument] = useState<DocumentWithRelations | null>(null);
  const [loading, setLoading] = useState(true);

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
      } else {
        toast.error('Failed to fetch document');
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

  const handleDownload = async (type: 'current' | 'version' | 'artifact', id?: string) => {
    try {
      const params = new URLSearchParams();
      params.set('type', type);
      if (type === 'version' && id) params.set('version_id', id);
      if (type === 'artifact' && id) params.set('artifact_id', id);

      const response = await fetch(`/api/v1/docustore/${documentId}/download?${params.toString()}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = document?.title || 'download';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Download started');
      } else {
        toast.error('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Error downloading file');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document?')) return;

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
        <div className="text-center py-8 text-muted-foreground">Loading document...</div>
      </AppLayout>
    );
  }

  if (!document) {
    return (
      <AppLayout title="Not Found" breadcrumbs={[{ label: 'DocuStore', href: '/docustore' }]}>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Document not found</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/docustore')}>
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
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.push('/docustore')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            {document.current_version && (
              <Button onClick={() => handleDownload('current')}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}
            <Button variant="outline" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Document Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{document.title}</CardTitle>
                {document.description && (
                  <CardDescription className="mt-2">{document.description}</CardDescription>
                )}
              </div>
              <Badge variant={document.status === 'active' ? 'default' : 'secondary'}>
                {document.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {document.document_type && (
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{document.document_type}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{formatDate(document.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Updated</p>
                <p className="font-medium">{formatDate(document.updated_at)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Versions</p>
                <p className="font-medium">{document.versions?.length || 0}</p>
              </div>
            </div>

            {document.tags && document.tags.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Tags</p>
                <div className="flex gap-2 flex-wrap">
                  {document.tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="versions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="versions">
              <FileText className="mr-2 h-4 w-4" />
              Versions ({document.versions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="links">
              <LinkIcon className="mr-2 h-4 w-4" />
              Links ({document.links?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="artifacts">
              <FileText className="mr-2 h-4 w-4" />
              Artifacts ({document.artifacts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="mr-2 h-4 w-4" />
              History ({document.events?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Versions Tab */}
          <TabsContent value="versions">
            <Card>
              <CardHeader>
                <CardTitle>Document Versions</CardTitle>
                <CardDescription>
                  All uploaded versions of this document
                </CardDescription>
              </CardHeader>
              <CardContent>
                {document.versions && document.versions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Version</TableHead>
                        <TableHead>Filename</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {document.versions.map(version => (
                        <TableRow key={version.id}>
                          <TableCell>
                            <Badge variant="outline">v{version.version_number}</Badge>
                            {version.id === document.current_version_id && (
                              <Badge variant="default" className="ml-2">
                                Current
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {version.original_filename}
                          </TableCell>
                          <TableCell>
                            {(version.file_size / 1024 / 1024).toFixed(2)} MB
                          </TableCell>
                          <TableCell>{formatDateTime(version.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload('version', version.id)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No versions uploaded yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Links Tab */}
          <TabsContent value="links">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Entity Links</CardTitle>
                    <CardDescription>
                      Documents linked to other platform entities
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Link
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {document.links && document.links.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entity Type</TableHead>
                        <TableHead>Entity ID</TableHead>
                        <TableHead>Link Type</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {document.links.map(link => (
                        <TableRow key={link.id}>
                          <TableCell>
                            <Badge variant="outline">{link.entity_type}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {link.entity_id}
                          </TableCell>
                          <TableCell>{link.link_type}</TableCell>
                          <TableCell>{formatDate(link.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No links found
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Artifacts Tab */}
          <TabsContent value="artifacts">
            <Card>
              <CardHeader>
                <CardTitle>Generated Artifacts</CardTitle>
                <CardDescription>
                  PDF artifacts generated from this document
                </CardDescription>
              </CardHeader>
              <CardContent>
                {document.artifacts && document.artifacts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Filename</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Generated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {document.artifacts.map(artifact => (
                        <TableRow key={artifact.id}>
                          <TableCell>
                            <Badge variant="outline">{artifact.artifact_type}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{artifact.filename}</TableCell>
                          <TableCell>
                            {(artifact.file_size / 1024 / 1024).toFixed(2)} MB
                          </TableCell>
                          <TableCell>{formatDateTime(artifact.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload('artifact', artifact.id)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No artifacts generated yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Activity History</CardTitle>
                <CardDescription>
                  Complete audit trail of document events
                </CardDescription>
              </CardHeader>
              <CardContent>
                {document.events && document.events.length > 0 ? (
                  <div className="space-y-4">
                    {document.events.map(event => (
                      <div key={event.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{event.event_type}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDateTime(event.created_at)}
                            </span>
                          </div>
                          {event.user_id && (
                            <p className="text-sm text-muted-foreground mt-1">
                              User: {event.user_id}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No activity history
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}








