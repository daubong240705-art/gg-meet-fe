# Rời / Kết thúc phòng họp

## Tổng quan

**Hook:** `src/features/meeting/room/hooks/use-room-exit-actions.ts`

Quản lý 2 actions chính: participant rời phòng (leave) và host kết thúc phòng (end).

---

## exitMeeting() — hàm lõi

```
exitMeeting(reason: "left" | "ended" | "kicked" | "banned" = "left")
  │
  ├─ Kiểm tra hasExitedMeetingRef — chỉ chạy một lần
  │
  ├─ onBeforeExit?.() — cleanup hooks khác (ví dụ: dừng screen share)
  ├─ resetHandRaise() — clear hand raise state
  ├─ disconnectMeetingSocket() — đóng STOMP connection
  ├─ roomRef.current?.disconnect() — đóng LiveKit WebRTC
  └─ onLeave(reason) — callback về parent, trigger page state change
```

`hasExitedMeetingRef` đảm bảo `exitMeeting()` chỉ thực thi một lần dù được gọi từ nhiều nơi (socket event, button click, v.v.).

---

## handleLeaveMeeting() — Participant rời phòng

```
handleLeaveMeeting()
  ├─ reportLeaveMeeting() — gửi API leave (best effort, không chờ)
  └─ exitMeeting("left")
```

### reportLeaveMeeting()

```
meetingApi.leaveMeeting(meetingCode, localMeetingParticipantId, meetingToken, { keepalive: true })
```

- Dùng `keepalive: true` để request hoàn thành dù trang đang chuyển hướng.
- Fire-and-forget: `catch(() => undefined)` — lỗi bị bỏ qua.
- Mục đích: Cập nhật trạng thái participant ở backend trước khi trang đóng.

---

## handleEndMeeting() — Host kết thúc phòng

```
handleEndMeeting()
  │
  ├─ Kiểm tra isEndingMeeting (loading guard)
  ├─ setIsEndingMeeting(true)
  │
  ├─ meetingApi.endMeeting(meetingCode)
  │    ├─ Thành công: exitMeeting("ended")
  │    └─ Thất bại: toast.error() + setIsEndingMeeting(false)
  │
  └─ setIsEndingMeeting(false) [finally]
```

---

## Các trigger thoát phòng ngoài button

| Trigger | Lý do |
|---------|-------|
| STOMP `MEETING_ENDED` trên `/topic/meeting/{code}` | Host đã kết thúc phòng |
| STOMP `USER_KICKED` trên `/topic/meeting/{code}/participant/{id}` với `isBan: false` | Bị kick |
| STOMP `USER_KICKED` với `isBan: true` | Bị ban |
| LiveKit `disconnected` event (trong use-livekit-room) | LiveKit kết nối bị đứt |

---

## Màn hình sau khi thoát

| Lý do | Màn hình |
|-------|---------|
| `"left"` | Trang chủ hoặc trang xác nhận đã rời |
| `"ended"` | Thông báo cuộc họp đã kết thúc |
| `"kicked"` | Thông báo bị remove bởi host |
| `"banned"` | Thông báo bị ban |

---

## Các vấn đề tiềm ẩn

### 1. reportLeaveMeeting() có thể không gửi được
- **Vấn đề:** Mặc dù dùng `keepalive: true`, request vẫn có thể fail nếu browser đang teardown hoặc `localMeetingParticipantId` là `null`.
- **Hậu quả:** Backend không biết participant đã rời → participant hiển thị sai trạng thái ở backend cho đến khi LiveKit WebRTC disconnect timeout propagates.
- **Trường hợp đặc biệt:** `localMeetingParticipantId === null` → `reportLeaveMeeting()` return sớm, không gửi API. Điều này xảy ra khi participant là guest chưa có ID hoặc meetingToken không parse được.

### 2. exitMeeting() gọi disconnect không theo thứ tự đảm bảo
- **Vấn đề:** STOMP `disconnectMeetingSocket()` và LiveKit `roomRef.current?.disconnect()` được gọi sequential nhưng cả hai đều async internally.
- **Hậu quả:** Có thể còn pending callbacks từ STOMP hoặc LiveKit được gọi sau khi `onLeave()` đã render trang mới. React state updates sau unmount có thể gây warnings.

### 3. hasExitedMeetingRef không reset
- **Vấn đề:** `hasExitedMeetingRef.current = true` được set và không bao giờ reset.
- **Hậu quả:** Nếu component không unmount đúng cách sau exit (edge case), các lần gọi `exitMeeting()` tiếp theo sẽ bị no-op. Trong practice ít xảy ra vì page thường navigate đi.

### 4. endMeeting không thành công khi host đã rời khỏi LiveKit
- **Vấn đề:** Nếu LiveKit connection drop trước khi host click "End Meeting", `meetingApi.endMeeting()` vẫn có thể thành công (REST API không cần LiveKit). Tuy nhiên LiveKit room có thể không được dọn dẹp đúng cách.
- **Hậu quả:** Phụ thuộc vào backend — nếu backend xử lý LiveKit cleanup khi end meeting, không có vấn đề. Nếu không, LiveKit room có thể còn active.
