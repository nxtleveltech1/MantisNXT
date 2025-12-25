import { Badge } from '@/components/ui/badge';
import type { DocumentSigningStatus } from '@/types/docustore';

interface SigningStatusBadgeProps {
  status: DocumentSigningStatus;
  className?: string;
}

const statusConfig: Record<
  DocumentSigningStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: { label: 'Draft', variant: 'outline' },
  pending_your_signature: { label: 'Pending Your Signature', variant: 'default' },
  pending_other_signatures: { label: 'Pending Signatures', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'default' },
  voided: { label: 'Voided', variant: 'destructive' },
};

export function SigningStatusBadge({ status, className }: SigningStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

