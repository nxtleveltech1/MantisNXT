'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Upload, 
  X, 
  FileText, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileUp,
  Tag,
  Type,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

import { DocustoreSidebar } from '@/components/docustore-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { useAuth } from '@/lib/auth/auth-context';

export default function NewDocumentPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    document_type: '',
    tags: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

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

      // Step 1: Create document record
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
        throw new Error(createResult.error || 'Failed to create document record');
      }

      const documentId = createResult.data.id;

      // Step 2: Upload initial version
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);

      const uploadResponse = await fetch(`/api/v1/docustore/${documentId}/versions`, {
        method: 'POST',
        body: uploadFormData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success) {
        // We could technically delete the record here if upload fails, 
        // but it's better to let the user retry from the detail page.
        throw new Error(uploadResult.error || 'Record created, but file upload failed');
      }

      toast.success('Document created and file uploaded successfully');
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
      
      // Auto-fill title if empty
      if (!formData.title) {
        const nameWithoutExt = file.name.split('.').slice(0, -1).join('.');
        setFormData(prev => ({ ...prev, title: nameWithoutExt }));
      }
      
      setSelectedFile(file);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-violet-600"></div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <DocustoreSidebar />
      <SidebarInset>
        <AppHeader title="Upload Document" subtitle="Add a new file to DocuStore" />
        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="max-w-4xl mx-auto w-full space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Upload New Document</h1>
                <p className="text-sm text-muted-foreground">Add a new file to the platform repository</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main Form Area */}
              <div className="md:col-span-2 space-y-6">
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" /> General Information
                    </CardTitle>
                    <CardDescription>Enter the basic metadata for this document</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Document Title <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={e => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g. Q4 Financial Report"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Provide a brief overview of the document contents..."
                        rows={5}
                        className="resize-none"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileUp className="h-4 w-4 text-primary" /> File Upload
                    </CardTitle>
                    <CardDescription>Select the file you wish to store in the cloud</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div 
                      className={`relative border-2 border-dashed rounded-xl p-10 transition-all text-center
                        ${selectedFile ? 'border-primary/50 bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/30 hover:bg-muted/50'}`}
                    >
                      {selectedFile ? (
                        <div className="space-y-4 animate-in zoom-in-95 duration-200">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary">
                            <FileText className="h-8 w-8" />
                          </div>
                          <div>
                            <p className="font-bold text-lg">{selectedFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type || 'Unknown type'}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full px-6"
                            onClick={() => setSelectedFile(null)}
                          >
                            <X className="h-3 w-3 mr-2" /> Replace File
                          </Button>
                        </div>
                      ) : (
                        <label
                          htmlFor="file"
                          className="flex flex-col items-center justify-center cursor-pointer space-y-4"
                        >
                          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                            <Upload className="h-8 w-8" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-lg font-semibold">Click to browse or drag and drop</p>
                            <p className="text-sm text-muted-foreground">
                              Any file format supported (PDF, Excel, Images, etc.)
                            </p>
                          </div>
                          <Badge variant="outline" className="font-normal text-muted-foreground">
                            Maximum file size: 50MB
                          </Badge>
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
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar / Additional Settings */}
              <div className="space-y-6">
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" /> Categorization
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="document_type" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Document Type</Label>
                      <Input
                        id="document_type"
                        value={formData.document_type}
                        onChange={e => setFormData({ ...formData, document_type: e.target.value })}
                        placeholder="e.g. Invoice, Contract"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tags" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tags</Label>
                      <Input
                        id="tags"
                        value={formData.tags}
                        onChange={e => setFormData({ ...formData, tags: e.target.value })}
                        placeholder="Comma separated tags..."
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Used for advanced filtering and grouping
                      </p>
                    </div>
                  </CardContent>
                  <Separator />
                  <CardFooter className="flex flex-col items-stretch gap-3 pt-6">
                    <Button type="submit" className="w-full shadow-md" disabled={loading || uploading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {uploading ? 'Uploading Content...' : 'Initialising Record...'}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Create & Upload
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-muted-foreground"
                      onClick={() => router.back()}
                      disabled={loading}
                    >
                      Discard Changes
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="border-none shadow-sm bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
                      <AlertCircle className="h-4 w-4" /> Platform Note
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Documents are stored in the platform's encrypted cloud database. 
                      Automatic versioning and audit trails will be active immediately upon upload.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </form>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
