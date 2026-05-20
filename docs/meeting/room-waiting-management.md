# Quản lý Waiting Room (Dành cho Host)

## Tổng quan

Host có thể xem, duyệt, từ chối, và kick participants. Có 2 hook chính:

| Hook | File |
|------|------|
| `useWaitingRoomActions` | `use-waiting-room-actions.ts` — actions: approve, reject, approve-all, kick |
| `useWaitingRoomRequests` | `use-waiting-room-requests.ts` — state: danh sách participants đang chờ |
| `useRoomTargetedMute` | `use-room-targeted-mute.ts` — tắt mic/camera participant cụ thể |

---

## Waiting Room Requests (useWaitingRoomRequests)

### Nguồn dữ liệu

Danh sách participants chờ duyệt được cập nhật từ 2 nguồn:

1. **REST API** — `meetingApi.getWaitingRoomRequests()` được gọi khi socket connect.
2. **STOMP** — `JOIN_REQUEST` event từ `/topic/meeting/{code}/waiting`.

### Deduplication

`upsertWaitingParticipant(message)` xử lý JOIN_REQUEST:
- Nếu participant đã có trong list → cập nhật.
- Nếu chưa có → thêm vào.

### Resync

`requestWaitingRoomResync()` trigger một lần resync với API sau một khoảng delay nhỏ. Tránh gọi API ngay lập tức sau mỗi action (batch refresh).

---

## Actions (useWaitingRoomActions)

Tất cả actions đều dùng STOMP socket để gửi lệnh ngay lập tức:

### Duyệt một participant

```
handleApproveWaitingParticipant(participant)
  ├─ sendAccept({ meetingCode, targetParticipantId, targetName })
  ├─ removeWaitingParticipant(participant.participantId) — optimistic remove
  └─ requestWaitingRoomResync()
```

### Từ chối một participant

```
handleRejectWaitingParticipant(participant)
  ├─ sendReject({ meetingCode, targetParticipantId, targetName })
  ├─ removeWaitingParticipant(participant.participantId)
  └─ requestWaitingRoomResync()
```

### Duyệt tất cả

```
handleApproveAllWaitingParticipants()
  └─ forEach participant:
       ├─ sendAccept(...)
       └─ removeWaitingParticipant(...)
  └─ requestWaitingRoomResync() (một lần)
```

### Kick participant khỏi phòng

```
handleKickParticipant(participant, isBan: boolean)
  └─ sendKickout({
       meetingCode,
       targetParticipantId,
       targetName,
       isBan          // true = ban (không cho join lại)
     })
```

Kick action không remove khỏi participant list ngay — backend gửi `USER_KICKED` event qua STOMP về `/topic/meeting/{code}`, từ đó `removeParticipantByMeetingId()` được gọi.

---

## Mute/Camera từ xa (useRoomTargetedMute)

**Chỉ host** mới có thể dùng.

```
handleMuteParticipantTrack(participant, trackType: "AUDIO" | "VIDEO")
  │
  ├─ Kiểm tra participantId không null
  ├─ Kiểm tra track chưa bị mute (tránh gửi redundant)
  │
  ├─ setMutingParticipantTrack({participantId, trackType}) — loading state
  │
  ├─ meetingApi.muteParticipantTrack(meetingCode, participantId, trackType, meetingToken)
  │    └─ Backend dùng LiveKit Admin API để force mute track
  │
  └─ setMutingParticipantTrack(null)
```

Khi backend mute thành công, LiveKit phát `TrackMuted` event trên participant target → `syncLocalMediaState()` của participant đó phát hiện và hiển thị toast thông báo.

---

## Room Settings (Host only)

Host có thể thay đổi:

| Setting | Ý nghĩa |
|---------|---------|
| `allowParticipantUnmute` | Participants có được phép tự bật mic không |
| `allowParticipantShareScreen` | Participants có được phép chia sẻ màn hình không |

API: `meetingApi.updateRoomSettings(meetingCode, settings, meetingToken)`

Khi settings thay đổi, backend broadcast `ROOM_SETTINGS_CHANGED` event qua STOMP → tất cả participants nhận và cập nhật local state.

---

## Các vấn đề tiềm ẩn

### 1. Approve-all không có rollback
- **Vấn đề:** `handleApproveAllWaitingParticipants()` gửi nhiều `sendAccept` trong loop. Nếu socket disconnect giữa chừng, một số participants được duyệt, số khác thì không.
- **Hậu quả:** Danh sách waiting inconsistent giữa client và server. Resync sau đó sẽ sửa, nhưng có độ trễ.

### 2. Optimistic remove có thể sai
- **Vấn đề:** `removeWaitingParticipant()` xóa participant khỏi list ngay khi sendAccept/sendReject. Nếu STOMP publish thất bại (socket not connected), action bị drop nhưng UI đã xóa participant.
- **Hậu quả:** Participant biến mất khỏi list của host nhưng vẫn đang chờ ở backend. Resync sẽ đưa participant trở lại, nhưng tạo confusion.

### 3. muteParticipantTrack không update LiveKit state local
- **Vấn đề:** Sau khi gọi API mute, host không thấy track state của participant thay đổi ngay — cần chờ LiveKit event `TrackMuted` propagate.
- **Hậu quả:** Loading state (`mutingParticipantTrack`) cleared ngay sau API call, nhưng UI track state chưa cập nhật → người dùng có thể click mute lần 2.

### 4. Room settings chỉ được check client-side
- **Vấn đề:** `canUnmuteMicrophone` và `canShareScreen` là state local — host có thể thay đổi cài đặt. Backend cũng enforce, nhưng nếu có race condition giữa settings update và participant action, có thể phát sinh lỗi ngắn.
- **Ví dụ:** Host disable share screen → participant đang share vẫn share thêm vài giây cho đến khi `canUseScreenShare` effect trigger.

### 5. Kick không có confirmation round-trip
- **Vấn đề:** `sendKickout` là fire-and-forget STOMP publish. Nếu socket fail, kick không được thực hiện nhưng host không nhận được thông báo lỗi (chỉ catch Error và gọi `toast.error`).
