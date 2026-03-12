import axios from 'axios'

// Azure API endpoint
const AZURE_API_BASE = 'https://climamonitor-api.azurewebsites.net/api/v1'

// Create axios instance with default config
const api = axios.create({
  baseURL: AZURE_API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout for AI responses
})

// Request interceptor for adding auth headers (when auth is implemented)
api.interceptors.request.use(
  (config) => {
    // TODO: Add X-API-Key header when auth is implemented
    // const apiKey = getApiKey()
    // if (apiKey) {
    //   config.headers['X-API-Key'] = apiKey
    // }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Transform error to consistent format
    const errorResponse = {
      error: 'unknown_error',
      message: 'An unexpected error occurred. Please try again.',
    }

    if (error.response) {
      // Server responded with an error
      errorResponse.error = error.response.data?.error || 'server_error'
      errorResponse.message = error.response.data?.message || `Server error: ${error.response.status}`
    } else if (error.request) {
      // Request made but no response
      errorResponse.error = 'network_error'
      errorResponse.message = 'Unable to connect to the server. Please check your internet connection.'
    }

    return Promise.reject(errorResponse)
  }
)

// Mock user/classroom IDs for development
const MOCK_USER_ID = 'student_mock'
const MOCK_CLASSROOM_ID = 'class_mock'

/**
 * Send a chat message and get an AI response
 * @param {string} message - The user's message
 * @param {string|null} conversationId - Optional conversation ID to continue a conversation
 * @returns {Promise<Object>} The API response with AI answer and sources
 */
export async function sendMessage(message, conversationId = null) {
  const payload = {
    message,
    user_id: MOCK_USER_ID,
    classroom_id: MOCK_CLASSROOM_ID,
  }

  if (conversationId) {
    payload.conversation_id = conversationId
  }

  const response = await api.post('/chat/completions', payload)
  return response.data
}

/**
 * Get list of conversations (for future use)
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} List of conversations
 */
export async function getConversations(params = {}) {
  const response = await api.get('/conversations', {
    params: {
      classroom_id: MOCK_CLASSROOM_ID,
      ...params,
    },
  })
  return response.data
}

export default api
