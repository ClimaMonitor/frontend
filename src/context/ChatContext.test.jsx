import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatProvider } from './ChatContext.jsx'
import { useChat } from '../hooks/useChat.js'

const sendMessageMock = vi.fn()
const getChatHistoryMock = vi.fn()

vi.mock('../services/api.js', () => ({
  getChatHistory: (...args) => getChatHistoryMock(...args),
  sendMessage: (...args) => sendMessageMock(...args),
}))

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  getChatHistoryMock.mockReset()
  sendMessageMock.mockReset()
})

function TestHarness() {
  const {
    messages,
    isHistoryLoading,
    isLoading,
    sendMessage,
    clearConversation,
  } = useChat()

  return (
    <div>
      <button onClick={() => sendMessage('What causes global warming?')}>send</button>
      <button onClick={clearConversation}>clear</button>
      <span data-testid="history-loading">{String(isHistoryLoading)}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="message-count">{messages.length}</span>
      {messages.map((message) => (
        <p data-testid="message-content" key={message.id}>{message.content}</p>
      ))}
    </div>
  )
}

describe('ChatContext', () => {
  it('loads persisted chat history in chronological order', async () => {
    getChatHistoryMock.mockResolvedValueOnce({
      history: [
        {
          chat_history_id: 'history-2',
          conversation_id: 'conv-1',
          query_text: 'How do scientists measure temperature?',
          response_text: 'They use thermometers, satellites, and ocean measurements.',
          sources: [{ title: 'Temperature source' }],
          created_at: '2026-05-06T18:00:00.000Z',
        },
        {
          chat_history_id: 'history-1',
          conversation_id: 'conv-1',
          query_text: 'What causes global warming?',
          response_text: 'Greenhouse gases trap extra heat.',
          sources: [],
          created_at: '2026-05-06T17:00:00.000Z',
        },
      ],
    })

    render(
      <ChatProvider historyAccessToken="token-123" loadPersistedHistory>
        <TestHarness />
      </ChatProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Greenhouse gases trap extra heat.')).toBeInTheDocument()
    })

    expect(getChatHistoryMock).toHaveBeenCalledWith(expect.objectContaining({
      accessToken: 'token-123',
      limit: 50,
    }))
    expect(screen.getAllByTestId('message-content').map((node) => node.textContent)).toEqual([
      'What causes global warming?',
      'Greenhouse gases trap extra heat.',
      'How do scientists measure temperature?',
      'They use thermometers, satellites, and ocean measurements.',
    ])
    expect(screen.getByTestId('history-loading')).toHaveTextContent('false')
  })

  it('does not load persisted history when the provider is not configured for signed-in history', () => {
    render(
      <ChatProvider>
        <TestHarness />
      </ChatProvider>,
    )

    expect(getChatHistoryMock).not.toHaveBeenCalled()
  })

  it('waits for an access token before loading persisted history', () => {
    render(
      <ChatProvider loadPersistedHistory>
        <TestHarness />
      </ChatProvider>,
    )

    expect(getChatHistoryMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('history-loading')).toHaveTextContent('false')
  })

  it('ignores stale persisted history after clearing the conversation', async () => {
    let resolveHistory
    getChatHistoryMock.mockImplementationOnce(() => new Promise((resolve) => {
      resolveHistory = resolve
    }))

    render(
      <ChatProvider historyAccessToken="token-123" loadPersistedHistory>
        <TestHarness />
      </ChatProvider>,
    )

    expect(screen.getByTestId('history-loading')).toHaveTextContent('true')
    fireEvent.click(screen.getByText('clear'))

    resolveHistory({
      history: [{
        chat_history_id: 'history-1',
        conversation_id: 'conv-1',
        query_text: 'Old question',
        response_text: 'Old answer',
        sources: [],
        created_at: '2026-05-06T17:00:00.000Z',
      }],
    })

    await waitFor(() => {
      expect(screen.getByTestId('history-loading')).toHaveTextContent('false')
    })

    expect(screen.getByTestId('message-count')).toHaveTextContent('0')
    expect(screen.queryByText('Old answer')).not.toBeInTheDocument()
  })

  it('keeps previously loaded backend history hidden after clear and reload', async () => {
    const historyResponse = {
      history: [{
        chat_history_id: 'history-1',
        conversation_id: 'conv-1',
        query_text: 'Previously saved question',
        response_text: 'Previously saved answer',
        sources: [],
        created_at: '2026-05-06T17:00:00.000Z',
      }],
    }

    getChatHistoryMock.mockResolvedValue(historyResponse)

    const { unmount } = render(
      <ChatProvider
        historyAccessToken="token-123"
        historyStorageKey="user-123"
        loadPersistedHistory
      >
        <TestHarness />
      </ChatProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Previously saved answer')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('clear'))
    expect(screen.getByTestId('message-count')).toHaveTextContent('0')

    unmount()

    render(
      <ChatProvider
        historyAccessToken="token-123"
        historyStorageKey="user-123"
        loadPersistedHistory
      >
        <TestHarness />
      </ChatProvider>,
    )

    await waitFor(() => {
      expect(getChatHistoryMock).toHaveBeenCalledTimes(2)
    })

    expect(screen.getByTestId('message-count')).toHaveTextContent('0')
    expect(screen.queryByText('Previously saved answer')).not.toBeInTheDocument()
  })

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

  it('reports guest prompt metadata from successful responses', async () => {
    const onGuestSessionUpdate = vi.fn()
    sendMessageMock.mockResolvedValueOnce({
      message_id: 'assistant_1',
      response: 'Climate answer',
      conversation_id: 'conv_1',
      created_at: new Date().toISOString(),
      sources: [],
      guest: {
        prompt_count: 1,
        max_prompts: 5,
        prompts_remaining: 4,
      },
    })

    render(
      <ChatProvider onGuestSessionUpdate={onGuestSessionUpdate}>
        <TestHarness />
      </ChatProvider>,
    )

    fireEvent.click(screen.getByText('send'))

    await waitFor(() => {
      expect(screen.getByText('Climate answer')).toBeInTheDocument()
    })

    expect(onGuestSessionUpdate).toHaveBeenCalledWith({
      prompt_count: 1,
      max_prompts: 5,
      prompts_remaining: 4,
    })
  })
})
