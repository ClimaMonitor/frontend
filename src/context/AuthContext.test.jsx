import { describe, expect, it } from 'vitest'
import {
  normalizeCurrentUser,
  normalizeGuestSession,
  normalizeRole,
  parseJwtClaims,
} from './AuthContext.jsx'

function createJwt(payloadObject) {
  const json = JSON.stringify(payloadObject)
  const base64 = btoa(json)
  const base64Url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  return `header.${base64Url}.signature`
}

describe('parseJwtClaims', () => {
  it('decodes valid base64url payloads without padding', () => {
    const token = createJwt({ roles: ['teacher'] })

    expect(parseJwtClaims(token)).toEqual({ roles: ['teacher'] })
  })

  it('returns an empty object for malformed tokens', () => {
    expect(parseJwtClaims('not-a-jwt')).toEqual({})
  })
})

describe('auth normalization', () => {
  it('normalizes database user context from /me', () => {
    expect(normalizeCurrentUser({
      user_id: 'user-1',
      external_id: 'oid-1',
      email: 'alex@example.com',
      display_name: 'Alex Rowe',
      fname: 'Alex',
      lname: 'Rowe',
      role: 'Admin',
      active: true,
      school_id: 'school-1',
      classroom_id: null,
      classroom_ids: ['class-1'],
      classroom_memberships: [{ classroom_id: 'class-1' }],
    })).toEqual({
      userId: 'user-1',
      externalId: 'oid-1',
      email: 'alex@example.com',
      displayName: 'Alex Rowe',
      firstName: 'Alex',
      lastName: 'Rowe',
      role: 'admin',
      active: true,
      schoolId: 'school-1',
      classroomId: null,
      classroomIds: ['class-1'],
      classroomMemberships: [{ classroom_id: 'class-1' }],
    })
  })

  it('normalizes known roles and rejects unknown roles', () => {
    expect(normalizeRole('Student')).toBe('student')
    expect(normalizeRole('teacher')).toBe('teacher')
    expect(normalizeRole('ADMIN')).toBe('admin')
    expect(normalizeRole('owner')).toBeNull()
  })

  it('normalizes guest session metadata from the backend', () => {
    expect(normalizeGuestSession({
      guest_session_id: 'guest-session-id',
      guest_token: 'guest-token',
      prompt_count: 1,
      max_prompts: 5,
      prompts_remaining: 4,
      expires_at: '2026-04-28T18:00:00.000Z',
    })).toEqual({
      guestSessionId: 'guest-session-id',
      token: 'guest-token',
      promptCount: 1,
      maxPrompts: 5,
      promptsRemaining: 4,
      expiresAt: '2026-04-28T18:00:00.000Z',
    })
  })
})
