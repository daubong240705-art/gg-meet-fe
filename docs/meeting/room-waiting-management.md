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
