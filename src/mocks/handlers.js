import { http, HttpResponse, delay } from 'msw'
import { generateId } from './data.js'

// Store conversation state in memory
const conversations = new Map()

// Chat completions now handled by Azure API - no mock needed

export const handlers = [
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
