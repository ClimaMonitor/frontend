# Auth Info

This document summarizes the current authentication setup for ClimaMonitor as of May 5, 2026. It reflects the active frontend and the active Azure Functions backend in `backend/`.

The older `api/` directory still contains a prototype auth implementation with `AUTH_MODE=optional|required`. That code is useful historical context, but it is not the current implementation described here.

## Current Auth Model

ClimaMonitor uses Microsoft Entra ID for sign-in and bearer-token validation.

Current model:

- The frontend uses MSAL for interactive sign-in.
- The frontend requests an access token for the ClimaMonitor API scope.
- The backend validates the Microsoft Entra access token signature, issuer, audience, and expiry.
- The backend extracts the caller's Entra `oid` claim.
- The backend resolves that `oid` to an application user record in PostgreSQL.
- Backend database data is the current source of truth for role, active status, school, and classroom access.

This means Entra proves identity, but application authorization is now database-backed.

## What Changed Since The Older Version Of This Doc

Several statements in the previous version were stale:

- It said authorization was based on Entra app-role claims. That is no longer the full current model. App roles still exist in Entra, but the active backend derives effective role/access from PostgreSQL after token validation.
- It pointed backend local setup at `api/local.settings.json` and `api/src/auth/*`. The active backend is now under `backend/`.
- It described local `AUTH_MODE=optional` as current behavior. The active `backend/` auth layer does not read `AUTH_MODE`; routes call the token validator directly.
- It said the frontend had not been deployed. Azure now has a storage-account static website endpoint for the frontend.
- It did not mention guest mode. The frontend contains guest-mode UI/client code, but the deployed API currently returns `404` for `/api/v1/guest/sessions`, so guest mode should be treated as not production-ready.

## Azure Auth Resources

Azure CLI inspection confirmed the auth app registrations still exist:

- `ClimaMonitor-Frontend`
- `ClimaMonitor-API`

The API app registration has:

- Application ID URI in the `api://...` format.
- Delegated scope: `access_as_user`.
- App roles: `Student`, `Teacher`, `Admin`.
- Access token version: v2.

The frontend app registration has:

- SPA redirect URI for local development at `http://localhost:5173`.
- API permission to call the ClimaMonitor API delegated scope.

The API enterprise application has app-role assignments for the demo student, demo teacher, and current team/admin users. Those assignments can still produce `roles` claims in tokens, and the frontend can use token roles as a fallback before `/me` resolves. They are not the backend's final authorization source.

For public documentation, do not list tenant IDs, app/client IDs, user object IDs, or personal account names here. They are not passwords, but they are environment-specific identifiers and can be useful for tenant/app enumeration. Use Azure Portal, Azure CLI, or local environment files when an operator needs the exact values.

## Active Frontend Configuration

Frontend auth code lives in:

- `frontend/src/auth/msalConfig.js`
- `frontend/src/auth/msalInstance.js`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/hooks/useAuth.js`
- `frontend/src/components/Auth/LoginPage.jsx`

Frontend API calls live in:

- `frontend/src/services/api.js`

Frontend environment variables:

- `VITE_AUTH_MODE`
- `VITE_API_BASE_URL`
- `VITE_AZURE_TENANT_ID`
- `VITE_AZURE_CLIENT_ID`
- `VITE_AZURE_AUTHORITY`
- `VITE_AZURE_API_SCOPE`
- `VITE_USER_ID`
- `VITE_CLASSROOM_ID`

Mode behavior:

- `npm run dev` and `npm run dev:azure` point at the deployed Azure API through `.env.azure`.
- `npm run dev:localapi` points at `http://localhost:7071/api/v1` through `.env.localapi`.
- `VITE_AUTH_MODE=optional` only controls whether the frontend offers local anonymous-dev UI.
- The active backend still requires a valid bearer token unless a specific unauthenticated route exists.

Authenticated requests:

- Frontend attaches `Authorization: Bearer <access_token>`.
- Chat request bodies send `message` and optional `conversation_id`.
- Authenticated and guest-token chat requests do not send `user_id` or `classroom_id`.

Anonymous local-dev requests:

- The frontend only sends `user_id` and `classroom_id` when `allowAnonymousRequest` is explicitly true.
- This path is only appropriate for local development.
- Against the active `backend/` implementation, anonymous chat will fail unless anonymous support is added or a different local prototype API is used.

## Active Backend Configuration

Active backend auth code lives in:

- `backend/src/auth/authenticate.js`
- `backend/src/auth/resolveUserContext.js`
- `backend/src/auth/permissions.js`
- `backend/src/functions/me.js`
- `backend/src/functions/chatCompletions.js`
- `backend/src/functions/adminUsers.js`
- `backend/src/functions/adminClassrooms.js`
- `backend/src/functions/teacherClassrooms.js`

Relevant backend app settings:

- `AZURE_API_AUDIENCE`
- `AZURE_API_CLIENT_ID`
- `AZURE_TOKEN_ISSUER`
- `AZURE_JWKS_URI`
- `PG_CONNECTION_STRING`

The deployed Function App also has `AUTH_MODE=required`, but the active `backend/` auth code does not use that setting. Authentication is enforced because each protected handler calls `authenticate()` and fails if the bearer token is missing or invalid.

The active backend accepts both API audience formats:

- `api://<api-client-id>`
- `<api-client-id>`

That compatibility is implemented in `getAcceptedAudiences()`.

## User Context And Roles

Backend user resolution flow:

1. Validate the bearer token.
2. Read the `oid` claim.
3. Look up a PostgreSQL `users` row using that ID.
4. Load active classroom memberships.
5. Reject unknown or inactive users.
6. Return a trusted user context to the handler.

The current database mapping uses the Entra object ID as the application `users.user_id`. If that changes later, the resolver and schema should be updated together.

