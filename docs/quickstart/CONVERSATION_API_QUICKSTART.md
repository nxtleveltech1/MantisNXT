# AI Conversation API - Quick Start Guide

**⚡ 5-Minute Integration Guide**

---

## Enable Persistence (1 line change)

### Before
```typescript
fetch('/api/ai/chat', {
  method: 'POST',
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello AI!' }]
  })
})
```

### After
```typescript
fetch('/api/ai/chat', {
  method: 'POST',
  body: JSON.stringify({
    conversationId: 'conv_user123_' + Date.now(),  // Add unique ID
    messages: [{ role: 'user', content: 'Hello AI!' }],
    persistHistory: true  // Enable persistence ✅
  })
})
```

**That's it!** Messages are now automatically saved.

---

## Common Operations

### 1. Retrieve Conversation History

```typescript
const response = await fetch(
  `/api/v1/ai/conversations/${conversationId}`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
)

const { data } = await response.json()
console.log('Messages:', data.messages)
console.log('Total:', data.total)
```

### 2. List All Conversations

```typescript
const response = await fetch(
  '/api/v1/ai/conversations?limit=20',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
)

const { data } = await response.json()
data.conversations.forEach((conv) => {
  console.log(`${conv.messageCount} messages - ${conv.firstMessage.slice(0, 50)}`)
})
```

### 3. Search Conversations

```typescript
const response = await fetch(
  '/api/v1/ai/conversations/search?q=inventory+management',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
)

const { data } = await response.json()
data.results.forEach((result) => {
  console.log(`[${result.role}] ${result.content}`)
  console.log(`Relevance: ${result.relevanceScore.toFixed(2)}`)
})
```

### 4. Delete Conversation

```typescript
await fetch(
  `/api/v1/ai/conversations/${conversationId}`,
  {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  }
)
```

---

## Complete React Example

```typescript
import { useState, useEffect } from 'react'

function ChatWithHistory() {
  const [conversationId] = useState(() => `conv_${Date.now()}`)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')

  // Load existing messages
  useEffect(() => {
    fetch(`/api/v1/ai/conversations/${conversationId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.data.messages.length > 0) {
          setMessages(data.data.messages)
        }
      })
  }, [conversationId])

  // Send message
  const sendMessage = async () => {
    const userMessage = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')

    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        conversationId,
        messages: [userMessage],
        persistHistory: true,  // ✅ Auto-save
        stream: false
      })
    })

    const data = await response.json()
    const assistantMessage = {
      role: 'assistant',
      content: data.data.response.message
    }

    setMessages((prev) => [...prev, assistantMessage])
    // No need to manually save - it's automatic! ✅
  }

  return (
    <div>
      <div>
        {messages.map((msg, i) => (
          <div key={i}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  )
}
```

---

## Streaming Example

```typescript
async function streamChat() {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      conversationId: 'conv_stream_123',
      messages: [{ role: 'user', content: 'Explain AI' }],
      persistHistory: true,  // ✅ Will save after stream completes
      stream: true
    })
  })

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let fullResponse = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6))

        if (data.type === 'content') {
          fullResponse += data.content
          console.log(data.content)  // Display chunk
        }
      }
    }
  }

  // fullResponse is automatically saved ✅
  console.log('Stream complete and saved!')
}
```

---

## All API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ai/chat` | POST | Chat with auto-persistence |
| `/api/v1/ai/conversations` | GET | List conversations |
| `/api/v1/ai/conversations` | POST | Save message manually |
| `/api/v1/ai/conversations/{id}` | GET | Get messages |
| `/api/v1/ai/conversations/{id}` | DELETE | Delete conversation |
| `/api/v1/ai/conversations/{id}/context` | GET | Get context |
| `/api/v1/ai/conversations/history` | GET | Get history summary |
| `/api/v1/ai/conversations/search` | GET | Search messages |

---

## Query Parameters

### List Conversations
```
GET /api/v1/ai/conversations?limit=50&offset=0&fromDate=2025-01-01
```

### Search
```
GET /api/v1/ai/conversations/search?q=inventory&limit=20
```

### Get Messages
```
GET /api/v1/ai/conversations/{id}?limit=100
```

---

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 42,
    "hasMore": false
  }
}
```

### Error
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## TypeScript Types

```typescript
interface ConversationMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  context?: Record<string, any>
  createdAt: Date
}

interface ConversationSummary {
  conversationId: string
  messageCount: number
  firstMessage: string
  lastMessage: string
  createdAt: Date
  lastUpdated: Date
}

