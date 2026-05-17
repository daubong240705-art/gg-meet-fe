# Ke hoach refactor hooks cho Meeting Room

Tai lieu nay tap trung vao viec tach logic trong cac file qua lon cua man hinh hop, dac biet la `src/components/meeting/room/room.tsx`, thanh cac custom hooks va component nho hon de de sua, de test va de mo rong ve sau.

## 1. Hien trang

### File dang qua tai

| File | So dong hien tai | Van de chinh |
| --- | ---: | --- |
| `src/components/meeting/room/room.tsx` | 1412 | Gom UI layout, LiveKit lifecycle, STOMP socket, waiting room, media controls, screen share, raised hand, sidebar state va popup menu. |
| `src/components/meeting/room/room-sidebar.tsx` | 625 | Nhieu panel UI va action cua participants/chat/waiting room trong cung mot file. |
| `src/components/meeting/room/room-footer.tsx` | 617 | Gom toolbar UI, device selector, state hien thi menu va cac action media. |
| `src/components/meeting/room/room-stage.tsx` | 294 | Kha on, nhung can giu pure UI va khong dua them business logic vao day. |

### Hooks da co san

`src/features/meeting/room/hooks` da co nen tang tot:

- `use-room-devices.ts`: quan ly danh sach mic/camera va switch device.
- `use-room-chat.ts`: quan ly chat, unread count va gui tin LiveKit.
- `use-waiting-room-requests.ts`: sync danh sach nguoi cho, upsert/remove request.

Huong refactor nen tiep tuc mo rong folder nay thay vi tao pattern moi.

## 2. Muc tieu kien truc

Sau refactor, `room.tsx` chi nen dong vai tro "composition shell":

- Doc props dau vao.
- Goi cac hook cap cao.
- Ghe UI: header, stage, sidebar, footer.
- Khong chua socket handler dai, timeout/menu logic phuc tap, API side-effect truc tiep hoac mapping participant chi tiet.

Muc tieu kich thuoc sau refactor:

- `room.tsx`: duoi 350 dong.
- Moi hook: duoi 250 dong, uu tien 80-180 dong.
- Moi component UI: duoi 300 dong, tru truong hop layout lap lai co ly do ro rang.

## 3. Nguyen tac tach hook

- Tach theo capability, khong tach theo "mot nhom useState". Moi hook phai tra loi duoc cau hoi: hook nay quan ly nghiep vu gi?
- Hook duoc phep biet LiveKit/STOMP/API; component UI khong nen biet chi tiet transport.
- Hook tra ve object co ten ro rang: `state`, `actions`, `refs` neu can. Khong tra ve tuple dai.
- Logic derive du lieu nen nam trong hook/lib va memo hoa khi can, vi du participant list, screen-share selection.
- Khong dua global store vao ngay. Hien tai project chua co Zustand; chi them store khi state can chia se ngang hang nhieu man hinh, khong chi de giam props.
- Duy tri file `index.ts` export hook moi de import gon tu `@/features/meeting/room/hooks`.

## 4. Cau truc de xuat

```text
src/features/meeting/room/
├── hooks/
│   ├── index.ts
│   ├── use-room-chat.ts
│   ├── use-room-devices.ts
│   ├── use-room-identity.ts
│   ├── use-room-livekit-session.ts
│   ├── use-room-media-controls.ts
│   ├── use-room-participants.ts
│   ├── use-room-screen-share.ts
│   ├── use-room-sidebar-state.ts
│   ├── use-room-socket-events.ts
│   ├── use-room-hand-raise.ts
│   ├── use-room-viewport-state.ts
│   ├── use-hover-disclosure.ts
│   ├── use-waiting-room-actions.ts
│   └── use-waiting-room-requests.ts
├── lib/
│   ├── chat-message.ts
│   ├── metadata.ts
│   ├── participant-mapper.ts
│   ├── participant-selectors.ts
│   └── waiting-room.ts
```

