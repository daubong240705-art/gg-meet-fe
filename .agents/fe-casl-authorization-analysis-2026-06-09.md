# Phân tích khả năng áp dụng CASL (authorization) cho `gg-meet-fe`

> Ngày: 2026-06-09 · Phạm vi: frontend (`gg-meet-fe`) · Trạng thái: phân tích + đề xuất hướng áp dụng

## TL;DR (Kết luận nhanh)

- **Có thể áp dụng CASL được**, không vướng kỹ thuật gì: stack (Next.js 16, React 19, TS 5) tương thích hoàn toàn, CASL là thư viện isomorphic chạy được cả ở server (`generateMetadata`, admin guard) lẫn client.
- **Nhưng CASL không bắt buộc.** Tập role hiện tại nhỏ và tĩnh (`ADMIN/USER` ở tầng app, `HOST/PARTICIPANT` ở tầng phòng họp). Lợi ích thật sự của CASL ở dự án này **không phải** là "thêm khả năng phân quyền" mà là:
  1. Gom logic quyền đang **rải rác + truyền prop nhiều tầng** (`canManageWaitingRoom`, `canManageParticipantMedia`, `canForceStopScreenShare`, `canUnmuteMicrophone`, `canEndMeeting`, `isHost`…) về **một nơi**.
  2. Mô tả gọn các quyền **có điều kiện theo thuộc tính** (ABAC) — đây là chỗ CASL toả sáng: ví dụ "host được mute participant *không phải chính mình và không phải host khác*", hay "participant được tự bật mic *chỉ khi* `allowParticipantUnmute = true`".
- **Lưu ý quan trọng:** kiểm tra quyền ở FE chỉ mang tính **trải nghiệm/ẩn-hiện UI**; backend (`ParticipantPermissionService`, `RoomMuteService`, `TargetedMuteService`, meeting JWT) mới là nơi thực thi thật. Dùng CASL ở FE tạo ra **bản sao luật** phải giữ đồng bộ thủ công với BE (BE là Java/Spring nên không share được code CASL).
- **Khuyến nghị:** áp dụng CASL **có chọn lọc, theo từng giai đoạn**, ưu tiên cho khối phòng họp (room) vì đó là nơi luật phức tạp và prop-drilling nặng nhất. Tầng admin (`USER/ADMIN`) chỉ là một guard đơn giản — gói vào CASL cũng được nhưng lợi ích biên thấp.

---

## 1. CASL là gì (ngắn gọn)

