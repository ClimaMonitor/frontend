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
  const { canContinueWithoutAuth, getAccessToken, isAuthenticated, isLoading } = useAuth()
  const [isAnonymousMode, setIsAnonymousMode] = useState(false)

  useEffect(() => {
    setAccessTokenProvider(async () => {
      if (!isAuthenticated) {
        return null
      }

      return getAccessToken()
    })

    return () => setAccessTokenProvider(null)
  }, [getAccessToken, isAuthenticated])

  useEffect(() => {
    if (isAuthenticated && isAnonymousMode) {
      setIsAnonymousMode(false)
    }
  }, [isAnonymousMode, isAuthenticated])

  if (isLoading) {
    return <div className={styles.loadingScreen}>Loading authentication...</div>
  }

  if (!isAuthenticated && !isAnonymousMode) {
    return (
      <LoginPage
        onContinueWithoutAuth={canContinueWithoutAuth ? () => setIsAnonymousMode(true) : undefined}
      />
    )
  }

  return (
    <SidebarProvider>
      <ChatProvider>
        <div className={styles.app}>
          <Header isAnonymousMode={isAnonymousMode} />
          <Sidebar isAnonymousMode={isAnonymousMode} />
          <MainContent isAnonymousMode={isAnonymousMode} />
        </div>
      </ChatProvider>
    </SidebarProvider>
  )
}

function MainContent({ isAnonymousMode }) {
  const { isOpen, width } = useSidebar()

  return (
    <main
      className={`${styles.main} ${isOpen ? styles.mainSidebarOpen : ''}`}
      style={isOpen ? { marginLeft: `${width}px` } : undefined}
    >
      <ChatWindow isAnonymousMode={isAnonymousMode} />
    </main>
  )
}

function Header({ isAnonymousMode }) {
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
        ) : isAnonymousMode ? (
          <span className={styles.anonymousBadge}>anonymous dev mode</span>
        ) : null}
      </div>

      {hasMessages && (
        <button
          className={styles.newChatButton}
          onClick={clearConversation}
        >
          <PlusIcon />
          <span>New chat</span>
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

function PlusIcon() {
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
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export default App