```text
src/components/meeting/room/
├── room.tsx
├── room-header.tsx
├── room-header-participants-menu.tsx
├── room-header-waiting-menu.tsx
├── room-sidebar.tsx
├── room-sidebar-chat-panel.tsx
├── room-sidebar-participants-panel.tsx
├── room-footer.tsx
├── room-footer-device-menu.tsx
├── room-stage.tsx
└── participant-card.tsx
```

## 5. Hooks can tach tu `room.tsx`

### 5.1 `useRoomIdentity`

Trach nhiem:

- Resolve `displayName`, `meetingTitle`, `localEmail`, `localAvatarUrl`.
- Decode `meetingToken`, `livekitToken`.
- Resolve `localRole`, `localMeetingRole`, `localMeetingParticipantId`, `resolvedHostId`, `resolvedHostName`.
- Tinh `canManageWaitingRoom` va `fallbackLocalParticipantIsHost`.

Input:

- `MeetingRoomProps`
- `user` tu `useAuthSession`

Output goi y:

```ts
{
  displayName,
  meetingTitle,
  localEmail,
  localAvatarUrl,
  localRole,
  localMeetingRole,
  localMeetingParticipantId,
  resolvedHostId,
  resolvedHostName,
  canManageWaitingRoom,
  fallbackLocalParticipantIsHost,
}
```

Loi ich: tat ca logic identity/token nam mot noi, giam duplicate khi sau nay them role moderator/co-host.

### 5.2 `useRoomLiveKitSession`

Trach nhiem:

- Goi `useLiveKitRoom`.
- Sync `roomRef`.
- Quan ly `isRoomConnected`, `canPlaybackAudio`, `liveKitError`.
- Gom callbacks: reset chat, device change, participant change, local attributes change, chat message.
- Goi `ensureMeetingAudioReady()`.

Input:

- LiveKit token/url/options.
- Initial device state.
- Cac callback domain: `onParticipantsChange`, `onLocalAttributesChange`, `onChatMessage`, `onDeviceChange`, `onReset`.

Output:

```ts
{
  roomRef,
  isLiveKitEnabled,
  isRoomConnected,
  canPlaybackAudio,
  liveKitError,
  setLiveKitError,
  handleStartAudio,
}
```

Luu y: hook nay la lop integration, khong nen map participant UI truc tiep. Mapping nen dua qua `useRoomParticipants`.

### 5.3 `useRoomParticipants`

Trach nhiem:

- Nhan LiveKit room participant events va map sang `Participant`.
- Duy tri `liveParticipants`.
- Tao fallback local participant khi LiveKit chua co data.
- Sort raised hand.
- Tra ve `participants` da san sang cho UI.

Input:

- Identity tu `useRoomIdentity`.
- `isLiveKitEnabled`, `isMicEnabled`, `isCameraEnabled`.
- `localHandState`, `preferLocalHandState`.

Output:

```ts
{
  participants,
  liveParticipants,
  setLiveParticipants,
  handleLiveKitParticipantsChange,
}
```

Nen tach them pure selector vao `lib/participant-selectors.ts`:

- `buildBaseParticipants`
- `selectSortedParticipants`
- `selectScreenShareParticipants`

### 5.4 `useRoomScreenShare`

Trach nhiem:

- Quan ly `activeScreenShareId`.
- Tinh `screenShareParticipants`, `screenShareParticipant`, `isScreenSharing`.
- Xu ly `handleScreenShare`, `handlePresentOtherContent`.
- Tu dong chon screen share local neu co, fallback ve screen share dau tien.

Input:

- `participants`
- `roomRef`
- `isLiveKitEnabled`
- `onError`

Output:

```ts
{
  screenShareParticipants,
  screenShareParticipant,
  activeScreenShareId,
  setActiveScreenShareId,
  isScreenSharing,
  handleScreenShare,
  handlePresentOtherContent,
}
```

### 5.5 `useRoomMediaControls`

Trach nhiem:

- Quan ly optimistic state cua mic/camera.
- Toggle mic/camera va rollback khi LiveKit fail.

Input:

- `initialMicOn`, `initialCameraOn`
- `roomRef`, `isLiveKitEnabled`, `onError`

