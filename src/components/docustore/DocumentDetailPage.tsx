'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Download,
  Share2,
  Trash2,
  Edit,
  Eye,
  FileText,
  Users,
  Link2,
  Clock,
  User,
} from 'lucide-react';
import { SigningStatusBadge } from './SigningStatusBadge';
import { ShareDialog } from './ShareDialog';
import { PermissionsDialog } from './PermissionsDialog';
import { DocumentPreview } from './DocumentPreview';
import { SigningWorkflowDialog } from './SigningWorkflowDialog';
import type { DocumentWithRelations } from '@/lib/services/docustore/types';

interface DocumentDetailPageProps {
  document: DocumentWithRelations;
}

export function DocumentDetailPage({ document: initialDocument }: DocumentDetailPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [signingWorkflowDialogOpen, setSigningWorkflowDialogOpen] = useState(false);

  const { data: document, isLoading } = useQuery({
    queryKey: ['document', initialDocument.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/docustore/${initialDocument.id}?include_relations=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }
      const result = await response.json();
      return result.data;
    },
    initialData: initialDocument,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/docustore/${document.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
    },
    onSuccess: () => {
      toast.success('Document deleted');
      router.push('/docustore');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete document');
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!document) {
    return (
      <Alert>
        <AlertDescription>Document not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{document.title}</h1>
              <SigningStatusBadge
                status={(document.metadata as any)?.signing_status || 'draft'}
              />
            </div>
            {document.description && (
              <p className="text-muted-foreground">{document.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Created: {format(new Date(document.created_at), 'PPP')}
              </span>
              {document.updated_at !== document.created_at && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Updated: {format(new Date(document.updated_at), 'PPP')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewDialogOpen(true)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareDialogOpen(true)}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/docustore/${document.id}/edit`)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm('Are you sure you want to delete this document?')) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="signing">Signing</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Document Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <p className="mt-1">{document.document_type || 'General'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <p className="mt-1">
                  <Badge variant="outline">{document.status}</Badge>
                </p>
              </div>
              {document.tags && document.tags.length > 0 && (
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Tags</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {document.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="signing" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Signing Workflow</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSigningWorkflowDialogOpen(true)}
              >
                Create Workflow
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              No signing workflow configured for this document.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Document Versions</h3>
            {document.versions && document.versions.length > 0 ? (
              <div className="space-y-2">
                {document.versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">Version {version.version_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(version.created_at), 'PPP p')}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No versions available</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="links" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Entity Links</h3>
            {document.links && document.links.length > 0 ? (
              <div className="space-y-2">
                {document.links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{link.entity_type}</p>
                      <p className="text-sm text-muted-foreground">{link.entity_id}</p>
                    </div>
                    <Badge variant="outline">{link.link_type}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No entity links</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Audit Trail</h3>
            {document.events && document.events.length > 0 ? (
              <div className="space-y-2">
                {document.events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{event.event_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.created_at), 'PPP p')}
                      </p>
                    </div>
                    {event.user_id && (
                      <Badge variant="outline">
                        <User className="mr-1 h-3 w-3" />
                        User
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No events recorded</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        documentId={document.id}
        onSuccess={() => {
          setShareDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ['document', document.id] });
        }}
      />

      <PermissionsDialog
        open={permissionsDialogOpen}
        onOpenChange={setPermissionsDialogOpen}
        documentId={document.id}
      />

      <DocumentPreview
        documentId={document.id}
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
      />

      <SigningWorkflowDialog
        open={signingWorkflowDialogOpen}
        onOpenChange={setSigningWorkflowDialogOpen}
        documentId={document.id}
        onSuccess={() => {
          setSigningWorkflowDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ['document', document.id] });
        }}
      />
    </div>
  );
}

