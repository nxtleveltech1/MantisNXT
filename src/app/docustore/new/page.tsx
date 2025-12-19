'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, FileText } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function NewDocumentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    document_type: '',
    tags: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setLoading(true);

      // Step 1: Create document
      const createResponse = await fetch('/api/v1/docustore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          document_type: formData.document_type || undefined,
          tags: formData.tags
            ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
            : undefined,
        }),
      });

      const createResult = await createResponse.json();

      if (!createResult.success) {
        throw new Error(createResult.error || 'Failed to create document');
      }

      const documentId = createResult.data.id;

      // Step 2: Upload file version
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);

      const uploadResponse = await fetch(`/api/v1/docustore/${documentId}/versions`, {
        method: 'POST',
        body: uploadFormData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload file');
      }

      toast.success('Document created and uploaded successfully');
      router.push(`/docustore/${documentId}`);
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create document');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size exceeds 50MB limit');
        return;
      }
      setSelectedFile(file);
    }
  };

  return (
    <AppLayout
      title="Upload Document"
      breadcrumbs={[
        { label: 'DocuStore', href: '/docustore' },
        { label: 'Upload Document' },
      ]}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload New Document</CardTitle>
            <CardDescription>
              Create a new document in DocuStore and upload a file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter document title"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter document description"
                  rows={4}
                />
              </div>

              {/* Document Type */}
              <div className="space-y-2">
                <Label htmlFor="document_type">Document Type</Label>
                <Input
                  id="document_type"
                  value={formData.document_type}
                  onChange={e => setFormData({ ...formData, document_type: e.target.value })}
                  placeholder="e.g., invoice, contract, certificate"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={e => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Comma-separated tags (e.g., important, contract, 2024)"
                />
                <p className="text-sm text-muted-foreground">
                  Separate multiple tags with commas
                </p>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file">
                  File <span className="text-destructive">*</span>
                </Label>
                <div className="border-2 border-dashed rounded-lg p-6">
                  {selectedFile ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label
                      htmlFor="file"
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-sm font-medium">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Max file size: 50MB
                      </p>
                    </label>
                  )}
                  <input
                    id="file"
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="*/*"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || uploading}>
                  {uploading ? 'Uploading...' : loading ? 'Creating...' : 'Upload Document'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}