Output:

```ts
{
  isMicEnabled,
  isCameraEnabled,
  handleToggleMic,
  handleToggleCamera,
}
```

`useRoomDevices` van giu trach nhiem list/switch device; `useRoomMediaControls` chi bat/tat track.

### 5.6 `useRoomHandRaise`

Trach nhiem:

- Quan ly `localHandState`, `preferLocalHandState`.
- Sync refs can dung trong LiveKit participant mapper.
- Thuc thi cooldown `HAND_RAISE_COOLDOWN_MS`.
- Update LiveKit participant attributes.

Input:

- `roomRef`, `isLiveKitEnabled`, `onError`

Output:

```ts
{
  localHandState,
  localHandStateRef,
  preferLocalHandState,
  preferLocalHandStateRef,
  isHandRaiseCoolingDown,
  handleLiveKitLocalAttributesChange,
  handleToggleHandRaise,
  resetHandRaise,
}
```

### 5.7 `useRoomSidebarState`

Trach nhiem:

- Quan ly `activePanel`, `renderedPanel`, `activePanelRef`.
- Xu ly delayed unmount cua sidebar theo `SIDEBAR_LAYOUT_TRANSITION_MS`.
- Quan ly `isSidebarLayoutTransitioning`.
- Cung cap `togglePanel`, `handlePanelChange`.

Output:

```ts
{
  activePanel,
  renderedPanel,
  sidebarPanel,
  isSidebarOpen,
  isSidebarRendered,
  activePanelRef,
  isSidebarLayoutTransitioning,
  togglePanel,
  handlePanelChange,
}
```

Sau khi co hook nay, `room.tsx` khong can biet timeout dong sidebar.

### 5.8 `useHoverDisclosure`

Trach nhiem:

- Dung chung cho waiting menu va participants menu o header.
- Quan ly open/close, hover delay, click outside, Escape.
- Tra ve `ref`, `isOpen`, `setIsOpen`, `open`, `scheduleClose`, `clearCloseTimeout`.

Output:

```ts
{
  ref,
  isOpen,
  setIsOpen,
  open,
  scheduleClose,
  clearCloseTimeout,
}
```

Day la hook UI dung lai duoc, co the dat o `src/shared/hooks/use-hover-disclosure.ts` neu co man hinh khac can.

### 5.9 `useRoomViewportState`

Trach nhiem:

- Quan ly `isPageVisible`.
- Quan ly `isViewportResizing` voi debounce `VIEWPORT_RESIZE_SETTLE_MS`.
- Cleanup timeout/listener.

Output:

```ts
{
  isPageVisible,
  isViewportResizing,
}
```

### 5.10 `useRoomSocketEvents`

Trach nhiem:

- Ket noi/ngat `MeetingSocketConnection`.
- Subscribe meeting/waiting/participant topic theo role.
- Xu ly action tu socket:
  - `JOIN_REQUEST`
  - `ADMITTED`
  - `REJECTED`
  - `PARTICIPANT_LEFT`
  - `WAITING_CANCELLED`
  - `LEFT`
  - `MEETING_ENDED`
  - `USER_KICKED`
- Goi `syncWaitingParticipants`, `upsertWaitingParticipant`, `removeWaitingParticipant`.
- Goi `exitMeeting("ended")` khi meeting ended hoac user local bi kick.

Input:

- `meetingCode`, `meetingToken`, `canManageWaitingRoom`, `localMeetingParticipantId`
- socket API tu `useMeetingSocket`
- waiting room actions
- `exitMeeting`, `onError`

Output:

```ts
{
  meetingSocketRef,
}
```

Luu y: action handler nen tach thanh pure function neu co the:

- `normalizeSocketAction(action)`
- `isWaitingParticipantRemovalAction(action)`
- `isLocalKickMessage(message, localParticipantId)`

### 5.11 `useWaitingRoomActions`

Trach nhiem:

- `handleApproveWaitingParticipant`
- `handleRejectWaitingParticipant`
- `handleApproveAllWaitingParticipants`
- `handleKickParticipant`

