import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react'
import { sendMessage as apiSendMessage } from '../services/api.js'

// Action types
const ACTIONS = {
  ADD_USER_MESSAGE: 'ADD_USER_MESSAGE',
  ADD_ASSISTANT_MESSAGE: 'ADD_ASSISTANT_MESSAGE',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  CLEAR_CONVERSATION: 'CLEAR_CONVERSATION',
  SET_CONVERSATION_ID: 'SET_CONVERSATION_ID',
}

// Initial state
const initialState = {
  messages: [],
  conversationId: null,
  isLoading: false,
  error: null,
}

// Reducer
function chatReducer(state, action) {
  switch (action.type) {
    case ACTIONS.ADD_USER_MESSAGE:
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: action.payload.id,
            role: 'user',
            content: action.payload.content,
            timestamp: action.payload.timestamp,
          },
        ],
      }

    case ACTIONS.ADD_ASSISTANT_MESSAGE:
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: action.payload.id,
            role: 'assistant',
            content: action.payload.content,
            sources: action.payload.sources,
            timestamp: action.payload.timestamp,
          },
        ],
      }

    case ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      }

    case ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      }

    case ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      }

    case ACTIONS.SET_CONVERSATION_ID:
      return {
        ...state,
        conversationId: action.payload,
      }

    case ACTIONS.CLEAR_CONVERSATION:
      return {
        ...initialState,
      }

    default:
      return state
  }
}

// Create context
const ChatContext = createContext(null)

// Provider component
export function ChatProvider({
  children,
  allowAnonymousRequests = false,
  onGuestSessionUpdate,
}) {
  const [state, dispatch] = useReducer(chatReducer, initialState)
  const activeRequestIdRef = useRef(0)
  const activeAbortControllerRef = useRef(null)

  useEffect(() => {
    return () => {
      activeAbortControllerRef.current?.abort()
    }
  }, [])

  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || state.isLoading) return

    const requestId = activeRequestIdRef.current + 1
    activeRequestIdRef.current = requestId

    const abortController = new AbortController()
    activeAbortControllerRef.current = abortController

    // Generate temporary ID for user message
    const userMessageId = `user_${Date.now()}`

    // Add user message immediately
    dispatch({
      type: ACTIONS.ADD_USER_MESSAGE,
      payload: {
        id: userMessageId,
        content: content.trim(),
        timestamp: new Date().toISOString(),
      },
    })

    // Set loading state
    dispatch({ type: ACTIONS.SET_LOADING, payload: true })
    dispatch({ type: ACTIONS.CLEAR_ERROR })

    try {
      // Call API
      const response = await apiSendMessage(content, state.conversationId, {
        allowAnonymousRequest: allowAnonymousRequests,
        signal: abortController.signal,
      })

      if (requestId !== activeRequestIdRef.current) {
        return
      }

      // Update conversation ID if this is a new conversation
      if (!state.conversationId && response.conversation_id) {
        dispatch({
          type: ACTIONS.SET_CONVERSATION_ID,
          payload: response.conversation_id,
        })
      }

      // Add assistant message
      dispatch({
        type: ACTIONS.ADD_ASSISTANT_MESSAGE,
        payload: {
          id: response.message_id,
          content: response.response,
          sources: response.sources,
          timestamp: response.created_at,
        },
      })

      if (response.guest && onGuestSessionUpdate) {
        onGuestSessionUpdate(response.guest)
      }
    } catch (error) {
      if (requestId !== activeRequestIdRef.current || error.code === 'ERR_CANCELED') {
        return
      }

      if (error.error === 'guest_prompt_limit_reached' && onGuestSessionUpdate) {
        onGuestSessionUpdate({ prompts_remaining: 0 })
      }

      dispatch({
        type: ACTIONS.SET_ERROR,
        payload: error.message || 'Failed to send message. Please try again.',
      })
    } finally {
      if (requestId !== activeRequestIdRef.current) {
        return
      }

      activeAbortControllerRef.current = null
      dispatch({ type: ACTIONS.SET_LOADING, payload: false })
    }
  }, [allowAnonymousRequests, onGuestSessionUpdate, state.conversationId, state.isLoading])

  const clearConversation = useCallback(() => {
    activeRequestIdRef.current += 1
    activeAbortControllerRef.current?.abort()
    activeAbortControllerRef.current = null
    dispatch({ type: ACTIONS.CLEAR_CONVERSATION })
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_ERROR })
  }, [])

  const value = {
    messages: state.messages,
    conversationId: state.conversationId,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage,
    clearConversation,
    clearError,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

// Hook to use chat context
export function useChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}

export default ChatContext
