# ClimaMonitor Frontend

React chat interface for the ClimaMonitor educational chatbot.

## Tech Stack

- React 18 + Vite
- CSS Modules
- Axios
- MSW (mock API)

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Structure

```
src/
├── components/Chat/   # ChatWindow, MessageBubble, ChatInput, SourceCard
├── context/           # ChatContext (state management)
├── hooks/             # useChat
├── services/          # API client
└── mocks/             # MSW handlers + mock data
```

## Notes

- Mock API returns climate education responses
- Sources shown in collapsible panels under AI responses
- Ready to connect to real backend at `/api/v1/chat/completions`