Hook nay boc cac lenh `sendAccept`, `sendReject`, `sendKickout` va error/toast. `useWaitingRoomRequests` chi nen quan ly danh sach va sync API, khong nen biet UI action nao dang trigger.

Input:

- `meetingCode`
- `waitingParticipants`
- socket senders
- `removeWaitingParticipant`
- `requestWaitingRoomResync`
- `onError`

Output:

```ts
{
  handleApproveWaitingParticipant,
  handleRejectWaitingParticipant,
  handleApproveAllWaitingParticipants,
  handleKickParticipant,
}
```

### 5.12 `useRoomExitActions`

Trach nhiem:

- Dam bao exit chi chay mot lan bang `hasExitedMeetingRef`.
- Report leave meeting best-effort qua API.
- Disconnect STOMP va LiveKit.
- Reset hand raise.
- End meeting cho host.

Input:

- `meetingCode`, `meetingToken`, `localMeetingParticipantId`
- `roomRef`, `meetingSocketRef`
- `disconnectMeetingSocket`
- `resetHandRaise`
- `onLeave`
- `onError`

Output:

```ts
{
  isEndingMeeting,
  exitMeeting,
  handleLeaveMeeting,
  handleEndMeeting,
}
```

## 6. Components nen tach tu JSX trong `room.tsx`

### `RoomHeader`

Nhan props da derive san:

- `meetingTitle`
- `participants`
- `screenShareParticipants`
- `screenShareParticipant`
- `canManageWaitingRoom`
- `waitingParticipants`
- menu/action callbacks

`RoomHeader` khong nen goi API/socket/hook domain, ngoai tru hook UI cuc bo nhu `useHoverDisclosure` neu muon giu menu state trong header.

### `RoomHeaderWaitingMenu`

Chi render danh sach request dang cho va cac nut Admit/Reject/Admit all. Component nay giup tach khoi JSX dai hien tai trong top bar.

### `RoomHeaderParticipantsMenu`

Chi render preview participants va nut mo full panel.

### `RoomSidebarChatPanel`, `RoomSidebarParticipantsPanel`

`room-sidebar.tsx` nen la shell chon panel; tung panel tach rieng de tranh tang tiep len hon 600 dong.

### `RoomFooterDeviceMenu`

`room-footer.tsx` nen tach menu chon mic/camera thanh component rieng. Footer giu toolbar composition va confirm leave/end meeting.

## 7. Kich ban refactor an toan theo PR

### PR 1: Tach hook UI khong doi business logic

Pham vi:

- Tao `useRoomViewportState`.
- Tao `useRoomSidebarState`.
- Tao `useHoverDisclosure`.
- Cap nhat `room.tsx` dung cac hook nay.

Ly do lam truoc: day la logic timeout/listener cuc bo, it phu thuoc LiveKit/STOMP, de review va de rollback.

Kiem tra:

- Mo/dong sidebar chat/participants.
- Resize window khong lam stage giat qua muc.
- Hover/click/Escape tren waiting menu va participants menu.

### PR 2: Tach media va raised hand

Pham vi:

- Tao `useRoomMediaControls`.
- Tao `useRoomHandRaise`.
- Giu `useRoomDevices` nhu hien tai.

Kiem tra:

- Toggle mic/camera khi LiveKit connected.
- Toggle khi LiveKit chua connected khong crash.
- Raised hand hien local ngay, cooldown dung, remote thay doi theo attributes.

### PR 3: Tach identity, participants va screen share

Pham vi:

- Tao `useRoomIdentity`.
- Tao `useRoomParticipants`.
- Tao `useRoomScreenShare`.
- Tach selector pure vao `lib/participant-selectors.ts`.

Kiem tra:

- Host badge/role dung voi host token va fallback host.
- Participant sort theo raised hand.
- Local fallback participant hien dung khi LiveKit chua load.
- Nhieu nguoi share screen: tab chon screen share van dung.

### PR 4: Tach socket va waiting room actions

Pham vi:

