import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatProvider } from './ChatContext.jsx'
import { useChat } from '../hooks/useChat.js'

const sendMessageMock = vi.fn()

vi.mock('../services/api.js', () => ({
  sendMessage: (...args) => sendMessageMock(...args),
}))

function TestHarness() {
  const { messages, isLoading, sendMessage, clearConversation } = useChat()

  return (
    <div>
      <button onClick={() => sendMessage('What causes global warming?')}>send</button>
      <button onClick={clearConversation}>clear</button>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="message-count">{messages.length}</span>
      {messages.map((message) => (
        <p key={message.id}>{message.content}</p>
      ))}
    </div>
  )
}

describe('ChatContext', () => {
  it('ignores stale assistant responses after clearing the conversation', async () => {
    let resolveRequest
    sendMessageMock.mockImplementationOnce(() => new Promise((resolve) => {
      resolveRequest = resolve
    }))

    render(
      <ChatProvider>
        <TestHarness />
      </ChatProvider>,
    )

    fireEvent.click(screen.getByText('send'))
    expect(screen.getByText('What causes global warming?')).toBeInTheDocument()
    expect(screen.getByTestId('loading')).toHaveTextContent('true')

    fireEvent.click(screen.getByText('clear'))

    resolveRequest({
      message_id: 'assistant_1',
      response: 'Late response',
      conversation_id: 'conv_1',
      created_at: new Date().toISOString(),
      sources: [],
    })

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    expect(screen.getByTestId('message-count')).toHaveTextContent('0')
    expect(screen.queryByText('Late response')).not.toBeInTheDocument()
  })
})
