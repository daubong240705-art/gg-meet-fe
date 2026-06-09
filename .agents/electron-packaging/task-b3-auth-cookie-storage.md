# Task B3 — Auth cookie/refresh storage (desktop)

> Giai đoạn 2 · Phụ thuộc: B2 (origin `app://` ổn định) · Sửa `src`: Có + **cần phối hợp Backend** · Rủi ro: **Cao**
> Kết quả: phiên đăng nhập (access + refresh) chạy bền trong app desktop origin `app://`, không phụ thuộc cookie HTTP-only cross-origin của trình duyệt.

## Vì sao đây là phần khó nhất

Cơ chế hiện tại ([wrapper.ts](../../src/lib/api/wrapper.ts), [auth-token.ts](../../src/lib/auth/auth-token.ts), [auth-session.ts](../../src/lib/auth/auth-session.ts)):

| Token | Lưu ở | Cách gửi | Trong Electron `app://` |
|-------|-------|----------|------------------------|
| Access token | `localStorage` (`auth-access-token`) | header `Authorization: Bearer` | ✅ chạy (localStorage có) |
| Refresh token | **cookie HTTP-only** (BE set) | `fetch('/auth/refresh', { credentials:'include' })` [wrapper.ts:20](../../src/lib/api/wrapper.ts#L20) | ⚠️ **vấn đề** |

Origin `app://local` gọi backend cross-origin: để trình duyệt (Chromium của Electron) tự gửi cookie HTTP-only cần `SameSite=None; Secure` + CORS `Access-Control-Allow-Credentials: true` + BE allow origin `app://local`. Electron xử lý cookie cho custom protocol khá khó tính → dễ "đăng nhập xong nhưng refresh thất bại, văng ra `/sign-in`".

⇒ Có **2 hướng**. Chọn 1.

---

## Hướng 1 — Giữ cookie, cấu hình cho chạy cross-origin *(ít sửa FE, nhiều cấu hình)*

### FE
- Mọi request auth đã có `credentials:"include"` (giữ nguyên).
- Đảm bảo origin desktop **ổn định** (`app://local`, từ B2) — không dùng `file://`.

### Backend (phối hợp)
- Cookie refresh: `SameSite=None; Secure; HttpOnly`.
- CORS: thêm `app://local` vào `CORS_ALLOWED_ORIGINS`; bật `Access-Control-Allow-Credentials: true`.

### Electron main
- Đăng ký scheme `app` là `secure` (đã làm ở B2 `registerSchemesAsPrivileged`) để cookie `Secure` được chấp nhận.
- Có thể cần `session.cookies` cho phép cookie bên thứ ba cho origin này.

### Rủi ro
- Hành vi cookie cross-scheme của Electron không đảm bảo giữa các phiên bản; khó debug. Nếu refresh chập chờn → chuyển Hướng 2.

---

## Hướng 2 — Bỏ cookie cho desktop, lưu refresh token bằng `safeStorage` *(robust, cần BE trả token + sửa FE)*

Ý tưởng: trên desktop, refresh token **không** nằm trong cookie mà do app tự giữ (mã hoá ở main qua `safeStorage`), và gửi tường minh khi refresh.

### Backend (phối hợp)
- Endpoint login/refresh **trả refresh token trong body** (ngoài việc set cookie cho web). Hoặc thêm biến thể nhận refresh token qua header/body cho client desktop.
- `/auth/refresh` chấp nhận refresh token qua body/header (vd `X-Refresh-Token`) bên cạnh đường cookie hiện có.

### Electron main + preload
- `safeStorage.encryptString/decryptString` lưu refresh token vào file ở `userData`.
- Preload lộ API:
  ```ts
  contextBridge.exposeInMainWorld("desktop", {
    isElectron: true,
    config: { /* B1 */ },
    auth: {
      getRefreshToken: () => ipcRenderer.invoke("auth:getRefresh"),
      setRefreshToken: (t: string | null) => ipcRenderer.invoke("auth:setRefresh", t),
    },
  });
  ```

### FE — trừu tượng hoá storage refresh

Tạo `src/lib/auth/refresh-store.ts`:

```ts
const isDesktop = () => typeof window !== "undefined" && window.desktop?.isElectron === true;

export async function getRefreshToken(): Promise<string | null> {
  if (isDesktop()) return (await window.desktop!.auth!.getRefreshToken()) ?? null;
  return null; // web: cookie HTTP-only, FE không đọc trực tiếp
}
export async function setRefreshToken(token: string | null): Promise<void> {
  if (isDesktop()) await window.desktop!.auth!.setRefreshToken(token);
  // web: BE set cookie, no-op
}
```

### FE — sửa luồng refresh trong `wrapper.ts`

Trong `refreshToken()` ([wrapper.ts:17-23](../../src/lib/api/wrapper.ts#L17)): nếu desktop, gửi refresh token tường minh thay vì dựa cookie:

```ts
const refreshToken = async (): Promise<string | null> => {
  const headers: Record<string, string> = {};
  if (isDesktop()) {
    const rt = await getRefreshToken();
    if (!rt) return null;
    headers["X-Refresh-Token"] = rt;
  }
  const res = await fetch(`${backendBaseUrl}/auth/refresh`, {
    method: "POST",
    headers,
    credentials: isDesktop() ? "omit" : "include", // desktop không dùng cookie
  });
  // ...lấy access token (như cũ) + nếu BE trả refresh token mới: setRefreshToken(newRt)
};
```

### FE — lưu refresh token khi login

Trong [`auth-session.ts`](../../src/lib/auth/auth-session.ts) `syncAuthUserFromLogin()` / nơi nhận `LoginResponseData`: nếu desktop và response có refresh token → `await setRefreshToken(rt)`. Khi logout (`clearStoredAuthUser`) → `setRefreshToken(null)`.

> Access token vẫn ở localStorage như cũ cho cả hai nền tảng — không đổi.

---

## So sánh & khuyến nghị

| | Hướng 1 (cookie) | Hướng 2 (safeStorage) |
|---|---|---|
| Sửa FE | Rất ít | Vừa (refresh-store + wrapper + auth-session) |
| Sửa BE | Cấu hình cookie/CORS | Trả refresh token trong body + nhận qua header |
| Độ bền | Phụ thuộc Electron cookie | Cao, chủ động |
| Bảo mật token | HttpOnly (JS không đọc) | Mã hoá OS-level (safeStorage), nhưng renderer chạm được qua IPC |

**Khuyến nghị:** thử **Hướng 1** trước (rẻ); nếu refresh không ổn định trong Electron thì chuyển **Hướng 2**. Cả hai đều **bắt buộc phối hợp BE** — đây là điểm cần chốt với team backend sớm.

## Definition of Done

- [ ] Đăng nhập trong app desktop → ở lại phiên qua **access-token hết hạn** (refresh tự động thành công, không văng `/sign-in`).
- [ ] Tắt/mở lại app → vẫn đăng nhập (refresh token persisted).
- [ ] Logout xoá sạch token (localStorage + refresh store/cookie).
- [ ] Web **không đổi**: vẫn dùng cookie HTTP-only như cũ (mọi nhánh desktop gate bằng `window.desktop?.isElectron`).

## Rủi ro & lưu ý

- **BE là nguồn chân lý phiên** — mọi thay đổi token phải khớp BE; đừng tự ý đổi format.
- **Đừng để rò token**: nếu Hướng 2, refresh token đi qua IPC tới renderer → giữ tối thiểu thời gian trong bộ nhớ renderer, không log.
- **Gate chặt theo nền tảng**: web tuyệt đối không được rẽ vào nhánh desktop (không có `window.desktop`).
- **Liên quan B1b**: cancel-join gọi thẳng backend cũng cần CORS allow `app://local` — gộp chung khi chốt cấu hình BE.

## Rollback

Revert `wrapper.ts`, `auth-session.ts`, xoá `refresh-store.ts` + API auth trong preload/main. Web dùng cookie như cũ, không ảnh hưởng.