- Tao `useRoomSocketEvents`.
- Tao `useWaitingRoomActions`.
- Giu `useWaitingRoomRequests` cho state/sync pending list.

Kiem tra:

- Guest request join, host nhan request qua waiting topic.
- Admit/Reject mot nguoi.
- Admit all.
- Kick participant local va remote.
- End meeting day guest ra khoi room.
- Rejoin host van sync pending waiting room tu API.

### PR 5: Tach header/sidebar/footer UI

Pham vi:

- Tao `RoomHeader`, `RoomHeaderWaitingMenu`, `RoomHeaderParticipantsMenu`.
- Tach panel trong `room-sidebar.tsx`.
- Tach device menu trong `room-footer.tsx`.

Kiem tra:

- Build pass.
- UI desktop/mobile khong overlap.
- Sidebar desktop va mobile overlay van dong/mo dung.
- Chat, participants, waiting room panel khong mat action.

## 8. Trang thai `room.tsx` sau refactor

`room.tsx` nen co dang gan nhu sau:

```tsx
export default function MeetingRoom(props: MeetingRoomProps) {
  return (
    <MeetingSocketProvider>
      <MeetingRoomContent {...props} />
    </MeetingSocketProvider>
  );
}

function MeetingRoomContent(props: MeetingRoomProps) {
  const identity = useRoomIdentity(props);
  const sidebar = useRoomSidebarState();
  const handRaise = useRoomHandRaise(...);
  const media = useRoomMediaControls(...);
  const chat = useRoomChat(...);
  const devices = useRoomDevices(...);
  const waitingRequests = useWaitingRoomRequests(...);
  const livekit = useRoomLiveKitSession(...);
  const participants = useRoomParticipants(...);
  const screenShare = useRoomScreenShare(...);
  const exit = useRoomExitActions(...);
  const waitingActions = useWaitingRoomActions(...);

  useRoomSocketEvents(...);

  return (
    <div className="h-screen overflow-hidden bg-background">
      <RoomHeader ... />
      <RoomSidebar ... />
      <RoomStage ... />
      <RoomFooter ... />
    </div>
  );
}
```

Doan code tren chi la muc tieu hinh dang, khong phai implementation bat buoc y nguyen.

## 9. Ranh gioi dependency nen giu

- `components/meeting/room/*`: uu tien UI, props, event callbacks.
- `features/meeting/room/hooks/*`: stateful domain logic cua meeting room.
- `features/meeting/room/lib/*`: pure helpers/selectors/mappers, khong dung React.
- `features/livekit/hooks/*`: LiveKit primitive integration dung lai ngoai room.
- `features/meeting/providers/*`: socket provider va API gui socket command.
- `shared/services/*`: API service thuan, khong chua React state.

Neu component can import tu `meetingApi`, `meeting-websocket` hoac `livekit-client`, can xem lai co nen day vao hook/lib khong.

## 10. Rui ro va cach giam rui ro

- Socket reconnect lap lai: dam bao dependency array cua `useRoomSocketEvents` on dinh, cac callback nen `useCallback`.
- Stale closure voi participant/hand raise: cac state can LiveKit callback doc realtime nen co ref dong bo nhu hien tai.
- Lost waiting-room request: sau approve/reject/kick van giu `requestWaitingRoomResync`.
- UI flicker khi dong sidebar: giu co che `renderedPanel` delayed unmount trong `useRoomSidebarState`.
- Audio playback bi browser block: `handleStartAudio` phai tiep tuc nam trong LiveKit session hook va truyen xuong UI.
- Build pass nhung lint fail san co: sau moi PR nen chay `npm run build`; lint full repo co the con fail o file chua refactor, can lint theo file/thu muc moi neu can.

## 11. Checklist hoan thanh

