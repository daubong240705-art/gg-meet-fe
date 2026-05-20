# Chat trong phòng họp

## Tổng quan

**Hook:** `src/features/meeting/room/hooks/use-room-chat.ts`

Chat sử dụng **LiveKit Data Channel** (không qua STOMP). Tin nhắn được broadcast qua `room.localParticipant.sendChatMessage()` và nhận qua LiveKit event `chatMessage`.

---

## Các loại tin nhắn

```typescript
// Text
{ type: "text", content: string }

// Sticker
{ type: "sticker", stickerKey: string }
```

Payload được serialize thành JSON string trước khi gửi vào LiveKit chat channel.

**File:** `src/features/meeting/room/lib/chat-message.ts`  
**Sticker keys:** `src/components/meeting/room/chat-stickers.ts`

---

## Nhận tin nhắn

LiveKit event `chatMessage` → `handleLiveKitChatMessage()`:

```
handleLiveKitChatMessage(message, participant, room)
  │
  ├─ mapChatMessageToUiMessage() → parse payload, build ChatMessage UI object
  │
  ├─ Dedup bằng seenChatMessageIdsRef (Set<string>)
  │    └─ Tin nhắn đã thấy: cập nhật in-place (thay vì thêm mới)
  │
  ├─ Nếu tin nhắn mới + không phải local + sidebar không ở tab "chat"
  │    → unreadChatCount++
  │
  └─ setChatMessages() — sort theo timestamp
```

---

## Gửi tin nhắn

```
handleSendChatMessage(payload)
  │
  ├─ Validate: text không rỗng, sticker key hợp lệ
  │
  ├─ Kiểm tra room connected + isLiveKitEnabled
  │    → Không có room → onError()
  │
  ├─ setIsSendingChat(true)
  │
  ├─ room.localParticipant.sendChatMessage(serialized)
  │    ├─ Thành công: xóa chatDraft (chỉ với text)
  │    └─ Thất bại: onError(errorMessage)
  │
  └─ setIsSendingChat(false)
```

---

## Unread count

- Tăng khi: nhận tin nhắn mới + không phải local + chat panel không đang mở
- Reset khi: người dùng mở chat panel → `clearUnreadChatCount()`
- Hiển thị dưới dạng badge trên nút chat trong footer

---

## Các vấn đề tiềm ẩn

### 1. LiveKit sendChatMessage không có retry
- **Vấn đề:** Nếu `sendChatMessage()` thất bại (network blip, LiveKit disconnected), tin nhắn bị mất hoàn toàn.
- **Hậu quả:** Người dùng không biết tin nhắn không được gửi nếu không đọc error toast.

### 2. Chat message history mất khi refresh
- **Vấn đề:** `chatMessages` là React state — không được persist.
- **Hậu quả:** Refresh trang → mất toàn bộ lịch sử chat. LiveKit chỉ deliver tin nhắn gửi sau khi join.

### 3. seenChatMessageIdsRef không bị cleanup
- **Vấn đề:** `seenChatMessageIdsRef` (Set) tích lũy IDs mà không bị xóa trong suốt phiên.
- **Hậu quả:** Với cuộc họp dài có nhiều tin nhắn, Set tăng trưởng vô hạn. Ít ảnh hưởng thực tế vì meetings thường ngắn, nhưng là memory leak tiềm ẩn.

### 4. Sticker validation chỉ client-side
- **Vấn đề:** `isStickerKey(payload.stickerKey)` kiểm tra sticker hợp lệ, nhưng đây chỉ là validation phía client.
- **Hậu quả:** Nếu có participant custom client, họ có thể gửi sticker key bất kỳ. Receiver cần handle gracefully khi sticker key không tồn tại (chưa kiểm tra behavior này).

### 5. Không giới hạn số lượng tin nhắn
- **Vấn đề:** `chatMessages` array có thể tăng vô hạn trong cuộc họp dài.
- **Hậu quả:** Memory tăng dần. Re-render sau mỗi tin nhắn mới sort toàn bộ array O(n log n).
