"use client"

import React, { useState, useRef, useEffect } from "react"
import AppLayout from "@/components/layout/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip } from "@/components/ui/tooltip"
import {
  Search,
  Send,
  Paperclip,
  Phone,
  Video,
  MoreVertical,
  Archive,
  Star,
  Filter,
  MessageSquare,
  Users,
  Circle,
  Clock,
  Check,
  CheckCheck,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Download,
  X,
  Smile,
  Plus
} from "lucide-react"

// Types
interface Message {
  id: string
  content: string
  timestamp: Date
  sender: {
    id: string
    name: string
    avatar?: string
    initials: string
  }
  isOwn: boolean
  status: "sent" | "delivered" | "read"
  attachments?: Array<{
    id: string
    name: string
    type: "image" | "document" | "other"
    size: string
    url: string
  }>
}

interface Conversation {
  id: string
  name: string
  avatar?: string
  initials: string
  lastMessage: string
  timestamp: Date
  unreadCount: number
  isOnline: boolean
  isTyping: boolean
  isPinned: boolean
  type: "direct" | "group"
  participants?: string[]
}

// Mock data
const mockConversations: Conversation[] = [
  {
    id: "1",
    name: "Sarah Chen",
    initials: "SC",
    lastMessage: "The contract documents are ready for review",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    unreadCount: 2,
    isOnline: true,
    isTyping: false,
    isPinned: true,
    type: "direct"
  },
  {
    id: "2",
    name: "TechCorp Team",
    initials: "TC",
    lastMessage: "Meeting scheduled for tomorrow at 2 PM",
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    unreadCount: 0,
    isOnline: false,
    isTyping: true,
    isPinned: false,
    type: "group",
    participants: ["John Doe", "Sarah Chen", "Mike Johnson"]
  },
  {
    id: "3",
    name: "Global Manufacturing",
    initials: "GM",
    lastMessage: "Invoice #INV-2024-003 has been processed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    unreadCount: 1,
    isOnline: true,
    isTyping: false,
    isPinned: false,
    type: "direct"
  },
  {
    id: "4",
    name: "Procurement Team",
    initials: "PT",
    lastMessage: "Budget approval needed for Q1 purchases",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
    unreadCount: 0,
    isOnline: false,
    isTyping: false,
    isPinned: true,
    type: "group",
    participants: ["Alice Wilson", "Bob Smith", "Carol Brown"]
  }
]

const mockMessages: Message[] = [
  {
    id: "1",
    content: "Hi! I've reviewed the latest supplier contracts and have some questions about the terms.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    sender: {
      id: "sarah",
      name: "Sarah Chen",
      initials: "SC"
    },
    isOwn: false,
    status: "read"
  },
  {
    id: "2",
    content: "Sure, I'd be happy to clarify. Which specific terms are you concerned about?",
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    sender: {
      id: "me",
      name: "John Doe",
      initials: "JD"
    },
    isOwn: true,
    status: "delivered"
  },
  {
    id: "3",
    content: "The payment terms seem quite aggressive - 15 days instead of our usual 30. Also, the delivery penalties look steep.",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    sender: {
      id: "sarah",
      name: "Sarah Chen",
      initials: "SC"
    },
    isOwn: false,
    status: "read"
  },
  {
    id: "4",
    content: "I've attached the contract analysis document with highlighted sections that need attention.",
    timestamp: new Date(Date.now() - 1000 * 60 * 25),
    sender: {
      id: "sarah",
      name: "Sarah Chen",
      initials: "SC"
    },
    isOwn: false,
    status: "read",
    attachments: [
      {
        id: "att1",
        name: "Contract_Analysis_TechCorp_2024.pdf",
        type: "document",
        size: "2.4 MB",
        url: "#"
      }
    ]
  },
  {
    id: "5",
    content: "Thanks for the detailed analysis. Let me review this and get back to you by end of day.",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    sender: {
      id: "me",
      name: "John Doe",
      initials: "JD"
    },
    isOwn: true,
    status: "read"
  }
]

// Utility functions
const formatTime = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return "now"
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return date.toLocaleDateString()
}

const formatMessageTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Components
const ConversationList: React.FC<{
  conversations: Conversation[]
  selectedId?: string
  onSelect: (id: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}> = ({ conversations, selectedId, onSelect, searchQuery, onSearchChange }) => {
  const [filter, setFilter] = useState<"all" | "unread" | "pinned">("all")

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    switch (filter) {
      case "unread": return conv.unreadCount > 0
      case "pinned": return conv.isPinned
      default: return true
    }
  }).sort((a, b) => {
    // Sort pinned first, then by timestamp
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return b.timestamp.getTime() - a.timestamp.getTime()
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Messages</h2>
          <Button size="icon" variant="outline" className="h-8 w-8">
            <Plus className="h-4 w-4" />
            <span className="sr-only">New conversation</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            aria-label="Search conversations"
          />
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">Unread</TabsTrigger>
            <TabsTrigger value="pinned" className="text-xs">Pinned</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onSelect(conversation.id)}
              className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                selectedId === conversation.id ? "bg-muted" : ""
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onSelect(conversation.id)
                }
              }}
              aria-label={`Conversation with ${conversation.name}`}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    {conversation.avatar && (
                      <AvatarImage src={conversation.avatar} alt={conversation.name} />
                    )}
                    <AvatarFallback>{conversation.initials}</AvatarFallback>
                  </Avatar>
                  {conversation.isOnline && (
                    <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-green-500 text-green-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{conversation.name}</p>
                      {conversation.isPinned && (
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      )}
                      {conversation.type === "group" && (
                        <Users className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(conversation.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.isTyping ? (
                        <span className="text-primary">Typing...</span>
                      ) : (
                        conversation.lastMessage
                      )}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <Badge variant="default" className="h-5 w-5 p-0 text-xs flex items-center justify-center">
                        {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

type MessageAttachment = Message['attachments'] extends Array<infer A> ? A : never

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const renderAttachment = (attachment: MessageAttachment) => (
    <div key={attachment.id} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50 mt-2">
      {attachment.type === "document" ? (
        <FileText className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{attachment.name}</p>
        <p className="text-xs text-muted-foreground">{attachment.size}</p>
      </div>
      <Button size="icon" variant="ghost" className="h-6 w-6">
        <Download className="h-3 w-3" />
        <span className="sr-only">Download {attachment.name}</span>
      </Button>
    </div>
  )

  const StatusIcon = () => {
    switch (message.status) {
      case "sent": return <Check className="h-3 w-3" />
      case "delivered": return <CheckCheck className="h-3 w-3" />
      case "read": return <CheckCheck className="h-3 w-3 text-blue-500" />
      default: return null
    }
  }

  return (
    <div className={`flex gap-3 group ${message.isOwn ? "flex-row-reverse" : ""}`}>
      {!message.isOwn && (
        <Avatar className="h-8 w-8">
          {message.sender.avatar && (
            <AvatarImage src={message.sender.avatar} alt={message.sender.name} />
          )}
          <AvatarFallback>{message.sender.initials}</AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col ${message.isOwn ? "items-end" : "items-start"} max-w-[70%]`}>
        <div
          className={`rounded-lg px-3 py-2 ${
            message.isOwn
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          }`}
        >
          <p className="text-sm">{message.content}</p>
          {message.attachments?.map(renderAttachment)}
        </div>

        <div className={`flex items-center gap-1 mt-1 ${message.isOwn ? "flex-row-reverse" : ""}`}>
          <span className="text-xs text-muted-foreground">
            {formatMessageTime(message.timestamp)}
          </span>
          {message.isOwn && <StatusIcon />}
        </div>
      </div>
    </div>
  )
}

const MessageThread: React.FC<{
  conversation?: Conversation
  messages: Message[]
  onSendMessage: (content: string, attachments?: File[]) => void
}> = ({ conversation, messages, onSendMessage }) => {
  const [messageInput, setMessageInput] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    if (messageInput.trim() || attachments.length > 0) {
      onSendMessage(messageInput.trim(), attachments)
      setMessageInput("")
      setAttachments([])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Select a conversation</h3>
          <p className="text-muted-foreground">Choose a conversation from the sidebar to start messaging</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              {conversation.avatar && (
                <AvatarImage src={conversation.avatar} alt={conversation.name} />
              )}
              <AvatarFallback>{conversation.initials}</AvatarFallback>
            </Avatar>
            {conversation.isOnline && (
              <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-green-500 text-green-500" />
            )}
          </div>
          <div>
            <h3 className="font-medium">{conversation.name}</h3>
            <p className="text-sm text-muted-foreground">
              {conversation.isTyping ? (
                "Typing..."
              ) : conversation.isOnline ? (
                "Online"
              ) : (
                `Last seen ${formatTime(conversation.timestamp)}`
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" className="h-8 w-8">
            <Phone className="h-4 w-4" />
            <span className="sr-only">Start voice call</span>
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8">
            <Video className="h-4 w-4" />
            <span className="sr-only">Start video call</span>
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">More options</span>
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {conversation.isTyping && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{conversation.initials}</AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="mb-3 space-y-2">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm flex-1 truncate">{file.name}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => removeAttachment(index)}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove {file.name}</span>
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="h-10 w-10"
          >
            <Paperclip className="h-4 w-4" />
            <span className="sr-only">Attach file</span>
          </Button>

          <div className="flex-1">
            <Textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="min-h-[40px] max-h-32 resize-none"
              aria-label="Message input"
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={!messageInput.trim() && attachments.length === 0}
            className="h-10 w-10"
            size="icon"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          aria-label="File input"
        />
      </div>
    </div>
  )
}

export default function MessagesPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string>()
  const [conversations, setConversations] = useState(mockConversations)
  const [messages, setMessages] = useState(mockMessages)
  const [searchQuery, setSearchQuery] = useState("")

  const selectedConversation = conversations.find(c => c.id === selectedConversationId)

  const handleSendMessage = (content: string, attachments?: File[]) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      timestamp: new Date(),
      sender: {
        id: "me",
        name: "John Doe",
        initials: "JD"
      },
      isOwn: true,
      status: "sent",
      attachments: attachments?.map(file => ({
        id: Date.now().toString(),
        name: file.name,
        type: file.type.startsWith("image/") ? "image" : "document",
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        url: URL.createObjectURL(file)
      }))
    }

    setMessages(prev => [...prev, newMessage])

    // Update conversation last message
    if (selectedConversationId) {
      setConversations(prev => prev.map(conv =>
        conv.id === selectedConversationId
          ? { ...conv, lastMessage: content || "📎 Attachment", timestamp: new Date() }
          : conv
      ))
    }
  }

  const breadcrumbs = [
    { label: "Messages" }
  ]

  return (
    <AppLayout title="Messages" breadcrumbs={breadcrumbs}>
      <Card className="h-[calc(100vh-12rem)]">
        <div className="flex h-full">
          {/* Conversation List */}
          <div className="w-80 border-r">
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversationId}
              onSelect={setSelectedConversationId}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>

          {/* Message Thread */}
          <div className="flex-1">
            <MessageThread
              conversation={selectedConversation}
              messages={messages}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      </Card>
    </AppLayout>
  )
}