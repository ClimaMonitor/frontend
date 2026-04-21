import { describe, expect, it } from 'vitest'
import { parseJwtClaims } from './AuthContext.jsx'

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
