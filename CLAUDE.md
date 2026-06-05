# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm ci           # install dependencies (package-lock.json is canonical; the pnpm-* files at root are vestigial)
npm run dev      # start dev server, Turbopack (http://localhost:3000)
npm run dev:webpack  # dev server on webpack (fallback if Turbopack misbehaves)
npm run build    # production build (output: "standalone")
npm start        # serve the production build
npm run lint     # ESLint (flat config, eslint-config-next core-web-vitals + typescript)
```

Docker (production image, standalone output):
```bash
docker compose up --build -d
```

There is no test suite, and no single-test command exists — verify changes by running `npm run build` and `npm run lint`.

## Architecture

**Stack**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui.

### Source layout

| Path | Purpose |
|------|---------|
| `src/app/` | App Router pages and one API proxy route |
| `src/components/` | The actual UI tree, grouped by feature area (the heavy room UI lives in `src/components/meeting/room/{stage,sidebar,footer,header,chat,dialogs,...}`) |
| `src/features/` | Feature **logic** — `hooks/`, `lib/`, `providers/` per feature (e.g. `meeting/room/hooks/` holds ~20 single-responsibility hooks). UI is wired up from `src/components/` |
| `src/hooks/` | Older hooks (auth, meeting) + `shared/mutation.utils.ts` (`assertApiSuccess`); `src/features/` is preferred for new hooks |
| `src/lib/` | Core utilities: API wrapper (`api/`), auth session/token (`auth/`), URL config (`config/`), meeting helpers (`meeting/`), `form/zod-resolver.ts`, SEO (`seo/`) |
| `src/shared/services/` | API service layer — preferred over the older `src/service/` directory |
| `src/types/` | Global TypeScript ambient declarations |

`src/core/` and `src/shared/{store,types,utils,hooks,components}/` are empty scaffolding — don't assume code lives there.

### Pages / routes

Most pages live under the `(main)` route group (shared `SiteShell` layout); `/admin` is outside it with its own layout.

- `/` — home (guest or authenticated)
- `/sign-in`, `/sign-up` — auth
- `/schedule`, `/profile` — authenticated features
- `/[meetingCode]` — full meeting flow (verify → lobby → room)
- `/admin` — admin dashboard (`src/features/admin/`, `src/components/admin/`); data via `src/shared/services/admin/`
- `/api/proxy/meetings/[meetingCode]/cancel-join` — Next.js API route that proxies cancel-join to the backend so `navigator.sendBeacon()` works on page unload
- `robots.ts`, `sitemap.ts`, `not-found.tsx` — SEO/error routes

### Meeting flow

1. **Verify** — `meetingApi.verifyMeeting()` checks if the meeting exists and hasn't ended.
2. **Lobby** (`src/features/lobby/`) — user configures camera/mic, then calls `meetingApi.joinMeeting()`.
   - If the backend returns `participantStatus: "WAITING"`, the lobby opens a **STOMP/SockJS** connection (see below) and waits for host approval.
   - Approved participants complete a second join call to get their LiveKit token.
3. **Room** (`src/features/meeting/room/`) — renders the active meeting using LiveKit for video/audio/chat.
4. **Session persistence** — `src/lib/meeting/instant-meeting-session.ts` stores join state in `sessionStorage` so a page refresh restores the meeting without re-entering the lobby.

### Dual real-time channels

**LiveKit** (`livekit-client`) — WebRTC for video, audio, and in-meeting chat. The raw SDK is wrapped in `src/features/livekit/hooks/use-livekit-room.ts`, which exposes a stable callback-based interface. `use-room-livekit-session.ts` adapts this for the room feature.

**STOMP over SockJS** (`@stomp/stompjs` + `sockjs-client`) — used for meeting coordination signals (join requests, admit/reject, kick). The low-level connection lives in `src/lib/meeting/meeting-websocket.ts`; in the room it is owned by a React context, `MeetingSocketProvider` (`src/features/meeting/providers/meeting-socket-provider.tsx`), which exposes `connect`/`disconnect` plus typed `sendAccept`/`sendReject`/`sendKickout`/etc. Topics:
- `/topic/meeting/{code}` — general meeting events
- `/topic/meeting/{code}/waiting` — host-side waiting room notifications
- `/topic/meeting/{code}/participant/{id}` — per-participant events (admit/reject/kick)

### Data fetching & state

**React Query** (`@tanstack/react-query`) is the data layer. A single `QueryClient` is created in `src/components/layout/app-provider.tsx` (`AppProvider`), which also wraps `ThemeProvider` (next-themes) and the `sonner` `Toaster`; `AppProvider` is mounted once in the root layout. Service methods are not called directly from components — they are wrapped in query/mutation hooks (e.g. `useVerifyMeeting`, `useMeetingApi`, the `use-admin-*` hooks). `assertApiSuccess` in `src/hooks/shared/mutation.utils.ts` normalizes the `IBackendRes<T>` envelope into a thrown error or unwrapped data.

**Forms**: `react-hook-form` + `zod`, bridged by a hand-rolled `zodResolver` in `src/lib/form/zod-resolver.ts` (the project does **not** use `@hookform/resolvers`).

### API layer

`src/lib/api/wrapper.ts` → `sendRequest<T>()` is the single fetch wrapper. It:
- Attaches `Authorization: Bearer <token>` when `auth: true`
- Automatically retries once after refreshing the access token on a 401
- Redirects to `/sign-in` on refresh failure (configurable via `redirectOnAuthFail`)

All backend API methods live in `src/shared/services/meeting/client.ts` (exported via `src/shared/services/meeting.service.ts`).

### Auth

Client-side only — no Next.js middleware. Access token stored in `localStorage`, refresh token in an HTTP-only cookie. `useAuthSession()` in `src/lib/auth/auth-session.ts` uses `useSyncExternalStore` for reactive auth state across tabs.

### SEO & analytics

The meeting page (`src/app/(main)/[meetingCode]/page.tsx`) runs `generateMetadata` **on the server**: it `POST`s to the backend `/meetings/verify` (2 s timeout, falls back gracefully) to put the real meeting title into the page/OG tags, and marks meeting pages `noindex`. Site-wide SEO helpers live in `src/lib/seo/` (`site.ts`, `jsonld.ts`, `analytics.ts`). GA4 is wired through `@next/third-parties/google` in the root layout, gated on `NEXT_PUBLIC_GA_ID`.

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
| `NEXT_PUBLIC_SITE_URL` | ✓ (metadataBase, sitemap) | ✓ | `http://localhost:3000` |
| `NEXT_PUBLIC_GA_ID` | — | ✓ | `""` (GA disabled) |
| `NEXT_ALLOWED_DEV_ORIGINS` | ✓ (`next.config.ts`) | — | `local-origin.dev,*.local-origin.dev` |

`NEXT_PUBLIC_*` variables are baked in at build time — rebuild the image after changing them. URL resolution lives in `src/lib/config/api-url.ts`: server-side prefers `BACKEND_INTERNAL_URL`, browser uses `NEXT_PUBLIC_BACKEND_URL`, and the meeting socket URL is derived from the backend URL (swapping `/api` → `/server`) when not set explicitly.
