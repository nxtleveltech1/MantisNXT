'use client';

import { useState } from 'react';
import { ChevronRight, Folder, FolderOpen, Plus } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FolderTree as FolderTreeType } from '@/lib/services/docustore/folder-types';

interface FolderTreeProps {
  folders: FolderTreeType[];
  selectedFolderId?: string | null;
  onFolderSelect?: (folderId: string | null) => void;
  onFolderCreate?: (parentId: string | null) => void;
  level?: number;
}

export function FolderTree({
  folders,
  selectedFolderId,
  onFolderSelect,
  onFolderCreate,
  level = 0,
}: FolderTreeProps) {
  return (
    <div className="space-y-1">
      {folders.map((folderNode) => (
        <FolderTreeNode
          key={folderNode.folder.id}
          folderNode={folderNode}
          selectedFolderId={selectedFolderId}
          onFolderSelect={onFolderSelect}
          onFolderCreate={onFolderCreate}
          level={level}
        />
      ))}
    </div>
  );
}

interface FolderTreeNodeProps {
  folderNode: FolderTreeType;
  selectedFolderId?: string | null;
  onFolderSelect?: (folderId: string | null) => void;
  onFolderCreate?: (parentId: string | null) => void;
  level: number;
}

function FolderTreeNode({
  folderNode,
  selectedFolderId,
  onFolderSelect,
  onFolderCreate,
  level,
}: FolderTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(level < 2); // Auto-expand first 2 levels

  const isSelected = selectedFolderId === folderNode.folder.id;
  const hasChildren = folderNode.children.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors',
          isSelected && 'bg-accent',
          !isSelected && 'hover:bg-accent/50'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren ? (
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <ChevronRight
                className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-90')}
              />
            </Button>
          </CollapsibleTrigger>
        ) : (
          <div className="w-6" />
        )}

        <button
          type="button"
          onClick={() => onFolderSelect?.(folderNode.folder.id)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {isOpen ? (
            <FolderOpen
              className="h-4 w-4"
              style={{ color: folderNode.folder.color || undefined }}
            />
          ) : (
            <Folder
              className="h-4 w-4"
              style={{ color: folderNode.folder.color || undefined }}
            />
          )}
          <span className="flex-1 truncate">{folderNode.folder.name}</span>
          {folderNode.document_count !== undefined && folderNode.document_count > 0 && (
            <span className="text-xs text-muted-foreground">
              {folderNode.document_count}
            </span>
          )}
        </button>

        {onFolderCreate && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onFolderCreate(folderNode.folder.id);
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      {hasChildren && (
        <CollapsibleContent>
          <FolderTree
            folders={folderNode.children}
            selectedFolderId={selectedFolderId}
            onFolderSelect={onFolderSelect}
            onFolderCreate={onFolderCreate}
            level={level + 1}
          />
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

