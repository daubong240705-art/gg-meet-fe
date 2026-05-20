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

---

## Các vấn đề tiềm ẩn

### 1. Optimistic update + LiveKit failure = state diverge
- **Vấn đề:** UI cập nhật ngay (optimistic), nhưng nếu LiveKit call thất bại, state được rollback. Trong khoảng thời gian giữa (vài ms đến vài giây nếu network chậm), UI hiển thị trạng thái sai.
- **Hậu quả:** Người dùng thấy mic "bật" nhưng thực ra đang tắt. Rollback xảy ra đột ngột.

### 2. pendingLocalAudioUnmuteRef không có timeout
- **Vấn đề:** Nếu LiveKit gặp lỗi khi unmute nhưng không throw (silent fail), `pendingLocalAudioUnmuteRef` sẽ remain `true` mãi.
- **Hậu quả:** `syncLocalMediaState()` sẽ không bao giờ cập nhật `isMicEnabled` từ LiveKit nữa — state stuck ở "đang bật" dù thực ra tắt.

### 3. Camera không có pendingUnmute flag
- **Vấn đề:** Camera chỉ có `pendingLocalVideoMuteRef` (cho tắt), không có flag cho bật.
- **Hậu quả:** Khác biệt behavior so với mic — nếu bật camera thất bại, không có cơ chế suppress thông báo toast không cần thiết. Tuy nhiên ít ảnh hưởng vì host mute camera ít dùng hơn.

### 4. suppressLocalMediaNotifications() chỉ dùng một lần
- **Vấn đề:** Flag `shouldSuppressLocalMediaNotificationsRef` được set nhưng không bao giờ reset.
- **Vấn đề hiện tại:** Không thấy reset point trong code — điều này có nghĩa là toast thông báo "host muted" sẽ không bao giờ hiển thị nếu hàm này được gọi và flag không reset. Cần kiểm tra nơi gọi `suppressLocalMediaNotifications()`.
