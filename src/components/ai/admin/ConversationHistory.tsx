'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';


import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  MessageSquare,
  User,
  Bot,
  Calendar,
  Download,
  Trash2,
  ChevronRight,
  MoreVertical,
  Loader2,
  History,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ConversationMessage {
  id: string;
  org_id: string;
  user_id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  context?: Record<string, unknown>;
  created_at: string;
}

interface ConversationSummary {
  conversation_id: string;
  user_id: string;
  user_email?: string;
  message_count: number;
  first_message: string;
  last_message: string;
  created_at: string;
  last_updated: string;
  messages?: ConversationMessage[];
}

interface ConversationResponse {
  conversations: ConversationSummary[];
  total: number;
}

interface SearchHighlight {
  text: string;
  highlight: boolean;
}

const highlightSearchTerm = (text: string, searchTerm: string): SearchHighlight[] => {
  if (!searchTerm) return [{ text, highlight: false }];

  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) => ({
    text: part,
    highlight: index % 2 === 1,
  }));
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);

  if (isToday(date)) {
    return `Today at ${format(date, 'HH:mm')}`;
  }

  if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'HH:mm')}`;
  }

  return format(date, 'PPp');
};

const formatRelativeTime = (dateString: string): string => {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
};

export default function ConversationHistory() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());

  // Fetch conversations
  const { data, isLoading, error, refetch } = useQuery<ConversationResponse>({
    queryKey: ['ai-conversations', dateFilter, userFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (dateFilter !== 'all') {
        const now = new Date();
        let fromDate: Date;

        switch (dateFilter) {
          case 'today':
            fromDate = startOfDay(now);
            break;
          case 'week':
            fromDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            fromDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          default:
            fromDate = new Date(0);
        }

        params.append('fromDate', fromDate.toISOString());
        params.append('toDate', endOfDay(new Date()).toISOString());
      }

      if (userFilter !== 'all') {
        params.append('userId', userFilter);
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/v1/ai/conversations?${params}`);
      if (!response.ok) throw new Error('Failed to fetch conversations');

      const result = await response.json();
      return result.data || { conversations: [], total: 0 };
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch full conversation details
  const { data: conversationDetails, isLoading: isLoadingDetails } = useQuery<ConversationMessage[]>({
    queryKey: ['ai-conversation-details', selectedConversation?.conversation_id],
    queryFn: async () => {
      if (!selectedConversation?.conversation_id) return [];

      const response = await fetch(`/api/v1/ai/conversations/${selectedConversation.conversation_id}`);
      if (!response.ok) throw new Error('Failed to fetch conversation details');

      const result = await response.json();
      return result.data || [];
    },
    enabled: !!selectedConversation?.conversation_id,
  });

  // Get unique users for filter
  const uniqueUsers = useMemo(() => {
    if (!data?.conversations) return [];

    const users = new Map<string, string>();
    data.conversations.forEach(conv => {
      if (!users.has(conv.user_id)) {
        users.set(conv.user_id, conv.user_email || conv.user_id);
      }
    });

    return Array.from(users.entries()).map(([id, email]) => ({ id, email }));
  }, [data?.conversations]);

  // Delete conversation mutation
  const deleteMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await fetch(`/api/v1/ai/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete conversation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      toast.success('Conversation deleted successfully');
      setShowDeleteDialog(false);
      setConversationToDelete(null);
      if (selectedConversation?.conversation_id === conversationToDelete) {
        setSelectedConversation(null);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Export conversation
  const handleExport = useCallback((conversation: ConversationSummary) => {
    const exportData = {
      conversation_id: conversation.conversation_id,
      user_id: conversation.user_id,
      created_at: conversation.created_at,
      last_updated: conversation.last_updated,
      message_count: conversation.message_count,
      messages: conversationDetails || [],
    };

    let content: string;
    let filename: string;
    let mimeType: string;

    if (exportFormat === 'json') {
      content = JSON.stringify(exportData, null, 2);
      filename = `conversation_${conversation.conversation_id}_${format(new Date(), 'yyyy-MM-dd')}.json`;
      mimeType = 'application/json';
    } else {
      // CSV export
      const csvRows = ['Timestamp,Role,Message'];

      (conversationDetails || []).forEach(msg => {
        const escapedContent = msg.content.replace(/"/g, '""');
        csvRows.push(`"${msg.created_at}","${msg.role}","${escapedContent}"`);
      });

      content = csvRows.join('\n');
      filename = `conversation_${conversation.conversation_id}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Conversation exported as ${exportFormat.toUpperCase()}`);
  }, [conversationDetails, exportFormat]);

  // Copy message content
  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Message copied to clipboard');
  }, []);

  // Toggle message expansion
  const toggleMessageExpansion = useCallback((messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  }, []);

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!data?.conversations) return [];

    if (!searchQuery) return data.conversations;

    const query = searchQuery.toLowerCase();
    return data.conversations.filter(conv =>
      conv.first_message.toLowerCase().includes(query) ||
      conv.last_message.toLowerCase().includes(query) ||
      conv.conversation_id.toLowerCase().includes(query) ||
      conv.user_email?.toLowerCase().includes(query)
    );
  }, [data?.conversations, searchQuery]);

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <div className="text-center">
            <p className="text-destructive mb-2">Failed to load conversations</p>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Conversation History</h2>
          <p className="text-muted-foreground">
            View and manage AI conversation logs and history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <History className="h-3 w-3" />
            {data?.total || 0} Conversations
          </Badge>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.total || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredConversations.filter(c => isToday(new Date(c.last_updated))).length}
            </div>
            <p className="text-xs text-muted-foreground">Updated today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueUsers.length}</div>
            <p className="text-xs text-muted-foreground">Active users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Messages</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.conversations.length
                ? Math.round(
                    data.conversations.reduce((acc, c) => acc + c.message_count, 0) /
                    data.conversations.length
                  )
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">Per conversation</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search conversations by content, ID, or user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Conversations List and Details */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Conversation List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <CardDescription>
              {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="space-y-1 p-4">
                {filteredConversations.length === 0 ? (
                  <div className="flex items-center justify-center p-8 text-muted-foreground">
                    <p>No conversations found</p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <div
                      key={conversation.conversation_id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                        "hover:bg-accent",
                        selectedConversation?.conversation_id === conversation.conversation_id && "bg-accent"
                      )}
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium truncate">
                            {conversation.user_email || conversation.user_id}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {conversation.message_count} msgs
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {highlightSearchTerm(conversation.last_message, searchQuery).map((part, i) => (
                            <span key={i} className={part.highlight ? "bg-yellow-200 dark:bg-yellow-800" : ""}>
                              {part.text}
                            </span>
                          ))}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelativeTime(conversation.last_updated)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedConversation(conversation);
                              }}
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExport(conversation);
                              }}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Export
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConversationToDelete(conversation.conversation_id);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Conversation Details */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Conversation Thread</CardTitle>
                {selectedConversation && (
                  <CardDescription>
                    ID: {selectedConversation.conversation_id}
                  </CardDescription>
                )}
              </div>
              {selectedConversation && (
                <div className="flex items-center gap-2">
                  <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'json' | 'csv')}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport(selectedConversation)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!selectedConversation ? (
              <div className="flex items-center justify-center p-12 text-muted-foreground">
                <p>Select a conversation to view details</p>
              </div>
            ) : isLoadingDetails ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[550px]">
                <div className="p-4 space-y-4">
                  {/* Conversation Metadata */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">User</Label>
                        <p className="text-sm font-medium">
                          {selectedConversation.user_email || selectedConversation.user_id}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Messages</Label>
                        <p className="text-sm font-medium">{selectedConversation.message_count}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Started</Label>
                        <p className="text-sm font-medium">
                          {formatDate(selectedConversation.created_at)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Last Activity</Label>
                        <p className="text-sm font-medium">
                          {formatDate(selectedConversation.last_updated)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Messages Timeline */}
                  <div className="space-y-4">
                    {conversationDetails?.map((message, index) => {
                      const isExpanded = expandedMessages.has(message.id);
                      const isLongMessage = message.content.length > 300;
                      const displayContent = isLongMessage && !isExpanded
                        ? message.content.slice(0, 300) + '...'
                        : message.content;

                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex gap-3 p-4 rounded-lg",
                            message.role === 'user'
                              ? "bg-blue-50 dark:bg-blue-950/20"
                              : message.role === 'assistant'
                              ? "bg-green-50 dark:bg-green-950/20"
                              : "bg-gray-50 dark:bg-gray-950/20"
                          )}
                        >
                          <div className="flex-shrink-0">
                            {message.role === 'user' ? (
                              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                                <User className="h-4 w-4 text-white" />
                              </div>
                            ) : message.role === 'assistant' ? (
                              <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
                                <Bot className="h-4 w-4 text-white" />
                              </div>
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                                <MessageSquare className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="text-sm font-medium capitalize">{message.role}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(message.created_at)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleCopyMessage(message.content)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>

                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              <p className="whitespace-pre-wrap break-words">
                                {highlightSearchTerm(displayContent, searchQuery).map((part, i) => (
                                  <span key={i} className={part.highlight ? "bg-yellow-200 dark:bg-yellow-800" : ""}>
                                    {part.text}
                                  </span>
                                ))}
                              </p>

                              {isLongMessage && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="p-0 h-auto font-normal text-xs"
                                  onClick={() => toggleMessageExpansion(message.id)}
                                >
                                  {isExpanded ? 'Show less' : 'Show more'}
                                </Button>
                              )}
                            </div>

                            {message.context && Object.keys(message.context).length > 0 && (
                              <div className="mt-3">
                                <details className="group">
                                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                                    View context ({Object.keys(message.context).length} items)
                                  </summary>
                                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                                    {JSON.stringify(message.context, null, 2)}
                                  </pre>
                                </details>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setConversationToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (conversationToDelete) {
                  deleteMutation.mutate(conversationToDelete);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}