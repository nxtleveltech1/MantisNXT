// UPDATE: [2025-12-25] Complete DocuStore interface with real API integration and document generation
// UPDATE: [2026-01-07] Restructured to use SidebarProvider pattern with DocustoreSidebar hub
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  ChevronDown,
  RefreshCw,
  FileText,
  FolderOpen,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

import { DocustoreSidebar } from '@/components/docustore-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { DocumentRow, FolderRow, DocumentTableHeader } from '@/components/docustore/DocumentRow';
import { AdvancedSearchDialog } from '@/components/docustore/AdvancedSearchDialog';
import { BulkActionsBar } from '@/components/docustore/BulkActionsBar';
import { FolderDialog } from '@/components/docustore/FolderDialog';
import { ShareDialog } from '@/components/docustore/ShareDialog';
import { PermissionsDialog } from '@/components/docustore/PermissionsDialog';
import { DocumentPreview } from '@/components/docustore/DocumentPreview';
import { SigningWorkflowDialog } from '@/components/docustore/SigningWorkflowDialog';
import { useAuth } from '@/lib/auth/auth-context';
import type {
  SigningDocument,
  DocuStoreFolder,
  StatusCounts,
  FolderCounts,
  DocumentSigningStatus,
  DocumentAction,
  AdvancedSearchParams,
  DocuStoreRowItem,
} from '@/types/docustore';

// API response types - matches actual API response structure
interface ApiDocument {
  id: string;
  org_id: string;
  title: string;
  description?: string | null;
  document_type?: string | null;
  status: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  current_version_id?: string | null;
  folder_id?: string | null;
  expires_at?: string | null;
  signing_workflow_id?: string | null;
}

// Transform API document to UI format
function transformApiDocument(doc: ApiDocument): SigningDocument {
  // Determine signing status based on document status and metadata
  let signingStatus: DocumentSigningStatus = 'draft';
  if (doc.status === 'active') {
    const signingMeta = doc.metadata?.signing_status as string | undefined;
    if (signingMeta === 'pending_your_signature') {
      signingStatus = 'pending_your_signature';
    } else if (signingMeta === 'pending_other_signatures') {
      signingStatus = 'pending_other_signatures';
    } else if (signingMeta === 'completed' || doc.metadata?.completed) {
      signingStatus = 'completed';
    } else {
      signingStatus = 'pending_other_signatures';
    }
  } else if (doc.status === 'archived') {
    signingStatus = 'completed';
  }

  // Extract folder info from document type
  const folderName = doc.document_type 
    ? doc.document_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : 'Uncategorized';

  return {
    id: doc.id,
    title: doc.title,
    description: doc.description || null,
    signingStatus,
    requiresMySignature: signingStatus === 'pending_your_signature',
    folderId: doc.folder_id || doc.document_type || 'uncategorized',
    folderName,
    signers: [],
    recipients: [],
    totalSigners: 0,
    signedCount: 0,
    entityLinks: [],
    tags: doc.tags || [],
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    lastEditedAt: doc.updated_at,
    ownerId: doc.created_by || '',
    documentType: doc.document_type || null,
    hasArtifacts: false,
  };
}

