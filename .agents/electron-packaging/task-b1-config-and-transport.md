# Task B1 — Runtime config + cancel-join transport

> Giai đoạn 2 · Phụ thuộc: (nên sau Task A để có `window.desktop`) · Sửa `src`: Có · Rủi ro: Trung bình
> Kết quả: backend URL đọc **lúc chạy** (không bake), và cancel-join **không còn phụ thuộc API proxy route**. Đây là 2 bước nền để Chiến lược B (static export) khả thi.

## Vì sao cần

- **B1a — runtime config:** `NEXT_PUBLIC_*` bị bake vào bundle lúc `next build` ([api-url.ts:27](../../src/lib/config/api-url.ts#L27)). App desktop phân phối cần trỏ tới backend cấu hình được sau khi cài → phải đọc config lúc chạy.
- **B1b — cancel-join transport:** beacon gửi qua proxy same-origin [`/api/proxy/.../cancel-join`](../../src/shared/services/meeting/cancel-join.ts) vì `sendBeacon` không set được `Authorization`. Static export **không** có route handler ⇒ phải bỏ phụ thuộc proxy.

---

## B1a — Runtime config adapter

### 1. Nguồn config lúc chạy

Trong Electron, `preload.ts` (đã có ở Task A) lộ config từ main:

```ts
// electron/preload.ts
import { contextBridge } from "electron";
contextBridge.exposeInMainWorld("desktop", {
  isElectron: true,
  config: {
    backendUrl: process.env.KALLIO_BACKEND_URL ?? "",
    websocketUrl: process.env.KALLIO_LIVEKIT_WS_URL ?? "",
    meetingSocketUrl: process.env.KALLIO_MEETING_SOCKET_URL ?? "",
  },
});
```

> `main.ts` đọc các biến này từ file config cạnh app (vd `app.getPath('userData')/config.json`) — cho phép đổi backend mà không build lại.

### 2. Cho `api-url.ts` ưu tiên runtime config

Sửa [`api-url.ts`](../../src/lib/config/api-url.ts) — thêm một lớp đọc `window.desktop?.config` **trước** khi fallback về `process.env.NEXT_PUBLIC_*`:

```ts
type DesktopConfig = { backendUrl?: string; websocketUrl?: string; meetingSocketUrl?: string };

const desktopConfig = (): DesktopConfig | null => {
  if (typeof window === "undefined") return null;
  return (window as unknown as { desktop?: { config?: DesktopConfig } }).desktop?.config ?? null;
};

export const getBackendBaseUrl = () => {
  if (typeof window === "undefined") {
    return process.env.BACKEND_INTERNAL_URL
      ?? process.env.NEXT_PUBLIC_BACKEND_URL
      ?? DEFAULT_INTERNAL_BACKEND_URL;
  }
  // Desktop: runtime config thắng; Web: như cũ
  return desktopConfig()?.backendUrl?.trim()
    || process.env.NEXT_PUBLIC_BACKEND_URL
    || DEFAULT_PUBLIC_BACKEND_URL;
};
```

Tương tự cho `getLiveKitWebsocketUrl()` và nhánh explicit trong `getMeetingSocketHttpUrl()`.

> Web build: `window.desktop` không tồn tại ⇒ rơi về đúng hành vi cũ. **Không** đổi hành vi web.

### 3. Khai báo type cho `window.desktop`

Thêm vào `src/types/global.type.ts` (ambient):

```ts
declare global {
  interface Window {
    desktop?: {
      isElectron: boolean;
      config?: { backendUrl?: string; websocketUrl?: string; meetingSocketUrl?: string };
    };
  }
}
```

---

## B1b — Cancel-join transport adapter

### Hiện trạng

- [`cancel-join.ts`](../../src/shared/services/meeting/cancel-join.ts): `getCancelJoinProxyUrl()` trả `/api/proxy/...` + `normalizeCancelJoinRequest()`.
- [`client.ts:320`](../../src/shared/services/meeting/client.ts#L320): block dùng `navigator.sendBeacon(proxyUrl, ...)`.

### Mục tiêu

Tách một hàm `sendCancelJoin()` với 2 đường:
- **Web** (mặc định): giữ nguyên `sendBeacon` → proxy route (beacon đáng tin khi unload).
- **Desktop**: gọi **thẳng backend** với `fetch(backendUrl, { method:"POST", keepalive:true, headers:{ Authorization }, body })`. Electron không bị ràng buộc CORS như web nên gọi trực tiếp được; `keepalive` cho phép request sống qua lúc đóng cửa sổ.

### Sửa `cancel-join.ts`

```ts
import { getBackendBaseUrl } from "@/lib/config/api-url";

const isDesktop = () => typeof window !== "undefined" && window.desktop?.isElectron === true;

export function sendCancelJoin(meetingCode: string, payload: Record<string, number | string>, accessToken?: string) {
  const body = JSON.stringify(payload);

  if (isDesktop()) {
    const url = `${getBackendBaseUrl().replace(/\/+$/, "")}/meetings/${encodeURIComponent(meetingCode)}/cancel-join`;
    return fetch(url, {
      method: "POST",
      keepalive: true,
      headers: {
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body,
      credentials: "include",
    }).then(() => true).catch(() => false);
  }

  // Web: proxy + beacon (giữ nguyên hành vi)
  return navigator.sendBeacon(
    `/api/proxy/meetings/${encodeURIComponent(meetingCode)}/cancel-join`,
    new Blob([body], { type: "application/json" }),
  );
}
```

Trong [`client.ts`](../../src/shared/services/meeting/client.ts#L320), thay block sendBeacon trực tiếp bằng `sendCancelJoin(...)`. Giữ `normalizeCancelJoinRequest()` như cũ để dựng payload.

> **Lưu ý quan trọng:** giữ đường web nguyên vẹn. Chỉ desktop mới rẽ nhánh. Vậy sau B1, **web vẫn cần** proxy route — route chỉ được gỡ khỏi *bản export desktop* ở [task-b2](task-b2-static-export-routing.md).

## Definition of Done

- [ ] `npm run build` (web) xanh; hành vi web cancel-join + URL resolution **không đổi** (kiểm thử: refresh giữa lobby/waiting room vẫn gửi cancel-join qua proxy).
- [ ] Trong Electron (Task A shell): `window.desktop.config.backendUrl` được `api-url.ts` dùng; cancel-join gọi thẳng backend (xác nhận bằng network log / BE log).
- [ ] Đổi `KALLIO_BACKEND_URL` ở config → app trỏ backend mới **không** cần build lại bundle.

## Rủi ro & lưu ý

- **`NEXT_PUBLIC_*` vẫn bị bake**: sau B1, web vẫn dùng env bake (đúng), desktop dùng runtime config. Đừng xoá nhánh `process.env.NEXT_PUBLIC_*` — nó là fallback của web.
- **keepalive 64KB limit**: payload cancel-join nhỏ nên an toàn; codebase đã có guard tương tự ở [wrapper.ts](../../src/lib/api/wrapper.ts) — theo cùng nguyên tắc.
- **CORS phía BE cho desktop**: gọi trực tiếp từ origin `app://` cần BE cho phép (liên quan [task-b3](task-b3-auth-cookie-storage.md) §CORS).

## Rollback

Revert `api-url.ts`, `cancel-join.ts`, `client.ts`, `global.type.ts`. Proxy route giữ nguyên nên web không ảnh hưởng.
