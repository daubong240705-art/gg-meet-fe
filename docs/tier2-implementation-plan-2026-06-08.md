# Kế hoạch triển khai TIER 2 — Tính năng tầm trung (Meeting Room)

**Ngày:** 2026-06-08
**Nguồn:** [`room-ux-improvement-proposal-2026-06-08.md`](./room-ux-improvement-proposal-2026-06-08.md) — phần TIER 2.

**Bối cảnh kỹ thuật đã xác minh:**
- [`stage-layout.ts`](../src/components/meeting/room/stage/stage-layout.ts) **đã có** `prioritizeParticipantsForLayout(participants, limit, highlightedParticipantId)` + hệ điểm ưu tiên (speaking > local > sharing > hand > host) → tái dùng được cho speaker view & pin.
- Layout screen-share trong [`room-stage.tsx`](../src/components/meeting/room/stage/room-stage.tsx) (tile lớn + filmstrip) **chính là khuôn "spotlight"** → trích ra để dùng lại cho #7/#8.
- Tiền lệ chọn đối tượng layout: `activeScreenShareId` trong [`use-room-screen-share.ts:35`](../src/features/meeting/room/hooks/use-room-screen-share.ts#L35) (state cục bộ) — pin/speaker-mode nên theo pattern này.
- **Chưa dùng** `publishData` / `RoomEvent.DataReceived` ở đâu (chỉ có `sendChatMessage` ở [`use-room-chat.ts:185`](../src/features/meeting/room/hooks/use-room-chat.ts#L185)) → reactions (#9) cần thêm kênh data ephemeral mới.
- **Chưa có** global keyboard dispatcher (chỉ vài handler `Escape`/click-outside cục bộ) → #11 thêm mới.
- Đã có `dialog.tsx` (Radix) để dựng help dialog (#11).

> Quy ước chung: state "chỉ ảnh hưởng phía mình" (pin, layout mode) là **local-only**, theo mẫu [`RoomLocalVolumeProvider`](../src/features/meeting/room/providers/room-local-volume-provider.tsx). Field đổi liên tục **không** đẩy vào mảng `participants` (tránh re-render toàn cây) — xem ghi chú ở [`tier1-implementation-plan-2026-06-08.md`](./tier1-implementation-plan-2026-06-08.md) F2.

---

## Nhóm A — Kiểm soát bố cục: #7 (Speaker view) + #8 (Pin)

> Hai mục này dùng chung một khái niệm **"đối tượng spotlight"** nên làm cùng nhau, refactor một lần.

### A0. Nền tảng dùng chung
- **Khái niệm spotlight target** (thứ tự ưu tiên):
  `screenShareParticipant` → `pinnedId` (#8) → (nếu `layoutMode === "speaker"`) active speaker (#7) → `null` (grid).
- **Tạo hook** `useRoomStageLayout`:
  - `layoutMode: "grid" | "speaker"` (mặc định `"grid"`), `setLayoutMode` / `toggleLayoutMode`.
  - `pinnedParticipantId: string | null`, `pinParticipant(id)` / `unpin()`.
  - Trả `spotlightParticipant` đã suy ra từ `participants` + screen-share state.
  - **Local-only** (không qua LiveKit/backend). Lưu ý: pin theo `participant.id` (identity) để bền khi participant re-map.
- **Trích component** `SpotlightStage` từ nhánh screen-share hiện tại của [`room-stage.tsx`](../src/components/meeting/room/stage/room-stage.tsx): nhận `featured` (participant **hoặc** screen track) + `railParticipants` + cờ layout. Dùng lại cho cả screen-share lẫn speaker/pin → tránh nhân đôi JSX và tránh tái phát [lỗi nháy đã sửa](./project-optimization-audit-2026-06-08.md).

### A1. #7 — Speaker view (Grid ↔ Speaker)
- **Mục tiêu:** nút đổi giữa lưới đều và "người đang nói phóng to + filmstrip".
- **UI:** nút toggle layout (lucide `LayoutGrid` / `SquareUser`) — đặt ở header [`room-header.tsx`](../src/components/meeting/room/header/room-header.tsx) hoặc cụm phải footer.
- **Render:** khi `layoutMode === "speaker"` và **không** có screen share → render `SpotlightStage` với `featured = active speaker` (đổi mượt khi người nói đổi; debounce ~1–2s để khỏi nhảy liên tục), rail = phần còn lại qua `prioritizeParticipantsForLayout`.
- **Edge cases:** không ai nói → giữ speaker gần nhất hoặc host; 1–2 người → speaker view vô nghĩa, tự fallback grid; có screen share thì screen-share luôn thắng.

### A2. #8 — Pin / Spotlight một người
- **Mục tiêu:** "Ghim" 1 người để luôn là tile lớn (chỉ phía mình thấy).
- **UI:** thêm mục "Ghim/Bỏ ghim" vào action menu tile ([`participant-card.tsx:210`](../src/components/meeting/room/stage/participant-card.tsx#L210)); badge "📌 Đã ghim" trên tile đang pin; nút bỏ ghim nổi trên spotlight.
- **Render:** `pinnedId` có giá trị → ép vào `SpotlightStage` (ưu tiên hơn speaker view, dưới screen share). Truyền `pinnedId` làm `highlightedParticipantId` cho `prioritizeParticipantsForLayout` để luôn nằm trong rail/visible.
- **Edge cases:** người bị pin rời phòng → auto `unpin()`; pin trong lúc đang screen share → screen vẫn thắng, pin có hiệu lực lại khi share dừng.

**Files (Nhóm A):** tạo `use-room-stage-layout.ts`, `spotlight-stage.tsx`; sửa `room-stage.tsx` (dùng `SpotlightStage` cho cả 3 nhánh), `participant-card.tsx` (menu pin), `room-header.tsx`/footer (nút layout), `room.tsx` (wiring).

**Acceptance:** Đổi grid↔speaker thấy bố cục đổi mượt (không nháy); ghim 1 người → họ luôn là tile lớn; người bị ghim rời phòng → tự bỏ ghim; screen share luôn ưu tiên.

**Ước lượng:** 2–3 ngày (chủ yếu là refactor `SpotlightStage` cho an toàn).

---

## #9 — Floating reactions (👍❤️😂)

**Mục tiêu:** thả emoji nổi thoáng qua trên video; mọi người cùng thấy; ephemeral, tách khỏi chat.

**Cách tiếp cận:**
1. **Kênh data:** dùng `room.localParticipant.publishData(payload, { reliable: false, topic: "reaction" })` với payload `{ t: "reaction", emoji: string, at: number }` (JSON → `Uint8Array`). Lossy là chấp nhận được (reaction không quan trọng tuyệt đối).
2. **Nhận:** thêm handler `onData` trong [`use-livekit-room.ts`](../src/features/livekit/hooks/use-livekit-room.ts) bắt `RoomEvent.DataReceived(payload, participant, _, topic)` → forward lên [`use-room-livekit-session.ts`](../src/features/meeting/room/hooks/use-room-livekit-session.ts) (giống `onChatMessage`).
3. **Hook** `useRoomReactions`: nhận reaction (local + remote) → đẩy vào danh sách ephemeral (mỗi item có `id`, `emoji`, `participantId`, `createdAt`); tự xoá sau khi animation xong (~3s).
4. **Render:** `ReactionsOverlay` (absolute, `pointer-events-none`) trên stage: emoji bay lên + mờ dần; tùy chọn gắn reaction nhỏ ở góc tile người gửi.
5. **Trigger UI:** nút reactions ở footer mở popover emoji nhỏ (dùng unicode emoji cho nhẹ, **không** cần ảnh sticker như [`chat-stickers.ts`](../src/components/meeting/room/chat/chat-stickers.ts)).

**Edge cases:** chống spam (cooldown ~500ms/lần gửi); `prefers-reduced-motion` → hiện tĩnh rồi mờ; giới hạn số reaction đồng thời trên màn để khỏi tràn; bỏ qua payload sai định dạng.

**Files:** tạo `use-room-reactions.ts`, `reactions-overlay.tsx`, nút reactions ở footer; sửa `use-livekit-room.ts`, `use-room-livekit-session.ts`, `room.tsx`.

**Acceptance:** Bấm 👍 → emoji bay lên ở máy mình **và** máy người khác; không spam được; tự biến mất.

**Ước lượng:** 1.5 ngày.

---

## #10 — Nâng cấp chat

> Dựa trên [`room-sidebar-chat-panel.tsx`](../src/components/meeting/room/chat/room-sidebar-chat-panel.tsx) + [`use-room-chat.ts`](../src/features/meeting/room/hooks/use-room-chat.ts). Gồm 3 phần độc lập.

### 10a. Gộp tin liên tiếp cùng người
- So message với message liền trước: cùng `identity` và cách nhau < ~5 phút → ẩn avatar + tên, thu hẹp khoảng cách → bong bóng liền mạch.
- Thuần render (không đổi data); cẩn thận vẫn giữ accessibility (mỗi bong bóng vẫn có label người gửi qua `aria-label`).

### 10b. Vạch ngăn "tin chưa đọc"
- Khi mở panel chat, chốt `lastReadMessageId` = tin cuối; tin tới sau đó (khi panel không active) là "chưa đọc".
- Render divider "Tin chưa đọc" trước tin chưa đọc đầu tiên; xoá khi panel active trở lại.
- Gắn với `unreadChatCount` / `clearUnreadChatCount` sẵn có trong [`use-room-chat.ts`](../src/features/meeting/room/hooks/use-room-chat.ts).

### 10c. Cuộn-xuống-đáy thông minh (đồng bộ doc chat #6)
- Hiện auto-scroll xuống đáy mọi lúc ([`room-sidebar-chat-panel.tsx:52`](../src/components/meeting/room/chat/room-sidebar-chat-panel.tsx#L52)) → kéo user xuống khi đang đọc lịch sử.
- Chỉ auto-scroll khi đang ở **gần đáy**; nếu không, hiện nút "↓ Tin nhắn mới (N)" để bấm nhảy xuống.
- Tham chiếu mục #6 trong [`chat-flow-optimization-2026-06-08.md`](./chat-flow-optimization-2026-06-08.md).

**Files:** chủ yếu `room-sidebar-chat-panel.tsx`; 10b có thể thêm chút state ở `use-room-chat.ts`.

**Acceptance:** tin liên tiếp gộp gọn; có vạch "chưa đọc" đúng vị trí; đang đọc lịch sử không bị kéo xuống, có nút nhảy đáy.

**Ước lượng:** 1.5 ngày (3 phần có thể tách PR).

---

## #11 — Phím tắt + dialog trợ giúp (`?`)

**Mục tiêu:** thao tác nhanh bằng bàn phím; overlay liệt kê phím.

**Cách tiếp cận:**
1. **Hook** `useRoomKeyboardShortcuts`:
   - Một `keydown` global, **bỏ qua** khi `event.target` là `input`/`textarea`/`[contenteditable]` (quan trọng: ô chat) hoặc khi có `ctrl/meta/alt`.
   - Map: `m`→toggle mic, `e`→toggle camera, `c`→chat panel, `p`→participants panel, `h`→hand raise, `d`→rời họp, `?`→mở help.
   - Gọi đúng các handler **đã có** trong [`room.tsx`](../src/components/meeting/room/room.tsx) (`handleToggleMic`, `handleToggleCamera`, `togglePanel`, `handleToggleHandRaise`, `handleLeaveMeeting`) → tự kế thừa guard (mic locked, hand cooldown…).
2. **Help dialog** `RoomShortcutsDialog` (dùng [`dialog.tsx`](../src/components/ui/dialog.tsx)) liệt kê phím; mở bằng `?` và/hoặc nút nhỏ ở footer.
3. (Nối với #6 Tier 1) hiển thị phím tắt trong tooltip các nút footer.

**Edge cases:** không nuốt phím khi user đang gõ chat; `d` (rời họp) nên xác nhận với host (đã có `RoomLeaveDialog`); tránh trùng phím trình duyệt.

**Files:** tạo `use-room-keyboard-shortcuts.ts`, `room-shortcuts-dialog.tsx`; sửa `room.tsx` (wiring).

**Acceptance:** Gõ `m` (ngoài ô chat) → mic toggle; gõ trong ô chat → ký tự bình thường; `?` mở bảng phím.

**Ước lượng:** 1 ngày.

---

## Tổng hợp & thứ tự đề xuất

| Thứ tự | Mục | Ghi chú | Ước lượng |
|--------|-----|---------|-----------|
| 1 | **#11** phím tắt + help | Độc lập, gọi handler sẵn có; nối tiếp #6 | 1 ngày |
| 2 | **#10** chat (10a→10b→10c) | Tách 3 PR; 10c trùng doc chat #6 | 1.5 ngày |
| 3 | **#9** reactions | Thêm kênh data LiveKit (tái dùng cho tương lai) | 1.5 ngày |
| 4 | **Nhóm A** (#7+#8) | Refactor `SpotlightStage` — làm cuối, lớn nhất | 2–3 ngày |

**Tổng:** ~6–7 ngày. Mỗi mục là PR độc lập; verify bằng `npm run lint` + `npm run build`.

**Điểm cần chốt trước khi code:**
- **#7:** nút đổi layout đặt ở **header** hay **footer**? Active speaker có **debounce** bao lâu khi đổi người nói?
- **#9:** bộ emoji reaction cố định gồm những gì (vd 👍 ❤️ 😂 🎉 👏 😮)? Có cần `reliable` không (mặc định lossy)?
- **Nhóm A:** thứ tự ưu tiên cuối cùng giữa **pin** và **screen share** (đề xuất: screen share > pin > speaker > grid).
