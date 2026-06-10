# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

The package manager is **pnpm** (`packageManager: pnpm@11.1.1`; `pnpm-lock.yaml` is canonical — the `package-lock.json` at root is a leftover from the earlier npm setup).

```bash
pnpm install     # install dependencies
pnpm dev         # start dev server, Turbopack (http://localhost:3000)
pnpm dev:webpack # dev server on webpack (fallback if Turbopack misbehaves)
pnpm build       # production build (output: "standalone")
pnpm start       # serve the production build
pnpm lint        # ESLint (flat config, eslint-config-next core-web-vitals + typescript)
```

Electron desktop app:
```bash
pnpm desktop:dev    # dev: runs Next dev server + Electron pointed at localhost:3000
pnpm build:desktop  # static export for the desktop shell (BUILD_TARGET=desktop → ./out)
pnpm desktop:dir    # build unpacked desktop app (electron-builder --dir)
pnpm desktop:pack   # build distributable desktop package
```

Docker (production image, standalone output):
```bash
docker compose up --build -d
```

There is no test suite, and no single-test command exists — verify changes by running `pnpm build` and `pnpm lint`.

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

### Authorization (CASL)

Permissions are modeled with `@casl/ability` in `src/lib/auth/ability/`:
- `defineAppAbility(role)` — app-level ability from the user role (`ADMIN` → `manage all`); built in `admin-dashboard.tsx`.
- `defineRoomAbility({ isHost, canUseHostMediaControls, roomSettings })` — in-room permissions (kick, muteTrack, endMeeting, unmuteSelf, shareScreen, …), with CASL conditions on participant fields like `isLocal`/`isHost`. Provided to the room UI via `RoomAbilityProvider` (`src/features/meeting/providers/room-ability-provider.tsx`) and consumed with `ability.can(...)` checks in the room components.

Check abilities rather than re-deriving `isHost`/room-settings logic in components.

### Electron desktop app

`electron/main.ts` is the Electron entry: in dev it loads the Next dev server (`ELECTRON_DEV_SERVER_URL`, default `http://localhost:3000`); when packaged it serves the **static export** (`pnpm build:desktop` → `./out`, built by `scripts/build-desktop.mjs` which temporarily moves the web-only routes `src/app/api/` and `src/app/(main)/[meetingCode]/` aside and sets `BUILD_TARGET=desktop`) through a custom `app://local` protocol — a stable origin, so localStorage/auth survive restarts. There is no embedded Node server.

Desktop-specific plumbing: runtime config is read from `<userData>/config.json` (backend/LiveKit/STOMP URLs, overriding the baked `NEXT_PUBLIC_*` values via `window.desktop.config` in `src/lib/config/api-url.ts`); the refresh token is stored encrypted via `safeStorage` in the main process and reached over IPC (`window.desktop.auth`, consumed by `src/lib/auth/refresh-store.ts` + the desktop branch in `src/lib/api/wrapper.ts`, which sends `X-Refresh-Token`/`X-Client: desktop` instead of cookies); in-app navigation to meetings must go through `meetingHref()` (`src/lib/meeting/meeting-path.ts`), which returns `/join?code=` on desktop and `/{code}` on the web. `main.ts` also wires `session.setDisplayMediaRequestHandler` + `desktopCapturer` so in-app screen sharing works. `pnpm electron:build` compiles `electron/` with its own tsconfig into `dist-electron/` (the `main` field in package.json); packaging config is in `electron-builder.yml` (the `out/` export ships as an extraResource). The desktop auth/refresh flow requires the backend to support `X-Refresh-Token`/`X-Client` (see `docs/desktop-spa-flutter-roadmap/task-0-be-client-agnostic-auth.md` at the repo root).

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
