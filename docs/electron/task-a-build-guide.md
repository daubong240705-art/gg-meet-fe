# Hướng Dẫn Build Electron Production

> ⚠️ **Lỗi thời**: pipeline standalone (Task A) đã bị thay bằng static export + `app://` protocol — xem `docs/desktop-spa-flutter-roadmap/` ở repo root. Các script `build:standalone`, `copy-standalone-assets.mjs`, `electron-after-pack.cjs` không còn tồn tại; build desktop hiện tại dùng `pnpm build:desktop` + `pnpm desktop:pack`. File này giữ lại làm tư liệu lịch sử.

Tài liệu này mô tả cách build app desktop từ bản web Next.js đã deploy thành công. Task A giữ nguyên source web, đóng gói Next standalone server vào Electron, rồi Electron mở app qua `http://127.0.0.1:<port-rảnh>`.

## Kết Quả Build

Pipeline hiện tại tạo ra:

- `pnpm run build:standalone`: build Next production và chuẩn bị `.next/standalone`.
- `pnpm run electron:build`: compile `electron/main.ts`, `electron/preload.ts` vào `dist-electron`.
- `pnpm run desktop:dir`: tạo bản unpacked để test nhanh trong `release/linux-unpacked`.
- `pnpm run desktop:pack`: tạo installer/artifact trong `release`.

Trên Linux, artifact hiện tại là:

```bash
release/Kallio Meet-0.1.0.AppImage
```

## Điều Kiện Trước Khi Build Production

Cần có sẵn các endpoint production truy cập được từ máy người dùng:

- Backend REST API public qua HTTPS, ví dụ `https://api.example.com/api`.
- Meeting SockJS/STOMP endpoint public qua HTTPS, ví dụ `https://api.example.com/server`.
- LiveKit websocket public qua WSS, ví dụ `wss://livekit.example.com`.
- Web production URL, ví dụ `https://meet.example.com`.

Desktop app không nằm trong Docker network, nên không được dùng hostname nội bộ như `backend:8080` cho bản production desktop.

## Env Production Cho Desktop

Tạo file `.env.production.local` ở root repo:

```bash
NEXT_PUBLIC_BACKEND_URL=https://api.example.com/api
NEXT_PUBLIC_MEETING_SOCKET_URL=https://api.example.com/server
NEXT_PUBLIC_WEBSOCKET_URL=wss://livekit.example.com
NEXT_PUBLIC_SITE_URL=https://meet.example.com
NEXT_PUBLIC_GA_ID=

# Desktop production không nên trỏ về Docker hostname nội bộ.
# Có thể bỏ trống biến này, hoặc đặt bằng public backend URL nếu cần server-side route dùng rõ ràng.
BACKEND_INTERNAL_URL=https://api.example.com/api
```

Thay `example.com` bằng domain production đang dùng cho bản web.

### Giải Thích Từng Biến

`NEXT_PUBLIC_BACKEND_URL`

Backend REST API public. Nên kết thúc bằng `/api` vì code đang mặc định backend base URL là API base.

Ví dụ:

```bash
NEXT_PUBLIC_BACKEND_URL=https://api.kallio.example/api
```

`NEXT_PUBLIC_MEETING_SOCKET_URL`

Endpoint SockJS/STOMP cho meeting. Biến này là HTTP(S) endpoint, không phải LiveKit websocket.

Ví dụ:

```bash
NEXT_PUBLIC_MEETING_SOCKET_URL=https://api.kallio.example/server
```

`NEXT_PUBLIC_WEBSOCKET_URL`

LiveKit websocket URL. Production nên dùng `wss://`.

Ví dụ:

```bash
NEXT_PUBLIC_WEBSOCKET_URL=wss://livekit.kallio.example
```

`NEXT_PUBLIC_SITE_URL`

URL của bản web production. Biến này dùng cho SEO, sitemap, robots và metadata. Với desktop, vẫn nên để bằng web URL thật thay vì `localhost`.

Ví dụ:

```bash
NEXT_PUBLIC_SITE_URL=https://meet.kallio.example
```

`BACKEND_INTERNAL_URL`

Bản web/Docker có thể dùng hostname nội bộ như `http://backend:8080/api`. Bản desktop production không nên dùng giá trị đó, vì app chạy trên máy người dùng và không truy cập được Docker network của server.

Khuyến nghị cho desktop:

```bash
BACKEND_INTERNAL_URL=https://api.kallio.example/api
```

Hoặc đảm bảo biến này không tồn tại trong môi trường build/runtime desktop.

`NEXT_PUBLIC_GA_ID`

Google Analytics Measurement ID. Để trống nếu không dùng tracking.

## Lưu Ý Quan Trọng Về `NEXT_PUBLIC`

Tất cả biến `NEXT_PUBLIC_*` được bake vào client bundle tại lúc build. Sau khi đã tạo AppImage/installer, đổi file env sẽ không làm app đã build đổi backend.

Nếu cần đổi backend, websocket, LiveKit:

1. Sửa `.env.production.local`.
2. Chạy lại `pnpm run desktop:pack`.
3. Phát hành lại artifact mới.

Task A chưa có runtime config. Nếu muốn người dùng đổi backend sau khi cài app, cần làm Task B1 trước.

