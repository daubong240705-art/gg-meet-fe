# Luồng Meeting Đầy Đủ

## Tổng quan

Trang `src/app/(main)/[meetingCode]/page.tsx` điều phối toàn bộ luồng meeting qua hook `useMeetingPageState()`. Luồng có 4 giai đoạn chính:

```
Verify  →  Lobby  →  Room  →  Exit
```

---

## Giai đoạn 1 — Verify

**Hook:** `src/features/meeting/hooks/use-verify-meeting.ts`

- Gọi `meetingApi.verifyMeeting(meetingCode)` khi page load.
- Nếu meeting không tồn tại hoặc đã kết thúc → hiển thị `MeetingStatusView` với thông báo lỗi.
- Query được cache 60 giây, không refetch tự động.
- `retry: false` — không retry nếu lỗi (tránh spam request khi meeting thực sự không tồn tại).

### Session restore
Trước khi verify, page kiểm tra `sessionStorage` qua `instant-meeting-session.ts`. Nếu session còn hiệu lực (trùng meetingCode), bỏ qua lobby và vào room trực tiếp.

---

## Giai đoạn 2 — Lobby

**Feature:** `src/features/lobby/`

Xem chi tiết tại [lobby.md](lobby.md).

Tóm tắt:
1. Người dùng chọn camera/mic, nhập tên (nếu là guest).
2. Click "Join" → gọi `meetingApi.joinMeeting()`.
3. Nếu response trả `participantStatus: "ACCEPT"` và có `livekitToken` → vào room ngay.
4. Nếu `participantStatus: "WAITING"` → hiện màn hình chờ duyệt + mở STOMP socket.

---

## Giai đoạn 3 — Room

**Feature:** `src/features/meeting/room/`

Xem chi tiết:
- [room-media-controls.md](room-media-controls.md)
- [room-chat.md](room-chat.md)
- [room-screen-share.md](room-screen-share.md)
- [room-hand-raise.md](room-hand-raise.md)
- [room-waiting-management.md](room-waiting-management.md)
- [room-exit.md](room-exit.md)

Hai kênh real-time song song:
- **LiveKit** — video, audio, chat
- **STOMP** — coordination (kick, admit, settings change, screen share signals)

---

## Giai đoạn 4 — Exit

Có 4 lý do thoát:

| Lý do | Mô tả |
|-------|-------|
| `"left"` | Participant chủ động rời phòng |
| `"ended"` | Host kết thúc phòng (hoặc nhận được MEETING_ENDED event) |
| `"kicked"` | Participant bị kick bởi host |
| `"banned"` | Participant bị kick kèm ban |

Khi exit: STOMP disconnect → LiveKit disconnect → gọi callback `onLeave(reason)` → page render màn hình tương ứng.

---

## State machine của useMeetingPageState

```
idle
  │ verifyMeeting thành công + có session → room
  │ verifyMeeting thành công + không có session → lobby
  │ verifyMeeting thất bại → error
  ▼
lobby
  │ joinMeeting ACCEPT + livekitToken → room
  │ joinMeeting WAITING → waiting (trong lobby)
  │ ADMITTED + joinMeeting lần 2 ACCEPT → room
  ▼
room
  │ leave/end/kicked/banned → exited
  ▼
exited
```

---

## Session persistence (`instant-meeting-session.ts`)

- **Storage:** `sessionStorage`, một key duy nhất `instant-meeting-session`.
- **Cấu trúc:** map `Record<meetingCode, InstantMeetingSession>` — `meetingCode` được normalize (`trim().toLowerCase()`), cho phép lưu song song nhiều meeting trong cùng tab.
- **`InstantMeetingSession` gồm:** `meetingCode`, `title`, `userName`, `guestId`, `guestSecret`, `isMicOn`, `isCameraOn`, `selectedMic`, `selectedCamera`, `livekitToken`, `meetingToken`, `participantStatus`, `hostId`, `hostName`.
- **API:** `persistInstantMeetingSession(session)`, `readInstantMeetingSession(meetingCode)`, `clearInstantMeetingSession(meetingCode)`.
- Được persist khi: join thành công (ACCEPT hoặc WAITING), khi settings thay đổi trong waiting state.
- Được xóa khi: meeting kết thúc, bị reject, rời phòng (xóa entry theo `meetingCode`; khi map rỗng thì gỡ luôn key khỏi `sessionStorage`).
