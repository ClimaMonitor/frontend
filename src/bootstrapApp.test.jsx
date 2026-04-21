import { describe, expect, it, vi, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import { bootstrapApp } from './bootstrapApp.jsx'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('bootstrapApp', () => {
  it('renders a startup error screen when initialization fails', async () => {
    const rootElement = document.createElement('div')
    rootElement.id = 'root'
    document.body.appendChild(rootElement)

    const error = new Error('MSAL init failed')
    const startMocking = vi.fn(async () => {})
    const initializeMsal = vi.fn(async () => {
      throw error
    })

    bootstrapApp({
      initializeMsal,
      startMocking,
      rootElement,
    })

    expect(await screen.findByText('ClimaMonitor could not start')).toBeInTheDocument()
    expect(screen.getByText('MSAL init failed')).toBeInTheDocument()
  })
})