## Backend Cần Cấu Hình Gì Để Desktop Dùng Được

Vì Electron load UI từ `http://127.0.0.1:<port-rảnh>`, backend production cần chấp nhận request từ local origin này.

Kiểm tra các điểm sau ở backend:

- CORS cho phép origin dạng `http://127.0.0.1:<port>`.
- CORS cho phép credentials nếu auth dùng cookie.
- Cookie auth phù hợp với cross-origin request từ Electron đến API domain.
- HTTPS/WSS certificate hợp lệ, không dùng self-signed certificate cho production.
- LiveKit URL public truy cập được từ internet của người dùng.

Nếu bản web production đã chạy nhưng desktop bị lỗi login/cookie, nguyên nhân thường gặp là backend chỉ allow origin của web domain, chưa allow `127.0.0.1` của Electron.

## Lệnh Build Production

Cài dependency:

```bash
corepack enable
pnpm install
```

Kiểm tra code:

```bash
pnpm run lint
pnpm exec tsc --noEmit
```

Build app desktop:

```bash
pnpm run desktop:pack
```

Output:

```bash
release/Kallio Meet-0.1.0.AppImage
release/linux-unpacked
release/latest-linux.yml
```

Nếu chỉ muốn test nhanh trước khi tạo installer:

```bash
pnpm run desktop:dir
```

## Test Sau Khi Build

Chạy AppImage:

```bash
./release/Kallio\ Meet-0.1.0.AppImage
```

Checklist:

- Mở app thành công, không trắng trang.
- Đăng nhập được bằng backend production.
- Refresh app vẫn giữ session nếu auth dùng cookie.
- Tạo phòng hoặc join phòng được.
- Camera và microphone hoạt động.
- Screen share hoạt động. Task A hiện chọn source đầu tiên như PoC; bản product nên làm UI picker riêng ở task sau.
- Chat/socket meeting kết nối được.
- Thoát app xong không còn process Next server bị treo.

Có thể test Next standalone trong output packaged:

```bash
PORT=3021 HOSTNAME=127.0.0.1 node release/linux-unpacked/resources/standalone/server.js
curl -I http://127.0.0.1:3021/sign-in
```

Kết quả mong đợi:

```text
HTTP/1.1 200 OK
```

## Bảo Mật Env Và Artifact

Script `scripts/copy-standalone-assets.mjs` xóa `.env*` khỏi `.next/standalone` trước khi đóng gói, để tránh ship file env local vào app.

Không commit các file env thật:

```bash
.env
.env.local
.env.production.local
```

Nhưng cần nhớ: biến `NEXT_PUBLIC_*` đã được embed vào JS bundle. Không đặt secret vào `NEXT_PUBLIC_*`.

## Cấu Trúc Đóng Gói Hiện Tại

`electron-builder.yml` đang để `asar: false` cho Task A. Lý do: Next standalone server cần filesystem bình thường để resolve `standalone/node_modules` ổn định.

Hook `scripts/electron-after-pack.cjs` làm hai việc:

- Xóa `resources/app/node_modules` do Electron Builder copy thừa.
- Copy `.next/standalone/node_modules` vào `resources/standalone/node_modules`.

Sau build, cấu trúc đúng nên là:

```text
release/linux-unpacked/resources/app/main.js
release/linux-unpacked/resources/app/preload.js
release/linux-unpacked/resources/standalone/server.js
release/linux-unpacked/resources/standalone/node_modules
release/linux-unpacked/resources/standalone/.next/static
release/linux-unpacked/resources/standalone/public
```

## Lỗi Thường Gặp

App build xong nhưng gọi API về localhost:

- Kiểm tra `.env.production.local`.
- Đảm bảo `NEXT_PUBLIC_BACKEND_URL` không còn là `http://localhost:8080/api`.
- Chạy lại `pnpm run desktop:pack`.

Server-side route lỗi khi chạy desktop:

- Kiểm tra `BACKEND_INTERNAL_URL`.
- Desktop production không dùng `http://backend:8080/api`.
- Đặt `BACKEND_INTERNAL_URL` bằng public API URL hoặc xóa biến này khỏi môi trường build/runtime.

Static asset bị 404:

- Kiểm tra `.next/standalone/.next/static`.
- Chạy lại `pnpm run build:standalone`.

Screen share không hiện:

- Kiểm tra `electron/main.ts` có `setDisplayMediaRequestHandler`.
- Task A chỉ là PoC, chưa có UI chọn màn hình/cửa sổ.

AppImage báo thiếu `libfuse.so.2` trên Arch Linux:

- Cài FUSE v2:

```bash
sudo pacman -S fuse2
```

- Chạy lại AppImage:

```bash
./release/Kallio\ Meet-0.1.0.AppImage
```

- Nếu không muốn cài FUSE, chạy bản unpacked đã build:

```bash
./release/linux-unpacked/fe
```

- Hoặc extract AppImage rồi chạy `AppRun`:

```bash
./release/Kallio\ Meet-0.1.0.AppImage --appimage-extract
./squashfs-root/AppRun
```

AppImage build được nhưng cần phát hành thật:

- Thêm icon app.
- Thêm `desktopName`, Linux category.
- Cấu hình code signing/notarization cho macOS và Windows.
- Cân nhắc auto-update nếu phân phối cho người dùng cuối.
