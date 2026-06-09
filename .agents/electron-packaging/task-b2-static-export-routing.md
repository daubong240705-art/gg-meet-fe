# Task B2 — Static export + routing

> Giai đoạn 2 · Phụ thuộc: B1 (gỡ phụ thuộc proxy trước) · Sửa `src`: Có · Rủi ro: Trung bình
> Kết quả: bật `output: "export"` cho build desktop → SPA thuần, không Node server. Gỡ 2 thứ chặn export: `generateMetadata` server-fetch và dynamic route `[meetingCode]`.

## Vì sao cần

Static export yêu cầu: **không route handler động**, **không page render server theo request**. Hiện có:
1. [`[meetingCode]/page.tsx`](../../src/app/(main)/[meetingCode]/page.tsx) — `generateMetadata` fetch server ⇒ route Dynamic.
2. [`api/proxy/.../cancel-join/route.ts`](../../src/app/api/proxy/meetings/[meetingCode]/cancel-join/route.ts) — POST route handler ⇒ export báo lỗi.
3. Dynamic segment `[meetingCode]` không có `generateStaticParams` ⇒ export không biết pre-render gì.

## Build target gate

Dùng biến `BUILD_TARGET=desktop` để **một** codebase build cả hai. Sửa [`next.config.ts`](../../next.config.ts):

```ts
const isDesktop = process.env.BUILD_TARGET === "desktop";

const nextConfig: NextConfig = {
  output: isDesktop ? "export" : "standalone",
  allowedDevOrigins,
  ...(isDesktop ? { images: { unoptimized: true } } : {}),
  // export không hỗ trợ rewrites/headers/route handlers động
};
```

Thêm script:
```jsonc
"build:desktop": "cross-env BUILD_TARGET=desktop next build"  // xuất ra ./out
```

---

## 1. `generateMetadata` server → client-only (gỡ blocker #1)

Với desktop **không có SEO**; metadata server là thừa và là thứ khiến route Dynamic.

**Cách làm:** đưa metadata về tĩnh + đặt title ở client.

- Trong [`[meetingCode]/page.tsx`](../../src/app/(main)/[meetingCode]/page.tsx): xoá hàm `getMeetingTitle()` (fetch server) và phần `generateMetadata` phụ thuộc nó. Thay bằng `export const metadata` tĩnh (title fallback + `robots: noindex`), hoặc gate:

```ts
// chỉ giữ metadata động cho web; desktop dùng tĩnh
export const metadata: Metadata = {
  title: { absolute: "Join Meeting on Kallio" },
  robots: { index: false, follow: false },
};
```

- Đặt tiêu đề thật ở client sau khi verify: trong `MeetingPageClient`/room, khi có `meetingTitle`, `document.title = meetingTitle`.

> Nếu muốn **giữ** metadata động cho **web**: tách 2 file qua build target, hoặc để `generateMetadata` chỉ chạy khi `!isDesktop` (nhưng export sẽ vẫn thấy hàm → an toàn nhất là bỏ hẳn cho desktop bằng cách tách). Đơn giản nhất cho PoC desktop: bỏ `generateMetadata`, web chấp nhận title tĩnh trên trang meeting (vốn đã `noindex`).

## 2. Dynamic route `[meetingCode]` → query-based (gỡ blocker #3)

Export không pre-render được code phòng (chưa biết lúc build). **Đổi sang đọc code từ query/hash ở client** — route thành tĩnh hoàn toàn.

**Phương án khuyến nghị:** thêm route tĩnh `/join` đọc `?code=`:

- Tạo `src/app/(main)/join/page.tsx` (client) đọc `useSearchParams().get("code")` rồi render `MeetingPageClient`.
- Trong desktop, mọi nơi điều hướng tới phòng dùng `/join?code=XXX` thay vì `/XXX`.
- Giữ `[meetingCode]` cho **web** (link đẹp + SEO). Gate điều hướng theo `window.desktop?.isElectron`.

> Vì sao không `generateStaticParams`: code phòng vô hạn/không biết trước. Query-based là cách export-friendly sạch nhất, không cần SSR fallback.

## 3. Loại API proxy route khỏi bản export (gỡ blocker #2)

Sau [B1](task-b1-config-and-transport.md), desktop **không** dùng proxy nữa. Nhưng nếu file `route.ts` còn tồn tại, `next build` (export) **vẫn lỗi**. Xử lý:

- **Cách gọn:** trong build desktop, loại thư mục `api/` khỏi build. Vì App Router build theo file-system, cách thực dụng: bước `build:desktop` tạm di chuyển/loại `src/app/api` (script prebuild), hoặc đặt proxy sau cờ và dùng `.gitignore`-style exclude. Đề xuất: script `prebuild:desktop` rename `src/app/api` → `src/app/_api_disabled` rồi `postbuild` đổi lại.
- **Cách sạch hơn (dài hạn):** đưa proxy route ra một app riêng/biến thể web-only. Với mục tiêu desktop trước mắt, dùng cách script là đủ.

> Robots/sitemap (`robots.ts`, `sitemap.ts`) **không** chặn export (chúng sinh file tĩnh) — để yên, vô hại; hoặc gate bỏ cho gọn.

## 4. Nạp `out/` trong Electron qua custom protocol

Export ra `./out` (HTML/JS tĩnh). **Không** dùng `file://` (vỡ đường dẫn asset + fetch). Đăng ký custom protocol chuẩn-secure ở `electron/main.ts`:

```ts
import { protocol } from "electron";
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);
// app.whenReady: protocol.handle("app", (req) => serve file từ ./out)
// window.loadURL("app://local/index.html")
```

Origin ổn định `app://local` rất quan trọng cho cookie/auth ([task-b3](task-b3-auth-cookie-storage.md)).

## Definition of Done

- [ ] `npm run build` (web/standalone) **vẫn xanh** — web giữ `[meetingCode]` + metadata động.
- [ ] `npm run build:desktop` chạy xong, xuất `./out`, **không** lỗi route handler / dynamic param.
- [ ] Electron load `app://local/...`, vào được `/join?code=XXX`, render lobby → room.
- [ ] Title cửa sổ hiển thị tên phòng (đặt client-side).

## Rủi ro & lưu ý

- **Đừng phá web**: tất cả thay đổi phải gate theo `BUILD_TARGET`/`window.desktop`. Web vẫn dùng route đẹp + SSR metadata.
- **Điều hướng nội bộ**: rà mọi `router.push("/" + code)` / `<Link href={`/${code}`}>` để desktop dùng `/join?code=`. (`grep -rn "meetingCode" src/components src/features | grep -i "push\|href\|route"`.)
- **`next/image`**: export cần `images.unoptimized` (đã thêm). Kiểm tra ảnh vẫn hiển thị.
- **Deep link**: nếu cần mở `app://` từ link ngoài, cấu hình thêm — ngoài phạm vi task.

## Rollback

Gate hoá toàn bộ qua `BUILD_TARGET`; revert chỉ cần bỏ nhánh desktop trong `next.config.ts` + xoá `/join` + khôi phục `generateMetadata`. Web không phụ thuộc thay đổi nào.
