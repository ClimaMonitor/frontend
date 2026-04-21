import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { msalInstance } from './auth/msalInstance.js'

export async function enableMocking() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser.js')
    return worker.start({
      onUnhandledRequest: 'bypass',
    })
  }
}

function FatalStartupError({ error }) {
  const details = error instanceof Error ? error.message : 'Unknown startup error'

  return (
    <main style={fatalErrorStyles.page}>
      <section style={fatalErrorStyles.card}>
        <p style={fatalErrorStyles.eyebrow}>Startup failure</p>
        <h1 style={fatalErrorStyles.title}>ClimaMonitor could not start</h1>
        <p style={fatalErrorStyles.copy}>
          The application failed during initialization. Check the console for details and verify the auth and mock-service configuration for this environment.
        </p>
        <pre style={fatalErrorStyles.details}>{details}</pre>
      </section>
    </main>
  )
}

const fatalErrorStyles = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    background: '#f5f7fb',
    padding: '24px',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    width: 'min(560px, 100%)',
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 18px 45px rgba(15, 23, 42, 0.12)',
    border: '1px solid #d7e0ea',
  },
  eyebrow: {
    margin: '0 0 8px',
    color: '#9f1239',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontSize: '0.75rem',
  },
  title: {
    margin: '0 0 12px',
    color: '#0f172a',
    fontSize: '1.75rem',
    lineHeight: 1.2,
  },
  copy: {
    margin: '0 0 16px',
    color: '#334155',
    lineHeight: 1.5,
  },
  details: {
    margin: 0,
    padding: '12px 14px',
    borderRadius: '12px',
    background: '#f8fafc',
    color: '#475569',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
  },
}

export function renderApp(rootElement = document.getElementById('root')) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
  return root
}

export function renderStartupError(error, rootElement = document.getElementById('root')) {
  console.error('Failed to bootstrap ClimaMonitor', error)

  const root = ReactDOM.createRoot(rootElement)
  root.render(<FatalStartupError error={error} />)
  return root
}

export async function bootstrapApp({
  initializeMsal = () => msalInstance.initialize(),
  startMocking = enableMocking,
  rootElement = document.getElementById('root'),
} = {}) {
  try {
    await Promise.all([
      startMocking(),
      initializeMsal(),
    ])
    return renderApp(rootElement)
  } catch (error) {
    return renderStartupError(error, rootElement)
  }
}
