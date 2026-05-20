# Meeting WebSocket (STOMP over SockJS)

## Tổng quan

Meeting coordination (join requests, admit/reject, kick, screen share signals) đi qua STOMP protocol trên SockJS transport. Đây là kênh **khác** với LiveKit (LiveKit dùng WebRTC cho media).

**File chính:** `src/lib/meeting/meeting-websocket.ts`

---

## Kết nối

```typescript
connectMeetingSocket({
  meetingCode: string,
  meetingToken: string,          // JWT của participant trong phòng
  subscribeToMeetingTopic?: boolean,
  subscribeToWaitingTopic?: boolean,
  subscribeToParticipantTopic?: boolean,
  onMeetingMessage?, onWaitingMessage?, onParticipantMessage?,
  onConnect?, onDisconnect?, onError?,
}): MeetingSocketConnection
```

- SockJS URL: lấy từ `NEXT_PUBLIC_MEETING_SOCKET_URL` (hoặc derived từ backend URL)
- Meeting token được gửi trong STOMP connect headers: `Meeting-Token: <token>`
- Reconnect tự động sau 3 giây nếu mất kết nối

---

## 3 Topics

### `/topic/meeting/{code}` — General meeting events

| Action | Ý nghĩa |
|--------|---------|
| `MEETING_ENDED` | Cuộc họp đã kết thúc — tất cả participant rời phòng |
| `USER_KICKED` | Một participant bị kick — xóa khỏi danh sách |
| `ADMITTED`, `REJECTED`, `PARTICIPANT_LEFT`, `WAITING_CANCELLED`, `LEFT` | Xóa participant khỏi waiting room |
| `ROOM_SETTINGS_CHANGED` | Cài đặt phòng thay đổi (allowUnmute, allowShareScreen) |
| `SCREEN_SHARE_REQUESTED` | Có participant xin share screen (host nhận) |

### `/topic/meeting/{code}/waiting` — Waiting room (host only)

| Action | Ý nghĩa |
|--------|---------|
| `JOIN_REQUEST` | Participant mới xin vào phòng |
| `SCREEN_SHARE_REQUESTED` | Participant xin share screen |

### `/topic/meeting/{code}/participant/{id}` — Per-participant

| Action | Ý nghĩa |
|--------|---------|
| `ADMITTED` | Participant được host duyệt vào phòng |
| `REJECTED` | Participant bị từ chối |
| `USER_KICKED` (với targetId = localId) | Participant này bị kick/ban |
| `SCREEN_SHARE_APPROVED` | Host duyệt share screen |
| `SCREEN_SHARE_REJECTED` | Host từ chối share screen |
| `SCREEN_SHARE_STOPPED` | Host dừng share screen của participant |
| `MEETING_ENDED` | Phòng kết thúc (fallback — cũng gửi trên topic meeting) |

---

## Outbound actions (publish)

| Method | Destination STOMP | Ý nghĩa |
|--------|------------------|---------|
| `sendJoinRequest(msg)` | `/api/meeting/join` | Gửi yêu cầu tham gia |
| `sendAccept(msg)` | `/api/meeting/accept` | Host duyệt participant |
| `sendReject(msg)` | `/api/meeting/reject` | Host từ chối participant |
| `sendCancel(msg)` | `/api/meeting/cancel-join` | Hủy yêu cầu tham gia (participant) |
| `sendKickout(msg)` | `/api/meeting/kickout` | Kick participant khỏi phòng |

---

## Message structure

```typescript
type MeetingSocketMessage = {
  meetingCode?: string | null;
  targetParticipantId?: number | null;   // Participant bị tác động
  targetName?: string | null;
  requesterId?: number | null;           // Người gửi yêu cầu (screen share)
  requesterName?: string | null;
  action?: string | null;
  isBan?: boolean | null;                // Kick kèm ban hay không
  allowParticipantUnmute?: boolean | null;     // Trong ROOM_SETTINGS_CHANGED
  allowParticipantShareScreen?: boolean | null; // Trong ROOM_SETTINGS_CHANGED
}
```

Parser `parseMeetingSocketMessage()` chuẩn hóa nhiều biến thể field name (camelCase, snake_case, PascalCase) để tương thích với cả phiên bản backend cũ và mới.

---

## decodeMeetingToken()

```typescript
decodeMeetingToken(meetingToken) → { participantId, role, meetingCode }
```

Client-side decode JWT payload (không verify signature) để lấy `participantId` phục vụ đăng ký topic `/participant/{id}`. Field được thử nhiều tên: `participantId`, `participantID`, `participant_id`, `sub`, v.v.

---

## Vòng đời kết nối

```
connectMeetingSocket()
  │
  ├─ client.activate() → SockJS connect
  │
  ▼
onConnect:
  ├─ Subscribe /topic/meeting/{code}          (nếu subscribeToMeetingTopic)
  ├─ Subscribe /topic/meeting/{code}/waiting  (nếu subscribeToWaitingTopic)
  └─ Subscribe /topic/meeting/{code}/participant/{id} (nếu subscribeToParticipantTopic + có participantId)

onWebSocketClose:
  └─ Unsubscribe tất cả → gọi onDisconnect()

disconnect():
  └─ Unsubscribe tất cả → client.deactivate()
```

Flag `isClosed` đảm bảo `onDisconnect` không bị gọi khi `disconnect()` được gọi chủ động.

---

## Các vấn đề tiềm ẩn

### 1. Reconnect cố định 3 giây, không có exponential backoff
- **Vấn đề:** `reconnectDelay: 3000` — nếu server down trong thời gian dài, client liên tục reconnect mỗi 3 giây.
- **Hậu quả:** Gây tải cho server khi recovery. Chưa có giới hạn số lần retry.

### 2. participantId decode từ JWT client-side, không verify
- **Vấn đề:** `decodeMeetingToken()` chỉ decode base64, không verify chữ ký JWT.
- **Hậu quả:** Nếu token bị giả mạo hoặc bị lỗi format, `participantId` có thể là `null` → không subscribe được topic `/participant/{id}` → không nhận được ADMITTED/REJECTED/KICKED.

### 3. Không subscribe `/participant/{id}` khi participantId = null
- **Vấn đề:** Nếu `decodeMeetingToken()` không parse được `participantId`, subscription bị bỏ qua silently.
- **Hậu quả:** Participant không nhận được admit/reject/kick. Hiện chưa có error log hay warning.

### 4. Mất kết nối trong waiting room → lỗi hiển thị sau 8 giây
- **Vấn đề:** `useLobbyWaitingSocket` set timeout 8 giây sau `onDisconnect` để hiện thông báo lỗi.
- **Hậu quả:** Nếu mạng mất và recover nhanh hơn 8 giây, thông báo lỗi vẫn hiện ra. Reconnect và thông báo lỗi chạy song song.

### 5. Publish khi socket chưa connected
- **Vấn đề:** `publishMeetingAction()` throw `Error("Meeting socket is not connected.")` nếu `client.connected = false`.
- **Hậu quả:** Các handler như `handleApproveWaitingParticipant` bắt lỗi này và gọi `onError()`, nhưng action (admit/reject/kick) bị drop hoàn toàn — không có retry hay queue.

### 6. Không đồng bộ giữa STOMP reconnect và LiveKit room
- **Vấn đề:** STOMP socket có thể reconnect (sau mất mạng) trong khi LiveKit vẫn connected, hoặc ngược lại.
- **Hậu quả:** Trong khoảng thời gian lệch pha: meeting events (kick, settings change) qua STOMP không được nhận, nhưng video/audio vẫn chạy. Người dùng không bị thông báo.
