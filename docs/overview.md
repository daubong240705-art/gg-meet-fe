# Frontend — Tổng quan kiến trúc

**Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui

---

## Cấu trúc thư mục

| Thư mục | Vai trò |
|---------|---------|
| `src/app/` | App Router pages và một API proxy route |
| `src/components/` | UI component theo feature area |
| `src/features/` | Feature modules — mỗi module có `hooks/` + `components/` với barrel `index.ts` |
| `src/hooks/` | Hooks cũ (auth, meeting); `src/features/` là nơi ưu tiên cho hooks mới |
| `src/lib/` | Core utilities: API wrapper, auth session/token, config, meeting helpers |
| `src/shared/services/` | API service layer (ưu tiên hơn `src/service/` cũ) |
| `src/types/` | TypeScript ambient declarations |

---

## Các trang / routes

| Route | Mô tả |
|-------|-------|
| `/` | Home — guest hoặc authenticated |
| `/sign-in`, `/sign-up` | Xác thực |
| `/schedule` | Lên lịch cuộc họp (yêu cầu đăng nhập) |
| `/profile` | Hồ sơ và cài đặt thiết bị (yêu cầu đăng nhập) |
| `/[meetingCode]` | Toàn bộ luồng meeting: verify → lobby → room |
| `/api/proxy/meetings/[meetingCode]/cancel-join` | Proxy route — cho phép `navigator.sendBeacon()` gọi cancel-join khi đóng trang |

---

## Hai kênh real-time

### LiveKit (WebRTC)
- Dùng cho video, audio, chat trong phòng họp
- SDK: `livekit-client`
- Được wrap tại `src/features/livekit/hooks/use-livekit-room.ts`
- Adapted cho room tại `src/features/meeting/room/hooks/use-room-livekit-session.ts`

### STOMP over SockJS
- Dùng cho tín hiệu điều phối: yêu cầu tham gia, admit/reject, kick
- Client: `@stomp/stompjs` + `sockjs-client`
- Encapsulated tại `src/lib/meeting/meeting-websocket.ts`
- Topics:
  - `/topic/meeting/{code}` — sự kiện chung của phòng
  - `/topic/meeting/{code}/waiting` — thông báo waiting room cho host
  - `/topic/meeting/{code}/participant/{id}` — sự kiện riêng mỗi participant

---

## Luồng meeting tổng quát

```
Nhập meetingCode
     │
     ▼
[1] Verify meeting (meetingApi.verifyMeeting)
     │ Meeting không tồn tại hoặc đã kết thúc → hiển thị lỗi
     ▼
[2] Lobby — cấu hình camera/mic, nhập tên (nếu là guest)
     │ joinMeeting() → participantStatus = "WAITING"
     │    → mở STOMP socket, chờ host duyệt
     │ joinMeeting() → participantStatus = "ACCEPT"
     │    → có livekitToken, vào phòng ngay
     ▼
[3] Room — LiveKit video/audio/chat + STOMP cho meeting events
     │
     ▼
[4] Exit — leave hoặc end meeting
```

---

## Session persistence

`src/lib/meeting/instant-meeting-session.ts` lưu trạng thái join vào `sessionStorage` theo key `instant-meeting:{meetingCode}`.  
Khi người dùng refresh trang, lobby sẽ đọc lại và khôi phục trạng thái mà không cần nhập lại thông tin.

> **Lưu ý:** `sessionStorage` bị xóa khi đóng tab. Nếu tab crash hoặc bị force-close, session sẽ mất và người dùng phải join lại từ đầu. Nếu người dùng đang trong trạng thái WAITING, cancel-join có thể không được gửi kịp.

---

## Auth — client-side only

- Không có Next.js middleware để bảo vệ route.
- Toàn bộ bảo vệ route là client-side redirect.
- Access token lưu trong `localStorage`, refresh token trong HTTP-only cookie.
- Xem chi tiết tại [auth/authentication.md](auth/authentication.md).

---

## Các tài liệu chi tiết

| Chủ đề | File |
|--------|------|
| Xác thực người dùng | [auth/authentication.md](auth/authentication.md) |
| API wrapper & error handling | [api/api-layer.md](api/api-layer.md) |
| WebSocket STOMP | [websocket/meeting-websocket.md](websocket/meeting-websocket.md) |
| Luồng meeting đầy đủ | [meeting/meeting-flow.md](meeting/meeting-flow.md) |
| Lobby & waiting room | [meeting/lobby.md](meeting/lobby.md) |
| Điều khiển mic/camera | [meeting/room-media-controls.md](meeting/room-media-controls.md) |
| Chat & sticker | [meeting/room-chat.md](meeting/room-chat.md) |
| Chia sẻ màn hình | [meeting/room-screen-share.md](meeting/room-screen-share.md) |
| Giơ tay | [meeting/room-hand-raise.md](meeting/room-hand-raise.md) |
| Quản lý waiting room (host) | [meeting/room-waiting-management.md](meeting/room-waiting-management.md) |
| Rời / kết thúc phòng | [meeting/room-exit.md](meeting/room-exit.md) |
| Lên lịch cuộc họp | [schedule/schedule-meeting.md](schedule/schedule-meeting.md) |
| Hồ sơ & cài đặt thiết bị | [profile/profile.md](profile/profile.md) |
| Upcoming meetings | [upcoming/upcoming-meetings.md](upcoming/upcoming-meetings.md) |
