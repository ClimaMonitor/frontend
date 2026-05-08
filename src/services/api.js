import axios from 'axios'

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout for AI responses
})

let accessTokenProvider = null

export function setAccessTokenProvider(provider) {
  accessTokenProvider = provider
}

api.interceptors.request.use(async (config) => {
  if (config.skipAuth) {
    return config
  }

  if (!accessTokenProvider) {
    return config
  }

  try {
    const authContext = await accessTokenProvider()
    const token = authContext?.token ?? null
    const allowAnonymousRequest = authContext?.allowAnonymousRequest === true

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      return config
    }

    if (allowAnonymousRequest) {
      return config
    }
  } catch (error) {
    return Promise.reject(error)
  }

  return Promise.reject(new Error('Authentication is required for this request.'))
})

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

// User/classroom IDs (from environment)
const USER_ID = import.meta.env.VITE_USER_ID || 'student_mock'
const CLASSROOM_ID = import.meta.env.VITE_CLASSROOM_ID || 'class_mock'

/**
 * Send a chat message and get an AI response
 * @param {string} message - The user's message
 * @param {string|null} conversationId - Optional conversation ID to continue a conversation
 * @returns {Promise<Object>} The API response with AI answer and sources
 */
export async function sendMessage(message, conversationId = null, options = {}) {
  const payload = { message }

  if (options.allowAnonymousRequest) {
    payload.user_id = USER_ID
    payload.classroom_id = CLASSROOM_ID
  }

  if (conversationId) {
    payload.conversation_id = conversationId
  }

  const response = await api.post('/chat/completions', payload, {
    adapter: options.adapter,
    signal: options.signal,
  })
  return response.data
}

export async function createGuestSession(options = {}) {
  const response = await api.post('/guest/sessions', null, {
    adapter: options.adapter,
    signal: options.signal,
    skipAuth: true,
  })
  return response.data
}

export async function getChatHistory(options = {}) {
  const response = await api.get('/chat/history', {
    adapter: options.adapter,
    headers: options.accessToken
      ? { Authorization: `Bearer ${options.accessToken}` }
      : undefined,
    signal: options.signal,
    params: {
      limit: options.limit ?? 50,
    },
  })
  return response.data
}

export async function getCurrentUser(options = {}) {
  const response = await api.get('/me', {
    adapter: options.adapter,
    signal: options.signal,
  })
  return response.data
}

export async function getManagementUsers(options = {}) {
  const response = await api.get('/management/users', {
    adapter: options.adapter,
    signal: options.signal,
  })
  return response.data
}

export async function updateManagementUser(userId, patch, options = {}) {
  const response = await api.patch(`/management/users/${userId}`, patch, {
    adapter: options.adapter,
    signal: options.signal,
  })
  return response.data
}

export async function getManagementClassrooms(options = {}) {
  const response = await api.get('/management/classrooms', {
    adapter: options.adapter,
    signal: options.signal,
  })
  return response.data
}

export async function createManagementClassroom(payload, options = {}) {
  const response = await api.post('/management/classrooms', payload, {
    adapter: options.adapter,
    signal: options.signal,
  })
  return response.data
}

export async function updateManagementClassroom(classroomId, patch, options = {}) {
  const response = await api.patch(`/management/classrooms/${classroomId}`, patch, {
    adapter: options.adapter,
    signal: options.signal,
  })
  return response.data
}

export async function upsertClassroomMember(classroomId, payload, options = {}) {
  const response = await api.put(`/management/classrooms/${classroomId}/members`, payload, {
    adapter: options.adapter,
    signal: options.signal,
  })
  return response.data
}

export async function removeClassroomMember(classroomId, userId, options = {}) {
  const response = await api.delete(`/management/classrooms/${classroomId}/members/${userId}`, {
    adapter: options.adapter,
    signal: options.signal,
  })
  return response.data
}

export async function getTeacherClassrooms(options = {}) {
  const response = await api.get('/teacher/classrooms', {
    adapter: options.adapter,
    signal: options.signal,
  })
  return response.data
}

export async function getTeacherClassroomStudents(classroomId, options = {}) {
  const response = await api.get(`/teacher/classrooms/${classroomId}/students`, {
    adapter: options.adapter,
    signal: options.signal,
  })
  return response.data
}

export async function getTeacherStudentChatHistory(classroomId, studentId, options = {}) {
  const response = await api.get(`/teacher/classrooms/${classroomId}/students/${studentId}/chat/history`, {
    adapter: options.adapter,
    signal: options.signal,
    params: {
      limit: options.limit ?? 50,
    },
  })
  return response.data
}

export default api
