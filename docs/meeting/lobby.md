# Lobby

## Tổng quan

Lobby là màn hình người dùng cấu hình thiết bị và thực hiện join meeting. Feature nằm tại `src/features/lobby/`.

---

## Cấu trúc

```
src/features/lobby/
├── components/
│   ├── lobby-setup-view.tsx        — Màn hình chọn camera/mic + nút Join
│   ├── lobby-device-selector.tsx   — Dropdown chọn thiết bị
│   ├── lobby-video-preview.tsx     — Preview camera trước khi join
│   ├── lobby-waiting-approval.tsx  — Màn hình chờ host duyệt
│   └── lobby-rejected-request.tsx  — Màn hình khi bị từ chối
├── hooks/
│   ├── use-lobby-devices.ts        — Quản lý thiết bị audio/video
│   ├── use-lobby-join-flow.ts      — Logic join, approve, reject
│   ├── use-lobby-join-session.ts   — Session restore + persist
│   └── use-lobby-waiting-socket.ts — STOMP connection cho waiting room
├── lib/
│   ├── cancel-join.ts              — Build cancel-join message/request
│   ├── errors.ts                   — Error classification
│   ├── join-state.ts               — Join state utilities
│   └── waiting-message.ts         — Định dạng thông báo waiting
└── types.ts                        — LobbyJoinPayload, LobbyPendingJoinState
```

---

## Luồng Join (use-lobby-join-flow.ts)

### 1. Người dùng nhấn "Join"

```
useLobbyJoinFlow.joinMeetingMutation.mutate(payload)
  │
  ├─ Gọi meetingApi.joinMeeting(meetingCode, guestRequest?)
  │    (guestRequest chỉ gửi nếu user chưa đăng nhập)
  │
  ├─ participantStatus = "ACCEPT" + có livekitToken
  │    → persistLobbySession()
  │    → onJoin(payload) → vào room
  │
  ├─ participantStatus = "WAITING" + có meetingToken
  │    → persistLobbySession()
  │    → updatePendingJoinState()
  │    → setWaitingSocketRetryKey (trigger reconnect socket)
  │
  └─ Lỗi:
       isMeetingScheduledNotStartedError → "This meeting hasn't started yet"
       Lỗi khác → getMeetingApiErrorDescription()
```

### 2. Đang trong trạng thái WAITING

**Hai cơ chế song song để phát hiện duyệt/từ chối:**

**A. STOMP socket (realtime)**
```
useLobbyWaitingSocket:
  onParticipantMessage:
    ADMITTED  → requestApprovedJoin() → completeApprovedJoin()
    REJECTED  → updatePendingJoinState({participantStatus: "REJECTED"})
    MEETING_ENDED → handleMeetingEnded()
  onMeetingMessage:
    MEETING_ENDED → handleMeetingEnded()
```

**B. Polling fallback (khi socket chưa connected)**
```
setInterval(5000ms):
  syncPendingJoinStatus(pendingJoinState, silent=true)
    → meetingApi.getJoinRequestStatus(meetingCode, meetingToken)
    → ACCEPT → completeApprovedJoin()
    → REJECTED → updatePendingJoinState
    → Lỗi 404/meeting ended → handleMeetingEnded()
```

### 3. Khi được duyệt (ADMITTED)

```
requestApprovedJoin(pendingJoinState)
  │
  ├─ Gọi meetingApi.joinMeeting() lần 2 (để lấy livekitToken mới)
  │
  └─ completeApprovedJoin(payload, description)
       ├─ playGuestAdmittedSound()
       ├─ toast.success("You were admitted")
       └─ onJoin(payload) → vào room
```

---

## Thiết bị (use-lobby-devices.ts)

- Enumerate cameras/microphones qua `navigator.mediaDevices.enumerateDevices()`
- Load preferences từ `localStorage` (`device-preferences` key)
- Preview camera live stream trong `LobbyVideoPreview`
- Thiết bị được chọn truyền vào `LobbyJoinPayload` và dùng khi connect LiveKit

---

## Cancel Join khi rời trang

`useLobbyWaitingSocket` đăng ký `pagehide` và `beforeunload`:

```
handlePageExit():
  1. Nếu chưa trigger trước đó (hasTriggeredUnloadCancelRef)
  2. Gửi STOMP sendCancel (nếu socket connected) — best effort
  3. meetingApi.cancelJoinWithBeacon() — dùng navigator.sendBeacon
  4. disconnectMeetingSocket()
```
