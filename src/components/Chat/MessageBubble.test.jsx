import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MessageBubble } from './MessageBubble.jsx'

describe('MessageBubble', () => {
  it('renders assistant content without crashing on an invalid timestamp', () => {
    render(
      <MessageBubble
        message={{
          id: 'assistant_1',
          role: 'assistant',
          content: 'Climate answer',
          timestamp: 'not-a-real-date',
        }}
      />,
    )

    expect(screen.getByText('Climate answer')).toBeInTheDocument()
    expect(screen.queryByText(/am|pm/i)).not.toBeInTheDocument()
  })
})