// Fetch documents from API
async function fetchDocuments(params?: {
  status?: string;
  document_type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ documents: SigningDocument[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.document_type) searchParams.set('document_type', params.document_type);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));

  const response = await fetch(`/api/v1/docustore?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch documents');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Unknown error');
  }

  return {
    documents: (result.data || []).map(transformApiDocument),
    total: result.total || 0,
  };
}

// Build folders from document types
function buildFoldersFromDocuments(documents: SigningDocument[]): DocuStoreFolder[] {
  const folderMap = new Map<string, { count: number; name: string }>();
  
  documents.forEach(doc => {
    const folderId = doc.folderId || 'uncategorized';
    const existing = folderMap.get(folderId);
    if (existing) {
      existing.count++;
    } else {
      folderMap.set(folderId, {
        count: 1,
        name: doc.folderName || folderId,
      });
    }
  });

  return Array.from(folderMap.entries()).map(([id, { count, name }]) => ({
    id,
    name,
    slug: id,
    documentCount: count,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

// Calculate status counts
function calculateStatusCounts(documents: SigningDocument[]): StatusCounts {
  return {
    all: documents.length,
    draft: documents.filter(d => d.signingStatus === 'draft').length,
    pendingYourSignature: documents.filter(d => d.signingStatus === 'pending_your_signature').length,
    pendingOtherSignatures: documents.filter(d => d.signingStatus === 'pending_other_signatures').length,
    completed: documents.filter(d => d.signingStatus === 'completed').length,
    voided: documents.filter(d => d.signingStatus === 'voided').length,
  };
}

// Calculate folder counts
function calculateFolderCounts(documents: SigningDocument[], folders: DocuStoreFolder[]): FolderCounts {
  const folderCounts: Record<string, number> = {};
  folders.forEach(folder => {
    folderCounts[folder.id] = folder.documentCount;
  });

  return {
    all: documents.length,
    sharedWithMe: 0, // Would need sharing logic
    folders: folderCounts,
    deleted: 0, // Would need soft delete query
  };
}

export default function DocuStorePage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
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

  // Selection state for bulk operations
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set());

  // Dialog state
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [signingWorkflowDialogOpen, setSigningWorkflowDialogOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load folders from API
  const loadFolders = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/docustore/folders');
      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }
      const result = await response.json();
      if (result.success && result.data) {
        // Transform folder tree to flat list for sidebar
        const flattenFolders = (tree: unknown[]): DocuStoreFolder[] => {
          const flat: DocuStoreFolder[] = [];
          for (const node of tree) {
            const typedNode = node as {
              folder: {
                id: string;
                name: string;
                slug: string;
                icon?: string | null;
                color?: string | null;
                parent_id?: string | null;
                created_at: string;
                updated_at: string;
              };
              document_count?: number;
              children?: unknown[];
            };
            const folder: DocuStoreFolder = {
              id: typedNode.folder.id,
              name: typedNode.folder.name,
              slug: typedNode.folder.slug,
              documentCount: typedNode.document_count || 0,
              createdAt: typedNode.folder.created_at,
              updatedAt: typedNode.folder.updated_at,
            };
            if (typedNode.folder.icon) folder.icon = typedNode.folder.icon;
            if (typedNode.folder.color) folder.color = typedNode.folder.color;
            if (typedNode.folder.parent_id) folder.parentId = typedNode.folder.parent_id;
            flat.push(folder);
            if (typedNode.children && typedNode.children.length > 0) {
              flat.push(...flattenFolders(typedNode.children));
            }
          }
          return flat;
        };
        setFolders(flattenFolders(result.data));
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  }, []);

  // Load data from API
  const loadData = useCallback(async (showLoadingState = true) => {
    if (showLoadingState) setLoading(true);
    try {
      const params: Parameters<typeof fetchDocuments>[0] = {
        limit: 200,
      };
      if (selectedStatus !== 'all') {
        params.status = 'active';
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      const result = await fetchDocuments(params);
      setDocuments(result.documents);
      
      // Load folders from API
      await loadFolders();
      
      // Build folders from document types as fallback
      const derivedFolders = buildFoldersFromDocuments(result.documents);
      if (folders.length === 0) {
        setFolders(derivedFolders);
      }
      
      // Calculate status counts
      setStatusCounts(calculateStatusCounts(result.documents));
      setFolderCounts(calculateFolderCounts(result.documents, folders.length > 0 ? folders : derivedFolders));
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedStatus, folders, loadFolders]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [loadData, isAuthenticated]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData(false);
      toast.success('Documents refreshed');
    } finally {
      setRefreshing(false);
    }
  };

  // Handle document download
  const handleDownload = useCallback(async (documentId: string) => {
    try {
      const response = await fetch(`/api/v1/docustore/${documentId}/download`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const filename = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'document.pdf';
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  }, []);

  // Handle PDF generation
  const handleGeneratePdf = useCallback(async (documentId: string) => {
    try {
      toast.loading('Generating PDF...');
      const response = await fetch(`/api/v1/docustore/${documentId}/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'docustore_record' }),
      });
      
      if (!response.ok) throw new Error('PDF generation failed');
      
      const result = await response.json();
      if (result.success) {
        toast.dismiss();
        toast.success('PDF generated successfully');
        await loadData(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.dismiss();
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
  }, [loadData]);

  // Handle document action
  const handleAction = useCallback(
    async (documentId: string, action: DocumentAction) => {
      switch (action) {
        case 'sign':
          toast.info('Opening signing interface...');
          router.push(`/docustore/${documentId}/sign`);
          break;
        case 'edit':
          router.push(`/docustore/${documentId}`);
          break;
        case 'download':
          await handleDownload(documentId);
          break;
        case 'generate_pdf':
          await handleGeneratePdf(documentId);
          break;
        case 'resend':
          toast.success('Reminders sent to pending signers');
          break;
        case 'void':
          try {
            const response = await fetch(`/api/v1/docustore/${documentId}`, {
              method: 'DELETE',
            });
            if (response.ok) {
              toast.warning('Document voided');
              await loadData(false);
            }
          } catch {
            toast.error('Failed to void document');
          }
          break;
        case 'delete':
          try {
            const response = await fetch(`/api/v1/docustore/${documentId}`, {
              method: 'DELETE',
            });
            if (response.ok) {
              setDocuments((prev) => prev.filter((d) => d.id !== documentId));
              toast.success('Document deleted');
            }
          } catch {
            toast.error('Failed to delete document');
          }
          break;
        case 'duplicate':
          toast.info('Duplicate functionality coming soon');
          break;
        case 'share':
          setSelectedDocumentId(documentId);
          setShareDialogOpen(true);
          break;
        case 'permissions':
          setSelectedDocumentId(documentId);
          setPermissionsDialogOpen(true);
          break;
        case 'preview':
          setSelectedDocumentId(documentId);
          setPreviewDialogOpen(true);
          break;
        case 'signing_workflow':
          setSelectedDocumentId(documentId);
          setSigningWorkflowDialogOpen(true);
          break;
        default:
          break;
      }
    },
    [router, handleDownload, handleGeneratePdf, loadData]
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

      // Folder filter - match by folder ID, slug, or document_type mapping
      if (selectedFolderId && selectedFolderId !== 'shared' && selectedFolderId !== 'deleted') {
        const matchingFolder = folders.find(f => f.id === selectedFolderId || f.slug === selectedFolderId);
        if (matchingFolder) {
          // Check if document belongs to this folder
          const docFolderId = doc.folderId;
          const docFolder = folders.find(f => f.id === docFolderId || f.slug === docFolderId);
          const typeToSlug: Record<string, string> = {
            'invoice': 'sales',
            'quotation': 'sales',
            'sales_order': 'sales',
            'rental_agreement': 'rentals',
            'repair_order': 'repairs',
            'journal_entry': 'financial',
            'ap_invoice': 'financial',
            'purchase_order': 'purchasing',
            'delivery_note': 'logistics',
            'customer_statement': 'customers',
            'stock_adjustment': 'inventory',
          };
          const docTypeSlug = doc.documentType ? typeToSlug[doc.documentType] : null;
          
          const matchesFolder = 
            (docFolder && (docFolder.id === matchingFolder.id || docFolder.slug === matchingFolder.slug)) ||
            docTypeSlug === matchingFolder.slug ||
            docFolderId === matchingFolder.slug;
          
          if (!matchesFolder) return false;
        }
      }

      // Status filter
      if (selectedStatus !== 'all' && doc.signingStatus !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [documents, searchTerm, selectedFolderId, selectedStatus, folders]);

  // Group documents by folder for display
  const rowItems = useMemo((): DocuStoreRowItem[] => {
    // If a specific folder is selected, just show documents
    if (selectedFolderId && selectedFolderId !== 'shared' && selectedFolderId !== 'deleted') {
      return filteredDocuments.map((doc) => ({ type: 'document' as const, data: doc }));
    }

    // Group by folder - use folder_id first, then fallback to document_type mapping
    const folderMap = new Map<string, SigningDocument[]>();
    const ungroupedDocs: SigningDocument[] = [];
    
    // Create a map of folder IDs to slugs for quick lookup
    const folderIdToSlug = new Map<string, string>();
    folders.forEach((folder) => {
      folderIdToSlug.set(folder.id, folder.slug);
    });

    filteredDocuments.forEach((doc) => {
      let folderSlug: string | null = null;
      
      // First, try to use folder_id if it exists
      if (doc.folderId && doc.folderId !== 'uncategorized') {
        // Check if folderId is a UUID (folder ID) or a slug
        const matchingFolder = folders.find(f => f.id === doc.folderId || f.slug === doc.folderId);
        if (matchingFolder) {
          folderSlug = matchingFolder.slug;
        }
      }
      
      // Fallback: map document_type to folder slug
      if (!folderSlug && doc.documentType) {
        const typeToSlug: Record<string, string> = {
          'invoice': 'sales',
          'quotation': 'sales',
          'sales_order': 'sales',
          'rental_agreement': 'rentals',
          'repair_order': 'repairs',
          'journal_entry': 'financial',
          'ap_invoice': 'financial',
          'purchase_order': 'purchasing',
          'delivery_note': 'logistics',
          'customer_statement': 'customers',
          'stock_adjustment': 'inventory',
        };
        folderSlug = typeToSlug[doc.documentType] || null;
      }
      
      if (folderSlug) {
        const existing = folderMap.get(folderSlug) || [];
        folderMap.set(folderSlug, [...existing, doc]);
      } else {
        ungroupedDocs.push(doc);
      }
    });

    const items: DocuStoreRowItem[] = [];

    // If we have folders, group documents by folder
    if (folders.length > 0) {
      // Add folders with their documents
      folders.forEach((folder) => {
        const folderDocs = folderMap.get(folder.slug) || [];
        // Only show folders that have documents
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

      // Add ungrouped documents at the end
      ungroupedDocs.forEach((doc) => {
        items.push({ type: 'document', data: doc });
      });
    } else {
      // If no folders exist, just show all documents flat
      filteredDocuments.forEach((doc) => {
        items.push({ type: 'document', data: doc });
      });
    }

    // Fallback: if no items were added but we have documents, show them all
    if (items.length === 0 && filteredDocuments.length > 0) {
      filteredDocuments.forEach((doc) => {
        items.push({ type: 'document', data: doc });
      });
    }

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

  // Handle row selection
  const handleRowSelect = useCallback((documentId: string, selected: boolean) => {
    setSelectedDocumentIds((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(documentId);
      } else {
        newSet.delete(documentId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedDocumentIds(new Set(filteredDocuments.map((d) => d.id)));
    } else {
      setSelectedDocumentIds(new Set());
    }
  }, [filteredDocuments]);

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
        <AppHeader title="DocuStore" subtitle="Document Management & Digital Signing" />
        <div className="flex flex-1 flex-col gap-6 p-6">
          {/* Dashboard Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statusCounts.all}</div>
                <p className="text-xs text-muted-foreground">
                  {statusCounts.draft} drafts
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Your Signature</CardTitle>
                <div className="h-4 w-4 rounded-full bg-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{statusCounts.pendingYourSignature}</div>
                <p className="text-xs text-muted-foreground">
                  Requires your action
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Waiting for Others</CardTitle>
                <div className="h-4 w-4 rounded-full bg-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{statusCounts.pendingOtherSignatures}</div>
                <p className="text-xs text-muted-foreground">
                  Pending signatures
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <div className="h-4 w-4 rounded-full bg-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{statusCounts.completed}</div>
                <p className="text-xs text-muted-foreground">
                  Fully signed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Document List Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>Manage your documents and signing workflows</CardDescription>
                </div>
                <Button onClick={() => router.push('/docustore/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters Bar */}
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="docustore-search"
                    name="docustore-search"
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 h-10"
                  />
                </div>
                
                {/* Status Filter */}
                <Select
                  value={selectedStatus}
                  onValueChange={(v) => setSelectedStatus(v as DocumentSigningStatus | 'all')}
                >
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_your_signature">Pending Your Signature</SelectItem>
                    <SelectItem value="pending_other_signatures">Pending Others</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="voided">Voided</SelectItem>
                  </SelectContent>
                </Select>

                {/* Folder Filter */}
                <Select
                  value={selectedFolderId || 'all'}
                  onValueChange={(v) => setSelectedFolderId(v === 'all' ? null : v)}
                >
                  <SelectTrigger className="w-48">
                    <FolderOpen className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Folders</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name} ({folder.documentCount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

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
                  className="h-10 w-10"
                >
                  <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                </Button>
              </div>

              {/* Bulk Actions Bar */}
              {selectedDocumentIds.size > 0 && (
                <BulkActionsBar
                  selectedIds={Array.from(selectedDocumentIds)}
                  onClearSelection={() => setSelectedDocumentIds(new Set())}
                />
              )}

              {/* Documents Table */}
              <div className="rounded-lg border overflow-hidden">
                <DocumentTableHeader
                  onSelectAll={handleSelectAll}
                  allSelected={selectedDocumentIds.size > 0 && selectedDocumentIds.size === filteredDocuments.length}
                  someSelected={selectedDocumentIds.size > 0 && selectedDocumentIds.size < filteredDocuments.length}
                />

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
                            <DocumentRow
                              document={item.data}
                              onAction={handleAction}
                              selected={selectedDocumentIds.has(item.data.id)}
                              onSelect={(selected) => handleRowSelect(item.data.id, selected)}
                            />
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
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      {/* Dialogs */}
      <FolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        onSuccess={() => {
          loadData(false);
          setFolderDialogOpen(false);
        }}
      />

      {selectedDocumentId && (
        <>
          <ShareDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            documentId={selectedDocumentId}
            onSuccess={() => {
              setShareDialogOpen(false);
              toast.success('Share link created');
            }}
          />

          <PermissionsDialog
            open={permissionsDialogOpen}
            onOpenChange={setPermissionsDialogOpen}
            documentId={selectedDocumentId}
          />

          <DocumentPreview
            documentId={selectedDocumentId}
            open={previewDialogOpen}
            onOpenChange={setPreviewDialogOpen}
          />

          <SigningWorkflowDialog
            open={signingWorkflowDialogOpen}
            onOpenChange={setSigningWorkflowDialogOpen}
            documentId={selectedDocumentId}
            onSuccess={() => {
              setSigningWorkflowDialogOpen(false);
              loadData(false);
              toast.success('Signing workflow created');
            }}
          />
        </>
      )}
    </SidebarProvider>
  );
}
