# Audit tối ưu toàn dự án (FE)

**Ngày:** 2026-06-08
**Phạm vi:** `gg-meet-fe` — quét toàn bộ, tập trung path nóng (room realtime), data fetching, render.

> Các điểm **riêng của luồng chat** nằm ở [chat-flow-optimization-2026-06-08.md](./chat-flow-optimization-2026-06-08.md). File này là các phát hiện **toàn cục**.

---

## Tóm tắt ưu tiên

| Mã | Vấn đề | Tier | Rủi ro | Khuyến nghị |
|----|--------|------|--------|-------------|
| 1.2 | `participants` thay mới toàn bộ object mỗi thay đổi | Cao | Trung bình | **Làm trước** (fix gốc cho 1.1 + 2.2) |
| 1.1 | `ParticipantCard` chưa memo | Cao | Thấp | Làm (hoặc thay bằng 1.2) |
| 1.3 | `RoomSidebar` render 2 lần | Cao | Trung bình | Làm khi có thời gian test responsive |
| 2.1 | React Query không set default | Trung bình | Thấp | **Làm trước** (nhanh, lợi mạng) |
| 2.2 | `ParticipantRow` chưa memo | Trung bình | Thấp | Tự khỏi nếu làm 1.2 |
| 2.3 | Chat #3/#4 chưa làm | Trung bình | Thấp | Làm cùng dọn chat |
| 3.x | Mục nhỏ | Thấp | Thấp | Tùy chọn |

---

## TIER 1 — Tác động cao (render realtime của room)

### 1.1 — `ParticipantCard` chưa memo → 1 người nói/mute là re-render TẤT CẢ card
**File:** [`src/components/meeting/room/stage/participant-card.tsx`](../src/components/meeting/room/stage/participant-card.tsx)

