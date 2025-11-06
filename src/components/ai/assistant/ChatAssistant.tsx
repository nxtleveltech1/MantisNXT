"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, Bot, User } from 'lucide-react'

type Role = 'user' | 'assistant' | 'system'
interface Message { role: Role; content: string }

export default function ChatAssistant() {
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'You are the MantisNXT AI assistant. Be concise and helpful.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text) return
    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, messages: next, stream: false }),
      })
      const raw = await res.text()
      let data: any = undefined
      try { data = raw ? JSON.parse(raw) : undefined } catch {}

      if (!res.ok) {
        const errMsg = data?.error || raw || `${res.status} ${res.statusText}`
        throw new Error(errMsg)
      }
      if (!data?.success) {
        throw new Error(data?.error || 'Chat failed')
      }

      // Try multiple shapes for assistant content
      const resp = data?.data?.response
      const assistantText: string = resp?.data?.text || resp?.text || data?.data?.text || ''
      if (assistantText) {
        setMessages((prev) => [...prev, { role: 'assistant', content: assistantText }])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'No content returned from provider.' }])
      }
      if (data?.data?.conversationId) setConversationId(data.data.conversationId)
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${e?.message || 'Unknown error'}` }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey)) || (e.key === 'Enter' && !e.shiftKey)) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <Card className="w-full h-[calc(100vh-12rem)] max-h-[900px] flex flex-col">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> AI Assistant</CardTitle>
        {conversationId && <Badge variant="secondary">Session: {conversationId.slice(0, 8)}</Badge>}
      </CardHeader>
      <CardContent className="flex flex-col h-full">
        <div ref={scrollRef} className="flex-1 overflow-auto rounded border p-4 space-y-4 bg-background">
          {messages.filter(m => m.role !== 'system').map((m, idx) => (
            <div key={idx} className={`flex items-start gap-3 ${m.role === 'assistant' ? '' : 'justify-end'}`}>
              {m.role === 'assistant' && <Bot className="h-4 w-4 mt-1 text-blue-600" />}
              <div className={`max-w-[80%] whitespace-pre-wrap rounded-md px-3 py-2 text-sm ${m.role === 'assistant' ? 'bg-blue-50 text-blue-900' : 'bg-gray-100 text-gray-900'}`}>{m.content}</div>
              {m.role === 'user' && <User className="h-4 w-4 mt-1 text-gray-600" />}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-end gap-2">
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} rows={2} placeholder="Ask something... (Enter to send, Shift+Enter for new line)" />
          <Button onClick={send} disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
