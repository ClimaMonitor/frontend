import { useRef, useState, useEffect, useCallback } from 'react'
import { useSidebar } from '../../hooks/useSidebar.js'
import { RoleDemoUI } from './RoleDemoUI.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import styles from './Sidebar.module.css'

function CloseIcon() {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function Sidebar({ isAnonymousMode = false }) {
  const { isOpen, width, close, setWidth } = useSidebar()
  const {
    displayName,
    email,
    exitGuestMode,
    guestPromptsRemaining,
    isGuestMode,
    login,
    logout,
    primaryRole,
  } = useAuth()
  const sidebarRef = useRef(null)
  const [isResizing, setIsResizing] = useState(false)

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return
      const newWidth = e.clientX
      setWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, setWidth])

  // Handle escape key to close sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        close()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close])

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}
        style={{ width: isOpen ? `${width}px` : undefined }}
        aria-hidden={!isOpen}
      >
        <div className={styles.sidebarHeader}>
          <div>
            <span className={styles.sidebarTitle}>
              {isGuestMode ? 'Guest mode' : isAnonymousMode ? 'Local dev mode' : 'Signed in'}
            </span>
            <p className={styles.sidebarMeta}>
              {isGuestMode
                ? `${guestPromptsRemaining ?? 5} sample prompts remaining`
                : isAnonymousMode
                ? 'Authentication is bypassed for local testing.'
                : `${displayName}${email ? ` · ${email}` : ''}${primaryRole ? ` · ${primaryRole}` : ''}`}
            </p>
          </div>
          <button
            className={styles.closeButton}
            onClick={close}
            aria-label="Close sidebar"
          >
            <CloseIcon />
          </button>
        </div>

        {isGuestMode ? (
          <div className={styles.guestActions}>
            <button type="button" className={styles.signOutButton} onClick={login}>
              Sign in to continue
            </button>
            <button type="button" className={styles.secondaryActionButton} onClick={exitGuestMode}>
              Exit guest mode
            </button>
          </div>
        ) : !isAnonymousMode && (
          <button type="button" className={styles.signOutButton} onClick={logout}>
            Sign out
          </button>
        )}
        <RoleDemoUI />

        {/* Resize handle */}
        <div
          className={`${styles.resizeHandle} ${isResizing ? styles.resizing : ''}`}
          onMouseDown={handleMouseDown}
          aria-hidden="true"
        />
      </aside>
    </>
  )
}

export default Sidebar
