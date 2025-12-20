'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DartAiChatProps {
  connected: boolean;
  onTaskAction?: (action: string, data: unknown) => void;
}

export function DartAiChat({ connected, onTaskAction }: DartAiChatProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || !connected) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Try to send message via backend proxy if available
      const res = await fetch('/api/v1/project-management/dartai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error.message || 'Chat request failed');
        }

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.data?.response || 'I received your message, but the response format is not yet supported.',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Check if the response contains task actions
        if (data.data?.actions && Array.isArray(data.data.actions)) {
          data.data.actions.forEach((action: { type: string; data: unknown }) => {
            if (onTaskAction) {
              onTaskAction(action.type, action.data);
            }
          });
        }
      } else {
        // Fallback: show a message that chat is not yet fully integrated
        const fallbackMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content:
            'Chat integration is in progress. For now, please use the Dart-AI web interface directly. You can manage tasks using the task list above.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, fallbackMessage]);
      }
    } catch (error: unknown) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      toast({
        title: 'Chat Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!connected) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground text-center">
            Connect your Dart-AI account in settings to use the AI chat assistant
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`flex flex-col ${isMinimized ? 'h-auto' : 'h-[600px]'}`}>
      <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Dart-AI Assistant
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setIsMinimized(!isMinimized)}>
          {isMinimized ? <MessageSquare className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </CardHeader>
      {!isMinimized && (
        <>
          <CardContent className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground mb-2 font-medium">Start a conversation</p>
                <p className="text-muted-foreground text-sm">
                  Ask the AI assistant to help you manage tasks, create new tasks, or get project insights.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </CardContent>
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={loading}
              />
              <Button onClick={handleSend} disabled={loading || !input.trim()}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              Press Enter to send. The AI can help you create tasks, update status, and manage your project.
            </p>
          </div>
        </>
      )}
    </Card>
  );
}










