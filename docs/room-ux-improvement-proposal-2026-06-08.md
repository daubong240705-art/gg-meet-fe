# Đề xuất tối ưu UX/UI — Meeting Room (FE)

**Ngày:** 2026-06-08
**Phạm vi:** `gg-meet-fe` — trải nghiệm phòng họp (room). Tận dụng năng lực sẵn có của `livekit-client`, không bắt buộc đổi backend (trừ mục có ghi chú).

---

## 0. Hiện trạng (giữ nguyên điểm mạnh)

- Glassmorphism tối nhất quán, control bar dạng **pill** với **split-button** (nút chính + menu thiết bị) — [`room-footer-controls.tsx`](../src/components/meeting/room/footer/room-footer-controls.tsx).
- Header nổi với tab "đang trình bày" — [`room-header.tsx`](../src/components/meeting/room/header/room-header.tsx).
- Tile có active-speaker ring, hand-raise/host badge, action menu hover (mute/kick/stop-share) — [`participant-card.tsx`](../src/components/meeting/room/stage/participant-card.tsx).
- Bố cục tự chuyển grid ↔ screen-share + filmstrip — [`room-stage.tsx`](../src/components/meeting/room/stage/room-stage.tsx).

**Khoảng trống chính:** phản hồi trạng thái (mic/mạng/kết nối) và kiểm soát bố cục (pin/speaker view).

---

## TIER 1 — Quick wins (giá trị cao / công sức thấp, không đụng backend)

