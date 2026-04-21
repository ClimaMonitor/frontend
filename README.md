# ClimaMonitor Frontend

React chat interface for the ClimaMonitor educational chatbot.

## Tech Stack

- React 18 + Vite
- CSS Modules
- Axios
- MSW (mock API)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Choose a development mode:
   - `npm run dev` or `npm run dev:azure`
     Default mode. This targets the deployed Azure API and requires the Azure auth environment variables to sign in successfully.
   - `npm run dev:localapi`
     Use this when you want to run against the local API on `localhost:7071`. Anonymous local dev mode is available there.

3. For local API development, copy the example environment file:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your local values if needed:
   ```
   VITE_API_BASE_URL=http://localhost:7071/api/v1
   VITE_USER_ID=student_mock
   VITE_CLASSROOM_ID=class_mock
   ```

5. Start the app:
   ```bash
   npm run dev
   ```

6. Open http://localhost:5173

## Azure API Mode

When running `npm run dev` or `npm run dev:azure`, the frontend points at the deployed Azure Functions API and anonymous mode is unavailable.

Set these environment variables before using Azure mode:

```bash
VITE_API_BASE_URL=https://your-function-app.azurewebsites.net/api/v1
VITE_AZURE_TENANT_ID=...
VITE_AZURE_CLIENT_ID=...
VITE_AZURE_AUTHORITY=...
VITE_AZURE_API_SCOPE=...
```

## Structure

```
src/
├── components/Chat/   # ChatWindow, MessageBubble, ChatInput, SourceCard
├── context/           # ChatContext (state management)
├── hooks/             # useChat
├── services/          # API client
└── mocks/             # MSW handlers + mock data
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Azure Functions API endpoint |
| `VITE_USER_ID` | User ID for API requests (mock for now) |
| `VITE_CLASSROOM_ID` | Classroom ID for API requests (mock for now) |
| `VITE_AZURE_TENANT_ID` | Microsoft Entra tenant ID for Azure sign-in |
| `VITE_AZURE_CLIENT_ID` | Microsoft Entra app client ID |
| `VITE_AZURE_AUTHORITY` | Microsoft Entra authority URL |
| `VITE_AZURE_API_SCOPE` | API scope requested for bearer tokens |

## Notes

- `npm run dev` defaults to Azure API mode
- Use `npm run dev:localapi` when the local API is running on `localhost:7071`
- Connects to Azure Functions API at `VITE_API_BASE_URL`
- Sources shown in collapsible panels under AI responses (mocked until RAG is implemented)
- MSW mocks available for other endpoints during development
