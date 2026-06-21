# Điều khiển Mic / Camera trong phòng họp

## Tổng quan

**Hook:** `src/features/meeting/room/hooks/use-room-media-controls.ts`

Quản lý trạng thái bật/tắt microphone và camera của local participant trong LiveKit room. Sử dụng **optimistic update** — UI cập nhật ngay lập tức, sau đó sync với LiveKit.

---

## Trạng thái

| State | Mô tả |
|-------|-------|
| `isMicEnabled` | Trạng thái hiện tại của mic (UI state) |
| `isCameraEnabled` | Trạng thái hiện tại của camera (UI state) |

---

## Bật/tắt Microphone

```
handleToggleMic()
  │
  ├─ Nếu muốn bật + canUnmuteMicrophone = false
  │    → toast "Microphone locked" — host đã khóa
  │    → không làm gì
  │
  ├─ Optimistic update: setIsMicEnabled(!current)
  │    ├─ Bật: set pendingLocalAudioUnmuteRef = true
  │    └─ Tắt: set pendingLocalAudioMuteRef = true
  │
  └─ room.localParticipant.setMicrophoneEnabled(nextValue)
       ├─ Thành công: pending flags cleared qua syncLocalMediaState()
       └─ Thất bại: rollback về trạng thái cũ + onError()
```

### Điều kiện khóa mic (Host lock)

Khi host tắt `allowParticipantUnmute` trong room settings:
- `canUnmuteMicrophone = false`
- `handleToggleMic()` block việc bật mic với toast thông báo
- Chỉ host mới có thể unmute participant

---

## Bật/tắt Camera

```
handleToggleCamera()
  │
  ├─ Optimistic update: setIsCameraEnabled(!current)
  │    └─ Tắt: set pendingLocalVideoMuteRef = true
  │
  └─ room.localParticipant.setCameraEnabled(nextValue)
       ├─ Thành công: pending flags cleared
       └─ Thất bại: rollback + onError()
```

---

## syncLocalMediaState()

Được gọi khi LiveKit phát sinh `TrackMuted`/`TrackUnmuted` event (kể cả khi host mute từ xa):

```
syncLocalMediaState(room?)
  │
  ├─ Đọc trạng thái thực của mic và camera từ LiveKit publication
  │
  ├─ Lần đầu (hasSyncedLocalMediaRef = false): khởi tạo state
  │
  ├─ pendingLocalAudioUnmuteRef = true (đang chờ unmute confirm):
  │    ├─ LiveKit confirmed unmuted → clear flag, update state
  │    └─ Chưa unmuted → giữ optimistic state (không update UI)
  │
  ├─ Mic từ enabled → disabled (do host mute):
  │    ├─ pendingLocalAudioMuteRef = true → người dùng tự tắt, clear flag
  │    └─ Không phải local → toast "Host muted your microphone"
  │
  └─ Camera từ enabled → disabled (do host tắt):
       ├─ pendingLocalVideoMuteRef = true → người dùng tự tắt, clear flag
       └─ Không phải local → toast "Host turned off your camera"
```

Cờ `shouldSuppressLocalMediaNotificationsRef` cho phép tắt toast trong quá trình initial connect (tránh hiện thông báo sai khi lần đầu join với mic off).
