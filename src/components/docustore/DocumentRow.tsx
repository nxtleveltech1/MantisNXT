// UPDATE: [2025-12-25] DocumentRow component with expandable folders and document actions
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  FileText,
  FolderOpen,
  Download,
  Edit,
  Trash2,
  Send,
  MoreVertical,
  PenTool,
  Copy,
  Share2,
  ArchiveX,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SignerPopover } from './SignerPopover';
import type {
  SigningDocument,
  FolderWithDocuments,
  DocumentSigningStatus,
  DocumentAction,
} from '@/types/docustore';
import { formatSigningStatus, getSigningStatusColor } from '@/types/docustore';

interface DocumentRowProps {
  document: SigningDocument;
  onAction: (documentId: string, action: DocumentAction) => void;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  className?: string;
}

interface FolderRowProps {
  folder: FolderWithDocuments;
  onAction: (documentId: string, action: DocumentAction) => void;
  onDocumentSelect?: (documentId: string) => void;
  selectedDocuments?: string[];
  className?: string;
}

// Format date as YYYY/MM/DD
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

// Get primary action based on document status
function getPrimaryAction(document: SigningDocument): {
  label: string;
  action: DocumentAction;
  variant: 'default' | 'outline' | 'secondary';
} | null {
  if (document.requiresMySignature) {
    return { label: 'Sign', action: 'sign', variant: 'default' };
  }
  
  switch (document.signingStatus) {
    case 'draft':
      return { label: 'Edit', action: 'edit', variant: 'outline' };
    case 'pending_other_signatures':
      return { label: 'Resend', action: 'resend', variant: 'outline' };
    case 'completed':
      return { label: 'Download', action: 'download', variant: 'outline' };
    default:
      return { label: 'Edit', action: 'edit', variant: 'outline' };
  }
}

// Status badge with proper styling
function StatusBadge({ status }: { status: DocumentSigningStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-6 px-2.5 text-[11px] font-medium whitespace-nowrap border',
        getSigningStatusColor(status)
      )}
    >
      {formatSigningStatus(status)}
    </Badge>
  );
}

export function DocumentRow({
  document,
  onAction,
  selected = false,
  onSelect,
  className,
}: DocumentRowProps) {
  const primaryAction = getPrimaryAction(document);

  return (
    <div
      className={cn(
        'group flex items-center gap-4 px-4 py-3 hover:bg-muted/40 transition-colors border-b border-border/50',
        selected && 'bg-primary/5',
        className
      )}
    >
      {/* Selection Checkbox */}
      {onSelect && (
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-gray-300 cursor-pointer"
        />
      )}

      {/* Document Icon */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <div className="flex flex-col min-w-0">
          <button
            onClick={() => onAction(document.id, 'edit')}
            className="text-sm font-semibold text-foreground hover:text-primary transition-colors text-left truncate"
          >
            {document.title}
          </button>
          
          {/* Signers */}
          {document.signers.length > 0 && (
            <SignerPopover
              signers={document.signers}
              recipients={document.recipients}
              className="mt-0.5"
            />
          )}
        </div>
      </div>

      {/* Status */}
      <div className="w-44 flex-shrink-0">
        <StatusBadge status={document.signingStatus} />
      </div>

      {/* Last Edit Date */}
      <div className="w-24 flex-shrink-0 text-sm text-muted-foreground">
        {formatDate(document.lastEditedAt)}
      </div>

      {/* Actions */}
      <div className="w-32 flex-shrink-0 flex items-center justify-end gap-1">
        {primaryAction && (
          <Button
            variant={primaryAction.variant}
            size="sm"
            className={cn(
              'h-8 px-4 text-xs font-medium',
              primaryAction.action === 'sign' && 'bg-primary hover:bg-primary/90 text-primary-foreground'
            )}
            onClick={() => onAction(document.id, primaryAction.action)}
          >
            {primaryAction.label}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onAction(document.id, 'edit')}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {document.requiresMySignature && (
              <DropdownMenuItem onClick={() => onAction(document.id, 'sign')}>
                <PenTool className="h-4 w-4 mr-2" />
                Sign Document
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onAction(document.id, 'download')}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction(document.id, 'share')}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction(document.id, 'duplicate')}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            {document.signingStatus === 'pending_other_signatures' && (
              <DropdownMenuItem onClick={() => onAction(document.id, 'resend')}>
                <Send className="h-4 w-4 mr-2" />
                Resend Reminders
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {document.signingStatus !== 'voided' && document.signingStatus !== 'completed' && (
              <DropdownMenuItem
                onClick={() => onAction(document.id, 'void')}
                className="text-amber-600 focus:text-amber-600"
              >
                <ArchiveX className="h-4 w-4 mr-2" />
                Void Document
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onAction(document.id, 'delete')}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function FolderRow({
  folder,
  onAction,
  onDocumentSelect,
  selectedDocuments = [],
  className,
}: FolderRowProps) {
  const [isExpanded, setIsExpanded] = useState(folder.isExpanded ?? true);

  return (
    <div className={cn('', className)}>
      {/* Folder Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/40 transition-colors border-b border-border/50 text-left"
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Expand Icon */}
          <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          {/* Folder Icon and Name */}
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-amber-500" />
            <span className="font-semibold text-sm">{folder.name}</span>
            <Badge variant="secondary" className="h-5 px-2 text-[10px] font-semibold ml-1">
              {folder.documentCount}
            </Badge>
          </div>
        </div>
      </button>

      {/* Folder Contents */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-muted/20"
          >
            {folder.documents.length > 0 ? (
              folder.documents.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  document={doc}
                  onAction={onAction}
                  selected={selectedDocuments.includes(doc.id)}
                  onSelect={(selected) => onDocumentSelect?.(doc.id)}
                  className="pl-12"
                />
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No documents in this folder
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Table Header Component
interface DocumentTableHeaderProps {
  className?: string;
  onSelectAll?: (selected: boolean) => void;
  allSelected?: boolean;
  someSelected?: boolean;
}

export function DocumentTableHeader({
  className,
  onSelectAll,
  allSelected = false,
  someSelected = false,
}: DocumentTableHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-3 bg-muted/30 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground',
        className
      )}
    >
      {onSelectAll && (
        <input
          type="checkbox"
          checked={allSelected}
          ref={(input) => {
            if (input) input.indeterminate = someSelected && !allSelected;
          }}
          onChange={(e) => onSelectAll(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 cursor-pointer"
        />
      )}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span>Name</span>
        <ChevronDown className="h-3 w-3" />
      </div>
      <div className="w-44 flex-shrink-0 flex items-center gap-2">
        <span>Status</span>
        <ChevronDown className="h-3 w-3 opacity-50" />
      </div>
      <div className="w-24 flex-shrink-0 flex items-center gap-2">
        <span>Last Edit</span>
        <ChevronDown className="h-3 w-3 opacity-50" />
      </div>
      <div className="w-32 flex-shrink-0" />
    </div>
  );
}

