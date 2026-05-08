# ClimaMonitor Frontend Documentation

## Purpose

The `frontend` directory contains the ClimaMonitor web client: a React chat interface for an educational climate-science assistant. The frontend is responsible for sign-in, session mode selection, chat state, rendering assistant responses with source excerpts, and exposing role-specific student, teacher, and admin workspace controls.

The frontend is intentionally thin around AI behavior. It sends user input and auth context to the HTTP API, then renders the response and source metadata returned by that API.

## Tech Stack

- React 18
- Vite 5
- CSS Modules for component-scoped styling
- CSS custom properties in `src/styles/variables.css`
- Axios for HTTP calls
- Microsoft Authentication Library: `@azure/msal-browser` and `@azure/msal-react`
- React Markdown for assistant response rendering
- date-fns for message timestamps
- Vitest, jsdom, React Testing Library, and jest-dom for tests
- MSW for browser-side development mocks

## Repository Layout

```text
frontend/
├── README.md
├── frontend_docs.md
├── index.html
├── package.json
├── vite.config.js
├── public/
│   ├── climamonitor_logo.jpeg
│   └── mockServiceWorker.js
└── src/
    ├── App.jsx
    ├── App.module.css
    ├── auth/
    │   ├── msalConfig.js
    │   └── msalInstance.js
    ├── bootstrapApp.jsx
    ├── components/
    │   ├── Auth/
    │   ├── Chat/
    │   └── Sidebar/
    ├── context/
    │   ├── AuthContext.jsx
    │   ├── ChatContext.jsx
    │   └── SidebarContext.jsx
    ├── data/
    │   └── rolePermissions.js
    ├── hooks/
    │   ├── useAuth.js
    │   ├── useChat.js
    │   └── useSidebar.js
    ├── mocks/
    │   ├── browser.js
    │   ├── data.js
    │   └── handlers.js
    ├── services/
    │   └── api.js
    ├── styles/
    │   └── variables.css
    └── test/
        └── setupTests.js
```

Generated and local-only directories such as `node_modules/`, `dist/`, and `.git/` are not part of the source architecture.

## Scripts

Defined in `package.json`:

```bash
npm run dev
npm run dev:azure
npm run dev:localapi
npm run build
npm run test
npm run test:watch
npm run preview
```

`npm run dev` and `npm run dev:azure` run Vite in `azure` mode. `npm run dev:localapi` runs Vite in `localapi` mode.

## Environment Modes

Vite loads `.env` plus a mode-specific file such as `.env.azure` or `.env.localapi`.

Environment variables used by the frontend:

| Variable | Purpose |
| --- | --- |
| `VITE_AUTH_MODE` | Controls optional auth behavior. Current code expects `optional` to allow local anonymous development mode. |
| `VITE_API_BASE_URL` | Base URL for API calls. Azure mode targets the deployed API; local mode targets `localhost:7071`. |
| `VITE_AZURE_TENANT_ID` | Microsoft Entra tenant ID. |
| `VITE_AZURE_CLIENT_ID` | Frontend app registration client ID. |
| `VITE_AZURE_AUTHORITY` | Microsoft Entra authority URL. |
| `VITE_AZURE_API_SCOPE` | API scope requested for access tokens. |
| `VITE_USER_ID` | Mock user ID sent only for explicit anonymous local-mode chat requests. |
| `VITE_CLASSROOM_ID` | Mock classroom ID sent only for explicit anonymous local-mode chat requests. |

Important mode behavior:

- Azure mode points to `https://climamonitor-api.azurewebsites.net/api/v1` through `.env.azure`.
- Local API mode points to `http://localhost:7071/api/v1` through `.env.localapi`.
- Anonymous local dev mode is only offered when `VITE_AUTH_MODE=optional` and the API target is localhost or `127.0.0.1`.
- Authenticated and guest requests do not send `user_id` or `classroom_id`; those identity fields are only sent when `allowAnonymousRequest` is explicitly true.

Do not commit real secrets. Vite exposes `VITE_` values to browser code, so only public client configuration belongs there.

## Application Startup

Startup begins in `src/main.jsx`, which imports global variables/reset styles and calls `bootstrapApp()`.

`src/bootstrapApp.jsx` does three things:

1. Starts the MSW browser worker in development.
2. Initializes the MSAL client.
3. Renders `<App />` into the root element.

If startup fails, `bootstrapApp()` renders a fatal startup screen with the error message. This is covered by `src/bootstrapApp.test.jsx`.

## App Shell

`src/App.jsx` is the main composition point.

Provider order:

```text
MsalProvider
└── AuthProvider
    └── AppShell
        └── SidebarProvider
            └── ChatProvider
                ├── Header
                ├── Sidebar
                └── ChatWindow
```

The app shell decides whether to show:

