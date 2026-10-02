# Drive endpoint contracts

SYNC Drive should consume small, stable server responses rather than recreate the web app's full view-models.

Target contracts:

- `GET /mobile/drive/summary/` → today's next events, unread message previews, next work items.
- `POST /mobile/drive/assistant/` → a short voice-safe SYNC response plus optional action.

Until those dedicated endpoints exist, native adapters may map existing Calendar, Inbox, and Ticket endpoints. A dedicated aggregate endpoint is preferred before production because CarPlay should connect quickly and degrade gracefully on cellular connections.
