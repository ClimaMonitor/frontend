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
import { getCurrentUser } from '../services/api.js'

const AuthContext = createContext(null)

function normalizeRole(role) {
  if (!role) return null

  const normalized = role.toLowerCase()
  if (normalized === 'student') return ROLES.STUDENT
  if (normalized === 'teacher') return ROLES.TEACHER
  if (normalized === 'admin') return ROLES.ADMIN
  return null
}

export function parseJwtClaims(token) {
  if (!token) {
    return {}
  }

  try {
    const [, payload] = token.split('.')
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4)
    return JSON.parse(window.atob(padded))
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

function normalizeCurrentUser(rawUser) {
  if (!rawUser) return null

  const role = normalizeRole(rawUser.role)

  return {
    userId: rawUser.user_id || null,
    externalId: rawUser.external_id || null,
    email: rawUser.email || null,
    displayName: rawUser.display_name || null,
    firstName: rawUser.fname || null,
    lastName: rawUser.lname || null,
    role,
    active: rawUser.active === true,
    schoolId: rawUser.school_id || null,
    classroomId: rawUser.classroom_id || null,
    classroomIds: Array.isArray(rawUser.classroom_ids) ? rawUser.classroom_ids : [],
    classroomMemberships: Array.isArray(rawUser.classroom_memberships)
      ? rawUser.classroom_memberships
      : [],
  }
}

function getDbRoles(currentUser) {
  return currentUser?.role ? [currentUser.role] : []
}

export function AuthProvider({ children }) {
  const { instance, accounts, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const [accessToken, setAccessToken] = useState(null)
  const [accessTokenClaims, setAccessTokenClaims] = useState({})
  const [currentUser, setCurrentUser] = useState(null)
  const [userContextError, setUserContextError] = useState(null)
  const [isUserContextLoading, setIsUserContextLoading] = useState(false)
  const [tokenError, setTokenError] = useState(null)

  const account = accounts[0] || null
  const tokenRoles = useMemo(() => getRoleClaims(account, accessTokenClaims), [account, accessTokenClaims])
  const roles = useMemo(() => {
    const dbRoles = getDbRoles(currentUser)
    return dbRoles.length ? dbRoles : tokenRoles
  }, [currentUser, tokenRoles])
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
      setCurrentUser(null)
      setUserContextError(null)
      return
    }

    acquireToken().catch(() => {})
  }, [acquireToken, account, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setCurrentUser(null)
      setUserContextError(null)
      setIsUserContextLoading(false)
      return
    }

    let isMounted = true
    setIsUserContextLoading(true)
    setUserContextError(null)

    getCurrentUser()
      .then((response) => {
        if (!isMounted) return
        setCurrentUser(normalizeCurrentUser(response.user))
      })
      .catch((error) => {
        if (!isMounted) return
        setCurrentUser(null)
        setUserContextError(error.message || 'Unable to load your ClimaMonitor profile.')
      })
      .finally(() => {
        if (!isMounted) return
        setIsUserContextLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [accessToken, isAuthenticated])

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
    currentUser,
    displayName: currentUser?.displayName || getDisplayName(account),
    email: currentUser?.email || account?.username || null,
    getAccessToken: acquireToken,
    authError: userContextError || tokenError,
    isAuthenticated,
    isAuthConfigured,
    isLoading: inProgress !== InteractionStatus.None || isUserContextLoading,
    isUserContextLoading,
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
    currentUser,
    inProgress,
    isAuthenticated,
    isUserContextLoading,
    login,
    logout,
    primaryRole,
    roles,
    isLocalApiTarget,
    tokenError,
    userContextError,
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

export {
  normalizeCurrentUser,
  normalizeRole,
}
