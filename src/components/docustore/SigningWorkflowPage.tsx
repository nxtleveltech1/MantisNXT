'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SignerManagement } from './SignerManagement';
import { SignatureCapture } from './SignatureCapture';
import { SigningStatusBadge } from './SigningStatusBadge';
import { Send, Clock, CheckCircle2 } from 'lucide-react';
import type { DocumentSigner } from '@/types/docustore';

interface SigningWorkflowPageProps {
  documentId: string;
}

interface WorkflowStatus {
  workflow: {
    id: string;
    status: string;
    expires_at?: string | null;
    completed_at?: string | null;
  };
  signers: DocumentSigner[];
  signatures: Array<{
    id: string;
    signer_id: string;
    signed_at: string;
  }>;
  recipients: Array<{
    id: string;
    email: string;
    name?: string;
    type: 'cc' | 'bcc';
  }>;
  current_signer?: DocumentSigner | null;
  is_complete: boolean;
  is_expired: boolean;
}

export function SigningWorkflowPage({ documentId }: SigningWorkflowPageProps) {
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const { data: status, isLoading, refetch } = useQuery<WorkflowStatus>({
    queryKey: ['signing-workflow-status', documentId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/docustore/${documentId}/signing/status`);
      if (!response.ok) {
        throw new Error('Failed to fetch workflow status');
      }
      const result = await response.json();
      return result.data;
    },
  });

  const handleSignatureSave = async (data: string) => {
    if (!status?.current_signer) return;

    setSignatureData(data);

    try {
      const response = await fetch(`/api/v1/docustore/${documentId}/signing/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signer_id: status.current_signer.id,
          signature_data: data,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to record signature');
      }

      await refetch();
      setSignatureData(null);
    } catch (error) {
      console.error('Error recording signature:', error);
      // TODO: Show toast error
    }
  };

  const handleSendReminder = async (signerId: string) => {
    try {
      const response = await fetch(`/api/v1/docustore/${documentId}/signing/remind`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signer_id: signerId }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reminder');
      }

      await refetch();
    } catch (error) {
      console.error('Error sending reminder:', error);
      // TODO: Show toast error
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No signing workflow found for this document.</p>
      </div>
    );
  }

  const isCurrentUserSigner = status.current_signer?.id !== undefined;
  const canSign = isCurrentUserSigner && status.current_signer?.status === 'pending';

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">Signing Workflow</h1>
              <SigningStatusBadge status={status.workflow.status as any} />
            </div>
            {status.workflow.expires_at && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Expires: {format(new Date(status.workflow.expires_at), 'PPP p')}
                </span>
              </div>
            )}
            {status.workflow.completed_at && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  Completed: {format(new Date(status.workflow.completed_at), 'PPP p')}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="signers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="signers">
            Signers ({status.signers.length})
          </TabsTrigger>
          {canSign && <TabsTrigger value="sign">Sign Document</TabsTrigger>}
          {status.recipients.length > 0 && (
            <TabsTrigger value="recipients">
              Recipients ({status.recipients.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="signers" className="space-y-4">
          <Card className="p-6">
            <SignerManagement
              workflowId={status.workflow.id}
              signers={status.signers}
              onSignersChange={async () => {
                await refetch();
              }}
            />
          </Card>
        </TabsContent>

        {canSign && (
          <TabsContent value="sign" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Sign Document</h3>
                  <p className="text-sm text-muted-foreground">
                    Please review the document and sign below.
                  </p>
                </div>
                <SignatureCapture
                  onSignature={handleSignatureSave}
                  disabled={!!signatureData}
                />
              </div>
            </Card>
          </TabsContent>
        )}

        {status.recipients.length > 0 && (
          <TabsContent value="recipients" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recipients</h3>
              <div className="space-y-2">
                {status.recipients.map((recipient) => (
                  <div
                    key={recipient.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{recipient.name || recipient.email}</p>
                      <p className="text-sm text-muted-foreground">{recipient.email}</p>
                    </div>
                    <Badge variant="outline">{recipient.type.toUpperCase()}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