[CASL](https://casl.js.org/) là thư viện authorization isomorphic cho JS/TS. Mô hình cốt lõi:

```
ability.can(action, subject, field?)
```

- **action**: hành động (`read`, `update`, `kick`, `mute`…).
- **subject**: đối tượng bị tác động (một loại — `'Meeting'`, `'Participant'` — hoặc một instance kèm thuộc tính).
- **conditions**: luật có thể gắn điều kiện theo thuộc tính của subject (cú pháp kiểu Mongo query), nên hỗ trợ cả **RBAC** (theo vai trò) lẫn **ABAC** (theo thuộc tính).

Các gói liên quan:
- `@casl/ability` — core (định nghĩa & kiểm tra ability).
- `@casl/react` — `<Can>` component + `useAbility`/`createContextualCan` cho React.

---

## 2. Mô hình phân quyền hiện tại của dự án

Dự án đang có **hai phạm vi quyền tách biệt**, khớp với "dual JWT scheme" mô tả trong `CLAUDE.md`.

### 2.1. Tầng ứng dụng — User JWT (`Role = 'ADMIN' | 'USER'`)

- Định nghĩa: [`src/types/global.type.ts`](../gg-meet-fe/src/types/global.type.ts) — `type Role = 'ADMIN' | 'USER'`.
- Nguồn: `useAuthSession()` trong [`src/lib/auth/auth-session.ts`](../gg-meet-fe/src/lib/auth/auth-session.ts) đọc user từ `localStorage` (role lấy từ JWT claim `roles`).
- Nơi kiểm tra:
  - **Admin guard** — [`src/components/admin/admin-dashboard.tsx`](../gg-meet-fe/src/components/admin/admin-dashboard.tsx): `user?.role === "ADMIN"` lặp lại ở nhiều chỗ (`useEffect` redirect, `canLoadAdminData`, 3 nhánh render `AdminAccessState`).
  - Các trang authenticated khác (`/schedule`, `/profile`) chỉ cần `isAuthenticated`, không phân vai trò.

> Đặc điểm: chỉ là một boolean guard `role === 'ADMIN'`. Đơn giản, ít điều kiện.

### 2.2. Tầng phòng họp — Meeting JWT + LiveKit metadata (`HOST | PARTICIPANT`)

Trung tâm là hook [`src/features/meeting/room/hooks/use-room-identity.ts`](../gg-meet-fe/src/features/meeting/room/hooks/use-room-identity.ts), nơi suy ra danh tính + quyền từ meeting token và LiveKit metadata. Các giá trị quyền dẫn xuất:

| Cờ quyền | Ý nghĩa | Cách tính (rút gọn) |
|----------|---------|---------------------|
| `canManageWaitingRoom` | "là host" — admit/reject/kick, mute-all, end meeting, force-stop share, mở menu settings | `localMeetingRole === "HOST" \|\| localRole === "HOST"` |
| `localUserCanUseHostMediaControls` | dùng được điều khiển media của host | `canManageWaitingRoom \|\| (sub === resolvedHostId)` |
| `canUnmuteMicrophone` | được tự bật lại mic | `localUserCanUseHostMediaControls \|\| roomSettings.allowParticipantUnmute` |
| `canShareScreen` | được chia sẻ màn hình | host **hoặc** `roomSettings.allowParticipantShareScreen` |
| `canManageParticipantMedia` | mute mic/cam người khác | `= canManageWaitingRoom`, và mỗi card lọc tiếp `&& !isLocal && !isHost` |
| `canForceStopScreenShare` | buộc dừng share của người khác | `= canManageWaitingRoom`, lọc `&& isScreenSharing && !isLocal` |
| `canEndMeeting` | hiện nút "End for everyone" | `= canManageWaitingRoom` |

Nguồn dữ liệu cho điều kiện ABAC:
- `RoomSettings` (`allowParticipantUnmute`, `allowParticipantShareScreen`) — [`src/shared/services/meeting/types.ts:91`](../gg-meet-fe/src/shared/services/meeting/types.ts#L91). Lưu trong LiveKit room metadata, đổi runtime được (host bật/tắt).
- Thuộc tính participant (`isLocal`, `isHost`, `isScreenSharing`, `isMuted`, `isCameraOff`) dùng trong [`participant-card.tsx`](../gg-meet-fe/src/components/meeting/room/stage/participant-card.tsx).

### 2.3. Vấn đề hiện tại (động lực để dùng CASL)

1. **Prop-drilling sâu**: `canManageWaitingRoom`/`canForceStopScreenShare`/`canManageParticipantMedia` được truyền tay qua `room.tsx → room-body → room-stage → participant-card` và `room.tsx → room-footer → room-footer-controls`. Mỗi component lại khai báo lại prop và default `false`.
2. **Luật điều kiện viết tay, rải rác**: `canUnmuteMicrophone = host || allowUnmute`; `canMuteParticipantMedia = ... && !isLocal && !isHost`; `canStopScreenShare = ... && isScreenSharing && !isLocal`. Cùng "ngôn ngữ quyền" nhưng nằm ở nhiều file, dễ lệch khi thêm tính năng.
3. **Trùng lặp guard admin**: `role === 'ADMIN'` xuất hiện ≥4 lần trong một file.

Đây chính xác là loại bài toán CASL được sinh ra để giải.

---

## 3. Đánh giá: có nên dùng CASL?

### Điểm cộng (phù hợp dự án)
- **Gom luật về một factory** thay vì rải khắp các component → dễ đọc, dễ sửa, dễ test.
- **ABAC theo điều kiện** rất hợp với các luật hiện có (`{ isLocal: false, isHost: false }`, phụ thuộc `roomSettings`). Viết khai báo gọn hơn chuỗi `&&`.
- **Isomorphic**: dùng được cho admin guard chạy server-side và cho `generateMetadata` nếu sau này cần.
- **Ergonomics React**: `<Can I="kick" this={participant}>` hoặc `ability.can(...)` thay cho rừng boolean prop.
- **Typed**: định nghĩa được union `Actions`/`Subjects`, bắt lỗi compile-time.

### Điểm trừ / rủi ro
- **Tập quyền nhỏ & tĩnh** → CASL hơi "quá tay" nếu chỉ để thay vài boolean. Lợi ích chủ yếu là *tổ chức code*, không phải *năng lực mới*.
- **Bản sao luật FE↔BE**: BE (Spring) là nguồn chân lý. CASL ở FE phải tự giữ đồng bộ; nếu lệch chỉ gây sai UI (không phải lỗ hổng bảo mật, vì BE vẫn chặn) nhưng vẫn là nợ kỹ thuật.
- **Thêm dependency + lớp trừu tượng**: đội mới cần học mô hình `subject()/can()`.
- **Reactivity cần làm đúng**: ability phải cập nhật khi `roomSettings` đổi, nếu không UI sẽ "đứng" sai quyền (xem mục 4.4).

### Phán quyết
> **Áp dụng được và đáng làm cho khối phòng họp**, nơi luật phức tạp và prop-drilling nặng. **Tuỳ chọn** cho tầng admin. Không nên "đập đi xây lại" toàn bộ; nên migrate dần, giữ nguyên cách BE thực thi.

---

## 4. Hướng áp dụng chi tiết

### 4.1. Cài đặt

```bash
npm i @casl/ability @casl/react
```

(Không thêm gì cho build; cả hai đều tree-shakeable, hợp với `output: "standalone"`.)

### 4.2. Định nghĩa Actions & Subjects

Tạo `src/lib/auth/ability/types.ts`:

```ts
import type { MongoAbility } from "@casl/ability";

// ----- Tầng app (USER/ADMIN) -----
export type AppAction = "read" | "manage";
export type AppSubject = "AdminPanel" | "User" | "all";
export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

// ----- Tầng phòng họp (HOST/PARTICIPANT) -----
export type RoomAction =
  | "manageWaitingRoom"   // admit / reject / approveAll
  | "kick"
  | "muteTrack"           // mute mic/cam của participant khác
  | "forceStopShare"
  | "endMeeting"
  | "updateSettings"
  | "unmuteSelf"          // tự bật lại mic
  | "shareScreen";

// Subject dạng instance: mô tả participant để gắn điều kiện
export type ParticipantSubject = {
  kind: "Participant";
  isLocal: boolean;
  isHost: boolean;
  isScreenSharing: boolean;
};

export type RoomSubject =
  | "WaitingRoom"
  | "Meeting"
  | "RoomSettings"
  | ParticipantSubject
  | "all";

export type RoomAbility = MongoAbility<[RoomAction, RoomSubject]>;
```

### 4.3. Factory định nghĩa quyền

`src/lib/auth/ability/define-room-ability.ts`:

```ts
import { AbilityBuilder, createMongoAbility } from "@casl/ability";
import type { RoomAbility } from "./types";
import type { RoomSettings } from "@/shared/services/meeting/types";

type RoomAbilityInput = {
  /** = canManageWaitingRoom (host theo meeting role hoặc livekit metadata) */
  isHost: boolean;
  /** = localUserCanUseHostMediaControls (host hoặc khớp hostId) */
  canUseHostMediaControls: boolean;
  roomSettings: RoomSettings;
};

export function defineRoomAbility({
  isHost,
  canUseHostMediaControls,
  roomSettings,
}: RoomAbilityInput): RoomAbility {
  const { can, build } = new AbilityBuilder<RoomAbility>(createMongoAbility);

  if (isHost) {
    can("manageWaitingRoom", "WaitingRoom");
    can("endMeeting", "Meeting");
    can("updateSettings", "RoomSettings");
    // host được mute / kick người khác, KHÔNG phải chính mình, KHÔNG mute host khác
    can("kick", "Participant", { isLocal: false });
    can("muteTrack", "Participant", { isLocal: false, isHost: false });
    can("forceStopShare", "Participant", { isLocal: false, isScreenSharing: true });
  }

  // Quyền tự-tác-động lên bản thân: host (qua media controls) hoặc theo room settings
  if (canUseHostMediaControls || roomSettings.allowParticipantUnmute) {
    can("unmuteSelf", "Meeting");
  }
  if (isHost || roomSettings.allowParticipantShareScreen) {
    can("shareScreen", "Meeting");
  }

  return build();
}
```

`src/lib/auth/ability/define-app-ability.ts`:

```ts
import { AbilityBuilder, createMongoAbility } from "@casl/ability";
import type { AppAbility } from "./types";

export function defineAppAbility(role: Role | null): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (role === "ADMIN") {
    can("manage", "all");          // admin làm mọi thứ
  } else if (role === "USER") {
    can("read", "User");           // (mở rộng dần khi cần)
  }

  return build();
}
```

### 4.4. Cấp ability qua context (React) + giữ reactivity

Điểm mấu chốt: ability phải **đổi theo `roomSettings`** (host bật/tắt cho phép unmute/share runtime). Hai cách:

**Cách A — rebuild bằng `useMemo` (đơn giản, đủ dùng):**

```tsx
// src/features/meeting/providers/room-ability-provider.tsx
"use client";
import { useMemo } from "react";
import { createContextualCan } from "@casl/react";
import { createContext, useContext } from "react";
import { defineRoomAbility } from "@/lib/auth/ability/define-room-ability";
import type { RoomAbility } from "@/lib/auth/ability/types";

const RoomAbilityContext = createContext<RoomAbility>(undefined!);
export const Can = createContextualCan(RoomAbilityContext.Consumer);
export const useRoomAbility = () => useContext(RoomAbilityContext);

export function RoomAbilityProvider({
  isHost, canUseHostMediaControls, roomSettings, children,
}: { /* ...input + children */ }) {
  const ability = useMemo(
    () => defineRoomAbility({ isHost, canUseHostMediaControls, roomSettings }),
    [isHost, canUseHostMediaControls, roomSettings.allowParticipantUnmute, roomSettings.allowParticipantShareScreen],
  );
  return <RoomAbilityContext.Provider value={ability}>{children}</RoomAbilityContext.Provider>;
}
```

> Lưu ý: vì `ability` là instance mới mỗi lần settings đổi, mọi consumer đọc context sẽ re-render — đúng mong muốn. Tránh truyền `ability` xuống các component đã `React.memo` theo tham chiếu prop khác.

**Cách B — instance ổn định + `ability.update(rules)` (tối ưu re-render):** giữ một ability duy nhất, khi settings đổi thì gọi `ability.update(defineRoomAbility(...).rules)`. `@casl/react`'s `useAbility` tự subscribe và chỉ re-render component đang thực sự dùng tới rule thay đổi. Phức tạp hơn, dùng khi đo được vấn đề hiệu năng.

Bọc cây room trong provider tại [`room.tsx`](../gg-meet-fe/src/components/meeting/room/room.tsx), lấy input từ `useRoomIdentity()` + `roomSettings` sẵn có.

### 4.5. Ánh xạ cờ hiện tại → CASL (bảng dịch)

| Hiện tại | Sau khi dùng CASL |
|----------|-------------------|
| `canManageWaitingRoom` (gate waiting room) | `ability.can("manageWaitingRoom", "WaitingRoom")` |
| `canEndMeeting` / nút End for everyone | `ability.can("endMeeting", "Meeting")` |
| menu settings cho host | `ability.can("updateSettings", "RoomSettings")` |
| `canUnmuteMicrophone` | `ability.can("unmuteSelf", "Meeting")` |
| `canShareScreen` | `ability.can("shareScreen", "Meeting")` |
| `canMuteParticipantMedia && !isLocal && !isHost` | `ability.can("muteTrack", subject("Participant", p))` |
| `canStopScreenShare` (`forceStop && isScreenSharing && !isLocal`) | `ability.can("forceStopShare", subject("Participant", p))` |
| admin: `user?.role === "ADMIN"` (×4) | `appAbility.can("read", "AdminPanel")` |

Ví dụ trong `participant-card.tsx`:

```tsx
import { subject } from "@casl/ability";
import { useRoomAbility } from "@/features/meeting/providers/room-ability-provider";

const ability = useRoomAbility();
const p = subject("Participant", {
  kind: "Participant",
  isLocal: participant.isLocal,
  isHost: participant.isHost,
  isScreenSharing: participant.isScreenSharing,
});

const canMuteAudio = ability.can("muteTrack", p) && !participant.isMuted;
const canStopScreenShare = ability.can("forceStopShare", p);
```

→ **Bỏ được** các prop `canManageParticipantMedia` / `canForceStopScreenShare` xuyên suốt `room-body → room-stage → participant-card`. Component chỉ cần `useRoomAbility()`.

Hoặc khai báo trong JSX:

```tsx
<Can I="muteTrack" this={participantSubject}>
  <MuteButton ... />
</Can>
```

### 4.6. Lộ trình migrate theo giai đoạn

1. **Giai đoạn 0 — hạ tầng:** thêm 2 gói, tạo `types.ts` + 2 factory + provider. Chưa đổi UI. Build/lint xanh.
2. **Giai đoạn 1 — admin guard:** thay 4 chỗ `role === 'ADMIN'` trong `admin-dashboard.tsx` bằng `appAbility`. Phạm vi nhỏ, rủi ro thấp, làm "bài tập khởi động".
3. **Giai đoạn 2 — per-participant (lợi nhất):** chuyển `participant-card.tsx` sang `useRoomAbility`, gỡ prop-drilling `canManageParticipantMedia`/`canForceStopScreenShare` ở `room-body`/`room-stage`.
4. **Giai đoạn 3 — self-actions & footer:** map `canUnmuteMicrophone`, `canShareScreen`, `canEndMeeting`, menu settings.
5. **Giai đoạn 4 — dọn dẹp:** xoá các boolean/prop không còn ai dùng; thêm vài unit test cho factory (xem 4.7).

Mỗi giai đoạn độc lập, có thể dừng lại bất cứ lúc nào mà không vỡ phần còn lại.

### 4.7. Test (điểm cộng lớn của factory tập trung)

Vì luật gom về factory thuần (không phụ thuộc React), test cực gọn — dù repo hiện **chưa có test runner** (xác minh bằng `npm run build` + `npm run lint`), factory vẫn dễ thêm test sau:

```ts
const guest = defineRoomAbility({ isHost: false, canUseHostMediaControls: false,
  roomSettings: { allowParticipantUnmute: false, allowParticipantShareScreen: false } });
expect(guest.can("unmuteSelf", "Meeting")).toBe(false);
expect(guest.can("kick", subject("Participant", { kind: "Participant", isLocal: false, isHost: false, isScreenSharing: false }))).toBe(false);

const host = defineRoomAbility({ isHost: true, canUseHostMediaControls: true, roomSettings: {...} });
expect(host.can("muteTrack", subject("Participant", { ...selfLocal, isLocal: true }))).toBe(false); // không mute chính mình
```

---

## 5. Rủi ro & lưu ý khi triển khai

- **FE chỉ là UX, BE mới thực thi.** Đừng coi CASL ở FE là "bảo mật". Mọi action vẫn phải được BE (`ParticipantPermissionService`, meeting JWT, LiveKit metadata) kiểm tra. CASL FE và luật BE phải được cập nhật **cùng lúc** khi thêm tính năng quyền.
- **Giữ `useRoomIdentity` làm nguồn boolean gốc.** CASL nên *tiêu thụ* `isHost`/`canUseHostMediaControls` từ đó, không nên nhồi toàn bộ logic giải mã token vào factory — tách biệt "tôi là ai" (identity) và "tôi được làm gì" (ability).
- **Reactivity của `roomSettings`.** Đảm bảo deps của `useMemo` gồm đúng 2 cờ settings; nếu không, bật/tắt "allow unmute/share" sẽ không phản ánh lên UI.
- **`React.memo` ở `participant-card`.** Card này đã memo hoá; khi bỏ prop `canManage*` và đọc context, kiểm tra lại hàm so sánh memo để không bỏ sót re-render khi ability đổi.
- **Đừng over-engineer admin.** Nếu chỉ có một guard `ADMIN`, gói CASL cho nó là tuỳ chọn; có thể để sau cùng hoặc bỏ qua.

---

## 6. Khuyến nghị cuối

| Hạng mục | Khuyến nghị |
|----------|-------------|
| Có khả thi không? | **Có**, không rào cản kỹ thuật. |
| Nên làm toàn bộ ngay? | **Không.** Migrate dần theo 5 giai đoạn ở mục 4.6. |
| Khu vực ưu tiên | Phòng họp: per-participant media (Giai đoạn 2) → gỡ prop-drilling, lợi ích rõ nhất. |
| Khu vực ưu tiên thấp | Admin guard (đơn giản, lợi ích biên thấp). |
| Bắt buộc nhớ | BE vẫn là nơi thực thi; CASL FE chỉ đồng bộ UX. |

**Kết luận:** Dự án hoàn toàn áp dụng được CASL. Giá trị lớn nhất là **tập trung hoá và mô tả khai báo các luật có điều kiện** ở khối phòng họp, đồng thời **xoá bớt prop-drilling**. Nên triển khai theo lộ trình tăng dần, bắt đầu từ hạ tầng + per-participant, và luôn xem CASL ở FE là lớp trải nghiệm phía trên backend — không thay thế việc thực thi quyền của backend.

