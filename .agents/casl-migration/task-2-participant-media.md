# Task 2 — Per-participant media → `RoomAbility` (gỡ prop-drilling)

> Phụ thuộc: Task 0 (provider phải được mount) · Quy mô: L · Rủi ro: Trung bình
> Kết quả: `participant-card` đọc quyền mute/force-stop-share trực tiếp từ `useRoomAbility()`; xoá chuỗi prop `canManageParticipantMedia` / `canForceStopScreenShare` chạy qua 4 tầng. **Đây là task lợi ích cao nhất.**

## Mục tiêu

Thay 2 quyền per-participant bằng ability có điều kiện, và **xoá prop-drilling** dọc chuỗi:

```
room.tsx → room-body → room-stage → participant-card
```

Hành vi nút mute mic/cam và "stop screen share" trên card phải y hệt.

## Chuỗi prop hiện tại (đối chiếu trước khi sửa)

| Tầng | Đang làm gì | Ref |
|------|-------------|-----|
| `room.tsx` | `<RoomBody canForceStopScreenShare={canManageWaitingRoom} ... />` | [room.tsx:557](../../src/components/meeting/room/room.tsx#L557) |
| `room-body.tsx` | nhận `canForceStopScreenShare`; gửi xuống stage `canManageParticipantMedia={canManageWaitingRoom}` + `canForceStopScreenShare={canForceStopScreenShare}` | [room-body.tsx:324,327](../../src/components/meeting/room/layout/room-body.tsx#L324) |
| `room-stage.tsx` | nhận 2 cờ; gửi cho card ở **2 nơi** (filmstrip + grid) | [room-stage.tsx:208,347](../../src/components/meeting/room/stage/room-stage.tsx#L208) |
| `participant-card.tsx` | tính `canMuteParticipantMedia`, `canStopScreenShare` | [participant-card.tsx:99,111](../../src/components/meeting/room/stage/participant-card.tsx#L99) |

## Các bước (làm **bottom-up** để TypeScript dẫn đường)

### Bước 1 — `participant-card.tsx`: đọc ability thay vì prop

Hiện tại:

```tsx
canManageParticipantMedia = false,
canForceStopScreenShare = false,
// ...
const canMuteParticipantMedia =
  canManageParticipantMedia && !participant.isLocal && !participant.isHost;
// ...
const canStopScreenShare =
  canForceStopScreenShare && participant.isScreenSharing && !participant.isLocal;
```

Đổi thành:

```tsx
import { useMemo } from "react";
import { subject } from "@casl/ability";
import { useRoomAbility } from "@/features/meeting/providers";

// trong component (BỎ 2 prop canManageParticipantMedia, canForceStopScreenShare):
const ability = useRoomAbility();
const participantSubject = useMemo(
  () =>
    subject("Participant", {
      kind: "Participant" as const,
      isLocal: participant.isLocal,
      isHost: participant.isHost,
      isScreenSharing: participant.isScreenSharing,
    }),
  [participant.isLocal, participant.isHost, participant.isScreenSharing],
);

const canMuteParticipantMedia = ability.can("muteTrack", participantSubject);
const canStopScreenShare = ability.can("forceStopShare", participantSubject);
```

> Các dòng phía sau **không đổi**:
> `canMuteAudio = canMuteParticipantMedia && !participant.isMuted`,
> `canMuteVideo = canMuteParticipantMedia && !participant.isCameraOff`,
> `hasActionMenu = canMuteAudio || canMuteVideo || canStopScreenShare`.

**Kiểm chứng tương đương luật** (vì sao hành vi không đổi):
- `muteTrack` chỉ cấp khi `isHost`, kèm đk `{ isLocal:false, isHost:false }` ⇒ `isHost && !p.isLocal && !p.isHost`. Bằng đúng `canManageParticipantMedia(=canManageWaitingRoom=isHost) && !isLocal && !isHost`.
- `forceStopShare` chỉ cấp khi `isHost`, kèm đk `{ isLocal:false, isScreenSharing:true }` ⇒ `isHost && !p.isLocal && p.isScreenSharing`. Bằng đúng `canForceStopScreenShare(=canManageWaitingRoom) && isScreenSharing && !isLocal`.

### Bước 2 — `participant-card.tsx`: dọn props + memo

- Xoá 2 field khỏi `ParticipantCardProps` (`canManageParticipantMedia?`, `canForceStopScreenShare?`) và khỏi danh sách destructure/default.
- Trong hàm so sánh của `React.memo` ở cuối file, **xoá** 2 dòng so sánh:
  ```tsx
  && (previousProps.canManageParticipantMedia ?? false) === (nextProps.canManageParticipantMedia ?? false)
  && (previousProps.canForceStopScreenShare ?? false) === (nextProps.canForceStopScreenShare ?? false)
  ```
  An toàn vì: `React.memo` **không** chặn re-render do context đổi. Khi host gạt settings → ability mới → `useRoomAbility()` khiến card re-render đúng lúc, không cần prop trong memo.

### Bước 3 — `room-stage.tsx`: bỏ 2 prop trung gian

- Xoá khỏi props type: `canManageParticipantMedia?`, `canForceStopScreenShare?` (L33–34), khỏi destructure/default (L138–139).
- Xoá khi render card ở **cả 2 nơi** (L208–209 và L347–348):
  ```tsx
  canManageParticipantMedia={canManageParticipantMedia}
  canForceStopScreenShare={canForceStopScreenShare}
  ```
  (chỉ xoá 2 dòng này, các prop card khác giữ nguyên.)

### Bước 4 — `room-body.tsx`: ngừng tạo/chuyển 2 cờ

- Xoá prop `canForceStopScreenShare?` khỏi props type (L117) + destructure (L154).
- Xoá 2 dòng truyền xuống stage (L324, L327):
  ```tsx
  canManageParticipantMedia={canManageWaitingRoom}
  canForceStopScreenShare={canForceStopScreenShare}
  ```
- **GIỮ** `canManageWaitingRoom` trong `room-body` — nó còn dùng cho waiting-room/sidebar, không liên quan task này.

### Bước 5 — `room.tsx`: ngừng truyền `canForceStopScreenShare`

- Xoá dòng `canForceStopScreenShare={canManageWaitingRoom}` trong `<RoomBody>` (L557).
- `canManageWaitingRoom` vẫn truyền cho `RoomBody` như cũ (dùng cho phần khác).

> `handleForceStopScreenShare`, `forcingStopScreenShareParticipantId` và prop `onForceStopScreenShare`/`forcingStopScreenShareParticipantId` **vẫn cần** (đó là handler thực thi, không phải cờ quyền) — đừng xoá.

## Definition of Done

- [ ] `npm run build` + `npm run lint` xanh (TS sẽ báo nếu còn nơi truyền prop đã xoá).
- [ ] `grep -rn "canManageParticipantMedia\|canForceStopScreenShare" src` chỉ còn (nếu có) ở handler thực thi, **không** còn ở chuỗi card/stage/body như cờ quyền.
- [ ] Kiểm thử 2 tab:
  - **Host**: card của người khác có menu mute audio/video + "stop share" (khi họ đang share). Card **của chính host** và card host khác: KHÔNG có mute.
  - **Participant**: không card nào có menu mute/stop-share.
  - Host gạt settings unmute/share **không** ảnh hưởng menu mute trên card (đúng như cũ — 2 cái này độc lập).

## Rủi ro & lưu ý

- **Provider phải bao card.** Mọi nơi render `participant-card` đều nằm trong `room-stage` (trong room) ⇒ đã ở dưới `RoomAbilityProvider` (Task 0 bước 7). Trước khi merge, `grep -rn "ParticipantCard\|participant-card" src` để chắc không có render site nào ngoài room (nếu có sẽ throw "must be used within provider").
- **Đừng nhầm cờ quyền với handler.** Chỉ thay phần *quyết định hiện/ẩn*; giữ nguyên `onMuteParticipantTrack`, `mutingParticipantTrack`, `onForceStopScreenShare`...
- Nếu Task 0 bước 7 bị hoãn: phải mount provider trong task này **trước** Bước 1.

## Rollback

Revert 4 file (`participant-card`, `room-stage`, `room-body`, `room.tsx`). Hạ tầng Task 0 giữ nguyên.
