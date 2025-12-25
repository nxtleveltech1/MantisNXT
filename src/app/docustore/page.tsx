// UPDATE: [2025-12-25] Complete DocuStore interface with signing workflow, folders, and signer management
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Bell,
  ChevronDown,
  Globe,
  RefreshCw,
  FileText,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

import { DocuStoreSidebar } from '@/components/docustore/DocuStoreSidebar';
import { DocumentRow, FolderRow, DocumentTableHeader } from '@/components/docustore/DocumentRow';
import { AdvancedSearchDialog } from '@/components/docustore/AdvancedSearchDialog';
import type {
  SigningDocument,
  DocuStoreFolder,
  FolderWithDocuments,
  StatusCounts,
  FolderCounts,
  DocumentSigningStatus,
  DocumentAction,
  AdvancedSearchParams,
  DocuStoreRowItem,
} from '@/types/docustore';
import { getAvatarInitials } from '@/types/docustore';

// Mock data generator for demo purposes
function generateMockData(): {
  documents: SigningDocument[];
  folders: DocuStoreFolder[];
  statusCounts: StatusCounts;
  folderCounts: FolderCounts;
} {
  const signers = [
    { name: 'Mohamed Elabbouri', email: 'mohamed@hello.com' },
    { name: 'Abdallah Shadid', email: 'abdallah@hello.com' },
    { name: 'Mohamed Mosaad', email: 'mosaad@hello.com' },
    { name: 'Ahmed Ali', email: 'ahmed@hello.com' },
    { name: 'Sara Johnson', email: 'sara@hello.com' },
  ];

  const folders: DocuStoreFolder[] = [
    { id: 'agreements', name: 'Agreements', slug: 'agreements', documentCount: 12, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    { id: 'contracts', name: 'Contracts', slug: 'contracts', documentCount: 10, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    { id: 'freelancers', name: 'Freelancers', slug: 'freelancers', documentCount: 24, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  ];

  const documents: SigningDocument[] = [
    {
      id: '1',
      title: 'Service provider agreement',
      signingStatus: 'pending_your_signature',
      requiresMySignature: true,
      folderId: 'contracts',
      folderName: 'Contracts',
      signers: [
        { id: 's1', documentId: '1', name: signers[0].name, email: signers[0].email, role: 'signer', status: 'signed', order: 1, avatarInitials: getAvatarInitials(signers[0].name) },
        { id: 's2', documentId: '1', name: signers[1].name, email: signers[1].email, role: 'signer', status: 'signed', order: 2, avatarInitials: getAvatarInitials(signers[1].name) },
        { id: 's3', documentId: '1', name: signers[2].name, email: signers[2].email, role: 'signer', status: 'pending', order: 3, avatarInitials: getAvatarInitials(signers[2].name) },
        { id: 's4', documentId: '1', name: signers[3].name, email: signers[3].email, role: 'signer', status: 'pending', order: 4, avatarInitials: getAvatarInitials(signers[3].name) },
      ],
      recipients: [
        { id: 'r1', documentId: '1', email: 'ahmed@hello.com', type: 'cc' },
        { id: 'r2', documentId: '1', email: 'ahmed@hello.com', type: 'cc' },
      ],
      totalSigners: 4,
      signedCount: 2,
      tags: [],
      createdAt: '2021-05-04',
      updatedAt: '2021-05-04',
      lastEditedAt: '2021-05-04',
      ownerId: 'user1',
    },
    {
      id: '2',
      title: 'Service provider agreement',
      signingStatus: 'draft',
      requiresMySignature: false,
      folderId: 'contracts',
      folderName: 'Contracts',
      signers: [
        { id: 's5', documentId: '2', name: signers[0].name, email: signers[0].email, role: 'signer', status: 'pending', order: 1, avatarInitials: getAvatarInitials(signers[0].name) },
      ],
      recipients: [],
      totalSigners: 1,
      signedCount: 0,
      tags: [],
      createdAt: '2021-05-04',
      updatedAt: '2021-05-04',
      lastEditedAt: '2021-05-04',
      ownerId: 'user1',
    },
    {
      id: '3',
      title: 'Service provider agreement',
      signingStatus: 'draft',
      requiresMySignature: false,
      folderId: 'contracts',
      folderName: 'Contracts',
      signers: [
        { id: 's6', documentId: '3', name: signers[1].name, email: signers[1].email, role: 'signer', status: 'pending', order: 1, avatarInitials: getAvatarInitials(signers[1].name) },
      ],
      recipients: [],
      totalSigners: 1,
      signedCount: 0,
      tags: [],
      createdAt: '2021-05-04',
      updatedAt: '2021-05-04',
      lastEditedAt: '2021-05-04',
      ownerId: 'user1',
    },
    {
      id: '4',
      title: 'Service provider agreement',
      signingStatus: 'pending_your_signature',
      requiresMySignature: true,
      folderId: 'contracts',
      folderName: 'Contracts',
      signers: [
        { id: 's7', documentId: '4', name: signers[1].name, email: signers[1].email, role: 'signer', status: 'pending', order: 1, avatarInitials: getAvatarInitials(signers[1].name) },
      ],
      recipients: [],
      totalSigners: 1,
      signedCount: 0,
      tags: [],
      createdAt: '2021-05-04',
      updatedAt: '2021-05-04',
      lastEditedAt: '2021-05-04',
      ownerId: 'user1',
    },
    {
      id: '5',
      title: 'Service provider agreement',
      signingStatus: 'pending_other_signatures',
      requiresMySignature: false,
      folderId: 'contracts',
      folderName: 'Contracts',
      signers: [
        { id: 's8', documentId: '5', name: signers[0].name, email: signers[0].email, role: 'signer', status: 'pending', order: 1, avatarInitials: getAvatarInitials(signers[0].name) },
        { id: 's9', documentId: '5', name: signers[2].name, email: signers[2].email, role: 'signer', status: 'pending', order: 2, avatarInitials: getAvatarInitials(signers[2].name) },
      ],
      recipients: [],
      totalSigners: 2,
      signedCount: 0,
      tags: [],
      createdAt: '2021-05-04',
      updatedAt: '2021-05-04',
      lastEditedAt: '2021-05-04',
      ownerId: 'user1',
    },
    {
      id: '6',
      title: 'Service provider agreement',
      signingStatus: 'pending_other_signatures',
      requiresMySignature: false,
      folderId: 'contracts',
      folderName: 'Contracts',
      signers: [
        { id: 's10', documentId: '6', name: signers[0].name, email: signers[0].email, role: 'signer', status: 'signed', order: 1, avatarInitials: getAvatarInitials(signers[0].name) },
        { id: 's11', documentId: '6', name: signers[2].name, email: signers[2].email, role: 'signer', status: 'pending', order: 2, avatarInitials: getAvatarInitials(signers[2].name) },
      ],
      recipients: [],
      totalSigners: 2,
      signedCount: 1,
      tags: [],
      createdAt: '2021-05-04',
      updatedAt: '2021-05-04',
      lastEditedAt: '2021-05-04',
      ownerId: 'user1',
    },
    {
      id: '7',
      title: 'Service provider agreement',
      signingStatus: 'completed',
      requiresMySignature: false,
      folderId: 'agreements',
      folderName: 'Agreements',
      signers: [
        { id: 's12', documentId: '7', name: signers[1].name, email: signers[1].email, role: 'signer', status: 'signed', order: 1, avatarInitials: getAvatarInitials(signers[1].name) },
        { id: 's13', documentId: '7', name: signers[0].name, email: signers[0].email, role: 'signer', status: 'signed', order: 2, avatarInitials: getAvatarInitials(signers[0].name) },
      ],
      recipients: [],
      totalSigners: 2,
      signedCount: 2,
      tags: [],
      createdAt: '2021-05-04',
      updatedAt: '2021-05-04',
      lastEditedAt: '2021-05-04',
      ownerId: 'user1',
    },
    {
      id: '8',
      title: 'Service provider agreement',
      signingStatus: 'completed',
      requiresMySignature: false,
      folderId: 'agreements',
      folderName: 'Agreements',
      signers: [
        { id: 's14', documentId: '8', name: signers[1].name, email: signers[1].email, role: 'signer', status: 'signed', order: 1, avatarInitials: getAvatarInitials(signers[1].name) },
        { id: 's15', documentId: '8', name: signers[0].name, email: signers[0].email, role: 'signer', status: 'signed', order: 2, avatarInitials: getAvatarInitials(signers[0].name) },
      ],
      recipients: [],
      totalSigners: 2,
      signedCount: 2,
      tags: [],
      createdAt: '2021-05-04',
      updatedAt: '2021-05-04',
      lastEditedAt: '2021-05-04',
      ownerId: 'user1',
    },
  ];

  const statusCounts: StatusCounts = {
    all: 104,
    draft: 14,
    pendingYourSignature: 18,
    pendingOtherSignatures: 24,
    completed: 36,
    voided: 12,
  };

  const folderCounts: FolderCounts = {
    all: 104,
    sharedWithMe: 36,
    folders: {
      agreements: 12,
      contracts: 10,
      freelancers: 24,
    },
    deleted: 22,
  };

  return { documents, folders, statusCounts, folderCounts };
}

export default function DocuStorePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data state
  const [documents, setDocuments] = useState<SigningDocument[]>([]);
  const [folders, setFolders] = useState<DocuStoreFolder[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    all: 0,
    draft: 0,
    pendingYourSignature: 0,
    pendingOtherSignatures: 0,
    completed: 0,
    voided: 0,
  });
  const [folderCounts, setFolderCounts] = useState<FolderCounts>({
    all: 0,
    sharedWithMe: 0,
    folders: {},
    deleted: 0,
  });

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<DocumentSigningStatus | 'all'>('all');
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedSearchParams>({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 600));
      const data = generateMockData();
      setDocuments(data.documents);
      setFolders(data.folders);
      setStatusCounts(data.statusCounts);
      setFolderCounts(data.folderCounts);
      setLoading(false);
    };
    loadData();
  }, []);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    const data = generateMockData();
    setDocuments(data.documents);
    setFolders(data.folders);
    setStatusCounts(data.statusCounts);
    setFolderCounts(data.folderCounts);
    setRefreshing(false);
    toast.success('Documents refreshed');
  };

  // Handle document action
  const handleAction = useCallback(
    (documentId: string, action: DocumentAction) => {
      switch (action) {
        case 'sign':
          toast.info('Opening signing interface...');
          router.push(`/docustore/${documentId}/sign`);
          break;
        case 'edit':
          router.push(`/docustore/${documentId}`);
          break;
        case 'download':
          toast.success('Download started');
          break;
        case 'resend':
          toast.success('Reminders sent to pending signers');
          break;
        case 'void':
          toast.warning('Document voided');
          break;
        case 'delete':
          setDocuments((prev) => prev.filter((d) => d.id !== documentId));
          toast.success('Document deleted');
          break;
        case 'duplicate':
          toast.success('Document duplicated');
          break;
        case 'share':
          toast.info('Share dialog opened');
          break;
        default:
          break;
      }
    },
    [router]
  );

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesTitle = doc.title.toLowerCase().includes(search);
        const matchesSigner = doc.signers.some(
          (s) => s.name.toLowerCase().includes(search) || s.email.toLowerCase().includes(search)
        );
        if (!matchesTitle && !matchesSigner) return false;
      }

      // Folder filter
      if (selectedFolderId && selectedFolderId !== 'shared' && selectedFolderId !== 'deleted') {
        if (doc.folderId !== selectedFolderId) return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && doc.signingStatus !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [documents, searchTerm, selectedFolderId, selectedStatus]);

  // Group documents by folder for display
  const rowItems = useMemo((): DocuStoreRowItem[] => {
    // If a specific folder is selected, just show documents
    if (selectedFolderId && selectedFolderId !== 'shared' && selectedFolderId !== 'deleted') {
      return filteredDocuments.map((doc) => ({ type: 'document' as const, data: doc }));
    }

    // Group by folder
    const folderMap = new Map<string, SigningDocument[]>();
    const ungroupedDocs: SigningDocument[] = [];

    filteredDocuments.forEach((doc) => {
      if (doc.folderId) {
        const existing = folderMap.get(doc.folderId) || [];
        folderMap.set(doc.folderId, [...existing, doc]);
      } else {
        ungroupedDocs.push(doc);
      }
    });

    const items: DocuStoreRowItem[] = [];

    // Add folders
    folders.forEach((folder) => {
      const folderDocs = folderMap.get(folder.id) || [];
      if (folderDocs.length > 0) {
        items.push({
          type: 'folder',
          data: {
            ...folder,
            documents: folderDocs,
            documentCount: folderDocs.length,
          },
        });
      }
    });

    // Add ungrouped documents
    ungroupedDocs.forEach((doc) => {
      items.push({ type: 'document', data: doc });
    });

    return items;
  }, [filteredDocuments, folders, selectedFolderId]);

  // Pagination
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return rowItems.slice(start, start + rowsPerPage);
  }, [rowItems, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(rowItems.length / rowsPerPage);

  // Handle advanced search
  const handleAdvancedSearch = (params: AdvancedSearchParams) => {
    setAdvancedFilters(params);
    if (params.search) setSearchTerm(params.search);
    if (params.status) setSelectedStatus(params.status);
    toast.success('Filters applied');
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.documentType) count++;
    if (advancedFilters.signerEmail) count++;
    if (advancedFilters.signerName) count++;
    if (advancedFilters.dateFrom) count++;
    if (advancedFilters.dateTo) count++;
    return count;
  }, [advancedFilters]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <DocuStoreSidebar
        folders={folders}
        folderCounts={folderCounts}
        statusCounts={statusCounts}
        selectedFolderId={selectedFolderId}
        selectedStatus={selectedStatus}
        onFolderSelect={setSelectedFolderId}
        onStatusSelect={setSelectedStatus}
        onCreateFolder={() => toast.info('Create folder dialog')}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b bg-background">
          <div className="flex items-center gap-4">
            {/* User Avatar with notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative">
                  <Avatar className="h-10 w-10 bg-violet-600">
                    <AvatarFallback className="text-sm font-bold text-white bg-transparent">
                      MA
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications */}
            <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                4
              </span>
            </button>
          </div>

          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-sm">
                <Globe className="h-4 w-4" />
                En
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>English</DropdownMenuItem>
              <DropdownMenuItem>العربية</DropdownMenuItem>
              <DropdownMenuItem>Français</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
                <Badge variant="secondary" className="h-6 px-2.5 text-xs font-medium">
                  All
                </Badge>
              </div>
              <Button
                onClick={() => router.push('/docustore/new')}
                size="icon"
                className="h-10 w-10 rounded-full bg-primary shadow-lg hover:bg-primary/90"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 h-11 bg-muted/30 border-0 focus-visible:ring-1"
                />
              </div>
              <AdvancedSearchDialog
                onSearch={handleAdvancedSearch}
                onReset={() => {
                  setAdvancedFilters({});
                  setSearchTerm('');
                  setSelectedStatus('all');
                }}
                activeFiltersCount={activeFiltersCount}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-11 w-11"
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              </Button>
            </div>

            {/* Documents Table */}
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <DocumentTableHeader />

              {loading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : rowItems.length === 0 ? (
                <div className="text-center py-20 px-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground opacity-50" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">No documents found</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto mb-6">
                    {searchTerm || selectedStatus !== 'all'
                      ? "Try adjusting your filters to find what you're looking for."
                      : 'Your document repository is empty. Start by uploading your first document.'}
                  </p>
                  <Button variant="outline" onClick={() => router.push('/docustore/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
                </div>
              ) : (
                <div>
                  <AnimatePresence mode="popLayout">
                    {paginatedItems.map((item, index) => (
                      <motion.div
                        key={item.type === 'folder' ? `folder-${item.data.id}` : `doc-${item.data.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        {item.type === 'folder' ? (
                          <FolderRow folder={item.data} onAction={handleAction} />
                        ) : (
                          <DocumentRow document={item.data} onAction={handleAction} />
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Pagination */}
              {!loading && rowItems.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronDown className="h-4 w-4 rotate-90" />
                    </Button>
                    <Button variant="default" size="sm" className="h-8 w-8 p-0">
                      {currentPage}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <ChevronDown className="h-4 w-4 -rotate-90" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>
                      {(currentPage - 1) * rowsPerPage + 1}-
                      {Math.min(currentPage * rowsPerPage, rowItems.length)} of {rowItems.length}
                    </span>
                    <Select
                      value={String(rowsPerPage)}
                      onValueChange={(v) => {
                        setRowsPerPage(Number(v));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 rows</SelectItem>
                        <SelectItem value="25">25 rows</SelectItem>
                        <SelectItem value="50">50 rows</SelectItem>
                        <SelectItem value="100">100 rows</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
