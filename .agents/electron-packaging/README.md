# Electron packaging — phân tích & checklist refactor

> Phạm vi: `gg-meet-fe` · Mục tiêu: đóng gói app thành desktop (Electron) · Trạng thái: phân tích + kế hoạch

## TL;DR

**Build được, và `src` gần như không chặn.** Toàn app chỉ có **đúng 2 điểm buộc Node server**; phần còn lại (LiveKit/WebRTC, STOMP, auth localStorage, React Query) chạy tốt trong Chromium của Electron. Có **2 chiến lược**, khác nhau ở mức độ phải tách `src`.

## 1. Inventory: cái gì trong `src` phụ thuộc server

Theo build hiện tại, chỉ 2 route là `ƒ Dynamic`, còn lại `○ Static`:

| Blocker | File | Bản chất | Với desktop |
|---------|------|----------|-------------|
| **API proxy route** | [`api/proxy/.../cancel-join/route.ts`](../../src/app/api/proxy/meetings/[meetingCode]/cancel-join/route.ts) | Route handler Node, forward `navigator.sendBeacon()` (beacon không set được header `Authorization` → đi qua proxy same-origin để gắn auth+cookie). Consumer: [`client.ts:320`](../../src/shared/services/meeting/client.ts#L320), [`cancel-join.ts`](../../src/shared/services/meeting/cancel-join.ts) | Thay bằng gọi backend trực tiếp |
| **`generateMetadata` server-fetch** | [`[meetingCode]/page.tsx`](../../src/app/(main)/[meetingCode]/page.tsx) | `fetch` server-side tới `/meetings/verify` lấy title/OG → khiến route Dynamic | **Vô nghĩa với desktop** (không SEO) → bỏ/đưa client |

**KHÔNG phải blocker:** LiveKit (Chromium có WebRTC), STOMP/SockJS, `useAuthSession`, localStorage access token. Tất cả `/`, `/sign-in`, `/sign-up`, `/admin`, `/profile`, `/schedule` đều static. SEO routes (`robots.ts`, `sitemap.ts`, JsonLd) vô hại nhưng thừa với desktop.

**Auth (điểm cần lưu ý nhất):**
- Access token: `localStorage` (`auth-access-token`) → gửi `Authorization: Bearer` — chạy bình thường trong Electron renderer. Xem [`auth-token.ts`](../../src/lib/auth/auth-token.ts).
- Refresh token: **cookie HTTP-only**; refresh qua `fetch('/auth/refresh', { credentials: 'include' })` [`wrapper.ts:20`](../../src/lib/api/wrapper.ts#L20). Same-origin localhost (Chiến lược A) → chạy. Origin `app://` cross-origin (Chiến lược B) → rắc rối cookie.

## 2. Hai chiến lược

| | **A — Nhúng Next standalone server** | **B — Static export SPA (`app://`)** |
|---|---|---|
| Cách | Electron main spawn `server.js` trên `127.0.0.1:port`, window load `http://127.0.0.1:port` | `output: "export"` → SPA, load qua custom protocol |
| Sửa `src` | **~0** | Vừa: bỏ proxy, bỏ metadata server, đổi routing, rework auth cookie |
| Giữ SSR/metadata/proxy | Có (chạy như web) | Không |
| Auth/cookie | Như web (same-origin) | Phải xử lý lại (cross-origin) |
| Kích thước / khởi động | Nặng / chậm (ship Node + Next server) | Nhẹ / nhanh |
| Hợp khi | PoC nhanh, xác nhận khả thi | Sản phẩm phân phối thật |

## 3. Khuyến nghị (lộ trình theo giai đoạn)

1. **Giai đoạn 1 — PoC Chiến lược A** ([task-a-poc-embed-server.md](task-a-poc-embed-server.md)): gần như chỉ thêm `electron/` + spawn `server.js`. Xác nhận LiveKit, **screen share**, auth chạy trong Electron. Rủi ro thấp, làm trước.
2. **Giai đoạn 2 — chuyển sang SPA nhẹ (Chiến lược B)** nếu cần phân phối, làm 3 refactor `src` đã được thiết kế để tách sạch:
   - [task-b1-config-and-transport.md](task-b1-config-and-transport.md) — runtime config + cancel-join transport (gỡ phụ thuộc proxy + build-time env).
   - [task-b2-static-export-routing.md](task-b2-static-export-routing.md) — bỏ metadata server, đổi `[meetingCode]` → query-based, bật `output: export`.
   - [task-b3-auth-cookie-storage.md](task-b3-auth-cookie-storage.md) — rework refresh-token cookie (rủi ro cao nhất, **cần phối hợp BE**).

## 4. Danh sách task

| # | Task | File | Giai đoạn | Sửa `src`? | Rủi ro |
|---|------|------|-----------|-----------|--------|
| A | PoC nhúng standalone server | [task-a-poc-embed-server.md](task-a-poc-embed-server.md) | 1 | Không (chỉ thêm `electron/`) | Thấp |
| B1 | Runtime config + cancel-join transport | [task-b1-config-and-transport.md](task-b1-config-and-transport.md) | 2 | Có | Trung bình |
| B2 | Static export + routing | [task-b2-static-export-routing.md](task-b2-static-export-routing.md) | 2 | Có | Trung bình |
| B3 | Auth cookie/refresh storage | [task-b3-auth-cookie-storage.md](task-b3-auth-cookie-storage.md) | 2 | Có + **BE** | Cao |

Phụ thuộc: B2 nên sau B1 (B1 gỡ proxy ⇒ B2 mới xoá được route khỏi export). B3 độc lập nhưng là cổng chặn nếu app cần đăng nhập lâu dài.

## 5. Quy ước chung

- **Code Electron** đặt ở `electron/` (main, preload) — **không** trộn vào `src/` (renderer). `src` giữ là renderer dùng chung cho cả web lẫn desktop.
- **Build target gate**: dùng biến môi trường (vd `BUILD_TARGET=desktop`) trong `next.config.ts` để bật `output: "export"` + tắt các nhánh server — **không** fork codebase.
- **Cấm bake URL backend vào bundle**: app phân phối cần đổi backend lúc chạy ⇒ runtime config (B1), không phụ thuộc `NEXT_PUBLIC_*` bake lúc build.
- **CASL đã là dependency** (`@casl/ability`, `@casl/react`) — không liên quan Electron, chỉ lưu ý khi đụng `package.json`.

## 6. Việc ở Electron main (ngoài `src`) — bắt buộc cho cả A và B

- **Screen share**: app có chia sẻ màn hình → phải wiring `setDisplayMediaRequestHandler` → `desktopCapturer` (Chromium trong Electron không tự cấp `getDisplayMedia`). Chi tiết trong task-a §Media.
- **Quyền media**: `session.setPermissionRequestHandler` cho `media` (camera/mic).
- **CSP / network**: cho phép kết nối backend REST + LiveKit WS + STOMP.
- **contextIsolation + preload**: bật `contextIsolation`, `nodeIntegration:false`; mọi cầu nối renderer↔main qua `contextBridge` trong preload.

## Definition of Done (mỗi task)

- [ ] `npm run build` (web target) vẫn xanh — không phá bản web.
- [ ] Build/đóng gói desktop chạy được tới màn hình tương ứng.
- [ ] Kiểm thử thủ công: đăng nhập → tạo/join phòng → **video + mic + screen share** hoạt động trong cửa sổ Electron.
