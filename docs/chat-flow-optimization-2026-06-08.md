# Tối ưu luồng chat trong cuộc họp (FE)

**Ngày:** 2026-06-08
**Phạm vi:** `gg-meet-fe` — luồng chat realtime trong phòng họp (LiveKit `RoomEvent.ChatMessage`)

---

## 1. Luồng hiện tại

```
LiveKit RoomEvent.ChatMessage
  └─ use-livekit-room.ts:175  → onChatMessage(message, participant, room)
       └─ use-room-chat.ts:56  handleLiveKitChatMessage
            ├─ mapChatMessageToUiMessage()        (chat-message.ts:86)
            ├─ seenChatMessageIdsRef → unreadChatCount
            └─ setChatMessages() + sort()
                 └─ room.tsx (state)
                      └─ RoomBody
                           ├─ RoomSidebar (overlay mobile)   ← render bản 1
                           └─ RoomSidebar (desktop)           ← render bản 2
                                └─ RoomSidebarChatPanel
                                     └─ map → ChatLinkifiedText / sticker
```

Gửi tin: `RoomSidebarChatPanel` → `handleSendChatMessage` (use-room-chat.ts:101) → `room.localParticipant.sendChatMessage(serializeOutgoingChatPayload(...))`.

Luồng logic sạch và tách trách nhiệm tốt. Các điểm dưới đây là cơ hội tối ưu hiệu năng/UX, không phải bug.

---

## 2. Các điểm tối ưu (xếp theo mức tác động)

### #1 — `RoomSidebar` render 2 lần (tác động lớn nhất)
**File:** [`src/components/meeting/room/layout/room-body.tsx`](../src/components/meeting/room/layout/room-body.tsx) — dòng 105 (overlay mobile) và dòng 182 (desktop).

Cả hai instance đều nhận full `chatMessages`, đều render toàn bộ list và đều chạy effect scroll. Toàn bộ danh sách tin nhắn tồn tại **hai bản trong DOM** cùng lúc, dù mỗi lúc chỉ 1 cái hiển thị (ẩn bằng CSS `xl:hidden` / `hidden ... xl:flex`). Mỗi tin mới → render kép.

**Hướng xử lý:** Thêm hook media-query (vd `useMediaQuery("(min-width: 1280px)")`) để chỉ mount đúng 1 `RoomSidebar` theo breakpoint. Lưu ý: đổi cấu trúc responsive, cần test kỹ cả mobile/desktop và animation đóng/mở.

**Rủi ro:** Trung bình (đổi cách render responsive).

---

### #2 — Không memo theo từng tin nhắn
**File:** [`src/components/meeting/room/chat/room-sidebar-chat-panel.tsx`](../src/components/meeting/room/chat/room-sidebar-chat-panel.tsx) — dòng 127.

`chatMessages.map(...)` render inline. Mỗi tin mới làm thay đổi identity của mảng → **re-render toàn bộ** bong bóng cũ, và mỗi `ChatLinkifiedText` chạy lại regex linkify cho tất cả tin cũ.

**Hướng xử lý:** Tách `ChatMessageItem` thành component riêng bọc `React.memo`. Vì các tin cũ có props ổn định (id không đổi), chúng sẽ không re-render khi có tin mới.

**Rủi ro:** Thấp.

---

### #3 — `ChatLinkifiedText` không cache kết quả parse
**File:** [`src/components/meeting/room/chat/chat-linkified-text.tsx`](../src/components/meeting/room/chat/chat-linkified-text.tsx) — dòng 42.

`text.matchAll(LINK_CANDIDATE_REGEX)` + dựng mảng `parts` chạy lại mỗi lần render.

**Hướng xử lý:** Bọc phần dựng `parts` trong `useMemo` theo `[text, isLocal]`. Kết hợp với #2 sẽ loại bỏ hẳn việc linkify lại tin cũ.

**Rủi ro:** Thấp.

---

### #4 — `Intl.DateTimeFormat` khởi tạo mới mỗi tin (an toàn nhất, lợi rõ)
**File:** [`src/features/meeting/room/lib/chat-message.ts`](../src/features/meeting/room/lib/chat-message.ts) — dòng 23-28.

```ts
function formatChatTime(timestamp: number) {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(timestamp);
}
```

`Intl.DateTimeFormat` là object tương đối nặng, đang được tạo mới mỗi lần map một tin nhắn.

**Hướng xử lý:** Hoist instance formatter ra module scope, tái sử dụng:

```ts
const CHAT_TIME_FORMATTER = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" });
function formatChatTime(timestamp: number) {
  return CHAT_TIME_FORMATTER.format(timestamp);
}
```

**Rủi ro:** Rất thấp.

---

### #5 — Sort lại toàn bộ mảng mỗi tin
**File:** [`src/features/meeting/room/hooks/use-room-chat.ts`](../src/features/meeting/room/hooks/use-room-chat.ts) — dòng 92 và 95.

Mỗi message gọi `.sort()` toàn mảng → O(n log n) / tin → O(n² log n) tổng cho cả phiên chat. Tin từ LiveKit gần như luôn đến đúng thứ tự timestamp, nên sort luôn là phòng thủ thừa.

**Hướng xử lý:** Append thẳng (vì thường đã đúng thứ tự); chỉ binary-insert / sort khi phát hiện tin mới có timestamp nhỏ hơn tin cuối. Tương tự cho nhánh replace (tin chỉnh sửa).

**Rủi ro:** Thấp–trung bình (cần giữ đúng hành vi với tin đến lệch thứ tự và tin edit).

---

### #6 — Auto-scroll luôn nhảy xuống đáy (UX)
**File:** [`src/components/meeting/room/chat/room-sidebar-chat-panel.tsx`](../src/components/meeting/room/chat/room-sidebar-chat-panel.tsx) — dòng 52-63.

Effect scroll xuống đáy mỗi khi `chatMessages` đổi, kể cả khi user đang cuộn lên đọc lịch sử → bị kéo xuống đột ngột.

**Hướng xử lý:** Chỉ auto-scroll khi user đang ở gần đáy (so sánh `scrollHeight - scrollTop - clientHeight` với ngưỡng). Tùy chọn: hiện nút "tin nhắn mới" khi đang ở trên.

**Rủi ro:** Thấp (đổi hành vi UX, cần xác nhận với user).

---

## 3. Đề xuất triển khai

| Nhóm | Mục | Rủi ro | Ghi chú |
|------|-----|--------|---------|
| **An toàn — làm ngay** | #4, #2, #3, #5 | Thấp | Không đổi UX, chỉ giảm tải render/CPU |
| **Cân nhắc** | #1 | Trung bình | Tác động lớn nhất, cần đổi render responsive + test |
| **Cân nhắc (UX)** | #6 | Thấp | Đổi hành vi scroll, cần xác nhận |

**Khuyến nghị:** Làm trước nhóm an toàn (#2–#5) trong 1 PR; xử lý #1 và #6 riêng vì cần test kỹ và/hoặc xác nhận UX.
