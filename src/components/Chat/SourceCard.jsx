import { useState } from 'react'
import styles from './SourceCard.module.css'

export function SourceCard({ sources }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!sources || sources.length === 0) {
    return null
  }

  return (
    <div className={styles.container}>
      <button
        className={styles.toggle}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <DocumentIcon />
        <span>View sources ({sources.length})</span>
        <ChevronIcon className={isExpanded ? styles.chevronExpanded : ''} />
      </button>

      {isExpanded && (
        <div className={styles.sourceList}>
          {sources.map((source, index) => (
            <div key={source.chunk_id || index} className={styles.source}>
              <div className={styles.sourceHeader}>
                <span className={styles.documentName}>{source.document_name}</span>
                <RelevanceIndicator score={source.relevance_score} />
              </div>
              <p className={styles.excerpt}>{source.excerpt}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RelevanceIndicator({ score }) {
  const percentage = Math.round(score * 100)
  return (
    <div className={styles.relevance} title={`${percentage}% relevance`}>
      <div className={styles.relevanceBar}>
        <div
          className={styles.relevanceFill}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={styles.relevanceText}>{percentage}%</span>
    </div>
  )
}

function DocumentIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function ChevronIcon({ className }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default SourceCard
