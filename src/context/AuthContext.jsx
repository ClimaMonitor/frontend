import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import {
  authMode,
  getApiScope,
  isAuthConfigured,
  isLocalApiTarget,
  loginRequest,
} from '../auth/msalConfig.js'
import { ROLES } from '../data/rolePermissions.js'

const AuthContext = createContext(null)

function normalizeRole(role) {
  if (!role) return null

  const normalized = role.toLowerCase()
  if (normalized === 'student') return ROLES.STUDENT
  if (normalized === 'teacher') return ROLES.TEACHER
  if (normalized === 'admin') return ROLES.ADMIN
  return null
}

function parseJwtClaims(token) {
  if (!token) {
    return {}
  }

  try {
    const [, payload] = token.split('.')
    return JSON.parse(window.atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return {}
  }
}

function getRoleClaims(account, tokenClaims) {
  const idTokenClaims = account?.idTokenClaims || {}
  const tokenRoles = Array.isArray(tokenClaims.roles) ? tokenClaims.roles : []
  const idTokenRoles = Array.isArray(idTokenClaims.roles)
    ? idTokenClaims.roles
    : Array.isArray(idTokenClaims.extension_Roles)
      ? idTokenClaims.extension_Roles
      : []

  const candidates = tokenRoles.length ? tokenRoles : idTokenRoles

  return candidates.map(normalizeRole).filter(Boolean)
}

function getDisplayName(account) {
  const claims = account?.idTokenClaims || {}
  return claims.name || claims.preferred_username || account?.username || 'ClimaMonitor user'
}

export function AuthProvider({ children }) {
  const { instance, accounts, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const [accessToken, setAccessToken] = useState(null)
  const [accessTokenClaims, setAccessTokenClaims] = useState({})
  const [tokenError, setTokenError] = useState(null)

  const account = accounts[0] || null
  const roles = useMemo(() => getRoleClaims(account, accessTokenClaims), [account, accessTokenClaims])
  const primaryRole = roles[0] || null
  const canContinueWithoutAuth = authMode === 'optional' && isLocalApiTarget

  const acquireToken = useCallback(async () => {
    const scope = getApiScope()
    if (!isAuthConfigured || !account || !scope) {
      setAccessToken(null)
      return null
    }

    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account,
      })
      setAccessToken(response.accessToken)
      setAccessTokenClaims(parseJwtClaims(response.accessToken))
      setTokenError(null)
      return response.accessToken
    } catch (error) {
      setAccessToken(null)
      setAccessTokenClaims({})
      setTokenError('Unable to acquire an API token for this session.')
      throw error
    }
  }, [account, instance])

  useEffect(() => {
    if (!isAuthenticated || !account || !isAuthConfigured) {
      setAccessToken(null)
      setAccessTokenClaims({})
      return
    }

    acquireToken().catch(() => {})
  }, [acquireToken, account, isAuthenticated])

  const login = useCallback(async () => {
    if (!isAuthConfigured) {
      setTokenError('Authentication is not configured yet.')
      return
    }

    setTokenError(null)
    await instance.loginRedirect(loginRequest)
  }, [instance])

  const logout = useCallback(async () => {
    await instance.logoutRedirect({
      account: account || undefined,
    })
  }, [account, instance])

  const value = useMemo(() => ({
    accessToken,
    canContinueWithoutAuth,
    displayName: getDisplayName(account),
    email: account?.username || null,
    getAccessToken: acquireToken,
    isAuthenticated,
    isAuthConfigured,
    isLoading: inProgress !== InteractionStatus.None,
    login,
    logout,
    primaryRole,
    roles,
    isLocalApiTarget,
    tokenError,
  }), [
    accessToken,
    account,
    acquireToken,
    canContinueWithoutAuth,
    inProgress,
    isAuthenticated,
    login,
    logout,
    primaryRole,
    roles,
    isLocalApiTarget,
    tokenError,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
