/**
 * AI Conversation API Test Script
 *
 * Test all conversation endpoints with production scenarios
 *
 * Usage:
 *   npx ts-node scripts/test-conversation-api.ts
 */

import { conversationService } from '@/lib/ai/services/conversation-service'

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_ORG_ID = 'org_test_123'
const TEST_USER_ID = 'user_test_456'
const TEST_CONVERSATION_ID = `conv_test_${Date.now()}`

// ============================================================================
// Test Utilities
// ============================================================================

function logTest(name: string, status: 'PASS' | 'FAIL', message?: string) {
  const icon = status === 'PASS' ? '✓' : '✗'
  const color = status === 'PASS' ? '\x1b[32m' : '\x1b[31m'
  console.log(`${color}${icon}\x1b[0m ${name}${message ? `: ${message}` : ''}`)
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ============================================================================
// Test Cases
// ============================================================================

async function testSaveMessage() {
  console.log('\n=== Test 1: Save Message ===')

  try {
    const message = await conversationService.saveMessage(
      TEST_ORG_ID,
      TEST_USER_ID,
      TEST_CONVERSATION_ID,
      'user',
      'What are the best practices for inventory management?',
      {
        timestamp: new Date().toISOString(),
        source: 'test_script',
      }
    )

    if (message && message.conversationId === TEST_CONVERSATION_ID) {
      logTest('Save user message', 'PASS', `ID: ${message.id}`)
      return true
    } else {
      logTest('Save user message', 'FAIL', 'Message not saved')
      return false
    }
  } catch (error) {
    logTest('Save user message', 'FAIL', (error as Error).message)
    return false
  }
}

async function testSaveAssistantMessage() {
  console.log('\n=== Test 2: Save Assistant Message ===')

  try {
    const message = await conversationService.saveMessage(
      TEST_ORG_ID,
      TEST_USER_ID,
      TEST_CONVERSATION_ID,
      'assistant',
      'Here are the best practices for inventory management: 1) Regular stock audits, 2) Implement FIFO/LIFO, 3) Use demand forecasting...',
      {
        provider: 'openai',
        model: 'gpt-4o',
        tokenUsage: {
          promptTokens: 45,
          completionTokens: 123,
          totalTokens: 168,
        },
        timestamp: new Date().toISOString(),
      }
    )

    if (message && message.role === 'assistant') {
      logTest('Save assistant message', 'PASS', `Tokens: ${message.context?.tokenUsage?.totalTokens}`)
      return true
    } else {
      logTest('Save assistant message', 'FAIL')
      return false
    }
  } catch (error) {
    logTest('Save assistant message', 'FAIL', (error as Error).message)
    return false
  }
}

async function testGetConversationHistory() {
  console.log('\n=== Test 3: Get Conversation History ===')

  try {
    const messages = await conversationService.getConversationHistory(
      TEST_ORG_ID,
      TEST_USER_ID,
      TEST_CONVERSATION_ID
    )

    if (messages.length >= 2) {
      logTest('Get conversation history', 'PASS', `Found ${messages.length} messages`)
      console.log(`   First: ${messages[0].role} - ${messages[0].content.slice(0, 50)}...`)
      console.log(`   Last: ${messages[messages.length - 1].role} - ${messages[messages.length - 1].content.slice(0, 50)}...`)
      return true
    } else {
      logTest('Get conversation history', 'FAIL', `Expected 2+ messages, got ${messages.length}`)
      return false
    }
  } catch (error) {
    logTest('Get conversation history', 'FAIL', (error as Error).message)
    return false
  }
}

async function testListConversations() {
  console.log('\n=== Test 4: List Conversations ===')

  try {
    const conversations = await conversationService.listConversations(
      TEST_ORG_ID,
      TEST_USER_ID,
      { limit: 10 }
    )

    const testConv = conversations.find((c) => c.conversationId === TEST_CONVERSATION_ID)

    if (testConv) {
      logTest('List conversations', 'PASS', `Found ${conversations.length} total, test conv has ${testConv.messageCount} messages`)
      return true
    } else {
      logTest('List conversations', 'FAIL', 'Test conversation not found in list')
      return false
    }
  } catch (error) {
    logTest('List conversations', 'FAIL', (error as Error).message)
    return false
  }
}

async function testSearchConversations() {
  console.log('\n=== Test 5: Search Conversations ===')

  try {
    const results = await conversationService.searchConversations(
      TEST_ORG_ID,
      TEST_USER_ID,
      'inventory management'
    )

    const found = results.some((r) => r.conversationId === TEST_CONVERSATION_ID)

    if (found) {
      logTest('Search conversations', 'PASS', `Found ${results.length} results`)
      results.slice(0, 3).forEach((r) => {
        console.log(`   - [${r.role}] Relevance: ${r.relevanceScore?.toFixed(4)} - ${r.content.slice(0, 60)}...`)
      })
      return true
    } else {
      logTest('Search conversations', 'FAIL', 'Test conversation not found in search results')
      return false
    }
  } catch (error) {
    logTest('Search conversations', 'FAIL', (error as Error).message)
    return false
  }
}

async function testGetConversationContext() {
  console.log('\n=== Test 6: Get Conversation Context ===')

  try {
    const context = await conversationService.getConversationContext(TEST_CONVERSATION_ID)

    if (context && Object.keys(context).length > 0) {
      logTest('Get conversation context', 'PASS', `Keys: ${Object.keys(context).join(', ')}`)
      console.log('   Context sample:', JSON.stringify(context, null, 2).slice(0, 200))
      return true
    } else {
      logTest('Get conversation context', 'FAIL', 'No context returned')
      return false
    }
  } catch (error) {
    logTest('Get conversation context', 'FAIL', (error as Error).message)
    return false
  }
}

async function testMultipleConversations() {
  console.log('\n=== Test 7: Multiple Conversations ===')

  const conversations = [
    { id: `conv_test_a_${Date.now()}`, topic: 'supplier management' },
    { id: `conv_test_b_${Date.now() + 1}`, topic: 'demand forecasting' },
    { id: `conv_test_c_${Date.now() + 2}`, topic: 'pricing optimization' },
  ]

  try {
    for (const conv of conversations) {
      await conversationService.saveMessage(
        TEST_ORG_ID,
        TEST_USER_ID,
        conv.id,
        'user',
        `Tell me about ${conv.topic}`,
        { topic: conv.topic }
      )

      await sleep(100)

      await conversationService.saveMessage(
        TEST_ORG_ID,
        TEST_USER_ID,
        conv.id,
        'assistant',
        `Here's information about ${conv.topic}...`,
        { provider: 'openai', topic: conv.topic }
      )
    }

    const list = await conversationService.listConversations(TEST_ORG_ID, TEST_USER_ID, { limit: 50 })

    const foundAll = conversations.every((conv) =>
      list.some((c) => c.conversationId === conv.id)
    )

    if (foundAll) {
      logTest('Create multiple conversations', 'PASS', `Created and verified ${conversations.length} conversations`)
      return true
    } else {
      logTest('Create multiple conversations', 'FAIL', 'Not all conversations found')
      return false
    }
  } catch (error) {
    logTest('Create multiple conversations', 'FAIL', (error as Error).message)
    return false
  }
}

async function testDeleteConversation() {
  console.log('\n=== Test 8: Delete Conversation ===')

  try {
    const deletedCount = await conversationService.deleteConversation(TEST_CONVERSATION_ID)

    if (deletedCount > 0) {
      logTest('Delete conversation', 'PASS', `Deleted ${deletedCount} messages`)

      // Verify deletion
      const messages = await conversationService.getConversationHistory(
        TEST_ORG_ID,
        TEST_USER_ID,
        TEST_CONVERSATION_ID
      )

      if (messages.length === 0) {
        logTest('Verify deletion', 'PASS', 'Conversation successfully deleted')
        return true
      } else {
        logTest('Verify deletion', 'FAIL', `Still found ${messages.length} messages`)
        return false
      }
    } else {
      logTest('Delete conversation', 'FAIL', 'No messages deleted')
      return false
    }
  } catch (error) {
    logTest('Delete conversation', 'FAIL', (error as Error).message)
    return false
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests() {
  console.log('\n')
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║        AI Conversation Service - Integration Tests        ║')
  console.log('╚════════════════════════════════════════════════════════════╝')

  const results: boolean[] = []

  results.push(await testSaveMessage())
  results.push(await testSaveAssistantMessage())
  results.push(await testGetConversationHistory())
  results.push(await testListConversations())
  results.push(await testSearchConversations())
  results.push(await testGetConversationContext())
  results.push(await testMultipleConversations())
  results.push(await testDeleteConversation())

  const passed = results.filter((r) => r).length
  const total = results.length
  const percentage = ((passed / total) * 100).toFixed(1)

  console.log('\n')
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log(`║  Test Results: ${passed}/${total} passed (${percentage}%)                       ║`)
  console.log('╚════════════════════════════════════════════════════════════╝')

  if (passed === total) {
    console.log('\n✓ All tests passed! Production ready.\n')
    process.exit(0)
  } else {
    console.log(`\n✗ ${total - passed} test(s) failed. Review errors above.\n`)
    process.exit(1)
  }
}

// ============================================================================
// Execute Tests
// ============================================================================

runAllTests().catch((error) => {
  console.error('\n✗ Test runner failed:', error)
  process.exit(1)
})