### 1. Mic level meter — phản hồi "đang được nghe"
- **Hiện trạng:** active-speaker ring chỉ bật/tắt nhị phân ([`participant-card.tsx:52`](../src/components/meeting/room/stage/participant-card.tsx#L52)).
- **Đề xuất:** dùng `audioLevel` real-time của LiveKit → vòng sáng quanh nút mic ở footer + viền tile phản ứng theo âm lượng.
- **Vì sao:** user biết mic đang hoạt động; giảm tình huống "alo nghe không?".
- **Đụng tới:** `room-footer-controls.tsx`, `participant-card.tsx`, một hook đọc audio level.

### 2. Cảnh báo "Bạn đang tắt mic" khi nói
- **Hiện trạng:** không có.
- **Đề xuất:** local audio level vượt ngưỡng trong khi `!isMicEnabled` → toast nhắc "Bạn đang nói nhưng mic đang tắt".
- **Vì sao:** chống đúng tình huống khó chịu phổ biến nhất; pattern chuẩn của Meet/Zoom.

### 3. Chỉ báo chất lượng kết nối (per-participant)
- **Hiện trạng:** **không hiển thị gì** về chất lượng mạng.
- **Đề xuất:** dùng `ConnectionQuality` của LiveKit → icon sóng nhỏ ở góc tile, đổi màu khi yếu; banner "Mạng của bạn không ổn định" cho local.
- **Vì sao:** giải thích vì sao hình/tiếng giật; giảm hiểu lầm là lỗi app.

### 4. Banner "Đang kết nối lại…"
- **Hiện trạng:** chỉ có banner audio playback ([`room-body.tsx:145`](../src/components/meeting/room/layout/room-body.tsx#L145)).
- **Đề xuất:** bắt `RoomEvent.Reconnecting` / `Reconnected` → overlay/banner rõ ràng.
- **Vì sao:** tránh user tưởng app treo khi mạng chập chờn.

### 5. Empty state có CTA mời
- **Hiện trạng:** [`room-stage.tsx:144`](../src/components/meeting/room/stage/room-stage.tsx#L144) chỉ là dòng chữ "Waiting for participants…".
- **Đề xuất:** thêm nút **Copy link mời** + mã phòng ngay tại đó.
- **Vì sao:** giảm bước thao tác khi vừa mở phòng (đỡ phải mò ở footer).

### 6. Tooltip + nhãn rõ cho control bar
- **Hiện trạng:** footer toàn icon + thuộc tính `title` ([`room-footer-controls.tsx`](../src/components/meeting/room/footer/room-footer-controls.tsx)).
- **Đề xuất:** dùng shadcn Tooltip (mô tả + phím tắt).
- **Vì sao:** dễ nhận diện, nhất là cho người mới.

---

## TIER 2 — Tầm trung (giá trị cao / công sức vừa)

### 7. Nút đổi bố cục: Grid ↔ Speaker (spotlight)
- **Hiện trạng:** chỉ auto grid + chế độ screen-share.
- **Đề xuất:** thêm "Speaker view" (người đang nói phóng to ra giữa, còn lại thành filmstrip).
- **Vì sao:** giá trị lớn cho cuộc họp đông; user chủ động chọn cách xem.

### 8. Pin / Spotlight một người (local-only)
- **Hiện trạng:** action menu tile chỉ có mute/kick/stop-share ([`participant-card.tsx:210`](../src/components/meeting/room/stage/participant-card.tsx#L210)).
- **Đề xuất:** thêm "Ghim" để phóng to người mình muốn theo dõi. Không cần backend (state cục bộ giống `RoomLocalVolumeProvider`).

### 9. Floating reactions (👍❤️😂)
- **Hiện trạng:** đã có sticker trong chat ([`chat-stickers.ts`](../src/components/meeting/room/chat/chat-stickers.ts)).
- **Đề xuất:** reaction **nổi thoáng qua trên video**, gửi qua LiveKit data channel (ephemeral), tách khỏi chat.
- **Vì sao:** tăng tương tác mà không làm rối luồng chat.

### 10. Nâng cấp chat
- **Đề xuất:** vạch ngăn "tin chưa đọc"; gộp các tin liên tiếp cùng người (bớt lặp avatar/tên); nút cuộn-xuống-đáy khi đang đọc lịch sử.
- **Liên quan:** mục #6 trong [`chat-flow-optimization-2026-06-08.md`](./chat-flow-optimization-2026-06-08.md) (auto-scroll thông minh).

### 11. Phím tắt + dialog trợ giúp (`?`)
- **Hiện trạng:** chưa có.
- **Đề xuất:** m=mic, e=cam, d=rời, c=chat… kèm overlay liệt kê phím.
- **Vì sao:** tăng tốc cho power user; chuyên nghiệp hoá.

---

## TIER 3 — Tính năng lớn (định hướng)

- **Làm mờ / nền ảo (background blur):** LiveKit hỗ trợ qua track processors; áp dụng cả pre-join lẫn trong phòng.
- **Picture-in-Picture** khi chuyển tab.
- **Test thiết bị ở lobby:** nói thử thấy thanh level, phát âm thanh test loa trước khi vào.
- **Captions / biên bản:** cần backend STT.

---

## Lưu ý design system

Room đang **hardcode nền tối** (slate gradient, vd `bg-slate-950/...`) bất kể theme người dùng. Hai hướng:
- **(a)** Giữ tối có chủ đích (nhiều app họp cố tình vậy để video nổi) → nên **token-hoá** màu thay vì rải hằng `slate-*`, để nhất quán & dễ chỉnh.
- **(b)** Hỗ trợ cả light mode → cần token-hoá triệt để.

→ Nên **chốt 1 hướng** rồi token-hoá, tránh giá trị màu rải rác khó bảo trì.

---

## Khuyến nghị thứ tự triển khai

| Bước | Mục | Lý do |
|------|-----|-------|
| 1 | #1, #2, #3, #5 | Cảm giác "pro" rõ nhất, công sức thấp, không đụng backend |
| 2 | #6, #4 | Hoàn thiện phản hồi trạng thái + dễ dùng |
| 3 | #7, #8 | Kiểm soát bố cục — giá trị cao cho cuộc họp đông |
| 4 | #9, #10, #11 | Tăng tương tác & tốc độ |
| 5 | TIER 3 | Theo lộ trình sản phẩm |

**Bắt đầu tốt nhất:** #1 → #2 → #3 → #5.
