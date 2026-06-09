# Task 0 — Hạ tầng ability (CASL)

> Phụ thuộc: không · Quy mô: M · Rủi ro: Thấp
> Kết quả: cài CASL, tạo types + 2 factory thuần + provider React, mount provider vào cây room (chưa có consumer nào dùng). **Không đổi UI/hành vi.**

## Mục tiêu

Dựng toàn bộ "đường ray" để Task 1–3 chỉ việc thay điểm tiêu thụ. Sau task này, app chạy y hệt cũ; chỉ có thêm code hạ tầng và một context provider chạy không (no-op).

## File tạo/sửa

| File | Hành động |
|------|-----------|
| `package.json` | + `@casl/ability`, `@casl/react` |
| `src/lib/auth/ability/types.ts` | tạo |
| `src/lib/auth/ability/define-app-ability.ts` | tạo |
| `src/lib/auth/ability/define-room-ability.ts` | tạo |
| `src/lib/auth/ability/index.ts` | tạo (re-export) |
| `src/features/meeting/providers/room-ability-provider.tsx` | tạo |
| `src/features/meeting/providers/index.ts` | + export provider |
| `src/components/meeting/room/room.tsx` | bọc subtree bằng provider |

## Các bước

### 1. Cài package

```bash
npm i @casl/ability @casl/react
```

Cả hai tree-shakeable, không cấu hình thêm, hợp với `output: "standalone"`.

### 2. `src/lib/auth/ability/types.ts`

```ts
import type { MongoAbility } from "@casl/ability";

// ----- Tầng app (USER/ADMIN) -----
export type AppAction = "read" | "manage";
export type AppSubject = "AdminPanel" | "User" | "all";
export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

// ----- Tầng phòng họp (HOST/PARTICIPANT) -----
export type RoomAction =
  | "manageWaitingRoom" // admit / reject / approveAll
  | "kick"
  | "muteTrack"         // mute mic/cam của participant khác
  | "forceStopShare"
  | "endMeeting"
  | "updateSettings"
  | "unmuteSelf"        // tự bật lại mic
  | "shareScreen";

// Subject dạng instance để gắn điều kiện (ABAC)
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

> CASL cần phân biệt subject instance qua field `kind`. Dùng helper `subject("Participant", {...})` của CASL khi check (xem Task 2) để gắn "subject type name" — vẫn truyền object có `kind` để khớp điều kiện.

### 3. `src/lib/auth/ability/define-room-ability.ts`

```ts
import { AbilityBuilder, createMongoAbility } from "@casl/ability";
import type { RoomSettings } from "@/shared/services/meeting/types";
import type { RoomAbility } from "./types";

export type RoomAbilityInput = {
  /** = canManageWaitingRoom (host theo meeting role HOẶC livekit metadata) */
  isHost: boolean;
  /** = localUserCanUseHostMediaControls (host HOẶC sub khớp resolvedHostId) */
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
    // host mute/kick người khác — KHÔNG phải chính mình, KHÔNG mute host khác
    can("kick", "Participant", { isLocal: false });
    can("muteTrack", "Participant", { isLocal: false, isHost: false });
    can("forceStopShare", "Participant", { isLocal: false, isScreenSharing: true });
  }

  // Quyền tự-tác-động: host (qua media controls) HOẶC theo room settings
  if (canUseHostMediaControls || roomSettings.allowParticipantUnmute) {
    can("unmuteSelf", "Meeting");
  }
  if (isHost || roomSettings.allowParticipantShareScreen) {
    can("shareScreen", "Meeting");
  }

  return build();
}
```

**Ánh xạ 1-1 với code hiện tại để bảo toàn hành vi** (đây là phần dễ sai nhất — đối chiếu kỹ):

| Luật CASL | Tương đương hiện tại | Nguồn |
|-----------|----------------------|-------|
| `unmuteSelf` | `canUnmuteMicrophone = localUserCanUseHostMediaControls \|\| allowParticipantUnmute` | [room.tsx:179](../../src/components/meeting/room/room.tsx#L179) |
| `shareScreen` | `canShareScreen = isHost \|\| allowParticipantShareScreen` | [room.tsx:342](../../src/components/meeting/room/room.tsx#L342) |
| `muteTrack` (đk `!isLocal && !isHost`) | `canMuteParticipantMedia && !isLocal && !isHost` | [participant-card.tsx:99](../../src/components/meeting/room/stage/participant-card.tsx#L99) |
| `forceStopShare` (đk `!isLocal && isScreenSharing`) | `canForceStopScreenShare && isScreenSharing && !isLocal` | [participant-card.tsx:111](../../src/components/meeting/room/stage/participant-card.tsx#L111) |
| `manageWaitingRoom`/`endMeeting`/`updateSettings` | `canManageWaitingRoom` | [use-room-identity.ts:46](../../src/features/meeting/room/hooks/use-room-identity.ts#L46) |

### 4. `src/lib/auth/ability/define-app-ability.ts`

```ts
import { AbilityBuilder, createMongoAbility } from "@casl/ability";
import type { AppAbility } from "./types";

