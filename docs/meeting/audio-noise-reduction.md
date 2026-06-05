# Tối ưu âm thanh đầu vào — Giảm tạp âm cơ bản

## Tổng quan

Áp dụng xử lý âm thanh cơ bản của trình duyệt/WebRTC cho **mọi luồng mic** trong Kallio
để giảm tạp âm nền nhẹ (tiếng quạt, tiếng môi trường, tiếng vọng loa) mà **không** dùng
AI nặng và **không** lọc quá mạnh gây méo giọng.

Cấu hình áp dụng:

| Constraint | Tác dụng |
|------------|----------|
| `echoCancellation: true` | Khử tiếng vọng từ loa quay ngược lại mic (AEC) |
| `noiseSuppression: true` | Loại bỏ tạp âm nền ổn định (quạt, điều hòa, ù phòng) |
| `autoGainControl: true` | Tự cân bằng âm lượng mic, người nói to/nhỏ vẫn đều |
| `channelCount: 1` | Thu mono — giọng nói vốn là mono, giảm nửa bitrate, tránh artifact stereo |

> Đây là các constraint native của trình duyệt (WebRTC DSP). Không cần thư viện ngoài,
> chạy real-time, độ trễ thấp.

---

## Nguồn cấu hình duy nhất (single source of truth)

**File:** `src/lib/meeting/audio-capture.ts`

```ts
export const MEETING_AUDIO_CAPTURE_DEFAULTS: AudioCaptureOptions = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
};
```

Hằng số này được kiểu hóa bằng `AudioCaptureOptions` của `livekit-client`. Cả luồng phòng họp
(LiveKit) lẫn luồng preview ở lobby (`getUserMedia`) đều tham chiếu chung hằng số này — sửa một
chỗ, áp dụng toàn bộ.

---

## Các điểm áp dụng

### 1. Trong phòng họp — LiveKit Room (join + bật/tắt mic)

**File:** `src/components/meeting/room/room.tsx`

```ts
const LIVEKIT_ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: true,
  audioCaptureDefaults: MEETING_AUDIO_CAPTURE_DEFAULTS,
};
```

`audioCaptureDefaults` là cấu hình mặc định LiveKit dùng để tạo local audio track. Vì
`setMicrophoneEnabled()` được gọi **không kèm tham số**, LiveKit luôn fallback về
`room.options.audioCaptureDefaults`. Nhờ vậy một chỗ khai báo này phủ cả hai luồng:

- **Khi join phòng** — `src/features/livekit/hooks/use-livekit-room.ts`
  (`enableCameraAndMicrophone()` / `setMicrophoneEnabled(true)`).
- **Khi bật mic trong phòng** — `src/features/meeting/room/hooks/use-room-media-controls.ts`
  (`room.localParticipant.setMicrophoneEnabled(nextValue)`).

→ Không cần sửa hai hook trên; chúng tự kế thừa cấu hình từ Room options.

### 2. Lobby — preview thiết bị trước khi join

**File:** `src/features/lobby/hooks/use-lobby-devices.ts`

Lobby dùng `navigator.mediaDevices.getUserMedia()` riêng (không qua LiveKit) để preview, nên
phải truyền constraint trực tiếp:

```ts
audio: isMicOn
  ? { deviceId: selectedMic || undefined, ...MEETING_AUDIO_CAPTURE_DEFAULTS }
  : false,
```

→ Người dùng nghe/thấy mức âm thanh đã được khử nhiễu ngay từ bước kiểm tra thiết bị, nhất quán
với trải nghiệm trong phòng.

---

## Luồng mic toàn cục (sau khi tối ưu)

```
                MEETING_AUDIO_CAPTURE_DEFAULTS  (audio-capture.ts)
                          │
        ┌─────────────────┴──────────────────┐
        │                                     │
   Lobby preview                        LiveKit Room
   (use-lobby-devices)              (room.tsx → LIVEKIT_ROOM_OPTIONS
        │                            .audioCaptureDefaults)
   getUserMedia({ audio:                     │
     ...DEFAULTS })            ┌──────────────┴───────────────┐
                               │                              │
                       Join phòng                     Bật mic trong phòng
                  (use-livekit-room)            (use-room-media-controls)
                  setMicrophoneEnabled(true)    setMicrophoneEnabled(nextValue)
                               │                              │
                               └──────────────┬───────────────┘
                                        Track audio publish
                                  (đã qua AEC + NS + AGC, mono)
```

---

## Phạm vi & giới hạn

- **Mục tiêu:** giảm tạp âm nền nhẹ ở mức cơ bản, giữ giọng tự nhiên. Không phải khử ồn mạnh.
- `voiceIsolation` (khử ồn mạnh hơn, thử nghiệm) **không** bật vì hỗ trợ trình duyệt chưa rộng và
  dễ làm méo giọng — đúng yêu cầu "không lọc quá mạnh".
- Hiệu quả thực tế phụ thuộc trình duyệt/hệ điều hành. Chrome/Edge hỗ trợ tốt cả ba constraint;
  một số trình duyệt có thể bỏ qua constraint không hỗ trợ (giảm nhẹ chứ không lỗi).
- Không thay đổi codec hay bitrate audio mặc định của LiveKit (ngoài việc ép mono qua
  `channelCount: 1`).

---

## Kiểm thử

| Bước | Kỳ vọng |
|------|---------|
| Mở lobby, bật mic gần quạt/điều hòa | Tiếng ồn nền giảm rõ trong preview |
| Join phòng, nói khi có loa phát | Không nghe tiếng vọng (echo) quay lại |
| Tắt rồi bật lại mic trong phòng | Track mới vẫn áp dụng đầy đủ AEC/NS/AGC |
| Nói nhỏ rồi nói to | Âm lượng được tự cân bằng (AGC) |

Kiểm tra build/lint:

```bash
npm run lint
npm run build
```

---

## Các file thay đổi

| File | Thay đổi |
|------|----------|
| `src/lib/meeting/audio-capture.ts` | **Mới** — hằng số `MEETING_AUDIO_CAPTURE_DEFAULTS` |
| `src/components/meeting/room/room.tsx` | Thêm `audioCaptureDefaults` vào `LIVEKIT_ROOM_OPTIONS` |
| `src/features/lobby/hooks/use-lobby-devices.ts` | Áp constraint vào `getUserMedia` preview |