`ParticipantCard` (và `RoomStage`) không bọc `memo`. Mỗi sự kiện LiveKit (speaking/mute/track/active-speaker) đi qua `onParticipantsChange` → [`use-room-participants.ts:58`](../src/features/meeting/room/hooks/use-room-participants.ts#L58) tạo lại **mảng participants mới hoàn toàn** → toàn bộ `ParticipantCard` re-render.

- **Đã verify:** video **không** bị re-attach, vì `cameraTrack = publication.track` ([`use-livekit-tracks.ts:12`](../src/features/livekit/hooks/use-livekit-tracks.ts#L12)) là object LiveKit ổn định → effect trong [`track-view.tsx`](../src/components/meeting/room/stage/track-view.tsx) (deps `[track, muted]`) không chạy lại.
- **Chi phí thực:** reconcile lại mọi card + framer-motion `layout` đo đạc lại — tần suất cao (speaking đổi liên tục).

**Hướng xử lý:** `memo(ParticipantCard)` với custom comparator so các field của `participant` + các props còn lại. Callbacks (`onMuteParticipantTrack`, `onForceStopScreenShare`) đã `useCallback` ổn định ([`room.tsx:349`](../src/components/meeting/room/room.tsx#L349)) nên memo ăn ngay.

**Rủi ro:** Thấp.

---

### 1.2 — `areParticipantsEqual` là all-or-nothing (fix gốc cho 1.1 + 2.2)
**File:** [`src/features/meeting/room/lib/participant-mapper.ts:207`](../src/features/meeting/room/lib/participant-mapper.ts#L207)

Hiện `handleLiveKitParticipantsChange` map lại **toàn bộ** rồi `areParticipantsEqual` quyết định giữ mảng cũ hay thay mảng mới. Khi chỉ 1 người đổi → cả mảng bị thay bằng object mới → **mọi** participant đổi reference.

**Hướng xử lý:** Cho mapper **tái dùng object cũ cho participant không đổi** (cache theo `id`, so field như `areParticipantsEqual` đang làm nhưng ở mức từng item). Khi đó:
- `memo` shallow **mặc định** tự hoạt động ở mọi consumer: card (stage), row (sidebar), volume.
- Không cần rải custom comparator nhiều nơi.

Đây là giải pháp sạch hơn 1.1 và bao trùm 2.2.

**Rủi ro:** Trung bình (đụng logic core của roster — cần test kỹ join/leave/đổi trạng thái).

---

### 1.3 — `RoomSidebar` render 2 lần (mobile + desktop)
**File:** [`src/components/meeting/room/layout/room-body.tsx:105`](../src/components/meeting/room/layout/room-body.tsx#L105) và [`:182`](../src/components/meeting/room/layout/room-body.tsx#L182)

Cả list participants lẫn chat dựng **2 bản trong DOM** cùng lúc (1 cho overlay mobile, 1 cho desktop), chỉ ẩn bằng CSS (`xl:hidden` / `hidden ... xl:flex`). Mỗi cập nhật → render kép.

**Hướng xử lý:** Hook media-query (vd `useMediaQuery("(min-width: 1280px)")`) để chỉ mount đúng 1 `RoomSidebar`.

**Rủi ro:** Trung bình (đổi render responsive + animation đóng/mở).

---

## TIER 2 — Trung bình

### 2.1 — React Query không set default → refetch thừa
**File:** [`src/components/layout/app-provider.tsx:11`](../src/components/layout/app-provider.tsx#L11)

```ts
const [queryClient] = useState(() => new QueryClient());
```

Không có `defaultOptions` → `staleTime: 0`, refetch mỗi lần mount + mỗi lần focus cửa sổ. Admin/profile/schedule gọi lại API không cần thiết.

**Hướng xử lý:**
```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,          // tùy chỉnh theo độ "tươi" cần thiết
      refetchOnWindowFocus: false, // cân nhắc theo UX từng màn
    },
  },
});
```

**Rủi ro:** Thấp (cần rà các màn dựa vào refetch-on-focus).

---

### 2.2 — `ParticipantRow` (sidebar) chưa memo
**File:** [`src/components/meeting/room/sidebar/room-sidebar-participants-panel.tsx:35`](../src/components/meeting/room/sidebar/room-sidebar-participants-panel.tsx#L35)

Cùng pattern 1.1, nhẹ hơn (không render video, chỉ avatar + slider volume). **Tự khỏi nếu làm 1.2.**

**Rủi ro:** Thấp.

---

### 2.3 — Mục chat còn tồn (xem doc chat)
- `#3` — [`chat-linkified-text.tsx`](../src/components/meeting/room/chat/chat-linkified-text.tsx): bọc `useMemo` cho phần dựng `parts` (regex linkify) theo `[text, isLocal]`. **Chưa làm.**
- `#4` — [`chat-message.ts:23`](../src/features/meeting/room/lib/chat-message.ts#L23): hoist `Intl.DateTimeFormat` ra module scope. **Chưa làm.**
- `#5` (binary-insert thay full sort) và memo chat panel: **đã làm.**

**Rủi ro:** Thấp.

---

## TIER 3 — Nhỏ / tùy chọn

- **Clock footer:** [`room-footer-meeting-info.tsx:11`](../src/components/meeting/room/footer/room-footer-meeting-info.tsx#L11) tạo `Intl` mỗi render, nhưng chỉ tick 30s → bỏ qua được.
- **`RoomLocalVolumeProvider`:** [`room-local-volume-provider.tsx:166`](../src/features/meeting/room/providers/room-local-volume-provider.tsx#L166) — `value` đổi khi bất kỳ volume nào đổi → mọi consumer volume re-render. Fine-grained subscription là over-engineering → **không khuyến nghị**.
- **Ảnh:** chưa có `images.remotePatterns` trong [`next.config.ts`](../next.config.ts); avatar đang dùng `unoptimized`. Có thể bật tối ưu ảnh cho avatar remote, lợi nhỏ.

---

## Đề xuất thứ tự triển khai
1. **2.1** — nhanh, ít rủi ro, lợi mạng ngay.
2. **1.2** — fix gốc, một chỗ, bao trùm 1.1 + 2.2 cho toàn bộ room.
3. **2.3** — dọn nốt chat (#3, #4).
4. **1.3** — khi có thời gian test responsive kỹ.
