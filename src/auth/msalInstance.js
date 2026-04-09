import { PublicClientApplication } from '@azure/msal-browser'
import { msalConfig } from './msalConfig.js'

export const msalInstance = new PublicClientApplication(msalConfig)
