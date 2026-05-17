# Refactor File Audit

Ngay cap nhat: 2026-05-17. Lan cuoi chinh sua: refactor `schedule/page.tsx`.

Tai lieu nay tong hop cac file con can refactor sau dot tach hook cua meeting room. Muc tieu la giup chia viec theo tung file, tranh refactor lan man va co tieu chi hoan thanh ro rang.

## 1. Tong quan uu tien

| Uu tien | File | So dong | Ly do uu tien |
| --- | --- | ---: | --- |
| P0 | `src/components/meeting/lobby.tsx` | 314 | Da tach helper/UI, join flow, pending session va waiting socket lifecycle. |
| P0 | `src/app/profile/page.tsx` | 151 | Da tach profile draft, audio/device preferences va UI cards/dialog. |
| P1 | `src/components/meeting/room/room-sidebar.tsx` | 92 | Da tach shell, participants panel, chat panel, sticker picker va kick dialog. |
| P1 | `src/components/meeting/room/room-footer.tsx` | 167 | Da tach toolbar controls, device/screen menus, leave dialog, timer va copy link. |
| P1 | `src/shared/services/meeting.service.ts` | 5 | Da tach service thanh types, client, errors, status va cancel-join modules. |
| P1 | `src/components/auth/auth-form-page.tsx` | 20 | Da tach shell, fields, submit section va sign-in/sign-up forms. |
| P1 | `src/components/meeting/room/room.tsx` | 389 | Da gan composition shell, nhung van co nhieu hook wiring va LiveKit/socket prop glue. |
| P2 | `src/app/[meetingCode]/page.tsx` | 356 | Page route gom verify meeting, left/ended view, join-state persistence va render switching. |
| P2 | `src/lib/meeting/lobby-audio.ts` | 346 | Gom audio registry, storage, playback, event listener va preview logic. |
| P2 | `src/components/home/authenticated-home-upcoming.tsx` | 335 | Upcoming UI, notification localStorage, time polling va card rendering trong mot file. |
| P2 | `src/components/meeting/waiting-room.tsx` | 321 | Polling join status, toast rejection, last-check state va UI trong mot component. |
| P2 | `src/components/meeting/room/room-header.tsx` | 306 | Header moi tach, van co waiting menu va participants menu trong cung file. |
| P2 | `src/app/schedule/page.tsx` | 300 → 122 | ✓ Tach `schedule-form-card`, `schedule-invite-list`, `schedule-date-time-fields`. |

Quy tac uu tien:

- P0: Nen refactor truoc khi them tinh nang moi vao khu vuc do.
- P1: Refactor theo PR nho khi cham vao file.
- P2: Chua can dung ngay neu khong co thay doi lien quan, nhung nen tach khi file tiep tuc tang.

## 2. `src/components/meeting/lobby.tsx`

### Hien trang

- Sau phase 2: 314 dong, giam tu 1095 dong.
- Dang gom:
  - UI lobby composition.
  - Auth user/default guest name.
  - Device setup qua `useLobbyDevices`.
  - Wiring hook join flow/waiting socket.
  - Render setup, waiting approval va rejected states.

### Van de

- Nhieu ref lifecycle da duoc tach ra hook, nhung cac hook phase 2 van can duoc manual test tren backend/socket that.
- Business logic join/cancel/waiting socket khong con nam truc tiep trong JSX component.
- Edge case can kiem tra tay: guest refresh khi WAITING, host admitted, rejected, meeting ended, cancel join best-effort.

### Huong refactor

Tach theo thu tu:

1. `src/features/lobby/lib/join-state.ts`
   - `createGuestId`
   - `areLobbyJoinStatesEqual`
   - `getGuestJoinRequest`
   - `getInitialPendingJoinState`
2. `src/features/lobby/lib/cancel-join.ts`
   - `getCancelJoinMessage`
   - `getCancelJoinRequest`
3. `src/features/lobby/lib/errors.ts`
   - `shouldTreatPendingJoinErrorAsMeetingEnded`
4. `src/features/lobby/lib/waiting-message.ts`
   - `getWaitingMessage`
