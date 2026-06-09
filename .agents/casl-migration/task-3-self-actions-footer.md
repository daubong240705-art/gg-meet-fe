# Task 3 — Self-actions & footer

> Phụ thuộc: Task 0 (nên làm sau Task 2 để quen pattern) · Quy mô: M · Rủi ro: Trung bình
> Kết quả: footer đọc quyền **settings menu** và **end meeting** từ `useRoomAbility()`; (tuỳ chọn) mic-unmute và share-screen. Gỡ prop `isHost` khỏi chuỗi footer.

## ⚠️ Nuance quan trọng trước khi làm

Khác với Task 2 (quyền chỉ dùng ở UI), một số giá trị ở đây **còn được hook logic trong `room.tsx` tiêu thụ**, nên KHÔNG xoá khỏi `room.tsx`:

- `canUnmuteMicrophone` ([room.tsx:179](../../src/components/meeting/room/room.tsx#L179)) còn truyền vào hook mic ([room.tsx:194](../../src/components/meeting/room/room.tsx#L194)) → **giữ** biến này cho hook; chỉ đổi phần *hiển thị* ở footer.
- `canShareScreen` + `isHost` ([room.tsx:342-343](../../src/components/meeting/room/room.tsx#L342)) được truyền vào hook screen-share để hook tự quyết → mapping share-screen nên làm *bên trong* hook đó, ngoài phạm vi cốt lõi task này.

⇒ Task này chia làm **CỐT LÕI (A, B)** — làm chắc; và **TUỲ CHỌN (C, D)** — làm nếu muốn triệt để.

## Chuỗi hiện tại

```
room.tsx → room-footer → room-footer-controls
```

| Cờ | Nơi dùng | Map sang |
|----|----------|----------|
| `isHost` (footer-controls) | settings menu `{isHost ? ... }` [L212](../../src/components/meeting/room/footer/room-footer-controls.tsx#L212) | `updateSettings` / `RoomSettings` |
| `isHost` (footer) | `canEndMeeting={isHost}` cho leave dialog [L195](../../src/components/meeting/room/footer/room-footer.tsx#L195) | `endMeeting` / `Meeting` |
| `canUnmuteMicrophone` (footer-controls) | disable nút mic [L113,L122](../../src/components/meeting/room/footer/room-footer-controls.tsx#L113) | `unmuteSelf` / `Meeting` (tuỳ chọn) |

---

## A. (CỐT LÕI) Settings menu trong `room-footer-controls.tsx`

```tsx
import { useRoomAbility } from "@/features/meeting/providers";

const ability = useRoomAbility();
const canUpdateSettings = ability.can("updateSettings", "RoomSettings");
```

Thay `{isHost ? (` ở L212 bằng `{canUpdateSettings ? (`.

> `updateSettings` chỉ cấp khi `isHost` ⇒ `can("updateSettings","RoomSettings") === isHost`. Tương đương tuyệt đối.

## B. (CỐT LÕI) End meeting trong `room-footer.tsx`

`room-footer` render `RoomLeaveDialog` với `canEndMeeting={isHost}`. Đổi sang ability:

```tsx
import { useRoomAbility } from "@/features/meeting/providers";

const ability = useRoomAbility();
const canEndMeeting = ability.can("endMeeting", "Meeting");
// ...
<RoomLeaveDialog
  open={isLeaveDialogOpen}
  canEndMeeting={canEndMeeting}
  // ...giữ nguyên onLeave/onEndMeeting/isEndingMeeting
/>
```

> `endMeeting` chỉ cấp khi `isHost` ⇒ tương đương `canEndMeeting={isHost}` cũ.

## Dọn prop `isHost` khỏi chuỗi footer (sau A + B)

Sau A+B, `isHost` không còn ai dùng trong footer/footer-controls:

1. `room-footer-controls.tsx`: xoá `isHost` khỏi props type (L35) + destructure (L83). (L212 đã thay ở bước A.)
2. `room-footer.tsx`: xoá `isHost` khỏi props type (L45) + default (L82); xoá dòng truyền `isHost={isHost}` cho controls (L155); L195 đã thay ở bước B.
3. `room.tsx`: xoá `isHost={canManageWaitingRoom}` ở `<RoomFooter>` (L575/580).

> `canManageWaitingRoom` trong `room.tsx` vẫn dùng cho nhiều chỗ khác — **không** xoá biến gốc, chỉ ngừng truyền vào footer.

## C. (TUỲ CHỌN) Mic-unmute hiển thị ở footer

Trong `room-footer-controls.tsx`, đổi nguồn disable nút mic:

```tsx
const canUnmuteSelf = ability.can("unmuteSelf", "Meeting");
// thay canUnmuteMicrophone bằng canUnmuteSelf ở 2 chỗ L113, L122
```

Sau đó có thể xoá prop `canUnmuteMicrophone` khỏi footer & footer-controls.

> **GIỮ** `const canUnmuteMicrophone = ...` trong `room.tsx` — nó vẫn cần cho hook mic (L194). Hai nguồn cùng công thức (`canUseHostMediaControls || allowParticipantUnmute`) nên nhất quán. Nếu thấy "2 nguồn 1 luật" khó chịu, bỏ qua C — đây chỉ là dọn dẹp biên.

## D. (TUỲ CHỌN, thấp) Share-screen

Mapping `shareScreen` nên làm *bên trong* hook screen-share (nơi nhận `isHost` + `canShareScreen`), không phải ở footer. Để lại cho một pass riêng nếu cần — không thuộc DoD task này.

## Definition of Done

- [ ] `npm run build` + `npm run lint` xanh.
- [ ] Không còn `isHost` ở `room-footer.tsx` / `room-footer-controls.tsx`.
- [ ] Kiểm thử 2 tab:
  - **Host**: thấy nút settings (gear) trong footer; mở dialog rời phòng thấy "End for everyone".
  - **Participant**: KHÔNG thấy settings; dialog rời phòng KHÔNG có "End for everyone" (chỉ Leave + Cancel — đúng như task dialog trước).
  - Nút mic disable đúng theo settings host gạt (nếu làm C).

## Rủi ro & lưu ý

- **Đừng xoá `canUnmuteMicrophone`/`canShareScreen` khỏi `room.tsx`** — hook cần. Đây là khác biệt chính so với Task 2.
- Footer & controls đều nằm dưới `RoomAbilityProvider` (render trong room) ⇒ `useRoomAbility()` an toàn.
- Nhớ task "dialog xác nhận rời phòng" trước đó đã đưa `canEndMeeting` vào `RoomLeaveDialog`; bước B chỉ đổi *nguồn* của cờ này, không đổi cấu trúc dialog.

## Rollback

Revert `room.tsx`, `room-footer.tsx`, `room-footer-controls.tsx`.
