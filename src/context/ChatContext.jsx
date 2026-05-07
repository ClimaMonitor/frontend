import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react'
import {
  getChatHistory,
  sendMessage as apiSendMessage,
} from '../services/api.js'

// Action types
const ACTIONS = {
  ADD_USER_MESSAGE: 'ADD_USER_MESSAGE',
  ADD_ASSISTANT_MESSAGE: 'ADD_ASSISTANT_MESSAGE',
  SET_LOADING: 'SET_LOADING',
  SET_HISTORY_LOADING: 'SET_HISTORY_LOADING',
  SET_HISTORY: 'SET_HISTORY',
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
  isHistoryLoading: false,
  error: null,
}

const CHAT_HISTORY_CLEARED_AT_PREFIX = 'climamonitor.chatHistoryClearedAt'

function getClearedAtStorageKey(historyStorageKey) {
  return historyStorageKey ? `${CHAT_HISTORY_CLEARED_AT_PREFIX}.${historyStorageKey}` : null
}

function readHistoryClearedAt(historyStorageKey) {
  const storageKey = getClearedAtStorageKey(historyStorageKey)
  if (!storageKey) return null

  try {
    return window.localStorage.getItem(storageKey)
  } catch {
    return null
  }
}

function writeHistoryClearedAt(historyStorageKey, clearedAt) {
  const storageKey = getClearedAtStorageKey(historyStorageKey)
  if (!storageKey) return

  try {
    window.localStorage.setItem(storageKey, clearedAt)
  } catch {
    // Clearing is still useful for the current tab even if browser storage is unavailable.
  }
}

function filterHistoryRowsAfterClear(historyRows = [], clearedAt = null) {
  if (!clearedAt) return historyRows

  const clearedTime = new Date(clearedAt).getTime()
  if (!Number.isFinite(clearedTime)) return historyRows

  return historyRows.filter((row) => {
    const rowTime = new Date(row.created_at || 0).getTime()
    return Number.isFinite(rowTime) && rowTime > clearedTime
  })
}

function parseSources(sources) {
  if (!sources) return []
  if (Array.isArray(sources)) return sources

  if (typeof sources === 'string') {
    try {
      const parsedSources = JSON.parse(sources)
      return Array.isArray(parsedSources) ? parsedSources : []
    } catch {
      return []
    }
  }

  return []
}

function buildHistoryMessageId(row, role, index) {
  const baseId = row.chat_history_id || row.conversation_id || row.created_at || `history_${index}`
  return `${baseId}_${role}`
}

export function mapHistoryRowsToMessages(historyRows = []) {
  return [...historyRows]
    .sort((first, second) => {
      const firstTime = new Date(first.created_at || 0).getTime()
      const secondTime = new Date(second.created_at || 0).getTime()
      return firstTime - secondTime
    })
    .flatMap((row, index) => ([
      {
        id: buildHistoryMessageId(row, 'user', index),
        role: 'user',
        content: row.query_text || '',
        timestamp: row.created_at,
      },
      {
        id: buildHistoryMessageId(row, 'assistant', index),
        role: 'assistant',
        content: row.response_text || row.reason || '',
        sources: parseSources(row.sources),
        timestamp: row.created_at,
      },
    ]))
}

function getLatestConversationId(historyRows = []) {
  const latestRow = [...historyRows]
    .filter((row) => row.conversation_id)
    .sort((first, second) => {
      const firstTime = new Date(first.created_at || 0).getTime()
      const secondTime = new Date(second.created_at || 0).getTime()
      return secondTime - firstTime
    })[0]

  return latestRow?.conversation_id || null
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

    case ACTIONS.SET_HISTORY_LOADING:
      return {
        ...state,
        isHistoryLoading: action.payload,
      }

    case ACTIONS.SET_HISTORY:
      return {
        ...state,
        messages: action.payload.messages,
        conversationId: action.payload.conversationId,
        isHistoryLoading: false,
        error: null,
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
  historyAccessToken = null,
  historyStorageKey = null,
  loadPersistedHistory = false,
  onGuestSessionUpdate,
}) {
  const [state, dispatch] = useReducer(chatReducer, initialState)
  const activeRequestIdRef = useRef(0)
  const activeHistoryRequestIdRef = useRef(0)
  const activeAbortControllerRef = useRef(null)
  const activeHistoryAbortControllerRef = useRef(null)

  useEffect(() => {
    return () => {
      activeRequestIdRef.current += 1
      activeHistoryRequestIdRef.current += 1
      activeAbortControllerRef.current?.abort()
      activeHistoryAbortControllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!loadPersistedHistory || !historyAccessToken) {
      activeHistoryRequestIdRef.current += 1
      activeHistoryAbortControllerRef.current?.abort()
      activeHistoryAbortControllerRef.current = null
      dispatch({ type: ACTIONS.SET_HISTORY_LOADING, payload: false })
      return
    }

    const requestId = activeHistoryRequestIdRef.current + 1
    activeHistoryRequestIdRef.current = requestId

    const abortController = new AbortController()
    activeHistoryAbortControllerRef.current = abortController

    dispatch({ type: ACTIONS.SET_HISTORY_LOADING, payload: true })
    dispatch({ type: ACTIONS.CLEAR_ERROR })

    getChatHistory({
      accessToken: historyAccessToken,
      limit: 50,
      signal: abortController.signal,
    })
      .then((response) => {
        if (requestId !== activeHistoryRequestIdRef.current) {
          return
        }

        const historyRows = filterHistoryRowsAfterClear(
          Array.isArray(response.history) ? response.history : [],
          readHistoryClearedAt(historyStorageKey),
        )
        dispatch({
          type: ACTIONS.SET_HISTORY,
          payload: {
            messages: mapHistoryRowsToMessages(historyRows),
            conversationId: getLatestConversationId(historyRows),
          },
        })
      })
      .catch((error) => {
        if (requestId !== activeHistoryRequestIdRef.current || error.code === 'ERR_CANCELED') {
          return
        }

        dispatch({
          type: ACTIONS.SET_ERROR,
          payload: error.message || 'Unable to load chat history.',
        })
      })
      .finally(() => {
        if (requestId !== activeHistoryRequestIdRef.current) {
          return
        }

        activeHistoryAbortControllerRef.current = null
        dispatch({ type: ACTIONS.SET_HISTORY_LOADING, payload: false })
      })
  }, [historyAccessToken, historyStorageKey, loadPersistedHistory])

  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || state.isLoading) return

    const requestId = activeRequestIdRef.current + 1
    activeRequestIdRef.current = requestId
    activeHistoryRequestIdRef.current += 1
    activeHistoryAbortControllerRef.current?.abort()
    activeHistoryAbortControllerRef.current = null

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
    dispatch({ type: ACTIONS.SET_HISTORY_LOADING, payload: false })
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
    if (loadPersistedHistory && historyStorageKey) {
      writeHistoryClearedAt(historyStorageKey, new Date().toISOString())
    }

    activeRequestIdRef.current += 1
    activeHistoryRequestIdRef.current += 1
    activeAbortControllerRef.current?.abort()
    activeHistoryAbortControllerRef.current?.abort()
    activeAbortControllerRef.current = null
    activeHistoryAbortControllerRef.current = null
    dispatch({ type: ACTIONS.CLEAR_CONVERSATION })
  }, [historyStorageKey, loadPersistedHistory])

  const clearError = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_ERROR })
  }, [])

  const value = {
    messages: state.messages,
    conversationId: state.conversationId,
    isLoading: state.isLoading,
    isHistoryLoading: state.isHistoryLoading,
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
