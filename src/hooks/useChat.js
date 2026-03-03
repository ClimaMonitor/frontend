import { useChatContext } from '../context/ChatContext.jsx'

/**
 * Custom hook for chat functionality
 * Provides a clean interface to chat state and actions
 */
export function useChat() {
  const {
    messages,
    conversationId,
    isLoading,
    error,
    sendMessage,
    clearConversation,
    clearError,
  } = useChatContext()

  return {
    // State
    messages,
    conversationId,
    isLoading,
    error,

    // Actions
    sendMessage,
    clearConversation,
    clearError,

    // Derived state
    hasMessages: messages.length > 0,
    messageCount: messages.length,
  }
}

export default useChat
