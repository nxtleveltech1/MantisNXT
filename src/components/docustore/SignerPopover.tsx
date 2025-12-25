// UPDATE: [2025-12-25] SignerPopover component for displaying document signer details
'use client';

import { ChevronDown, Mail, Check, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { DocumentSigner, DocumentRecipient, SignerStatus } from '@/types/docustore';

interface SignerPopoverProps {
  signers: DocumentSigner[];
  recipients?: DocumentRecipient[];
  displayLimit?: number;
  className?: string;
}

// Avatar colors for signers
const avatarColors = [
  'bg-violet-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-indigo-500',
];

function getAvatarColor(index: number): string {
  return avatarColors[index % avatarColors.length];
}

function getStatusIcon(status: SignerStatus) {
  switch (status) {
    case 'signed':
      return <Check className="h-3 w-3" />;
    case 'pending':
      return <Clock className="h-3 w-3" />;
    case 'declined':
      return <X className="h-3 w-3" />;
    case 'expired':
      return <Clock className="h-3 w-3" />;
    default:
      return null;
  }
}

function getStatusLabel(status: SignerStatus): string {
  switch (status) {
    case 'signed':
      return 'Signed';
    case 'pending':
      return 'Pending';
    case 'declined':
      return 'Declined';
    case 'expired':
      return 'Expired';
    default:
      return status;
  }
}

function getStatusColor(status: SignerStatus): string {
  switch (status) {
    case 'signed':
      return 'text-emerald-600';
    case 'pending':
      return 'text-amber-500';
    case 'declined':
      return 'text-red-500';
    case 'expired':
      return 'text-muted-foreground';
    default:
      return 'text-muted-foreground';
  }
}

export function SignerPopover({
  signers,
  recipients = [],
  displayLimit = 3,
  className,
}: SignerPopoverProps) {
  const displaySigners = signers.slice(0, displayLimit);
  const remainingCount = signers.length - displayLimit;
  const hasMore = remainingCount > 0;

  // Build display text
  const displayText = displaySigners
    .map((s) => s.name.split(' ')[0])
    .join(', ');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'group flex items-center gap-2 text-left text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer',
            className
          )}
        >
          {/* Stacked avatars */}
          <div className="flex -space-x-2">
            {displaySigners.map((signer, index) => (
              <Avatar
                key={signer.id}
                className={cn(
                  'h-6 w-6 border-2 border-background ring-0',
                  getAvatarColor(index)
                )}
              >
                <AvatarFallback className="text-[10px] font-semibold text-white bg-transparent">
                  {signer.avatarInitials}
                </AvatarFallback>
              </Avatar>
            ))}
            {hasMore && (
              <Avatar className="h-6 w-6 border-2 border-background bg-muted">
                <AvatarFallback className="text-[9px] font-bold text-muted-foreground bg-transparent">
                  +{remainingCount}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
          
          {/* Names */}
          <span className="truncate max-w-[150px]">
            {displayText}
            {hasMore && ` +${remainingCount}`}
          </span>
          
          <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </PopoverTrigger>

      <PopoverContent 
        align="start" 
        className="w-72 p-0 shadow-lg"
        sideOffset={8}
      >
        {/* Signers Section */}
        <div className="p-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Signers
          </h4>
          <div className="space-y-3">
            {signers.map((signer, index) => (
              <div key={signer.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className={cn('h-8 w-8', getAvatarColor(index))}>
                    <AvatarFallback className="text-xs font-semibold text-white bg-transparent">
                      {signer.avatarInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium leading-tight">
                      {signer.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {signer.email}
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'h-6 px-2 gap-1 text-[10px] font-semibold border-0',
                    getStatusColor(signer.status)
                  )}
                >
                  {getStatusIcon(signer.status)}
                  {getStatusLabel(signer.status)}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Recipients Section (if any) */}
        {recipients.length > 0 && (
          <>
            <Separator />
            <div className="p-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Recipients
              </h4>
              <div className="space-y-2">
                {recipients.map((recipient) => (
                  <div key={recipient.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground truncate max-w-[160px]">
                        {recipient.email}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="h-5 px-2 text-[9px] font-medium text-muted-foreground uppercase"
                    >
                      {recipient.type === 'cc' ? 'CCed' : 'BCCed'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Compact version for table cells
export function SignerAvatarStack({
  signers,
  maxDisplay = 3,
  size = 'sm',
  className,
}: {
  signers: DocumentSigner[];
  maxDisplay?: number;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const displaySigners = signers.slice(0, maxDisplay);
  const remainingCount = signers.length - maxDisplay;

  const sizeClasses = size === 'sm' 
    ? 'h-6 w-6 text-[10px]' 
    : 'h-8 w-8 text-xs';

  return (
    <div className={cn('flex -space-x-2', className)}>
      {displaySigners.map((signer, index) => (
        <Avatar
          key={signer.id}
          className={cn(
            'border-2 border-background ring-0',
            sizeClasses,
            getAvatarColor(index)
          )}
          title={`${signer.name} (${getStatusLabel(signer.status)})`}
        >
          <AvatarFallback className="font-semibold text-white bg-transparent">
            {signer.avatarInitials}
          </AvatarFallback>
        </Avatar>
      ))}
      {remainingCount > 0 && (
        <Avatar className={cn('border-2 border-background bg-muted', sizeClasses)}>
          <AvatarFallback className="font-bold text-muted-foreground bg-transparent">
            +{remainingCount}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