- [ ] `room.tsx` duoi 350 dong va khong con socket handler dai.
- [ ] Tat ca hook moi duoc export tu `src/features/meeting/room/hooks/index.ts`.
- [ ] Khong con call truc tiep `meetingApi.*` trong `room.tsx`.
- [ ] Khong con call truc tiep `room.localParticipant.*` trong `room.tsx`.
- [ ] Header waiting/participants menu da tach component hoac hook rieng.
- [ ] `room-sidebar.tsx` duoi 300 dong hoac da tach panel.
- [ ] `room-footer.tsx` duoi 350 dong hoac da tach device menu.
- [ ] `npm run build` pass.

## 12. Regression test bat buoc

Chay lai cac flow sau sau moi PR refactor:

1. Host vao room voi mic/camera bat san.
2. Guest request join, host thay waiting request va admit.
3. Guest bi reject, guest bi kick, guest tu leave.
4. Host end meeting, guest bi day ra.
5. Toggle mic/camera, switch mic/camera device.
6. Send text chat va sticker, unread count tang khi panel chat dong.
7. Raise/lower hand, thu spam click de kiem tra cooldown.
8. Share screen, present other content, nhieu nguoi share screen.
9. Resize browser desktop/mobile, mo/dong sidebar.
10. Reload tab host sau khi co guest dang cho, pending list van sync tu API.

## 13. Nhat ky hoan thanh PR 1 va PR 2

Ngay cap nhat: 2026-05-17.

### PR 1: Tach hook UI khong doi business logic

Da hoan thanh:

- Tao `src/features/meeting/room/hooks/use-room-viewport-state.ts`.
  - Chuyen `isPageVisible`, `isViewportResizing`, `visibilitychange`, `resize debounce` va cleanup timeout ra khoi `room.tsx`.
- Tao `src/features/meeting/room/hooks/use-room-sidebar-state.ts`.
  - Chuyen `activePanel`, `renderedPanel`, `activePanelRef`, sidebar delayed unmount va sidebar layout transition ra hook rieng.
  - Dieu chinh de `renderedPanel` duoc sync trong action handler thay vi set state dong bo trong effect, giup targeted ESLint pass.
- Tao `src/features/meeting/room/hooks/use-hover-disclosure.ts`.
  - Dung chung cho waiting menu va participants menu.
  - Gom hover open, delayed close, click outside, Escape close va cleanup timeout.
- Cap nhat `room.tsx` dung cac hook tren, khong doi JSX behavior cua header/sidebar/stage/footer.

### PR 2: Tach media controls va raised hand

Da hoan thanh:

- Tao `src/features/meeting/room/hooks/use-room-media-controls.ts`.
  - Chuyen optimistic state `isMicEnabled`, `isCameraEnabled`.
  - Chuyen `handleToggleMic`, `handleToggleCamera` va rollback khi LiveKit fail.
  - Giu `use-room-devices.ts` cho danh sach/switch device dung nhu ke hoach.
- Tao `src/features/meeting/room/hooks/use-room-hand-raise.ts`.
  - Chuyen `localHandState`, `preferLocalHandState`, cac refs dong bo cho LiveKit mapper.
  - Chuyen cooldown `HAND_RAISE_COOLDOWN_MS`.
  - Chuyen `handleLiveKitLocalAttributesChange`, `handleToggleHandRaise`, `resetHandRaise`.
- Cap nhat `exitMeeting` trong `room.tsx` goi `resetHandRaise()` thay vi tu set hand state truc tiep.
- Export tat ca hook moi tu `src/features/meeting/room/hooks/index.ts`.

### Ket qua sau PR 1-2

- `room.tsx`: giam tu 1412 dong xuong 1121 dong.
- Cac hook moi deu nho hon 120 dong.
- Pham vi chua tach trong dot nay:
  - `useRoomIdentity`
  - `useRoomParticipants`
  - `useRoomScreenShare`
  - `useRoomSocketEvents`
  - `useWaitingRoomActions`
  - `useRoomExitActions`
  - Tach component `RoomHeader`, sidebar panels, footer device menu.

### Kiem tra da chay

