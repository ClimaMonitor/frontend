const tenantId = import.meta.env.VITE_AZURE_TENANT_ID
const clientId = import.meta.env.VITE_AZURE_CLIENT_ID
const authority = import.meta.env.VITE_AZURE_AUTHORITY
const apiScope = import.meta.env.VITE_AZURE_API_SCOPE
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

export const authMode = import.meta.env.VITE_AUTH_MODE || 'optional'
export const isLocalApiTarget = apiBaseUrl.includes('localhost') || apiBaseUrl.includes('127.0.0.1')
export const isAzureApiTarget = Boolean(apiBaseUrl) && !isLocalApiTarget

export const isAuthConfigured = Boolean(tenantId && clientId && authority && apiScope)

export const loginRequest = {
  scopes: apiScope ? ['openid', 'profile', 'offline_access', apiScope] : ['openid', 'profile', 'offline_access'],
}

export const msalConfig = {
  auth: {
    clientId: clientId || 'missing-client-id',
    authority: authority || `https://login.microsoftonline.com/${tenantId || 'missing-tenant-id'}`,
    knownAuthorities: authority ? [new URL(authority).host] : [],
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
}

export function getApiScope() {
  return apiScope
}
