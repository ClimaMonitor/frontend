import { useEffect, useRef } from 'react'
import { useChat } from '../../hooks/useChat.js'
import { useAuth } from '../../hooks/useAuth.js'
import { isLocalApiTarget } from '../../auth/msalConfig.js'
import { MessageBubble } from './MessageBubble.jsx'
import { ChatInput } from './ChatInput.jsx'
import styles from './ChatWindow.module.css'

export function ChatWindow({ isAnonymousMode = false, isGuestMode = false }) {
  const { messages, isLoading, error, sendMessage, clearError, hasMessages } = useChat()
  const { guestPromptsRemaining, isAuthenticated, login, primaryRole } = useAuth()
  const messagesEndRef = useRef(null)
  const guestLimitReached = isGuestMode && guestPromptsRemaining !== null && guestPromptsRemaining <= 0

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className={styles.container}>
      <div className={styles.messageArea}>
        {!hasMessages && !isLoading && (
          <EmptyState
            isAnonymousMode={isAnonymousMode}
            isAuthenticated={isAuthenticated}
            isGuestMode={isGuestMode}
            primaryRole={primaryRole}
          />
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && <LoadingIndicator />}

        {error && (
          <ErrorMessage message={error} onDismiss={clearError} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {isGuestMode && (
        <div className={styles.guestPromptStatus}>
          <span>
            {guestLimitReached
              ? 'Guest prompt limit reached.'
              : `${guestPromptsRemaining ?? 5} guest prompts remaining.`}
          </span>
          <button type="button" onClick={login}>
            Sign in
          </button>
        </div>
      )}

      <ChatInput onSend={sendMessage} disabled={isLoading || guestLimitReached} />
    </div>
  )
}

function EmptyState({ isAnonymousMode, isAuthenticated, isGuestMode, primaryRole }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <h2 className={styles.emptyTitle}>Ask a question!</h2>
      <p className={styles.emptyText}>
        {isAuthenticated
          ? `Signed in as ${primaryRole || 'a user'}. Ask about climate science and the rest of the interface will reflect your role.`
          : isGuestMode
            ? 'Guest mode uses the live ClimaMonitor assistant. You can send 5 sample prompts before signing in.'
          : isAnonymousMode
            ? isLocalApiTarget
              ? 'Anonymous dev mode is enabled against the local API. Authentication is bypassed locally, but role-based UI is hidden until you sign in.'
              : 'Anonymous mode cannot chat against the deployed Azure API because authentication is required there. Switch to local API mode to test anonymous chat.'
            : 'I can help you learn about climate science. Try asking about global warming, the carbon cycle, or how scientists measure temperature changes.'}
      </p>
      <div className={styles.suggestions}>
        <SuggestionChip text="What causes global warming?" />
        <SuggestionChip text="How do scientists measure temperature?" />
        <SuggestionChip text="What is the carbon cycle?" />
      </div>
    </div>
  )
}

function SuggestionChip({ text }) {
  const { sendMessage } = useChat()

  return (
    <button
      className={styles.suggestionChip}
      onClick={() => sendMessage(text)}
    >
      {text}
    </button>
  )
}

function LoadingIndicator() {
  return (
    <div className={styles.loading}>
      <div className={styles.loadingDots}>
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span className={styles.loadingText}>Thinking...</span>
    </div>
  )
}

function ErrorMessage({ message, onDismiss }) {
  return (
    <div className={styles.error}>
      <div className={styles.errorContent}>
        <span className={styles.errorIcon} aria-hidden="true">!</span>
        <span>{message}</span>
      </div>
      <button className={styles.errorDismiss} onClick={onDismiss}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

export default ChatWindow
