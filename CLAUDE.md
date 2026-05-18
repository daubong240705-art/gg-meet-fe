# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm ci           # install dependencies
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build
npm run lint     # ESLint
```

Docker (production image, standalone output):
```bash
docker compose up --build -d
```

There is no test suite.

## Architecture

**Stack**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui.

### Source layout

| Path | Purpose |
|------|---------|
| `src/app/` | App Router pages and one API proxy route |
| `src/components/` | Page-level UI components grouped by feature area |
| `src/features/` | Feature modules — each has `hooks/` + `components/` subdirs with barrel `index.ts` |
| `src/hooks/` | Older hooks (auth, meeting); `src/features/` is the preferred location for new hooks |
| `src/lib/` | Core utilities: API wrapper, auth session/token, config, meeting helpers |
| `src/shared/services/` | API service layer — preferred over the older `src/service/` directory |
| `src/types/` | Global TypeScript ambient declarations |

### Pages / routes

- `/` — home (guest or authenticated)
- `/sign-in`, `/sign-up` — auth
- `/schedule`, `/profile` — authenticated features
- `/[meetingCode]` — full meeting flow (verify → lobby → room)
- `/api/proxy/meetings/[meetingCode]/cancel-join` — Next.js API route that proxies cancel-join to the backend so `navigator.sendBeacon()` works on page unload

### Meeting flow

1. **Verify** — `meetingApi.verifyMeeting()` checks if the meeting exists and hasn't ended.
2. **Lobby** (`src/features/lobby/`) — user configures camera/mic, then calls `meetingApi.joinMeeting()`.
   - If the backend returns `participantStatus: "WAITING"`, the lobby opens a **STOMP/SockJS** connection (see below) and waits for host approval.
   - Approved participants complete a second join call to get their LiveKit token.
3. **Room** (`src/features/meeting/room/`) — renders the active meeting using LiveKit for video/audio/chat.
4. **Session persistence** — `src/lib/meeting/instant-meeting-session.ts` stores join state in `sessionStorage` so a page refresh restores the meeting without re-entering the lobby.

### Dual real-time channels

**LiveKit** (`livekit-client`) — WebRTC for video, audio, and in-meeting chat. The raw SDK is wrapped in `src/features/livekit/hooks/use-livekit-room.ts`, which exposes a stable callback-based interface. `use-room-livekit-session.ts` adapts this for the room feature.

**STOMP over SockJS** (`@stomp/stompjs` + `sockjs-client`) — used for meeting coordination signals (join requests, admit/reject, kick). Encapsulated in `src/lib/meeting/meeting-websocket.ts`. Topics:
- `/topic/meeting/{code}` — general meeting events
- `/topic/meeting/{code}/waiting` — host-side waiting room notifications
- `/topic/meeting/{code}/participant/{id}` — per-participant events (admit/reject/kick)

### API layer

`src/lib/api/wrapper.ts` → `sendRequest<T>()` is the single fetch wrapper. It:
- Attaches `Authorization: Bearer <token>` when `auth: true`
- Automatically retries once after refreshing the access token on a 401
- Redirects to `/sign-in` on refresh failure (configurable via `redirectOnAuthFail`)

All backend API methods live in `src/shared/services/meeting/client.ts` (exported via `src/shared/services/meeting.service.ts`).

### Auth

Client-side only — no Next.js middleware. Access token stored in `localStorage`, refresh token in an HTTP-only cookie. `useAuthSession()` in `src/lib/auth/auth-session.ts` uses `useSyncExternalStore` for reactive auth state across tabs.

### Global types

Defined as ambient declarations (no import needed):
- `IBackendRes<T>`, `IRequest`, `IModelPaginate<T>` — `src/types/backend.d.ts`
- `User`, `Role` — `src/types/global.type.ts`

### Environment variables

| Variable | Used server-side | Used client-side | Default |
|----------|-----------------|-----------------|---------|
| `NEXT_PUBLIC_BACKEND_URL` | fallback | ✓ | `/api` |
| `BACKEND_INTERNAL_URL` | ✓ (primary) | — | `http://backend:8080/api` |
| `NEXT_PUBLIC_WEBSOCKET_URL` | — | ✓ | `""` (LiveKit) |
| `NEXT_PUBLIC_MEETING_SOCKET_URL` | — | ✓ | derived from backend URL |

`NEXT_PUBLIC_*` variables are baked in at build time — rebuild the image after changing them.
