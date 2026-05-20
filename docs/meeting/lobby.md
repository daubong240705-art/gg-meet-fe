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

---

## Các vấn đề tiềm ẩn

### 1. Race condition giữa STOMP ADMITTED và polling
- **Vấn đề:** Khi socket reconnect và polling đang chạy đồng thời, cả hai có thể phát hiện ACCEPT cùng lúc.
- **Giảm thiểu:** `hasCompletedPendingJoinRef` flag — `completeApprovedJoin()` chỉ chạy một lần. Tuy nhiên, `requestApprovedJoin()` (gọi lại joinMeeting) có thể chạy đôi lần trước khi flag được set.

### 2. joinMeeting() lần 2 thất bại sau ADMITTED
- **Vấn đề:** Sau khi nhận ADMITTED từ STOMP, `requestApprovedJoin()` gọi lại `meetingApi.joinMeeting()`. Nếu request này fail (network error), người dùng thấy thông báo lỗi trong waiting screen dù đã được duyệt.
- **Hậu quả:** Người dùng stuck ở waiting screen. Cần refresh trang để thử lại.

### 3. `livekitToken` missing sau ADMITTED
- **Vấn đề:** Nếu backend trả ADMITTED qua STOMP nhưng joinMeeting lần 2 không có `livekitToken`, code throw `Error("The host approved you, but the server did not provide a LiveKit token yet.")`.
- **Hậu quả:** Người dùng thấy lỗi dù đã được duyệt. Khó tự phục hồi.

### 4. Cancel join không đảm bảo khi crash
- **Vấn đề:** `sendBeacon` có thể fail nếu URL không reachable hoặc payload quá lớn. Nếu tab bị force-kill trước khi `pagehide` fires, event không được gửi.
- **Hậu quả:** Participant "zombie" trong waiting room của host.

### 5. Polling interval 5s không dừng khi unmount nhanh
- **Vấn đề:** `setInterval` chạy mỗi 5 giây để sync join status. Cleanup xảy ra trong `useEffect` return. Nếu component unmount và remount nhanh (React StrictMode), interval cũ có thể chạy thêm một tick.
- **Hậu quả:** Gọi API thêm một lần không cần thiết — không crash nhưng lãng phí.

### 6. Thiết bị không enumerate được
- **Vấn đề:** `enumerateDevices()` trả về device không có `label` nếu chưa có permission. Selector sẽ hiển thị label trống.
- **Hậu quả:** Người dùng không biết đang chọn thiết bị nào. Cần xin permission trước khi enumerate.