- the login page,
- the full chat interface in authenticated mode,
- the full chat interface in guest mode,
- the full chat interface in anonymous local-dev mode.

It also registers an access-token provider with the API service. That provider is the bridge between auth state and Axios request headers.

## Authentication

Authentication lives in `src/context/AuthContext.jsx` and is surfaced through `src/hooks/useAuth.js`.

The frontend uses MSAL redirect login. Config is built in `src/auth/msalConfig.js` from Vite environment variables, and the singleton MSAL client is created in `src/auth/msalInstance.js`.

Primary auth responsibilities:

- determine whether MSAL auth is configured,
- acquire API access tokens silently,
- parse role claims from access tokens or ID token claims,
- fetch the current application user from `/me`,
- normalize role and user data from the API,
- manage login and logout redirects,
- manage guest-session state in `sessionStorage`.

Role resolution prefers the user record returned by `/me`. If that is not available, token role claims are used as a fallback. Known roles are `student`, `teacher`, and `admin`.

Guest mode:

- starts by calling `POST /guest/sessions` without an existing auth token,
- stores guest-session metadata in `sessionStorage` under `climamonitor.guestSession`,
- uses the returned guest token as a bearer token for chat,
- tracks prompt count and prompts remaining when the chat response includes guest metadata.

Local anonymous mode:

- is separate from guest mode,
- is only enabled for local API targets,
- bypasses bearer-token auth for explicit local development requests,
- sends `VITE_USER_ID` and `VITE_CLASSROOM_ID` because the local anonymous contract needs mock identity fields.

## Chat State

Chat state lives in `src/context/ChatContext.jsx` and is surfaced through `src/hooks/useChat.js`.

State fields:

- `messages`
- `conversationId`
- `isLoading`
- `error`

Main actions:

- `sendMessage(content)`
- `clearConversation()`
- `clearError()`

`sendMessage()` immediately adds the user message, calls the API service, stores the returned `conversation_id` for future turns, then appends the assistant message. It uses an `AbortController` and request IDs so stale responses are ignored after a conversation clear or component unmount.

Assistant messages may include source metadata. That source metadata is rendered by `SourceCard`.

## API Client

All frontend HTTP calls are centralized in `src/services/api.js`.

The Axios instance uses:

- `baseURL: import.meta.env.VITE_API_BASE_URL`
- JSON content type
- 30 second timeout
- a request interceptor for auth
- a response interceptor that normalizes errors into `{ error, message }`

API functions:

| Function | Route |
| --- | --- |
| `sendMessage` | `POST /chat/completions` |
| `createGuestSession` | `POST /guest/sessions` |
| `getCurrentUser` | `GET /me` |
| `getManagementUsers` | `GET /management/users` |
| `updateManagementUser` | `PATCH /management/users/:userId` |
| `getManagementClassrooms` | `GET /management/classrooms` |
| `createManagementClassroom` | `POST /management/classrooms` |
| `updateManagementClassroom` | `PATCH /management/classrooms/:classroomId` |
| `upsertClassroomMember` | `PUT /management/classrooms/:classroomId/members` |
| `removeClassroomMember` | `DELETE /management/classrooms/:classroomId/members/:userId` |
| `getTeacherClassrooms` | `GET /teacher/classrooms` |
| `getTeacherClassroomStudents` | `GET /teacher/classrooms/:classroomId/students` |

The frontend assumes the API returns chat responses shaped like:

```json
{
  "conversation_id": "conv_...",
  "message_id": "msg_...",
  "response": "Assistant answer",
  "sources": [
    {
      "chunk_id": "chunk_...",
      "document_name": "Document.pdf",
      "excerpt": "Relevant excerpt",
      "relevance_score": 0.94
    }
  ],
  "created_at": "2026-05-05T12:00:00.000Z"
}
```

## Components

### Auth

`src/components/Auth/LoginPage.jsx`

The login page shows:

- ClimaMonitor branding,
- sign-in button,
- guest mode button,
- environment-specific notices,
- local dev mode button when anonymous local dev is available.

### Chat

`src/components/Chat/ChatWindow.jsx`

Owns the visible chat layout. It renders the empty state, message list, loading indicator, guest prompt status, error banner, and chat input.

`src/components/Chat/ChatInput.jsx`

Autosizing textarea with Enter-to-send and Shift+Enter newline behavior. Enforces the frontend's 1000 character limit and shows a remaining-character counter near the limit.

`src/components/Chat/MessageBubble.jsx`

Renders user and assistant bubbles. Assistant content is rendered with React Markdown. Invalid timestamps are tolerated.

`src/components/Chat/SourceCard.jsx`

Collapsible list of sources for assistant answers. Each source shows document name, excerpt, and relevance percentage.

### Sidebar

`src/components/Sidebar/Sidebar.jsx`

Slide-out workspace panel with:

