import { ChatProvider } from './context/ChatContext.jsx'
import { SidebarProvider } from './context/SidebarContext.jsx'
import { ChatWindow } from './components/Chat/ChatWindow.jsx'
import { Sidebar } from './components/Sidebar/index.js'
import { useChat } from './hooks/useChat.js'
import { useSidebar } from './hooks/useSidebar.js'
import styles from './App.module.css'

function App() {
  return (
    <SidebarProvider>
      <ChatProvider>
        <div className={styles.app}>
          <Header />
          <Sidebar />
          <MainContent />
        </div>
      </ChatProvider>
    </SidebarProvider>
  )
}

function MainContent() {
  const { isOpen, width } = useSidebar()

  return (
    <main
      className={`${styles.main} ${isOpen ? styles.mainSidebarOpen : ''}`}
      style={isOpen ? { marginLeft: `${width}px` } : undefined}
    >
      <ChatWindow />
    </main>
  )
}

function Header() {
  const { clearConversation, hasMessages } = useChat()
  const { toggle, isOpen } = useSidebar()

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