5. `src/features/lobby/hooks/use-lobby-join-session.ts`
   - pending join state/ref.
   - persist/read/clear instant meeting session.
6. `src/features/lobby/hooks/use-lobby-waiting-socket.ts`
   - connect/disconnect waiting socket.
   - admitted/rejected/meeting ended messages.
7. `src/features/lobby/hooks/use-lobby-join-flow.ts`
   - join mutation.
   - request approved join.
   - sync pending status.
8. UI components:
   - `lobby-setup-view.tsx`
   - `lobby-waiting-approval.tsx`
   - `lobby-rejected-request.tsx`

Da hoan thanh phase 1:

- Tao `src/features/lobby/types.ts`.
- Tao `src/features/lobby/lib/join-state.ts`.
- Tao `src/features/lobby/lib/cancel-join.ts`.
- Tao `src/features/lobby/lib/errors.ts`.
- Tao `src/features/lobby/lib/waiting-message.ts`.
- Tao `src/features/lobby/components/lobby-setup-view.tsx`.
- Tao `src/features/lobby/components/lobby-waiting-approval.tsx`.
- Tao `src/features/lobby/components/lobby-rejected-request.tsx`.
- `npx eslint` targeted lobby files: pass.
- `npm run build`: pass.

Da hoan thanh phase 2:

- Tao va noi `src/features/lobby/hooks/use-lobby-join-session.ts`.
- Tao va noi `src/features/lobby/hooks/use-lobby-join-flow.ts`.
- Tao va noi `src/features/lobby/hooks/use-lobby-waiting-socket.ts`.
- `src/components/meeting/lobby.tsx` xuong 314 dong, chi con auth/device wiring va render state.
- Khong con goi truc tiep `meetingApi.*` trong `lobby.tsx`.
- Socket, polling, unload cancel va persist pending media settings nam trong `use-lobby-waiting-socket.ts`.
- Join mutation, approved join, sync pending status va meeting ended handling nam trong `use-lobby-join-flow.ts`.
- `npx eslint` targeted lobby phase 2 files: pass.
- `npm run build`: pass.

### Tieu chi hoan thanh

- `lobby.tsx` duoi 350 dong.
- Khong con goi truc tiep `meetingApi.*` trong JSX component, chi qua hook.
- Socket/cancel unload logic nam trong hook co cleanup ro.
- `npm run build` pass.
- Manual test: guest join, WAITING refresh, admitted, rejected, cancel join, meeting ended.

## 3. `src/app/profile/page.tsx`

### Hien trang

- Sau phase profile: 151 dong, giam tu 833 dong.
- Dang gom:
  - Fetch/update profile.
  - Wiring profile draft hook.
  - Wiring audio/device preferences hooks.
  - Render shell, summary card, details card va avatar dialog.

### Van de

- Page route khong con lam form model/settings UI truc tiep.
- Audio/device settings da tach ra hook, khong import UI component.
- Cac boundary UI chinh da ro: shell, summary card, form card, avatar dialog, audio/device settings.
- Con can manual test: save profile, reset draft, avatar picker, audio preview, doi default device va toggle meeting defaults.

### Huong refactor

Tach theo thu tu:

1. `src/features/profile/hooks/use-profile-draft.ts`
   - snapshot, fullName/avatar draft, changed state, reset.
2. `src/features/profile/hooks/use-meeting-audio-preferences.ts`
   - read/set/listen audio preferences.
   - preview sound.
3. `src/features/profile/hooks/use-meeting-device-preferences.ts`
   - read/set/listen device preferences.
   - enumerate camera/microphone devices.
4. Components:
   - `profile-page-shell.tsx`
   - `profile-form-card.tsx`
   - `avatar-picker-dialog.tsx`
   - `meeting-audio-settings.tsx`
   - `meeting-device-settings.tsx`

Da hoan thanh phase profile:

