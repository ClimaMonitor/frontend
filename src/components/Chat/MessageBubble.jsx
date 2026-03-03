import ReactMarkdown from 'react-markdown'
import { format } from 'date-fns'
import { SourceCard } from './SourceCard.jsx'
import styles from './MessageBubble.module.css'

export function MessageBubble({ message }) {
  const { role, content, sources, timestamp } = message
  const isUser = role === 'user'

  const formattedTime = timestamp
    ? format(new Date(timestamp), 'h:mm a')
    : ''

  return (
    <div className={`${styles.container} ${isUser ? styles.user : styles.assistant}`}>
      <div className={styles.bubble}>
        {isUser ? (
          <p className={styles.content}>{content}</p>
        ) : (
          <div className={styles.markdownContent}>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}

        {!isUser && sources && <SourceCard sources={sources} />}
      </div>

      {formattedTime && (
        <span className={styles.timestamp}>{formattedTime}</span>
      )}
    </div>
  )
}

export default MessageBubble
