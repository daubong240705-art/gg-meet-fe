# Điều chỉnh âm lượng từng người (local)

## Tổng quan

Cho phép **mỗi người nghe** tự chỉnh âm lượng của từng participant khác trong phòng:
kéo nhỏ người nói quá to, mute local người không muốn nghe, hoặc reset về 100%.

**Hoàn toàn local** — chỉ đổi âm thanh phát ra trên máy người đang chỉnh:

- ✅ Không đổi âm lượng người khác nghe
- ✅ Không mute mic thật của participant
- ✅ Không gọi backend / API moderation
- ✅ Không ảnh hưởng trạng thái mic/cam thật của ai

## Cơ chế kỹ thuật

Dùng `RemoteParticipant.setVolume(volume)` của LiveKit (`volume` 0..1, 1 = 100%).

LiveKit tự lưu volume trên object participant và **tự áp lại khi track audio re-subscribe**.
Trường hợp duy nhất cần tự xử lý: participant **rời rồi vào lại** → tạo object mới ở 100%,
nên provider áp lại volume đã lưu mỗi khi danh sách participant đổi.

## Kiến trúc

Dùng **React Context** (giống `MeetingSocketProvider`) để tránh prop-drilling 5 tầng
(`room → RoomBody → RoomSidebar → Panel → Row`).

| File | Vai trò |
|------|---------|
| `src/features/meeting/room/providers/room-local-volume-provider.tsx` | **Mới** — context giữ state âm lượng theo `identity`, áp `setVolume`, re-apply khi roster đổi |
| `src/components/meeting/room/room.tsx` | Bọc room bằng `<RoomLocalVolumeProvider roomRef={…} participants={…}>` |
| `src/components/meeting/room/sidebar/room-sidebar-participants-panel.tsx` | UI slider + mute + reset trong menu `…` của mỗi participant remote |

### State

```ts
type ParticipantVolumeState = {
  volume: number;   // 0..1, mức đã chọn (giữ nguyên khi mute để unmute khôi phục)
  isMuted: boolean; // mute local — ép mức nghe về 0
};
// Map theo participant.identity (chính là key của room.remoteParticipants)
```

Mức áp thật = `isMuted ? 0 : volume`. Không có entry ⇒ mặc định `{ volume: 1, isMuted: false }`.

### API context

| Hàm | Tác dụng |
|-----|----------|
| `getParticipantVolume(identity)` | Đọc state hiện tại (có default) |
| `setParticipantVolume(identity, volume)` | Đặt mức 0..1 (kéo > 0 sẽ tự unmute), clamp ≤ 1 |
| `toggleParticipantMute(identity)` | Bật/tắt mute local (giữ nguyên `volume`) |
| `resetParticipantVolume(identity)` | Về 100% + unmute |

## UI

Mỗi hàng participant **remote** (không phải bản thân) có nút `⋮` mở menu chứa:

- Nút loa (Volume2 / VolumeX) để mute/unmute local
- Slider `0–100%` (`<input type="range" accent-primary>`)
- Nhãn `%` hoặc `Muted`, nút **Reset** khi khác mặc định
- Ghi chú "Only changes what you hear."

Menu host (mute mic/cam, remove) vẫn nằm dưới, ngăn bởi divider. Bản thân không có
điều khiển âm lượng (không tự nghe mình).

## Giới hạn

- Trần 100% (`MAX_PARTICIPANT_VOLUME = 1`) để tránh vỡ/méo tiếng khi boost.
- State chỉ tồn tại trong phiên (không lưu localStorage) — rời phòng là reset.
