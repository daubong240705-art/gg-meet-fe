# Task 4 — Dọn dẹp + (tuỳ chọn) test

> Phụ thuộc: Task 1, 2, 3 · Quy mô: S · Rủi ro: Thấp
> Kết quả: xoá boolean/prop quyền không còn ai dùng; (tuỳ chọn) dựng test runner + unit test cho factory ability.

## Phần 1 — Dọn dẹp (bắt buộc)

### 1. Quét prop/biến quyền mồ côi

```bash
grep -rn "canManageParticipantMedia\|canForceStopScreenShare\|canManageWaitingRoom\|canUnmuteMicrophone\|canEndMeeting" src
```

Đối chiếu từng kết quả còn lại, phân loại:
- **Giữ**: biến gốc trong `room.tsx` còn nuôi hook (vd `canUnmuteMicrophone` cho hook mic), và `canManageWaitingRoom` còn dùng cho waiting-room/sidebar.
- **Xoá**: bất kỳ prop nào chỉ còn được khai báo mà không nơi nào truyền/đọc (TypeScript thường đã báo, nhưng prop optional `?` có thể lọt — quét tay).

### 2. Kiểm tra `use-room-identity.ts`

Sau Task 2+3, các giá trị này có thể không còn được đọc trực tiếp ở component (đã thay bằng ability):
- `localUserCanUseHostMediaControls` — vẫn cần (làm input cho provider + còn nuôi `canUnmuteMicrophone`). **Giữ.**
- `canManageWaitingRoom` — vẫn là input provider + dùng nhiều nơi. **Giữ.**

⇒ Thực tế `use-room-identity.ts` **không xoá gì** — nó là nguồn gốc. Chỉ xác nhận không còn ai *bỏ qua provider* để đọc cờ rồi tự tính quyền per-participant.

### 3. Xác nhận một nguồn sự thật

`grep -rn "=== \"HOST\"\|!isLocal && !isHost\|isScreenSharing && !isLocal" src` — đảm bảo các biểu thức "ngôn ngữ quyền" per-participant chỉ còn nằm trong `define-room-ability.ts`, không tái xuất hiện ở component.

### DoD phần 1
- [ ] `npm run build` + `npm run lint` xanh.
- [ ] Không còn prop quyền optional mồ côi.
- [ ] Mọi luật điều kiện per-participant tập trung ở `define-room-ability.ts`.

---

## Phần 2 — Test (TUỲ CHỌN nhưng khuyến nghị)

> Repo **chưa có test runner** (xác minh hiện tại chỉ là `npm run build` + `npm run lint`). Factory ability là hàm thuần ⇒ là ứng viên test đầu tiên lý tưởng, chi phí dựng thấp. Việc này trùng với đề xuất "thêm `vitest`" trong phân tích tối ưu thư viện.

### 1. Dựng vitest (nếu đội đồng ý thêm test runner)

```bash
npm i -D vitest
```

Thêm script vào `package.json`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

(Không cần `@testing-library/react` cho factory — factory không phụ thuộc React.)

### 2. `src/lib/auth/ability/define-room-ability.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { subject } from "@casl/ability";
import { defineRoomAbility } from "./define-room-ability";

const settings = (unmute: boolean, share: boolean) => ({
  allowParticipantUnmute: unmute,
  allowParticipantShareScreen: share,
});
const participant = (over: Partial<{ isLocal: boolean; isHost: boolean; isScreenSharing: boolean }> = {}) =>
  subject("Participant", {
    kind: "Participant" as const,
    isLocal: false,
    isHost: false,
    isScreenSharing: false,
    ...over,
  });

describe("defineRoomAbility", () => {
  it("guest: không quyền host, không tự unmute/share khi settings tắt", () => {
    const a = defineRoomAbility({ isHost: false, canUseHostMediaControls: false, roomSettings: settings(false, false) });
    expect(a.can("manageWaitingRoom", "WaitingRoom")).toBe(false);
    expect(a.can("endMeeting", "Meeting")).toBe(false);
    expect(a.can("unmuteSelf", "Meeting")).toBe(false);
    expect(a.can("shareScreen", "Meeting")).toBe(false);
    expect(a.can("muteTrack", participant())).toBe(false);
  });

  it("guest: settings bật ⇒ được tự unmute/share", () => {
    const a = defineRoomAbility({ isHost: false, canUseHostMediaControls: false, roomSettings: settings(true, true) });
    expect(a.can("unmuteSelf", "Meeting")).toBe(true);
    expect(a.can("shareScreen", "Meeting")).toBe(true);
  });

  it("host: quản lý phòng + media người khác, KHÔNG mute chính mình/host khác", () => {
    const a = defineRoomAbility({ isHost: true, canUseHostMediaControls: true, roomSettings: settings(false, false) });
    expect(a.can("manageWaitingRoom", "WaitingRoom")).toBe(true);
    expect(a.can("updateSettings", "RoomSettings")).toBe(true);
    expect(a.can("muteTrack", participant({ isLocal: false, isHost: false }))).toBe(true);
    expect(a.can("muteTrack", participant({ isLocal: true }))).toBe(false);  // chính mình
    expect(a.can("muteTrack", participant({ isHost: true }))).toBe(false);   // host khác
    expect(a.can("forceStopShare", participant({ isScreenSharing: true }))).toBe(true);
    expect(a.can("forceStopShare", participant({ isScreenSharing: false }))).toBe(false);
    expect(a.can("unmuteSelf", "Meeting")).toBe(true); // qua canUseHostMediaControls
  });
});
```

### 3. `src/lib/auth/ability/define-app-ability.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { defineAppAbility } from "./define-app-ability";

describe("defineAppAbility", () => {
  it("ADMIN truy cập admin panel", () => {
    expect(defineAppAbility("ADMIN").can("read", "AdminPanel")).toBe(true);
  });
  it("USER và khách thì không", () => {
    expect(defineAppAbility("USER").can("read", "AdminPanel")).toBe(false);
    expect(defineAppAbility(null).can("read", "AdminPanel")).toBe(false);
  });
});
```

### DoD phần 2
- [ ] `npm run test` xanh.
- [ ] Test phủ: host vs guest, điều kiện `!isLocal && !isHost`, `isScreenSharing`, đảo `roomSettings`, admin guard.

---

## Ghi chú khép vòng

Sau Task 4, mọi luật phân quyền FE nằm ở `src/lib/auth/ability/` và được kiểm thử. Khi BE thêm/sửa luật (vd thêm role, đổi điều kiện mute), **chỉ cần** sửa factory + cập nhật test ở đây — đồng thời nhớ **đồng bộ với BE** (`ParticipantPermissionService`, v.v.), vì FE chỉ là lớp UX, BE mới thực thi.