Frontend role resolution:

- The frontend acquires an API access token and parses token role claims.
- After sign-in, the frontend calls `GET /me`.
- If `/me` returns a user role, that database role wins.
- Token roles are only a fallback when no database user context has loaded yet.

Role values in frontend/backend application code are lowercase:

- `student`
- `teacher`
- `admin`

Entra app-role display values are title case:

- `Student`
- `Teacher`
- `Admin`

The frontend normalizes both forms.

## Protected Routes

Current frontend-facing routes used by the app:

| Route | Purpose | Auth expectation |
| --- | --- | --- |
| `GET /api/v1/me` | Current application user context | Bearer token required |
| `POST /api/v1/chat/completions` | Chat answer generation | Bearer token required in active backend |
| `GET /api/v1/management/users` | Admin user list | Admin role in DB required |
| `PATCH /api/v1/management/users/{user_id}` | Admin user update | Admin role in DB required |
| `GET /api/v1/management/classrooms` | Admin classroom list | Admin role in DB required |
| `POST /api/v1/management/classrooms` | Admin classroom create | Admin role in DB required |
| `PATCH /api/v1/management/classrooms/{classroom_id}` | Admin classroom update | Admin role in DB required |
| `PUT /api/v1/management/classrooms/{classroom_id}/members` | Admin membership upsert | Admin role in DB required |
| `DELETE /api/v1/management/classrooms/{classroom_id}/members/{user_id}` | Admin membership deactivate | Admin role in DB required |
| `GET /api/v1/teacher/classrooms` | Teacher/admin classroom list | Teacher or admin role in DB required |
| `GET /api/v1/teacher/classrooms/{classroom_id}/students` | Teacher/admin student list | Teacher/admin DB access required |

Frontend code also calls:

- `POST /api/v1/guest/sessions`

As of this check, the deployed API returns `404` for that route. Guest mode is therefore client-side/in-progress unless the backend implementation is added.

## Current Azure Deployment Behavior

Verified deployed API behavior:

- `GET /api/v1/me` without a bearer token returns `401` with `missing_authorization_header`.
- `POST /api/v1/chat/completions` without a bearer token returns `401` with `missing_authorization_header`.
- `POST /api/v1/guest/sessions` currently returns `404`.

Relevant Azure resources:

- Function App: `climamonitor-api`
- Resource group: `climamonitor-demo-rg`
- Static website storage account: `climamonitorstorage`
- Static website endpoint: `https://climamonitorstorage.z1.web.core.windows.net/`

The deployed frontend origin must be present in the frontend app registration redirect URIs and in API CORS settings for browser sign-in/API calls to work from production.

## How To Run Locally

### Frontend using deployed Azure API

```bash
cd /Users/alexrowe/Desktop/IFSAProject/frontend
npm install
npm run dev:azure
```

### Frontend using local active backend

```bash
cd /Users/alexrowe/Desktop/IFSAProject/backend
npm install
npm run start
```

In another terminal:

```bash
cd /Users/alexrowe/Desktop/IFSAProject/frontend
npm install
npm run dev:localapi
```

This path still requires valid auth configuration and a user record resolvable by the local backend.

## What To Test

Minimum useful auth test pass:

1. Sign in as a student user.
- Verify chat works.
- Verify teacher/admin controls are hidden.

2. Sign in as a teacher user.
- Verify teacher workspace controls appear.
- Verify admin-only controls are hidden.
- Verify chat works.

3. Sign in as an admin user.
- Verify admin management controls appear.
- Verify management routes work.
- Verify chat works.

4. Sign out and switch accounts.
- Verify role and user context update correctly.

5. Refresh while signed in.
- Verify session survives refresh.
- Verify `/me` reloads the database-backed role/user context.

6. Try unauthenticated deployed API calls.
- Verify protected routes return `401`.

## Files That Should Not Be Committed

Do not commit files containing environment-specific secrets or private operator data:

- `frontend/.env`
- `frontend/.env.local`
- `frontend/.env.*.local`
- `api/local.settings.json`
- `backend/local.settings.json`
- any files containing passwords, database connection strings, Azure OpenAI keys, access tokens, refresh tokens, or generated login credentials

Mode files such as `frontend/.env.azure` and `frontend/.env.localapi` can be committed only if they contain non-secret public routing values. Review them before pushing.

## Public Repository Safety

This updated document is intended to be safer for a public repository because it avoids listing:

- tenant IDs,
- app/client IDs,
- object IDs,
- personal account names,
- demo account UPNs,
- passwords,
- API keys,
- database connection strings.

The document still names public Azure resource hostnames and resource names. Those are usually not secret, but they do reveal project infrastructure. If the repository must be maximally private, replace those with placeholders too.

Before pushing the broader repo publicly, audit more than this file. The project currently contains files that are likely not safe for public release, including local settings, login notes, security/audit notes, and environment files outside this document.

## Known Follow-Up Work

- Decide whether guest mode should be implemented server-side or removed from the production UI.
- Remove or clearly isolate the legacy `api/` prototype to avoid confusing it with the active `backend/`.
- Update older backend README examples that still show `user_id` and `classroom_id` as required authenticated chat fields.
- Confirm deployed frontend redirect URI and API CORS configuration after each frontend deployment.
- Keep app-role assignments and database user roles synchronized, or document which one should be operationally authoritative.

## Summary

The current auth system is real and active:

- MSAL sign-in is used by the frontend.
- The API validates Entra access tokens.
- The backend resolves trusted user context from PostgreSQL.
- Role-based UI and server authorization now depend primarily on database user context.
- The deployed API rejects unauthenticated protected requests.

The main stale area is guest/anonymous behavior: the frontend has UI and client code for it, but the active deployed backend does not currently expose the guest-session route.
