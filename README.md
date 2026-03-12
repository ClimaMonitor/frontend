# ClimaMonitor Frontend

React chat interface for the ClimaMonitor educational chatbot.

## Tech Stack

- React 18 + Vite
- CSS Modules
- Axios
- MSW (mock API)

## Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your values:
   ```
   VITE_API_BASE_URL=https://your-function-app.azurewebsites.net/api/v1
   VITE_USER_ID=student_mock
   VITE_CLASSROOM_ID=class_mock
   ```

3. Install and run:
   ```bash
   npm install
   npm run dev
   ```

4. Open http://localhost:5173

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

## Notes

- Connects to Azure Functions API at `VITE_API_BASE_URL`
- Sources shown in collapsible panels under AI responses (mocked until RAG is implemented)
- MSW mocks available for other endpoints during development