- Tao `src/features/profile/types.ts`.
- Tao `src/features/profile/hooks/use-profile-draft.ts`.
- Tao `src/features/profile/hooks/use-meeting-audio-preferences.ts`.
- Tao `src/features/profile/hooks/use-meeting-device-preferences.ts`.
- Tao cac component `profile-page-shell.tsx`, `profile-summary-card.tsx`, `profile-details-card.tsx`, `profile-form-card.tsx`, `avatar-picker-dialog.tsx`, `meeting-device-settings.tsx`, `meeting-audio-settings.tsx`.
- `src/app/profile/page.tsx` xuong 151 dong va chi con container wiring.
- `npx eslint` targeted profile files: pass.
- `npm run build`: pass.

### Tieu chi hoan thanh

- `src/app/profile/page.tsx` duoi 200 dong.
- Route page chi fetches hooks va ghe UI.
- Audio/device preference hooks khong import UI component.
- Avatar picker co props ro: selected URL, options, onSelect, open state.

## 4. `src/components/meeting/room/room-sidebar.tsx`

### Hien trang

- Sau phase sidebar: 92 dong, giam tu 625 dong.
- Dang gom:
  - Chon tab active va render shell.
  - Truyen props vao participants/chat panel.
  - Khong doi public props tu `RoomBody`.

### Van de

- Chat UI va participants management da co file rieng.
- Sticker picker state/ref nam trong chat panel; kick dialog state nam trong participants panel.
- Con can manual test: approve/reject waiting room, admit all, kick/ban, chat text, sticker, focus input va auto scroll.

### Huong refactor

Tach theo thu tu:

1. `room-sidebar-shell.tsx`
   - header, tab switching, close button.
2. `room-sidebar-participants-panel.tsx`
   - waiting list, participants list, host controls.
3. `room-sidebar-chat-panel.tsx`
   - chat scroll, input, send button.
4. `room-sidebar-sticker-picker.tsx`
   - sticker menu state or controlled props.
5. `room-kick-participant-dialog.tsx`
   - kick target, ban checkbox, confirm action.

Da hoan thanh phase sidebar:

- Tao `room-sidebar-shell.tsx` cho wrapper, mobile header va tab switching.
- Tao `room-sidebar-participants-panel.tsx` cho waiting room list, participants list va host controls.
- Tao `room-sidebar-chat-panel.tsx` cho message list, auto scroll/focus va chat input.
- Tao `room-sidebar-sticker-picker.tsx` cho sticker grid.
- Tao `room-kick-participant-dialog.tsx` cho kick/ban confirm.
- `src/components/meeting/room/room-sidebar.tsx` xuong 92 dong.
- `npx eslint` targeted sidebar files: pass.
- `npm run build`: pass.

### Tieu chi hoan thanh

- `room-sidebar.tsx` duoi 220 dong.
- Chat panel co file rieng va chi nhan chat props.
- Kick dialog co component rieng.
- Khong thay doi props public cua `RoomBody` neu khong can.

## 5. `src/components/meeting/room/room-footer.tsx`

### Hien trang

- Sau phase footer: 167 dong, giam tu 617 dong.
- Dang gom:
  - Footer layout va outside-click menu cleanup.
  - Wiring toolbar controls, meeting info, panel buttons va leave dialog.
  - Khong doi public props tu `RoomBody`.

### Van de

- Device menu mic/camera da dung chung component.
- Primitive UI da tach ra `SplitControlButton` va `FloatingMenuPanel`.
- Leave/end dialog va copy-link timer da tach khoi footer main.
- Con can manual test: toggle mic/camera, doi device, present/stop present, compact controls mobile, copy link, host leave/end meeting.

### Huong refactor

Tach theo thu tu:

1. `room-footer-controls.tsx`
   - mic/camera/screen/hand/leave controls.
2. `room-footer-device-menu.tsx`
   - generic device menu cho mic/camera.
3. `room-footer-screen-menu.tsx`
   - present/stop/present other content.
4. `room-leave-dialog.tsx`
   - host leave/end decision.
5. `room-footer-meeting-info.tsx`
   - clock, meeting code, copy link.
6. Neu dung lai duoc:
   - `split-control-button.tsx`
   - `floating-menu-panel.tsx`

Da hoan thanh phase footer:

