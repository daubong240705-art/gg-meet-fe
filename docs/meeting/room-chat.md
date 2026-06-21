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
