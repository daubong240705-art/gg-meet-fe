# Giơ tay (Hand Raise)

## Tổng quan

**Hook:** `src/features/meeting/room/hooks/use-room-hand-raise.ts`

Hand raise được sync qua **LiveKit participant attributes** (metadata key-value). Không dùng backend API hay STOMP — hoàn toàn qua LiveKit Data Channel.

---

## Cách hoạt động

### Toggle giơ tay

```
handleToggleHandRaise()
  │
  ├─ Kiểm tra cooldown: nếu chưa đến nextHandRaiseAllowedAtRef → bỏ qua
  │
  ├─ Tính nextHandState:
  │    { handRaised: !current, handRaisedAt: Date.now() | null }
  │
  ├─ Đặt cooldown: nextHandRaiseAllowedAtRef = now + 1800ms
  ├─ setIsHandRaiseCoolingDown(true) → timeout 1800ms → false
  │
  ├─ Optimistic update: setLocalHandState(nextHandState), setPreferLocalHandState(true)
  │
  └─ room.localParticipant.setAttributes(getParticipantHandAttributes(nextHandState))
       └─ Thất bại: onError() (không rollback state!)
```

### Nhận thay đổi từ LiveKit

```
handleLiveKitLocalAttributesChange(participant)
  ├─ getParticipantHandState(participant.attributes) → parse state mới
  ├─ setLocalHandState(nextLocalHandState)
  └─ setPreferLocalHandState(false)  ← hết ưu tiên local state
```

`preferLocalHandState` là flag để ưu tiên optimistic state khi chờ LiveKit confirm. Sau khi LiveKit confirm (attributes changed event), flag reset.

---

## Cooldown

- **Mục đích:** Ngăn spam giơ/hạ tay liên tục.
- **Thời gian:** `HAND_RAISE_COOLDOWN_MS = 1800ms`
- Trong thời gian cooldown: `handleToggleHandRaise()` bị no-op, `isHandRaiseCoolingDown = true`.

---

## Participant attributes

```typescript
// getParticipantHandAttributes(state)
{
  "handRaised": "true" | "false",
  "handRaisedAt": string (timestamp) | ""
}
```

Participants khác nhận được attributes thay đổi qua LiveKit event và có thể render badge "giơ tay" trên participant card.

---

## Sắp xếp participants theo hand raise

`use-room-participants.ts` sort participants:
1. Participants đang giơ tay lên đầu, sorted theo `handRaisedAt` tăng dần (người giơ tay trước lên đầu)
2. Local participant thường ở đầu nếu không có ai giơ tay

---

## Các vấn đề tiềm ẩn

### 1. Lỗi setAttributes không rollback UI
- **Vấn đề:** Nếu `setAttributes()` thất bại (LiveKit error), state đã optimistic update nhưng không có rollback.
- **Hậu quả:** Người dùng thấy mình đang "giơ tay" nhưng thực ra LiveKit không biết. Những người khác không thấy hand raise. State diverge cho đến khi có LiveKit attributes event tiếp theo.

### 2. Cooldown không reset khi setAttributes fail
- **Vấn đề:** Cooldown timer chạy bất kể thành công hay thất bại.
- **Hậu quả:** Sau khi lỗi, người dùng phải chờ 1.8 giây để thử lại.

### 3. handRaisedAt là client timestamp
- **Vấn đề:** `handRaisedAt = Date.now()` dùng đồng hồ client, không đồng bộ với server.
- **Hậu quả:** Nếu đồng hồ giữa các client lệch nhau, thứ tự sort participants giơ tay có thể sai. Ví dụ: người A giơ tay trước nhưng đồng hồ client A chạy chậm → A hiển thị sau B.

### 4. resetHandRaise() không gửi lên LiveKit
- **Vấn đề:** `resetHandRaise()` chỉ reset local state, không gọi `setAttributes()` để clear remote.
- **Hậu quả:** Sau khi exit room và re-join, hand raise cũ có thể vẫn còn trong LiveKit participant attributes đến khi participant rejoin với attributes mới.