- Tao `room-footer-controls.tsx`.
- Tao `room-footer-device-menu.tsx`.
- Tao `room-footer-screen-menu.tsx`.
- Tao `room-leave-dialog.tsx`.
- Tao `room-footer-meeting-info.tsx`.
- Tao `room-footer-panel-buttons.tsx`.
- Tao primitive `split-control-button.tsx` va `floating-menu-panel.tsx`.
- Tao `room-footer-types.ts` cho menu key shared.
- `src/components/meeting/room/room-footer.tsx` xuong 167 dong.
- `npx eslint` targeted footer files: pass.
- `npm run build`: pass.

### Tieu chi hoan thanh

- `room-footer.tsx` duoi 250 dong.
- Mic/camera menu dung chung component.
- Leave/end dialog khong nam trong footer main JSX.
- Copy-link timer cleanup van duoc giu.

## 6. `src/shared/services/meeting.service.ts`

### Hien trang

- Sau phase service: `meeting.service.ts` con 5 dong barrel export, giam tu 510 dong.
- Dang gom:
  - Compatibility exports cho existing imports.
  - Module con `src/shared/services/meeting/*` chua type, endpoint, parser va helper rieng.

### Van de

- Type, parser va endpoint implementation da tach module.
- Existing imports van di qua compatibility barrel.
- Error/status/cancel join helper co the import truc tiep tu module con neu can.

### Huong refactor

Tach theo thu tu:

1. `src/shared/services/meeting/types.ts`
   - DTO/request/response/status types.
2. `src/shared/services/meeting/errors.ts`
   - `getMeetingApiErrorDescription`
   - `getMeetingApiFieldErrors`
   - not found / scheduled not started detectors.
3. `src/shared/services/meeting/status.ts`
   - normalize participant status.
   - waiting/rejected helper.
4. `src/shared/services/meeting/cancel-join.ts`
   - normalize cancel join request.
5. `src/shared/services/meeting/client.ts`
   - `meetingApi`.
6. Keep compatibility barrel:
   - `src/shared/services/meeting.service.ts` re-export de tranh break import.

Da hoan thanh phase service:

- Tao `src/shared/services/meeting/types.ts`.
- Tao `src/shared/services/meeting/errors.ts`.
- Tao `src/shared/services/meeting/status.ts`.
- Tao `src/shared/services/meeting/cancel-join.ts`.
- Tao `src/shared/services/meeting/client.ts`.
- `src/shared/services/meeting.service.ts` chi con compatibility barrel export.
- `npx eslint` targeted meeting service files: pass.
- `npm run build`: pass.

### Tieu chi hoan thanh

- Existing imports van pass qua barrel.
- Endpoint file chi con API methods.
- Parser/status helper co unit-test hoac targeted smoke test neu test setup san sang.

## 7. `src/components/auth/auth-form-page.tsx`

### Hien trang

- Sau phase auth: 20 dong, giam tu 392 dong.
- Dang gom:
  - Chon copy/config theo mode.
  - Render shell va sign-in/sign-up form tu component rieng.

### Huong refactor

- `auth-form-shell.tsx`: layout/hero/card.
- `auth-fields.tsx`: email/password/full-name fields.
- `auth-submit-section.tsx`: submit button, loading, link swap mode.
- Hook hien co `useLoginForm` co the tiep tuc mo rong hoac tach `useSignupForm`.

Da hoan thanh phase auth:

- Tao `auth-copy.ts` cho mode config.
- Tao `auth-form-shell.tsx` cho layout/card/back-link.
- Tao `auth-fields.tsx` cho field/error primitive.
- Tao `auth-submit-section.tsx` cho submit button pending state.
- Tao `sign-in-form.tsx` va `sign-up-form.tsx`.
- `src/components/auth/auth-form-page.tsx` xuong 20 dong.
- `npx eslint` targeted auth files: pass.
- `npm run build`: pass.

### Tieu chi hoan thanh

- `auth-form-page.tsx` duoi 200 dong.
- Mode-specific UI nam trong config object hoac subcomponent.

## 8. `src/components/meeting/room/room.tsx`

### Hien trang

- 389 dong sau refactor PR 1-5.
- Da la composition shell tuong doi ro.
- Con nhieu wiring props giua hook va `RoomHeader`, `RoomBody`, `RoomFooter`.

