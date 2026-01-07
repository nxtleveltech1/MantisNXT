import { NextRequest, NextResponse } from 'next/server';

// Mock data for conversations and messages
const mockConversations = [
  {
    id: 1,
    channelId: 1,
    platform: 'facebook',
    userName: 'Kevin Steyn',
    lastMessage: 'Hi, I need to rent some equipment for a wedding next month',
    time: new Date('2024-12-07T14:30:00'),
    unread: true,
    avatar: null,
    unreadCount: 2,
    latestMessage: {
      id: 1,
      conversationId: 1,
      platform: 'facebook',
      direction: 'inbound',
      messageType: 'text',
      content: 'Hi, I need to rent some equipment for a wedding next month',
      mediaUrl: null,
      timestamp: new Date('2024-12-07T14:30:00'),
      status: 'delivered'
    }
  },
  {
    id: 2,
    channelId: 2,
    platform: 'instagram',
    userName: 'Sarah Johnson',
    lastMessage: 'Thanks for the quick response! When can I pick up the speakers?',
    time: new Date('2024-12-07T13:15:00'),
    unread: false,
    avatar: null,
    unreadCount: 0,
    latestMessage: {
      id: 2,
      conversationId: 2,
      platform: 'instagram',
      direction: 'outbound',
      messageType: 'text',
      content: 'Thanks for the quick response! When can I pick up the speakers?',
      mediaUrl: null,
      timestamp: new Date('2024-12-07T13:15:00'),
      status: 'read'
    }
  },
  {
    id: 3,
    channelId: 3,
    platform: 'whatsapp',
    userName: 'Mike Chen',
    lastMessage: 'Can you help me with a repair quote?',
    time: new Date('2024-12-07T11:45:00'),
    unread: true,
    avatar: null,
    unreadCount: 1,
    latestMessage: {
      id: 3,
      conversationId: 3,
      platform: 'whatsapp',
      direction: 'inbound',
      messageType: 'text',
      content: 'Can you help me with a repair quote?',
      mediaUrl: null,
      timestamp: new Date('2024-12-07T11:45:00'),
      status: 'delivered'
    }
  }
];

const mockMessages = {
  1: [
    {
      id: 1,
      conversationId: 1,
      platform: 'facebook',
      direction: 'inbound',
      messageType: 'text',
      content: 'Hi, I need to rent some equipment for a wedding next month',
      mediaUrl: null,
      timestamp: new Date('2024-12-07T14:30:00'),
      status: 'delivered'
    },
    {
      id: 4,
      conversationId: 1,
      platform: 'facebook',
      direction: 'inbound',
      messageType: 'text',
      content: 'I\'m looking at speakers, microphones, and lighting setup',
      mediaUrl: null,
      timestamp: new Date('2024-12-07T14:31:00'),
      status: 'delivered'
    },
    {
      id: 5,
      conversationId: 1,
      platform: 'facebook',
      direction: 'outbound',
      messageType: 'text',
      content: 'Hi Kevin! We\'d be happy to help with your wedding equipment rental. Let me check our availability for next month.',
      mediaUrl: null,
      timestamp: new Date('2024-12-07T14:35:00'),
      status: 'read'
    }
  ],
  2: [
    {
      id: 2,
      conversationId: 2,
      platform: 'instagram',
      direction: 'outbound',
      messageType: 'text',
      content: 'Thanks for the quick response! When can I pick up the speakers?',
      mediaUrl: null,
      timestamp: new Date('2024-12-07T13:15:00'),
      status: 'read'
    }
  ],
  3: [
    {
      id: 3,
      conversationId: 3,
      platform: 'whatsapp',
      direction: 'inbound',
      messageType: 'text',
      content: 'Can you help me with a repair quote?',
      mediaUrl: null,
      timestamp: new Date('2024-12-07T11:45:00'),
      status: 'delivered'
    }
  ]
};

/**
 * GET /api/social-media/messages
 * Get messages for a conversation or all conversations
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId");

    if (conversationId) {
      // Get messages for a specific conversation
      const conversationIdNum = parseInt(conversationId);
      const messages = mockMessages[conversationIdNum as keyof typeof mockMessages] || [];

      return NextResponse.json({ messages });
    }

    // Get all conversations
    return NextResponse.json({ conversations: mockConversations });
  } catch (error: any) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social-media/messages
 * Send a message to a conversation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      conversationId,
      channelId,
      platform,
      content,
      messageType = "text",
      mediaUrl,
      attachments,
      quickReplies,
    } = body;

    if (!conversationId || !platform || !content) {
      return NextResponse.json(
        { error: "Missing required fields: conversationId, platform, content" },
        { status: 400 }
      );
    }

    // Create a new message
    const newMessage = {
      id: Date.now(),
      conversationId: parseInt(conversationId),
      channelId: channelId ? parseInt(channelId) : null,
      platform,
      direction: "outbound" as const,
      messageType,
      content,
      mediaUrl,
      attachments,
      quickReplies,
      status: "sent",
      timestamp: new Date(),
    };

    // Add to mock messages
    const conversationIdNum = parseInt(conversationId);
    if (!mockMessages[conversationIdNum as keyof typeof mockMessages]) {
      mockMessages[conversationIdNum as keyof typeof mockMessages] = [];
    }
    mockMessages[conversationIdNum as keyof typeof mockMessages].push(newMessage);

    // Update conversation
    const conversation = mockConversations.find(c => c.id === conversationIdNum);
    if (conversation) {
      conversation.lastMessage = content;
      conversation.time = new Date();
      conversation.latestMessage = newMessage;
    }

    return NextResponse.json({ message: newMessage, success: true });
  } catch (error: any) {
    console.error("Failed to send message:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}
