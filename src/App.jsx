import { useEffect, useState } from 'react'
import { ChatProvider } from './context/ChatContext.jsx'
import { SidebarProvider } from './context/SidebarContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ChatWindow } from './components/Chat/ChatWindow.jsx'
import { Sidebar } from './components/Sidebar/index.js'
import { LoginPage } from './components/Auth/index.js'
import { useChat } from './hooks/useChat.js'
import { useSidebar } from './hooks/useSidebar.js'
import { useAuth } from './hooks/useAuth.js'
import { setAccessTokenProvider } from './services/api.js'
import styles from './App.module.css'
import { MsalProvider } from '@azure/msal-react'
import { msalInstance } from './auth/msalInstance.js'
import { isLocalApiTarget } from './auth/msalConfig.js'

function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </MsalProvider>
  )
}

function AppShell() {
  const {
    accessToken,
    canContinueWithoutAuth,
    currentUser,
    getAccessToken,
    guestSession,
    isAuthenticated,
    isGuestMode,
    isLoading,
    updateGuestSession,
  } = useAuth()
  const [isAnonymousMode, setIsAnonymousMode] = useState(false)

  useEffect(() => {
    setAccessTokenProvider(async () => {
      if (isGuestMode && guestSession?.token) {
        return {
          token: guestSession.token,
          allowAnonymousRequest: false,
        }
      }

      if (isAnonymousMode && isLocalApiTarget) {
        return {
          token: null,
          allowAnonymousRequest: true,
        }
      }

      if (!isAuthenticated) {
        return {
          token: null,
          allowAnonymousRequest: false,
        }
      }

      return {
        token: await getAccessToken(),
        allowAnonymousRequest: false,
      }
    })

    return () => setAccessTokenProvider(null)
  }, [getAccessToken, guestSession?.token, isAnonymousMode, isAuthenticated, isGuestMode])

  useEffect(() => {
    if (isAuthenticated && isAnonymousMode) {
      setIsAnonymousMode(false)
    }
  }, [isAnonymousMode, isAuthenticated])

  if (isLoading) {
    return <div className={styles.loadingScreen}>Loading authentication...</div>
  }

  if (!isAuthenticated && !isAnonymousMode && !isGuestMode) {
    return (
      <LoginPage
        onContinueWithoutAuth={canContinueWithoutAuth ? () => setIsAnonymousMode(true) : undefined}
      />
    )
  }

  return (
    <SidebarProvider>
      <ChatProvider
        allowAnonymousRequests={isAnonymousMode && isLocalApiTarget}
        historyAccessToken={accessToken}
        historyStorageKey={currentUser?.userId || currentUser?.email || null}
        loadPersistedHistory={isAuthenticated && Boolean(accessToken) && !isAnonymousMode && !isGuestMode}
        onGuestSessionUpdate={isGuestMode ? updateGuestSession : undefined}
      >
        <div className={styles.app}>
          <Header isAnonymousMode={isAnonymousMode} isGuestMode={isGuestMode} />
          <Sidebar isAnonymousMode={isAnonymousMode} />
          <MainContent isAnonymousMode={isAnonymousMode} isGuestMode={isGuestMode} />
        </div>
      </ChatProvider>
    </SidebarProvider>
  )
}

function MainContent({ isAnonymousMode, isGuestMode }) {
  const { isOpen, width } = useSidebar()

  return (
    <main
      className={`${styles.main} ${isOpen ? styles.mainSidebarOpen : ''}`}
      style={isOpen ? { marginLeft: `${width}px` } : undefined}
    >
      <ChatWindow isAnonymousMode={isAnonymousMode} isGuestMode={isGuestMode} />
    </main>
  )
}

function Header({ isAnonymousMode, isGuestMode }) {
  const { clearConversation, hasMessages } = useChat()
  const { toggle, isOpen } = useSidebar()
  const { isAuthenticated, primaryRole } = useAuth()

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button
          className={styles.menuButton}
          onClick={toggle}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
        >
          <MenuIcon />
        </button>
        <div className={styles.logo}>
          <img
            src="/climamonitor_logo.jpeg"
            alt="ClimaMonitor"
            className={styles.logoImage}
          />
          <span className={styles.logoText}>ClimaMonitor</span>
        </div>
      </div>

      <div className={styles.headerCenter}>
        {isAuthenticated ? (
          <span className={styles.roleBadge}>{primaryRole || 'signed-in user'}</span>
        ) : isGuestMode ? (
          <span className={styles.guestBadge}>guest mode</span>
        ) : isAnonymousMode ? (
          <span className={styles.anonymousBadge}>
            {isLocalApiTarget ? 'anonymous local dev mode' : 'anonymous mode unavailable on azure api'}
          </span>
        ) : null}
      </div>

      {hasMessages && (
        <button
          className={styles.newChatButton}
          onClick={clearConversation}
        >
          <ClearIcon />
          <span>Clear chat</span>
        </button>
      )}
    </header>
  )
}

function MenuIcon() {
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
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function ClearIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  )
}

export default App