### Huong refactor tiep

- Khong uu tien tach them ngay.
- Neu can giam duoi 350 dong:
  - Tao `useMeetingRoomController` gom toan bo hook wiring va return object theo section: `header`, `body`, `footer`.
  - Hoac tach constants/options ra file `room-config.ts`.

### Tieu chi hoan thanh

- Chi nen lam khi co ly do ro. Hien tai file nay da khong con la blocker chinh.

## 9. `src/app/[meetingCode]/page.tsx`

### Hien trang

- Sau refactor: 173 dong, giam tu 356 dong.
- Chi con hook wiring va render switching.

### Huong refactor

- `use-meeting-page-state.ts`: joinState, leftMeetingState, restore instant session, handlers.
- `meeting-status-view.tsx`: move `MeetingStatusView` va `LeftMeetingView`.
- `use-verify-meeting.ts`: boc query verify meeting, co the dat trong `features/meeting/hooks`.

Da hoan thanh:

- Tao `src/features/meeting/hooks/use-verify-meeting.ts`.
- Tao `src/features/meeting/hooks/use-meeting-page-state.ts`.
- Tao `src/features/meeting/components/meeting-status-view.tsx` (MeetingStatusView + LeftMeetingView).
- `src/app/[meetingCode]/page.tsx` xuong 173 dong.
- `src/features/meeting/hooks/index.ts` cap nhat barrel export.
- `npx eslint` targeted files: pass.
- `npm run build`: pass.

### Tieu chi hoan thanh

- Page duoi 180 dong. ✓
- Query/error mapping khong nam chung voi status UI. ✓

## 10. `src/lib/meeting/lobby-audio.ts`

### Hien trang

- Sau refactor: 3 dong barrel, giam tu 346 dong.
- Playback tach khoi preference storage.

### Huong refactor

- `audio-preferences.ts`: get/set/listen preferences.
- `audio-playback.ts`: unlock, preload, play helpers.
- `audio-options.ts`: constants/options.
- `lobby-audio.ts`: compatibility barrel.

Da hoan thanh:

- Tao `src/lib/meeting/audio-options.ts` (types, constants, MEETING_AUDIO_EVENTS, MEETING_AUDIO_SOUND_OPTIONS, source maps).
- Tao `src/lib/meeting/audio-preferences.ts` (localStorage get/set/listen, normalize).
- Tao `src/lib/meeting/audio-playback.ts` (cache, priming, ensureMeetingAudioReady, play helpers).
- `src/lib/meeting/lobby-audio.ts` xuong 3 dong barrel export.
- Existing imports khong thay doi.
- `npx eslint` targeted files: pass.
- `npm run build`: pass.

### Tieu chi hoan thanh

- Playback code tach khoi preference storage. ✓
- Existing imports khong break. ✓

## 11. `src/components/home/authenticated-home-upcoming.tsx`

### Hien trang

- Sau refactor: 73 dong, giam tu 335 dong.
- Chi con query wiring, notification hook call va render switching.

### Huong refactor

- `use-current-time.ts`.
- `use-upcoming-meeting-notifications.ts`.
- `upcoming-meeting-card.tsx`.
- `upcoming-meetings-state.tsx` cho loading/error/empty.

Da hoan thanh:

- Tao `src/hooks/shared/use-current-time.ts`.
- Tao `src/hooks/meeting/use-upcoming-meeting-notifications.ts` (sessionStorage markers, toast).
- Tao `src/components/home/upcoming-meeting-card.tsx`.
- Tao `src/components/home/upcoming-meetings-state.tsx` (skeleton list, empty, error).
- `authenticated-home-upcoming.tsx` xuong 73 dong.
- `npx eslint` targeted files: pass.
- `npm run build`: pass.

### Tieu chi hoan thanh

- Main component duoi 180 dong. ✓
- Notification localStorage logic khong nam trong UI file. ✓

## 12. `src/components/meeting/waiting-room.tsx`

### Hien trang

- Sau refactor: 79 dong, giam tu 321 dong.
- Chi con layout shell va prop wiring vao card.