export function defineAppAbility(role: Role | null): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (role === "ADMIN") {
    can("manage", "all"); // manage/all ⇒ can("read","AdminPanel") = true
  } else if (role === "USER") {
    can("read", "User");
  }

  return build();
}
```

> `Role` là ambient type toàn cục (`src/types/global.type.ts`), không cần import.

### 5. `src/lib/auth/ability/index.ts`

```ts
export * from "./types";
export { defineAppAbility } from "./define-app-ability";
export { defineRoomAbility } from "./define-room-ability";
```

### 6. Provider React — `src/features/meeting/providers/room-ability-provider.tsx`

```tsx
"use client";

import { createContext, useContext, useMemo } from "react";
import { createContextualCan } from "@casl/react";

import { defineRoomAbility, type RoomAbilityInput } from "@/lib/auth/ability";
import type { RoomAbility } from "@/lib/auth/ability";

const RoomAbilityContext = createContext<RoomAbility | null>(null);

export const Can = createContextualCan(RoomAbilityContext.Consumer);

export function useRoomAbility(): RoomAbility {
  const ability = useContext(RoomAbilityContext);
  if (!ability) {
    throw new Error("useRoomAbility must be used within <RoomAbilityProvider>");
  }
  return ability;
}

type RoomAbilityProviderProps = RoomAbilityInput & {
  children: React.ReactNode;
};

export function RoomAbilityProvider({
  isHost,
  canUseHostMediaControls,
  roomSettings,
  children,
}: RoomAbilityProviderProps) {
  const ability = useMemo(
    () => defineRoomAbility({ isHost, canUseHostMediaControls, roomSettings }),
    // CHỈ 2 cờ settings nằm trong deps — KHÔNG dùng nguyên object roomSettings
    // để tránh rebuild thừa khi tham chiếu đổi mà giá trị không đổi.
    [
      isHost,
      canUseHostMediaControls,
      roomSettings.allowParticipantUnmute,
      roomSettings.allowParticipantShareScreen,
    ],
  );

  return (
    <RoomAbilityContext.Provider value={ability}>
      {children}
    </RoomAbilityContext.Provider>
  );
}
```

Thêm vào `src/features/meeting/providers/index.ts`:

```ts
export * from "./room-ability-provider";
```

### 7. Mount provider trong `room.tsx` (inert — chưa ai dùng)

Trong [`room.tsx`](../../src/components/meeting/room/room.tsx), bọc cây JSX trả về bằng `RoomAbilityProvider`, lấy input từ các giá trị **đã có sẵn** (`canManageWaitingRoom`, `localUserCanUseHostMediaControls` từ `useRoomIdentity`; `roomSettings` đã có trong component):

```tsx
return (
  <RoomAbilityProvider
    isHost={canManageWaitingRoom}
    canUseHostMediaControls={localUserCanUseHostMediaControls}
    roomSettings={roomSettings}
  >
    <RoomLocalVolumeProvider ...>
      {/* ...toàn bộ JSX hiện tại... */}
    </RoomLocalVolumeProvider>
  </RoomAbilityProvider>
);
```

> Mount ở Task 0 để hạ tầng sẵn sàng; vì chưa component nào gọi `useRoomAbility()` nên đây là no-op an toàn. (Có thể hoãn bước 7 sang Task 2 nếu muốn diff Task 0 thuần "không chạm UI".)

## Definition of Done

- [ ] `npm run build` + `npm run lint` xanh.
- [ ] App chạy y hệt — không nút/menu nào đổi (vì chưa có consumer).
- [ ] `defineRoomAbility`/`defineAppAbility` không import gì từ React (factory thuần).

## Rủi ro & lưu ý

- **Đừng đưa logic giải mã token vào factory.** Factory chỉ nhận boolean đã suy ra. Giữ `use-room-identity.ts` là nguồn gốc.
- **Deps của `useMemo`**: đúng 2 cờ settings + 2 boolean host. Sai deps ⇒ Task 3 sẽ "đứng" quyền khi host gạt settings.
- Nếu hoãn bước 7: nhớ rằng Task 2 sẽ throw vì `useRoomAbility` không có provider → phải mount trước khi thêm consumer.

## Rollback

Gỡ 5 file mới + revert `room.tsx`/`providers/index.ts` + `npm rm @casl/ability @casl/react`. Không có thay đổi dữ liệu/hành vi nên rollback sạch.
