// UPDATE: [2025-12-25] DocuStore sidebar with folder navigation and status filters
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  FileText,
  Users,
  ChevronDown,
  ChevronRight,
  Inbox,
  Send,
  FileStack,
  Settings,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  PenTool,
  Plus,
  LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { DocuStoreFolder, StatusCounts, FolderCounts, DocumentSigningStatus } from '@/types/docustore';

interface DocuStoreSidebarProps {
  folders: DocuStoreFolder[];
  folderCounts: FolderCounts;
  statusCounts: StatusCounts;
  selectedFolderId: string | null;
  selectedStatus: DocumentSigningStatus | 'all';
  onFolderSelect: (folderId: string | null) => void;
  onStatusSelect: (status: DocumentSigningStatus | 'all') => void;
  onCreateFolder?: () => void;
  className?: string;
}

// Navigation items
const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Send, label: 'Bulk Send', href: '/docustore/bulk-send' },
  { icon: FileText, label: 'Documents', href: '/docustore', active: true },
  { icon: FileStack, label: 'Templates', href: '/docustore/templates' },
  { icon: Users, label: 'My team', href: '/docustore/team' },
  { icon: Settings, label: 'Settings', href: '/docustore/settings' },
];

// Status items with icons and colors
const statusItems: { 
  key: DocumentSigningStatus | 'all'; 
  label: string; 
  icon: typeof FileText;
  color: string;
}[] = [
  { key: 'all', label: 'All', icon: FileText, color: 'bg-primary' },
  { key: 'draft', label: 'Draft', icon: FileText, color: 'bg-slate-400' },
  { key: 'pending_your_signature', label: 'Pending your signature', icon: PenTool, color: 'bg-amber-500' },
  { key: 'pending_other_signatures', label: 'Pending other signatures', icon: Clock, color: 'bg-orange-400' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, color: 'bg-emerald-500' },
  { key: 'voided', label: 'Voided', icon: AlertCircle, color: 'bg-red-500' },
];

export function DocuStoreSidebar({
  folders,
  folderCounts,
  statusCounts,
  selectedFolderId,
  selectedStatus,
  onFolderSelect,
  onStatusSelect,
  onCreateFolder,
  className,
}: DocuStoreSidebarProps) {
  const [foldersExpanded, setFoldersExpanded] = useState(true);
  const [statusesExpanded, setStatusesExpanded] = useState(true);

  const getStatusCount = (status: DocumentSigningStatus | 'all'): number => {
    switch (status) {
      case 'all':
        return statusCounts.all;
      case 'draft':
        return statusCounts.draft;
      case 'pending_your_signature':
        return statusCounts.pendingYourSignature;
      case 'pending_other_signatures':
        return statusCounts.pendingOtherSignatures;
      case 'completed':
        return statusCounts.completed;
      case 'voided':
        return statusCounts.voided;
      default:
        return 0;
    }
  };

  return (
    <aside className={cn('flex flex-col h-full w-64 bg-background border-r', className)}>
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Docu
            </span>
            <span className="text-2xl font-light tracking-tight text-foreground">Store</span>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3">
        {/* Navigation Items */}
        <nav className="space-y-1 mb-6">
          {navItems.map((item) => (
            <Button
              key={item.label}
              variant={item.active ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start h-10 px-3 font-medium',
                item.active && 'bg-primary/10 text-primary hover:bg-primary/15'
              )}
              asChild
            >
              <a href={item.href}>
                <item.icon className="h-4 w-4 mr-3" />
                {item.label}
              </a>
            </Button>
          ))}
        </nav>

        <Separator className="my-4" />

        {/* Folders Section */}
        <div className="mb-6">
          <button
            onClick={() => setFoldersExpanded(!foldersExpanded)}
            className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Folders</span>
            <div className="flex items-center gap-2">
              {onCreateFolder && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateFolder();
                  }}
                  className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center"
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
              {foldersExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </button>

          <AnimatePresence initial={false}>
            {foldersExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-0.5 mt-1">
                  {/* All Documents */}
                  <button
                    onClick={() => onFolderSelect(null)}
                    className={cn(
                      'flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors',
                      selectedFolderId === null && selectedStatus === 'all'
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Inbox className="h-4 w-4" />
                      <span>All</span>
                    </div>
                    <Badge variant="secondary" className="h-5 px-2 text-[10px] font-semibold">
                      {folderCounts.all}
                    </Badge>
                  </button>

                  {/* Shared with me */}
                  <button
                    onClick={() => onFolderSelect('shared')}
                    className={cn(
                      'flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors',
                      selectedFolderId === 'shared'
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4" />
                      <span>Shared with me</span>
                    </div>
                    <Badge variant="secondary" className="h-5 px-2 text-[10px] font-semibold">
                      {folderCounts.sharedWithMe}
                    </Badge>
                  </button>

                  {/* Custom Folders */}
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => onFolderSelect(folder.id)}
                      className={cn(
                        'flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors',
                        selectedFolderId === folder.id
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-muted'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-4 w-4" />
                        <span>{folder.name}</span>
                      </div>
                      <Badge variant="secondary" className="h-5 px-2 text-[10px] font-semibold">
                        {folder.documentCount}
                      </Badge>
                    </button>
                  ))}

                  {/* Deleted */}
                  <button
                    onClick={() => onFolderSelect('deleted')}
                    className={cn(
                      'flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors',
                      selectedFolderId === 'deleted'
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Trash2 className="h-4 w-4" />
                      <span>Deleted</span>
                    </div>
                    <Badge variant="secondary" className="h-5 px-2 text-[10px] font-semibold">
                      {folderCounts.deleted}
                    </Badge>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Statuses Section */}
        <div className="mb-6">
          <button
            onClick={() => setStatusesExpanded(!statusesExpanded)}
            className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Statuses</span>
            {statusesExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          <AnimatePresence initial={false}>
            {statusesExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-0.5 mt-1">
                  {statusItems.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => onStatusSelect(item.key)}
                      className={cn(
                        'flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors',
                        selectedStatus === item.key
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-muted'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn('h-2 w-2 rounded-full', item.color)} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <Badge variant="secondary" className="h-5 px-2 text-[10px] font-semibold">
                        {getStatusCount(item.key)}
                      </Badge>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </aside>
  );
}

