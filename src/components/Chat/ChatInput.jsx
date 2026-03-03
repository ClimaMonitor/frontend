import { useState, useRef, useEffect } from 'react'
import styles from './ChatInput.module.css'

const MAX_LENGTH = 1000

export function ChatInput({ onSend, disabled }) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [message])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (message.trim() && !disabled && message.length <= MAX_LENGTH) {
      onSend(message)
      setMessage('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const remainingChars = MAX_LENGTH - message.length
  const isOverLimit = remainingChars < 0
  const showCharCount = message.length > MAX_LENGTH - 100

  return (
    <form className={styles.container} onSubmit={handleSubmit}>
      <div className={styles.inputWrapper}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about climate science..."
          disabled={disabled}
          rows={1}
        />
        {showCharCount && (
          <span className={`${styles.charCount} ${isOverLimit ? styles.overLimit : ''}`}>
            {remainingChars}
          </span>
        )}
      </div>
      <button
        type="submit"
        className={styles.sendButton}
        disabled={disabled || !message.trim() || isOverLimit}
        aria-label="Send message"
      >
        <SendIcon />
      </button>
    </form>
  )
}

function SendIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

export default ChatInput
