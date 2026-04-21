import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import api, { sendMessage, setAccessTokenProvider } from './api.js'

function createAdapter(handler = async (config) => ({
  data: { ok: true },
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
})) {
  return vi.fn(handler)
}

describe('api auth and payload handling', () => {
  beforeEach(() => {
    setAccessTokenProvider(null)
  })

  afterEach(() => {
    setAccessTokenProvider(null)
  })

  it('sends user and classroom ids only for explicit anonymous local-mode requests', async () => {
    const adapter = createAdapter(async (config) => ({
      data: {
        requestBody: JSON.parse(config.data),
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }))

    setAccessTokenProvider(async () => ({
      token: null,
      allowAnonymousRequest: true,
    }))

    const response = await sendMessage('Hello climate', null, {
      allowAnonymousRequest: true,
      signal: undefined,
      adapter,
    })

    expect(response.requestBody).toMatchObject({
      message: 'Hello climate',
      user_id: 'student_mock',
      classroom_id: 'class_mock',
    })
  })

  it('omits user identity fields for authenticated requests', async () => {
    const adapter = createAdapter(async (config) => ({
      data: {
        requestBody: JSON.parse(config.data),
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }))

    setAccessTokenProvider(async () => ({
      token: 'token-123',
      allowAnonymousRequest: false,
    }))

    const response = await sendMessage('Hello climate', null, {
      adapter,
    })

    expect(response.requestBody).toEqual({
      message: 'Hello climate',
    })
  })

  it('rejects requests when authentication fails outside anonymous mode', async () => {
    const adapter = createAdapter()

    setAccessTokenProvider(async () => ({
      token: null,
      allowAnonymousRequest: false,
    }))

    await expect(api.get('/chat/completions', { adapter })).rejects.toMatchObject({
      message: 'An unexpected error occurred. Please try again.',
    })
    expect(adapter).not.toHaveBeenCalled()
  })
})