- `npx eslint src/components/meeting/room/room.tsx src/features/meeting/room/hooks/use-room-viewport-state.ts src/features/meeting/room/hooks/use-room-sidebar-state.ts src/features/meeting/room/hooks/use-hover-disclosure.ts src/features/meeting/room/hooks/use-room-media-controls.ts src/features/meeting/room/hooks/use-room-hand-raise.ts src/features/meeting/room/hooks/index.ts`: pass.
- `npm run build`: pass.

## 14. Nhat ky hoan thanh PR 3, PR 4 va PR 5

Ngay cap nhat: 2026-05-17.

### PR 3: Tach identity, participants va screen share

Da hoan thanh:

- Tao `src/features/meeting/room/hooks/use-room-identity.ts`.
  - Chuyen resolve `displayName`, `meetingTitle`, local email/avatar, LiveKit URL, decoded meeting token, local role, host fallback va `canManageWaitingRoom` ra khoi `room.tsx`.
- Tao `src/features/meeting/room/hooks/use-room-participants.ts`.
  - Chuyen LiveKit participant mapper callback, fallback local participant va sort raised hand ra hook rieng.
- Tao `src/features/meeting/room/hooks/use-room-screen-share.ts`.
  - Chuyen `screenShareParticipants`, selected screen share, `isScreenSharing`, `handleScreenShare`, `handlePresentOtherContent`.
  - Khong con effect set state de auto-correct selected screen share; thay vao do derive participant dang xem tu danh sach hien tai.

### PR 4: Tach socket va waiting room actions

Da hoan thanh:

- Tao `src/features/meeting/room/hooks/use-room-socket-events.ts`.
  - Chuyen connect/disconnect STOMP, subscribe meeting/waiting/participant topic va cac action `JOIN_REQUEST`, `MEETING_ENDED`, `USER_KICKED`, removal actions ra hook rieng.
- Tao `src/features/meeting/room/hooks/use-waiting-room-actions.ts`.
  - Chuyen approve, reject, approve all va kick participant ra hook rieng.
- Tao `src/features/meeting/room/hooks/use-room-exit-actions.ts`.
  - Chuyen leave reporting, exit once guard, LiveKit/STOMP disconnect va host end meeting ra hook rieng.

### PR 5: Tach UI composition

Da hoan thanh:

- Tao `src/components/meeting/room/room-header.tsx`.
  - Chuyen top bar, presenting tabs, waiting menu va participants preview menu ra component rieng.
- Tao `src/components/meeting/room/room-body.tsx`.
  - Chuyen mobile sidebar overlay, desktop sidebar column, audio playback banner va stage layout ra component rieng.
- Tao `src/features/meeting/room/hooks/use-room-livekit-session.ts`.
  - Chuyen setup `useLiveKitRoom`, audio playback state, room connected state, audio unlock va `ensureMeetingAudioReady` ra hook integration rieng.
- Export tat ca hook moi tu `src/features/meeting/room/hooks/index.ts`.

Ket qua sau PR 3-5:

- `room.tsx`: giam tiep tu 1121 dong xuong 389 dong.
- `RoomHeader`: 306 dong.
- `RoomBody`: 182 dong.
- Cac hook moi:
  - `use-room-identity.ts`: 80 dong.
  - `use-room-participants.ts`: 137 dong.
  - `use-room-screen-share.ts`: 98 dong.
  - `use-room-livekit-session.ts`: 111 dong.
  - `use-room-socket-events.ts`: 181 dong.
  - `use-waiting-room-actions.ts`: 131 dong.
  - `use-room-exit-actions.ts`: 102 dong.

Ton tai sau dot nay:

- `room-sidebar.tsx` van 625 dong, chua tach thanh `room-sidebar-chat-panel.tsx` va `room-sidebar-participants-panel.tsx`.
- `room-footer.tsx` van 617 dong, chua tach `room-footer-device-menu.tsx`.
- `room.tsx` da gan muc composition shell, nhung van cao hon muc tieu 350 dong do con phan wiring props giua nhieu hook va component.

Kiem tra da chay:

- Targeted ESLint tren `room.tsx`, `room-header.tsx`, `room-body.tsx` va toan bo hook meeting room moi: pass.
- `npm run build`: pass.
