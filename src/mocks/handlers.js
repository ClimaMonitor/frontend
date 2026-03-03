import { http, HttpResponse, delay } from 'msw'
import { findMockResponse, generateId } from './data.js'

// Store conversation state in memory
const conversations = new Map()

export const handlers = [
  // Chat completion endpoint
  http.post('/api/v1/chat/completions', async ({ request }) => {
    // Simulate network delay (1-2 seconds)
    await delay(1000 + Math.random() * 1000)

    const body = await request.json()
    const { message, conversation_id, user_id, classroom_id } = body

    // Validate required fields
    if (!message || message.trim() === '') {
      return HttpResponse.json(
        { error: 'invalid_message', message: 'Message cannot be empty.' },
        { status: 400 }
      )
    }

    if (message.length > 1000) {
      return HttpResponse.json(
        { error: 'invalid_message', message: 'Message exceeds 1000 character limit.' },
        { status: 400 }
      )
    }

    // Get or create conversation
    let convId = conversation_id
    if (!convId) {
      convId = generateId('conv')
      conversations.set(convId, {
        id: convId,
        user_id,
        classroom_id,
        messages: []
      })
    }

    // Get mock response based on message content
    const mockData = findMockResponse(message)
    const messageId = generateId('msg')

    // Store messages in conversation
    const conversation = conversations.get(convId)
    if (conversation) {
      conversation.messages.push(
        { role: 'user', content: message },
        { role: 'assistant', content: mockData.response, sources: mockData.sources }
      )
    }

    return HttpResponse.json({
      conversation_id: convId,
      message_id: messageId,
      response: mockData.response,
      sources: mockData.sources,
      created_at: new Date().toISOString()
    })
  }),

  // Get conversations list (for future use)
  http.get('/api/v1/conversations', async ({ request }) => {
    await delay(500)

    const url = new URL(request.url)
    const classroomId = url.searchParams.get('classroom_id')

    const conversationList = Array.from(conversations.values())
      .filter(conv => !classroomId || conv.classroom_id === classroomId)
      .map(conv => ({
        conversation_id: conv.id,
        user_id: conv.user_id,
        classroom_id: conv.classroom_id,
        title: conv.messages[0]?.content.slice(0, 50) + '...' || 'New conversation',
        message_count: conv.messages.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

    return HttpResponse.json({
      conversations: conversationList,
      total: conversationList.length,
      limit: 20,
      offset: 0
    })
  })
]
