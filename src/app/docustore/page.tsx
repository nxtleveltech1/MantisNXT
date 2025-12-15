'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, FileText, Download, Trash2, Eye, RefreshCw } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

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
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      params.set('status', 'active');
      params.set('limit', '100');

      const response = await fetch(`/api/v1/docustore?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setDocuments(result.data);
      } else {
        toast.error('Failed to fetch documents');
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocuments();
  };

  return (
    <AppLayout title="DocuStore" breadcrumbs={[{ label: 'DocuStore' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">DocuStore</h1>
            <p className="text-muted-foreground mt-1">
              Document warehouse and management system
            </p>
          </div>
          <Button onClick={() => router.push('/docustore/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Search Documents</CardTitle>
            <CardDescription>Find documents by title, description, or tags</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" variant="outline">
                <Search className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>
              {documents.length} document{documents.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No documents found</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push('/docustore/new')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Your First Document
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map(doc => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div>
                          <div
                            className="font-medium cursor-pointer hover:underline"
                            onClick={() => router.push(`/docustore/${doc.id}`)}
                          >
                            {doc.title}
                          </div>
                          {doc.description && (
                            <div className="text-sm text-muted-foreground mt-1 line-clamp-1">
                              {doc.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.document_type ? (
                          <Badge variant="outline">{doc.document_type}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {doc.tags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {doc.tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{doc.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={doc.status === 'active' ? 'default' : 'secondary'}
                        >
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(doc.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/docustore/${doc.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