interface ConversationSearchResult {
  conversationId: string
  messageId: string
  role: string
  content: string
  createdAt: Date
  relevanceScore?: number
}
```

---

## Testing

### Run Integration Tests
```bash
npx ts-node scripts/test-conversation-api.ts
```

### Manual Test
```bash
# List conversations
curl -X GET "http://localhost:3000/api/v1/ai/conversations?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search
curl -X GET "http://localhost:3000/api/v1/ai/conversations/search?q=inventory" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Best Practices

### 1. Generate Unique Conversation IDs

```typescript
function generateConversationId(userId: string) {
  return `conv_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
```

### 2. Handle Errors Gracefully

```typescript
try {
  const response = await fetch('/api/ai/chat', { ... })
  const data = await response.json()

  if (!data.success) {
    console.error('Chat failed:', data.error)
    // Show user-friendly error
  }
} catch (error) {
  console.error('Network error:', error)
  // Show retry option
}
```

### 3. Implement Pagination

```typescript
async function loadAllConversations() {
  let offset = 0
  const limit = 50
  const allConversations = []

  while (true) {
    const response = await fetch(
      `/api/v1/ai/conversations?limit=${limit}&offset=${offset}`
    )
    const data = await response.json()

    allConversations.push(...data.data.conversations)

    if (!data.pagination.hasMore) break
    offset += limit
  }

  return allConversations
}
```

### 4. Cache Conversation Lists

```typescript
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

let conversationCache = null
let cacheTimestamp = 0

async function getCachedConversations() {
  if (conversationCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return conversationCache
  }

  const response = await fetch('/api/v1/ai/conversations')
  const data = await response.json()

  conversationCache = data.data.conversations
  cacheTimestamp = Date.now()

  return conversationCache
}
```

---

## Common Patterns

### Pattern 1: Session-Based Conversations

```typescript
// One conversation per session
const sessionConversationId = `conv_${userId}_session_${sessionId}`

// Use same ID for entire session
await sendMessage(sessionConversationId, 'First question')
await sendMessage(sessionConversationId, 'Follow-up question')
// All messages grouped under same conversation
```

### Pattern 2: Topic-Based Conversations

```typescript
// New conversation per topic
function startNewConversation(topic: string) {
  return `conv_${userId}_${topic}_${Date.now()}`
}

const inventoryConvId = startNewConversation('inventory')
const suppliersConvId = startNewConversation('suppliers')
```

### Pattern 3: Date-Based Conversations

```typescript
// One conversation per day
function getDailyConversationId() {
  const today = new Date().toISOString().split('T')[0]
  return `conv_${userId}_${today}`
}
```

---

## Performance Tips

1. **Use limits:** Don't fetch all messages at once
   ```typescript
   fetch(`/api/v1/ai/conversations/${id}?limit=50`)
   ```

2. **Implement pagination:** For large lists
   ```typescript
   fetch('/api/v1/ai/conversations?limit=20&offset=0')
   ```

3. **Cache results:** Reduce API calls
   ```typescript
   // Cache conversation list for 5 minutes
   ```

4. **Use search wisely:** Full-text search is powerful but can be slow
   ```typescript
   // Specific search queries, not overly broad
   fetch('/api/v1/ai/conversations/search?q=specific+term')
   ```

---

## Troubleshooting

### Problem: Messages not saving

**Check:**
- Is `persistHistory: true` set?
- Is user authenticated?
- Check console for errors

### Problem: Can't find conversation

**Check:**
- Is `conversationId` correct?
- Does conversation belong to current user?
- Check organization isolation

### Problem: Search returns no results

**Check:**
- Is search query valid?
- Does content exist?
- Try simpler search terms

---

## Next Steps

1. ✅ Read full API docs: `docs/api/AI_CONVERSATION_API.md`
2. ✅ Review implementation: `docs/implementation/AI_CONVERSATION_SERVICE_IMPLEMENTATION.md`
3. ✅ Run tests: `npx ts-node scripts/test-conversation-api.ts`
4. ✅ Start building! 🚀

---

**Need Help?**
- 📖 Full API Documentation: `docs/api/AI_CONVERSATION_API.md`
- 🔧 Implementation Guide: `docs/implementation/AI_CONVERSATION_SERVICE_IMPLEMENTATION.md`
- ✅ Complete Summary: `CONVERSATION_SERVICE_COMPLETE.md`

**Happy Coding!** 🎉