### Huong refactor

- `use-waiting-room-status.ts`: polling, manual refresh, mounted guard.
- `waiting-room-status-card.tsx`: UI render.
- Shared status helpers reuse tu meeting service/status.

Da hoan thanh:

- Tao `src/features/meeting/hooks/use-waiting-room-status.ts` (polling, checkStatus, mounted guard, toast).
- Tao `src/components/meeting/waiting-room-status-card.tsx` (status card UI, check button, exit button).
- `waiting-room.tsx` xuong 79 dong.
- `npx eslint` targeted files: pass (0 errors).
- `npm run build`: pass.

### Tieu chi hoan thanh

- Component duoi 180 dong. ✓
- Polling hook co clear interval ro va khong set state sau unmount. ✓

## 13. `src/components/meeting/room/room-header.tsx`

### Hien trang

- Sau refactor: 69 dong, giam tu 306 dong.
- Chi con layout shell va sub-component composition.

### Huong refactor

- `room-header-presenting-tabs.tsx`.
- `room-header-waiting-menu.tsx`.
- `room-header-participants-menu.tsx`.

Da hoan thanh:

- Tao `room-header-presenting-tabs.tsx` (screen share tab bar).
- Tao `room-header-waiting-menu.tsx` (waiting menu button + dropdown, hover disclosure, canManageWaitingRoom effect).
- Tao `room-header-participants-menu.tsx` (participants button + dropdown, hover disclosure).
- `room-header.tsx` xuong 69 dong.
- `npx eslint` targeted files: pass.
- `npm run build`: pass.

### Tieu chi hoan thanh

- `room-header.tsx` duoi 160 dong. ✓
- Tung menu co props rieng va khong biet layout tong. ✓

## 14. `src/app/schedule/page.tsx`

### Hien trang

- 300 dong.
- Gom schedule form layout, field rendering, errors va submit.

### Huong refactor

- `schedule-form-card.tsx`.
- `schedule-invite-list.tsx`.
- `schedule-date-time-fields.tsx`.
- Giu `useScheduleMeetingForm` lam source logic chinh.

### Tieu chi hoan thanh

- Page route duoi 150 dong.
- Form UI tach thanh components co props ro.

### Ket qua ✓

- `src/components/schedule/schedule-date-time-fields.tsx` (54 dong) — date/time field pair.
- `src/components/schedule/schedule-form-card.tsx` (73 dong) — Meeting Details card, su dung `ScheduleDateTimeFields`.
- `src/components/schedule/schedule-invite-list.tsx` (117 dong) — email input + participant list with host badge.
- `src/app/schedule/page.tsx`: 300 → 122 dong (barrel composition, Summary card va submit inline).
- ESLint: pass. Build: pass.

## 15. De xuat thu tu PR tiep theo

1. PR A: Refactor `lobby.tsx` phase 1
   - Tach `features/lobby/lib/join-state.ts` va `features/lobby/lib/cancel-join.ts`.
   - Khong doi UI.
2. PR B: Refactor `lobby.tsx` phase 2
   - Tach `use-lobby-join-session`, `use-lobby-waiting-socket`, `use-lobby-join-flow`.
3. PR C: Refactor `profile/page.tsx`
   - Tach hooks preferences va profile draft.
   - Tach UI cards/dialog.
4. PR D: Refactor `room-sidebar.tsx`
   - Tach chat panel, participants panel, kick dialog.
5. PR E: Refactor `room-footer.tsx`
   - Tach device menu, screen menu, leave dialog, meeting info.
6. PR F: Split `meeting.service.ts`
   - Tach type/error/status/client theo barrel compatibility.

## 16. Kiem tra chung sau moi PR

- `npm run build`.
- Targeted ESLint cho file vua tach.
- Manual smoke theo khu vuc:
  - Lobby: guest join, waiting, admitted, rejected, cancel join, meeting ended.
  - Profile: save name/avatar, preview audio, select default mic/camera.
  - Room sidebar/footer: chat/sticker, participant list, kick, switch device, leave/end.
  - Meeting service split: verify/join/waiting/end/leave/cancel join flows.
