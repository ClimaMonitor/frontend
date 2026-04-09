import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/variables.css'
import { msalInstance } from './auth/msalInstance.js'

async function enableMocking() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser.js')
    return worker.start({
      onUnhandledRequest: 'bypass',
    })
  }
}

Promise.all([
  enableMocking(),
  msalInstance.initialize(),
]).then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
