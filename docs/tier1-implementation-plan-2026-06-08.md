# Kế hoạch triển khai TIER 1 — Quick wins UX (Meeting Room)

**Ngày:** 2026-06-08
**Nguồn:** [`room-ux-improvement-proposal-2026-06-08.md`](./room-ux-improvement-proposal-2026-06-08.md) — phần TIER 1.
**Bối cảnh kỹ thuật đã xác minh:**
- `livekit-client` `^2.18.1`, `radix-ui` `^1.4.3`, `lucide-react`, `sonner` đều có sẵn.
- **Chưa có** component `Tooltip` trong [`src/components/ui/`](../src/components/ui/) (mới có button, card, dialog, input, sonner).
- Kiểu [`Participant`](../src/components/meeting/room/types.ts) có `isSpeaking` nhưng **chưa có** `audioLevel` / `connectionQuality`.
- `setMicrophoneEnabled(false)` của LiveKit **mute = `mediaStreamTrack.enabled = false`** → track phát **im lặng** ra cả Web Audio (ảnh hưởng cách làm #2).
- Convention Radix trong dự án: `import { X as XPrimitive } from "radix-ui"` (xem [`dialog.tsx`](../src/components/ui/dialog.tsx)).
- Logic copy link đang **lặp ở 2 nơi**: [`room-footer-meeting-info.tsx:48`](../src/components/meeting/room/footer/room-footer-meeting-info.tsx#L48) và [`authenticated-meeting-code-button.tsx:12`](../src/components/home/authenticated-meeting-code-button.tsx#L12).

> Nguyên tắc chung: không đụng backend; thêm field vào `Participant` đi qua [`participant-mapper.ts`](../src/features/meeting/room/lib/participant-mapper.ts) + cập nhật `areParticipantsEqual`; bind listener per-participant theo đúng pattern speaking listener trong [`use-livekit-room.ts`](../src/features/livekit/hooks/use-livekit-room.ts).

---

## Nền tảng dùng chung (làm trước, phục vụ nhiều mục)

### F1. Hook `useCopyMeetingLink(meetingCode)` — phục vụ #5
- **Tạo mới:** `src/features/meeting/room/hooks/use-copy-meeting-link.ts` (hoặc `src/lib/meeting/`).
- Trả `{ copied, copyMeetingLink }`; gói logic `navigator.clipboard.writeText(\`${origin}/${code}\`)` + cờ `copied` 2s + guard SSR.
- **Refactor:** thay logic lặp ở [`room-footer-meeting-info.tsx`](../src/components/meeting/room/footer/room-footer-meeting-info.tsx) và [`authenticated-meeting-code-button.tsx`](../src/components/home/authenticated-meeting-code-button.tsx) dùng hook này.
- **Lợi:** DRY + tái dùng ngay cho empty-state CTA (#5).

### F2. Mở rộng `Participant` + mapper — phục vụ #1 (tile) và #3
- Thêm field vào [`Participant`](../src/components/meeting/room/types.ts):
  - `connectionQuality: "excellent" | "good" | "poor" | "lost" | "unknown"` (#3)
  - *(tùy chọn cho tile meter #1)* `audioLevel: number` (0..1)
- Map trong [`participant-mapper.ts`](../src/features/meeting/room/lib/participant-mapper.ts) từ `participant.connectionQuality` (enum `ConnectionQuality` của LiveKit) và `participant.audioLevel`.
- Bổ sung 2 field vào `areParticipantsEqual` (lưu ý: `audioLevel` đổi liên tục → **không** đưa vào so sánh để tránh re-render mỗi frame; chỉ so `connectionQuality`). Audio level cho tile nên đi đường riêng (rAF cục bộ), không qua state participants — xem #1.

---

## #1 — Mic level meter ("đang được nghe")

**Mục tiêu:** Người dùng thấy mic đang thu (vòng/level động quanh nút mic ở footer); tùy chọn cường độ ring trên tile theo âm lượng.

**Cách tiếp cận:**
1. **Footer (lõi):** hook `useLocalMicLevel(roomRef, isMicEnabled)`:
   - Lấy local track: `room.localParticipant.getTrackPublication(Track.Source.Microphone)?.audioTrack` (`LocalAudioTrack`).
   - Dùng `createAudioAnalyser(track)` của `livekit-client` → `{ calculateVolume, cleanup }`.
   - Vòng lặp `requestAnimationFrame` (throttle ~30fps), set state `level` (0..1) đã làm mượt (low-pass) để khỏi giật.
   - Cleanup analyser khi track đổi / unmount / mic tắt.
2. **Render:** thêm lớp ring/bars quanh nút mic trong [`room-footer-controls.tsx`](../src/components/meeting/room/footer/room-footer-controls.tsx) (vd `box-shadow`/scale theo `level`, hoặc 3 thanh nhỏ).
3. **Tile (tùy chọn, phase 2):** một rAF loop **cục bộ trong `RoomStage`** đọc `participant.audioLevel` cho các tile và chỉnh độ đậm của active-speaker ring — **không** đẩy qua state `participants` (tránh re-render toàn cây mỗi frame).

**Files:** tạo `use-local-mic-level.ts`; sửa `room-footer-controls.tsx` (+ truyền `roomRef`/level qua [`room-footer.tsx`](../src/components/meeting/room/footer/room-footer.tsx) hoặc đọc trực tiếp trong controls).

**Edge cases:** track chưa sẵn sàng khi vừa join; đổi thiết bị mic (analyser phải re-bind theo track mới); `prefers-reduced-motion` → giảm/biến mất animation; tab ẩn → tạm dừng rAF.

**Acceptance:** Nói → ring quanh nút mic phản ứng tức thì; tắt mic → ring tắt; đổi mic → vẫn chạy; không drop FPS.

**Ước lượng:** Footer 0.5 ngày; tile meter +0.5 ngày.

---

## #2 — Cảnh báo "Bạn đang tắt mic" khi nói

**Mục tiêu:** Khi `!isMicEnabled` mà người dùng đang nói → nhắc nhẹ (toast/inline) "Bạn đang nói nhưng mic đang tắt".

**⚠️ Ràng buộc kỹ thuật:** LiveKit mute đặt `mediaStreamTrack.enabled = false` → track gửi **im lặng**, **không** đọc được mức âm từ track đã mute. Vì vậy cần **đường audio riêng** khi đang mute.

**Cách tiếp cận (khuyến nghị):** hook `useMutedSpeechDetector`:
- Chỉ hoạt động khi `!isMicEnabled` **và** tab đang hiển thị.
- Mở `getUserMedia({ audio: { deviceId: selectedMic } })` riêng → `AnalyserNode` → đo mức.
- Ngưỡng + duy trì (vd level > T trong > 400ms) → bắn toast (dùng `toast` với `id` cố định + cooldown ~10s để không spam).
- **Teardown ngay** khi mic bật lại / đổi panel / unmount (giải phóng mic).

**🔐 Lưu ý quyền riêng tư (bắt buộc cân nhắc):** giữ `getUserMedia` khi đang "tắt mic" khiến **chỉ báo mic của trình duyệt/OS vẫn sáng** — có thể gây hiểu lầm. Hai lựa chọn:
- **(a)** Chấp nhận (giống Google Meet) nhưng teardown nhanh khi unmute; ghi rõ trong tooltip/cài đặt.
- **(b)** Đưa thành **tùy chọn bật/tắt** trong Room settings (mặc định tắt) để tôn trọng quyền riêng tư.
→ Cần **chốt (a) hay (b)** trước khi code.

**Files:** tạo `use-muted-speech-detector.ts`; tiêu thụ trong [`room.tsx`](../src/components/meeting/room/room.tsx) (đã có `isMicEnabled`, `selectedMic`/`activeMicrophoneId`).

**Acceptance:** Mute mic rồi nói → trong ~0.5s hiện nhắc, không lặp dồn dập; bật mic lại → mic OS tắt (stream được giải phóng).

**Ước lượng:** 0.5–1 ngày (phụ thuộc chọn (a)/(b)).

---

## #3 — Chỉ báo chất lượng kết nối (per-participant)

**Mục tiêu:** Icon sóng ở góc tile (xanh/vàng/đỏ) theo chất lượng; banner cảnh báo khi **local** yếu.

**Cách tiếp cận:**
1. **Bind listener:** trong [`use-livekit-room.ts`](../src/features/livekit/hooks/use-livekit-room.ts) thêm `ParticipantEvent.ConnectionQualityChanged` (hoặc `RoomEvent.ConnectionQualityChanged(quality, participant)`) → `scheduleSyncParticipants()` để re-map. Bind theo đúng pattern speaking listener (bind khi `ParticipantConnected`, unbind khi `ParticipantDisconnected`).
2. **Mapper:** map `participant.connectionQuality` → field `connectionQuality` (F2), thêm vào `areParticipantsEqual`.
3. **Render tile:** icon (lucide `SignalHigh`/`SignalMedium`/`SignalLow`) ở góc [`participant-card.tsx`](../src/components/meeting/room/stage/participant-card.tsx), màu theo mức; ẩn khi `excellent`/`unknown` để đỡ rối.
4. **Banner local:** khi participant local `poor`/`lost` → banner cạnh banner audio playback trong [`room-body.tsx`](../src/components/meeting/room/layout/room-body.tsx).

**Edge cases:** `unknown` lúc vừa join → không hiện cảnh báo; tránh nhấp nháy khi dao động nhanh (debounce nhẹ hoặc chỉ đổi khi giữ trạng thái > ~2s).

**Acceptance:** Bóp băng thông (DevTools throttling) → icon chuyển vàng/đỏ + banner local; phục hồi → ẩn.

**Ước lượng:** 0.5–1 ngày.

---

## #4 — Banner "Đang kết nối lại…"

**Mục tiêu:** Khi mất/khôi phục kết nối → overlay/banner rõ ràng, không để user tưởng treo.

**Cách tiếp cận:**
1. Tận dụng `RoomEvent.ConnectionStateChanged` (đã được lắng nghe trong [`use-livekit-room.ts:169`](../src/features/livekit/hooks/use-livekit-room.ts#L169) nhưng hiện chỉ gọi `scheduleSyncParticipants`). Mở rộng `onConnectionChange(boolean)` → `onConnectionStateChange(state)` với `ConnectionState` (`Connected | Connecting | Reconnecting | Disconnected`).
2. Truyền state lên [`use-room-livekit-session.ts`](../src/features/meeting/room/hooks/use-room-livekit-session.ts) → room → [`room-body.tsx`](../src/components/meeting/room/layout/room-body.tsx).
3. Render: `Reconnecting` → banner "Đang kết nối lại…" (spinner); `Disconnected` (ngoài ý muốn) → trạng thái lỗi + nút thử lại.

**Lưu ý:** giữ tương thích `isRoomConnected` hiện có (có thể derive `isRoomConnected = state === Connected`).

**Acceptance:** Ngắt mạng tạm → hiện "Đang kết nối lại…"; có mạng lại → banner biến mất, media nối lại.

**Ước lượng:** 0.5 ngày.

---

## #5 — Empty state có CTA mời

**Mục tiêu:** Ở màn chờ "Waiting for participants…" có sẵn **mã phòng + nút Copy link mời**.

**Cách tiếp cận:**
1. Dùng `useCopyMeetingLink` (F1).
2. Truyền `meetingCode` xuống [`RoomStage`](../src/components/meeting/room/stage/room-stage.tsx) (hiện **chưa** nhận prop này) qua [`room-body.tsx`](../src/components/meeting/room/layout/room-body.tsx).
3. Thay khối empty-state [`room-stage.tsx:144`](../src/components/meeting/room/stage/room-stage.tsx#L144): thêm mã phòng + nút Copy (đổi icon ✓ khi copied) + gợi ý "Chia sẻ link để mời người khác".

**Acceptance:** Vào phòng một mình → thấy nút Copy hoạt động (toast/đổi icon), link đúng `origin/{code}`.

**Ước lượng:** 0.5 ngày (đa phần là F1).

---

## #6 — Tooltip + nhãn rõ cho control bar

**Mục tiêu:** Hover/focus nút footer → tooltip mô tả (kèm phím tắt sau này ở #11).

**Cách tiếp cận:**
1. **Tạo** `src/components/ui/tooltip.tsx` theo convention dialog: `import { Tooltip as TooltipPrimitive } from "radix-ui"`, export `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`.
2. Bọc `TooltipProvider` một lần (trong [`room.tsx`](../src/components/meeting/room/room.tsx) hoặc [`app-provider.tsx`](../src/components/layout/app-provider.tsx)).
3. Thay `title=...` ở [`room-footer-controls.tsx`](../src/components/meeting/room/footer/room-footer-controls.tsx) (và split-button) bằng `Tooltip`. Giữ `aria-label` cho a11y.

**Edge cases:** trên mobile/touch không hover → tooltip chỉ cho con trỏ; không che menu thiết bị đang mở; `delayDuration` hợp lý (~300ms).

**Acceptance:** Hover từng nút thấy mô tả; bàn phím Tab tới nút cũng hiện; không phá menu hiện có.

**Ước lượng:** 0.5 ngày.

---

## Tổng hợp & thứ tự đề xuất

| Thứ tự | Mục | Phụ thuộc | Ước lượng |
|--------|-----|-----------|-----------|
| 1 | **F1** (copy hook) | — | 0.25 ngày |
| 2 | **#5** empty CTA | F1 | 0.25 ngày |
| 3 | **#6** tooltip | — | 0.5 ngày |
| 4 | **F2** + **#3** connection quality | F2 | 0.5–1 ngày |
| 5 | **#4** reconnecting banner | — | 0.5 ngày |
| 6 | **#1** mic meter (footer) | — | 0.5 ngày |
| 7 | **#2** muted-speech detector | chốt privacy (a/b) | 0.5–1 ngày |

**Tổng:** ~3.5–4.5 ngày. Mỗi mục là 1 PR độc lập; verify bằng `npm run lint` + `npm run build` (dự án không có test).

**Điểm cần chốt trước khi code:**
- **#2:** chấp nhận giữ mic mở khi muted **(a)** hay đưa thành tùy chọn mặc-định-tắt **(b)**?
- **#1 tile meter:** làm luôn hay để phase 2 (footer trước)?