- signed-in, guest, or local-dev session metadata,
- sign out, sign in, or exit guest controls,
- `RoleDemoUI`,
- draggable width resizing,
- escape-key close behavior,
- mobile overlay.

`src/components/Sidebar/RoleDemoUI.jsx`

Role-specific workspace surface:

- Guest users see a prompt to sign in.
- Students see a role/access summary.
- Teachers can view classroom and student information.
- Admins can view management metrics, list users, update roles/active state, create/update classrooms, and manage classroom memberships.

This is the most complex frontend component. It coordinates several API calls and keeps separate loading, pending, notice, and tab state for management workflows.

## Role and Permission Data

`src/data/rolePermissions.js` defines:

- role constants,
- display labels,
- permission categories,
- rate-limit metadata,
- `hasPermission(role, permissionKey)`.

This file is frontend display/control metadata. It should not be treated as the source of truth for real authorization. Server-side authorization must still decide whether a request is allowed.

## Styling

Styling is split between:

- `src/styles/variables.css` for global tokens and resets,
- one CSS module per major component.

Core tokens include brand colors, neutrals, spacing, radii, shadows, typography, transitions, and sidebar sizing.

The UI uses the ClimaMonitor logo from `public/climamonitor_logo.jpeg`.

## Development Mocks

MSW is initialized in development by `enableMocking()` in `src/bootstrapApp.jsx`.

Current mock handlers are intentionally limited:

- Chat completions are not mocked in `handlers.js`; chat calls go to the configured API target.

`src/mocks/data.js` still contains older mock climate responses and helper data. This may be useful for future mock expansion, but it is not currently wired to the chat endpoint.

## Testing

Tests use Vitest with jsdom. Global setup is in `src/test/setupTests.js`.

Current test coverage includes:

- API auth and payload handling in `src/services/api.test.js`
- auth normalization and JWT parsing in `src/context/AuthContext.test.jsx`
- stale chat response handling and guest prompt updates in `src/context/ChatContext.test.jsx`
- admin role workspace flows in `src/components/Sidebar/RoleDemoUI.test.jsx`
- startup failure rendering in `src/bootstrapApp.test.jsx`
- invalid timestamp rendering in `src/components/Chat/MessageBubble.test.jsx`

Run tests with:

```bash
npm run test
```

## Azure Deployment Context

Azure CLI inspection on May 5, 2026 showed these relevant resources in the active subscription:

| Resource | Group | Region | Type | Frontend relevance |
| --- | --- | --- | --- | --- |
| `climamonitorstorage` | `climamonitor-demo-rg` | Germany West Central | Storage account | Static website host for the built frontend. |
| `climamonitor-api` | `climamonitor-demo-rg` | Germany West Central | Function App | Deployed API target used by Azure mode. |
| `climamonitor-api` | `climamonitor-demo-rg` | Global/Germany West Central | Application Insights | API monitoring context. |
| `climamonitor-gpt-deployment` | `climamonitor-demo-rg` | Germany West Central | Azure AI/OpenAI account | AI backend context only; frontend does not call it directly. |
| `psql-climamonitor-dev` | `climamonitor-demo-rg` | Sweden Central | PostgreSQL Flexible Server | Data backend context only; frontend does not call it directly. |

The storage account exposes the static website endpoint:

```text
https://climamonitorstorage.z1.web.core.windows.net/
```

The deployed API host is:

```text
https://climamonitor-api.azurewebsites.net
```

The frontend's Azure mode base URL is:

```text
https://climamonitor-api.azurewebsites.net/api/v1
```

## Build and Deploy Notes

For a production build:

```bash
npm run build
```

The generated assets are written to `dist/`. The storage account static website endpoint suggests deployment is likely done by uploading `dist/` contents to the storage account's static website container.

Before deploying, confirm that:

- `VITE_API_BASE_URL` points to the intended API,
- Microsoft Entra app registration redirect URIs include the deployed frontend origin,
- the API scope in `VITE_AZURE_API_SCOPE` matches the deployed API registration,
- the API CORS settings allow the deployed frontend origin,
- `mockServiceWorker.js` is not relied on for production behavior.

## Current Integration Notes and Risks

- The frontend has a complete guest-mode UI and client flow, but it depends on `POST /guest/sessions` and guest metadata in chat responses. Confirm the deployed API supports that contract before presenting guest mode as production-ready.
- Conversation listing is intentionally not exposed in the frontend service layer until the backend implements a production route.
- The sidebar role workspace is functional but dense. Any changes to management API response shapes should be reflected in `RoleDemoUI.jsx` and its tests.
- The frontend repository has its own `.git` directory and was clean at the time this documentation was written.
- Root-level project docs and adjacent API/backend code provide useful context, but this frontend should remain decoupled from backend internals except for the HTTP contracts in `src/services/api.js`.
