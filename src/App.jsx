import { ChatProvider } from './context/ChatContext.jsx'
import { ChatWindow } from './components/Chat/ChatWindow.jsx'
import { useChat } from './hooks/useChat.js'
import styles from './App.module.css'

function App() {
  return (
    <ChatProvider>
      <div className={styles.app}>
        <Header />
        <main className={styles.main}>
          <ChatWindow />
        </main>
      </div>
    </ChatProvider>
  )
}

function Header() {
  const { clearConversation, hasMessages } = useChat()

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <img
          src="/climamonitor_logo.jpeg"
          alt="ClimaMonitor"
          className={styles.logoImage}
        />
        <span className={styles.logoText}>ClimaMonitor</span>
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
