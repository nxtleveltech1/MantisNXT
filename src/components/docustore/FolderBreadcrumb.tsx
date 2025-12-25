import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Folder } from 'lucide-react';

interface FolderBreadcrumbProps {
  folders: Array<{ id: string; name: string }>;
  onFolderClick?: (folderId: string | null) => void;
}

export function FolderBreadcrumb({ folders, onFolderClick }: FolderBreadcrumbProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {onFolderClick ? (
            <BreadcrumbLink
              onClick={() => onFolderClick(null)}
              className="cursor-pointer"
            >
              <Folder className="mr-1 h-4 w-4" />
              All Documents
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage>
              <Folder className="mr-1 h-4 w-4" />
              All Documents
            </BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {folders.map((folder, index) => (
          <div key={folder.id} className="flex items-center">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {index === folders.length - 1 ? (
                <BreadcrumbPage>{folder.name}</BreadcrumbPage>
              ) : onFolderClick ? (
                <BreadcrumbLink
                  onClick={() => onFolderClick(folder.id)}
                  className="cursor-pointer"
                >
                  {folder.name}
                </BreadcrumbLink>
              ) : (
                <span>{folder.name}</span>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

