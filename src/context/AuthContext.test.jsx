import { describe, expect, it } from 'vitest'
import { normalizeCurrentUser, normalizeRole, parseJwtClaims } from './AuthContext.jsx'

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
})
