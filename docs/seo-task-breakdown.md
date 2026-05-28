# SEO Task Breakdown — Kallio Frontend

> **Phiên bản:** 1.0 | **Ngày:** 2026-05-28 | **Dự án:** Kallio (gg-meet-fe)
> **Nguồn:** Rà soát thực tế FE đối chiếu với [seo-implementation-plan.md](./seo-implementation-plan.md)
> **Mục đích:** Liệt kê chi tiết các task có thể triển khai ngay, kèm task bị block. Chưa bao gồm code.

---

## Mục lục

0. [Tiến độ triển khai](#tiến-độ-triển-khai)
1. [Hiện trạng thực tế (khác với plan gốc)](#1-hiện-trạng-thực-tế-khác-với-plan-gốc)
2. [Phần có thể triển khai ngay](#2-phần-có-thể-triển-khai-ngay)
   - [Nhóm A — Hạ tầng metadata](#nhóm-a--hạ-tầng-metadata)
   - [Nhóm B — Noindex các trang không cần index](#nhóm-b--noindex-các-trang-không-cần-index)
   - [Nhóm C — Refactor client → server wrapper](#nhóm-c--refactor-client--server-wrapper)
   - [Nhóm D — Phụ trợ](#nhóm-d--phụ-trợ)
3. [Phần bị block](#3-phần-bị-block)
4. [Thứ tự triển khai đề xuất](#4-thứ-tự-triển-khai-đề-xuất)

---

## Tiến độ triển khai

| Ngày | Task | Trạng thái | Ghi chú |
|------|------|------------|---------|
| 2026-05-28 | TASK-A1 | Done | Đã nâng cấp metadata trong [`src/app/layout.tsx`](../src/app/layout.tsx): `metadataBase`, title template, description, keywords, canonical, Open Graph, Twitter card, robots, googleBot và icons. `npm run build` pass. `npm run lint` đang fail bởi lỗi cũ không liên quan ở `src/features/meeting/hooks/use-waiting-room-status.ts:206` (`react-hooks/set-state-in-effect`). |
| 2026-05-28 | TASK-A2 | Done | Đã tạo [`src/app/sitemap.ts`](../src/app/sitemap.ts). Sitemap chỉ khai báo `/`, dùng URL tuyệt đối từ `NEXT_PUBLIC_SITE_URL` với fallback `http://localhost:3000`, `changeFrequency: "weekly"`, `priority: 1`. `npm run build` pass và route list có `/sitemap.xml`. |
| 2026-05-28 | TASK-A3 | Done | Đã tạo [`src/app/robots.ts`](../src/app/robots.ts). Robots allow `/`, disallow `/sign-in`, `/sign-up`, `/profile`, `/schedule`, `/admin`, `/api/`, và khai báo sitemap absolute URL. `npm run build` pass và route list có `/robots.txt`. |
| 2026-05-28 | TASK-A4 | Done | Đã thêm `NEXT_PUBLIC_SITE_URL` vào builder `ARG/ENV` trong [`Dockerfile`](../Dockerfile) và `build.args` trong [`docker-compose.yml`](../docker-compose.yml). `docker compose config` pass, render đúng build arg và runtime env. Chưa chạy Docker image build đầy đủ. |
| 2026-05-28 | TASK-B1 | Done | Đã thêm metadata noindex cho `src/app/(main)/sign-in/page.tsx` và `src/app/(main)/sign-up/page.tsx`. `npm run build` pass; build artifact có title `Sign In \| Kallio`, `Sign Up \| Kallio` và robots `noindex, nofollow`. |
| 2026-05-28 | TASK-B2 | Done | Đã thêm metadata noindex tại [`src/app/admin/layout.tsx`](../src/app/admin/layout.tsx) để áp cho `/admin` và các subroute admin. `npm run build` pass; build artifact có title `Admin \| Kallio` và robots `noindex, nofollow`. |
| 2026-05-28 | TASK-B3 | Done | Đã tạo [`src/app/not-found.tsx`](../src/app/not-found.tsx) với UI giống các trạng thái meeting, dùng ảnh [`frog-520.webp`](../public/images/frog-520.webp), CTA về `/`, metadata `Page Not Found` + `noindex, nofollow`. Test production local: `/route-khong-ton-tai/extra` trả HTTP 404 và HTML có ảnh frog + noindex. Lưu ý `/route-khong-ton-tai` một segment hiện bị route `[meetingCode]` bắt như mã phòng nên trả meeting page. |
| 2026-05-28 | TASK-C1 | Done | Đã tách logic client trang chủ sang [`src/components/home/home-page-client.tsx`](../src/components/home/home-page-client.tsx), biến [`src/app/(main)/page.tsx`](../src/app/(main)/page.tsx) thành server component và export metadata trang chủ. `npm run build` pass; HTML trang chủ vẫn có OG/canonical và title `Kallio`. `npm run lint` pass. |
| 2026-05-28 | TASK-C2 | Done | Đã tạo nested layout cho `profile` và `schedule` để đặt metadata noindex mà không refactor client pages. `npm run build` pass; build artifact có title `Profile \| Kallio`, `Schedule Meeting \| Kallio` và robots `noindex, nofollow`. `npm run lint` pass. |
| 2026-05-28 | TASK-C3 | Done | Đã tách meeting page client sang [`src/components/meeting/meeting-page-client.tsx`](../src/components/meeting/meeting-page-client.tsx) và thêm `generateMetadata` trong [`src/app/(main)/[meetingCode]/page.tsx`](../src/app/(main)/[meetingCode]/page.tsx). Endpoint thực tế là `POST /meetings/verify?meetingCode=...`; BE đã xác nhận không cần auth token. Metadata có timeout 2s, fallback `Join Meeting on Kallio`, robots `noindex, nofollow`, OG/Twitter. `npm run build` + `npm run lint` pass. |
| 2026-05-28 | TASK-D1 | Done | Đã chuẩn hóa [`public/og-image.png`](../public/og-image.png) từ 1731×909 về 1200×630, dung lượng còn khoảng 652KB. Metadata khai báo đúng `width: 1200`, `height: 630`, `type: image/png`, `alt`, `og:image:secure_url` và `twitter:image`; URL ảnh có version query `?v=20260528` để bust cache preview. `npm run build` + `npm run lint` pass. |
| 2026-05-28 | TASK-D2 | Done | Đã tạo [`src/lib/seo/jsonld.ts`](../src/lib/seo/jsonld.ts) và [`src/components/seo/JsonLd.tsx`](../src/components/seo/JsonLd.tsx), render WebSite + Organization + SoftwareApplication JSON-LD trong trang chủ. `npm run build` pass; view-source build có `<script type="application/ld+json">`. `npm run lint` pass. |
| 2026-05-28 | TASK-D3 | Done | Đã tạo [`src/lib/seo/site.ts`](../src/lib/seo/site.ts) để dùng chung `getSiteUrl`, `getAbsoluteUrl`, thông số OG image và helper `getOpenGraphImage()` cho root layout, meeting metadata và JSON-LD. |

---

## 1. Hiện trạng thực tế (khác với plan gốc)

Khi rà soát source code, phát hiện một số điểm khác so với mô tả trong [seo-implementation-plan.md](./seo-implementation-plan.md). Các task bên dưới đã điều chỉnh theo hiện trạng thực tế.

| Hạng mục | Plan gốc ghi | Thực tế trong repo |
|----------|-------------|--------------------|
| Cấu trúc route | Phẳng dưới `src/app/` | Các trang public nằm trong route group `(main)/` — đường dẫn thực: `src/app/(main)/page.tsx`, `src/app/(main)/sign-in/page.tsx`, v.v. |
| `NEXT_PUBLIC_SITE_URL` | Chưa có, cần thêm | **Đã có** trong [`.env`](../.env) (dòng 16) và [`.env.example`](../.env.example) (dòng 14) |
| OG image | Cần tạo `og-default.png` 1200×630 | **Đã có** [`public/og-image.png`](../public/og-image.png), đã chuẩn hóa về **1200×630** |
| `/admin` route | Không nhắc tới | Tồn tại (`src/app/admin/`), là **server component** — dễ thêm noindex |
| Dockerfile env vars | Plan giả định cần config | [`Dockerfile`](../Dockerfile) hiện chỉ truyền 3 biến (`NEXT_PUBLIC_BACKEND_URL`, `WEBSOCKET_URL`, `MEETING_SOCKET_URL`), **chưa truyền `NEXT_PUBLIC_SITE_URL`** |
| Page client | Chỉ nhắc `page.tsx` cần refactor | **3 file** đều có `"use client"`: `(main)/page.tsx`, `(main)/[meetingCode]/page.tsx`, `(main)/profile/page.tsx`, `(main)/schedule/page.tsx` — cùng bài toán |

**Hệ quả:**
- TASK-001 trong plan gốc (thêm `NEXT_PUBLIC_SITE_URL`) **không cần làm mới**, chỉ cần đảm bảo nó được truyền qua Docker build.
- Cần thêm các task chưa có trong plan gốc: noindex `/admin`, cập nhật Dockerfile/docker-compose cho `NEXT_PUBLIC_SITE_URL`, noindex `/profile` và `/schedule` bằng cách dùng nested layout (không cần refactor).

---

## 2. Phần có thể triển khai ngay

### Nhóm A — Hạ tầng metadata

> **Mục tiêu nhóm:** Thiết lập nền tảng metadata, sitemap, robots cho toàn app. Có thể làm song song nhóm B. Phải xong trước nhóm C/D.

---

#### TASK-A1: Nâng cấp root layout metadata

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Cung cấp metadata mặc định đầy đủ cho toàn app: `metadataBase`, `title.template`, `openGraph`, `twitter`, `robots`, `alternates.canonical`, `icons` |
| **File cần sửa** | [`src/app/layout.tsx`](../src/app/layout.tsx) |
| **Phụ thuộc** | Không (env var đã sẵn) |
| **Ưu tiên** | High |
| **Độ khó** | Dễ (~30 phút) |
| **Trạng thái** | Done — hoàn tất ngày 2026-05-28 |
| **Đã làm** | Root layout hiện có `metadataBase` từ `NEXT_PUBLIC_SITE_URL` fallback `http://localhost:3000`; `title.default/template` (`%s \| Kallio`); description; `applicationName`; authors; creator; keywords; canonical `/`; Open Graph; Twitter card; robots index/follow; googleBot directives; icon `/favicon.ico`. |
| **Kiểm tra** | `npm run build` pass, HTML build có `og:title`, `twitter:card`, canonical và robots. `npm run lint` chưa pass do lỗi cũ không liên quan ở `use-waiting-room-status.ts:206`. |
| **Ghi chú** | OG image hiện tên `og-image.png` (không phải `og-default.png` như plan gốc) → giữ tên hiện tại. Sau TASK-D1, ảnh thật đã đúng 1200×630 và metadata dùng URL tuyệt đối kèm `secureUrl`, `type`, `width`, `height`, `alt`; URL metadata có query `?v=20260528` để bust cache Zalo/social preview. |
| **Acceptance** | View source `/` thấy đủ `<meta property="og:*">`, `<meta name="twitter:*">`, `<link rel="canonical">`, title template hoạt động (trang con dùng `title: "X"` ra `"X \| Kallio"`) |

---

#### TASK-A2: Tạo `sitemap.ts`

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Google crawler biết URL nào cần crawl |
| **File cần tạo** | `src/app/sitemap.ts` |
| **Routes đưa vào** | Chỉ `/` (priority 1.0, changeFrequency `weekly`) |
| **Phụ thuộc** | Không |
| **Ưu tiên** | High |
| **Độ khó** | Dễ (~15 phút) |
| **Trạng thái** | Done — hoàn tất ngày 2026-05-28 |
| **Đã làm** | Tạo `src/app/sitemap.ts`; chuẩn hóa `NEXT_PUBLIC_SITE_URL` bằng cách trim trailing slash; fallback `http://localhost:3000`; chỉ đưa route `/` vào sitemap với `lastModified`, `changeFrequency: "weekly"`, `priority: 1`. |
| **Kiểm tra** | `npm run build` pass, Next route list có `/sitemap.xml`. `npm run lint` chưa pass do lỗi cũ không liên quan ở `use-waiting-room-status.ts:206`. |
| **Acceptance** | `GET /sitemap.xml` trả XML hợp lệ, URL tuyệt đối lấy từ `NEXT_PUBLIC_SITE_URL` |

---

#### TASK-A3: Tạo `robots.ts`

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Chỉ dẫn crawler về các route private + khai báo sitemap |
| **File cần tạo** | `src/app/robots.ts` |
| **Disallow** | `/sign-in`, `/sign-up`, `/profile`, `/schedule`, `/admin`, `/api/` |
| **Allow** | `/` |
| **Phụ thuộc** | Nên có sau A2 để link sitemap đúng |
| **Ưu tiên** | High |
| **Độ khó** | Dễ (~10 phút) |
| **Trạng thái** | Done — hoàn tất ngày 2026-05-28 |
| **Đã làm** | Tạo `src/app/robots.ts`; allow `/`; disallow `/sign-in`, `/sign-up`, `/profile`, `/schedule`, `/admin`, `/api/`; khai báo `Sitemap: <siteUrl>/sitemap.xml` từ `NEXT_PUBLIC_SITE_URL` đã trim trailing slash, fallback `http://localhost:3000`. |
| **Kiểm tra** | `npm run build` pass, Next route list có `/robots.txt`. `npm run lint` chưa pass do lỗi cũ không liên quan ở `use-waiting-room-status.ts:206`. |
| **Ghi chú** | Thêm `/admin` (plan gốc thiếu) |
| **Acceptance** | `GET /robots.txt` chứa `Sitemap: <siteUrl>/sitemap.xml` và đủ `Disallow:` |

---

#### TASK-A4: Bổ sung `NEXT_PUBLIC_SITE_URL` vào Dockerfile + docker-compose

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Đảm bảo URL production được bake vào build Docker image |
| **File cần sửa** | [`Dockerfile`](../Dockerfile), [`docker-compose.yml`](../docker-compose.yml) |
| **Việc** | Thêm `ARG NEXT_PUBLIC_SITE_URL` + `ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL` trong stage `builder`. Trong docker-compose thêm vào `build.args` |
| **Phụ thuộc** | Không |
| **Ưu tiên** | High (block deploy đúng URL) |
| **Độ khó** | Dễ (~10 phút) |
| **Trạng thái** | Done — hoàn tất ngày 2026-05-28 |
| **Đã làm** | Thêm `ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000` và `ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}` trong builder stage của `Dockerfile`; thêm `NEXT_PUBLIC_SITE_URL` vào `build.args` của `docker-compose.yml`. Runtime env đã có sẵn nên giữ nguyên. |
| **Kiểm tra** | `docker compose config` pass và render `build.args.NEXT_PUBLIC_SITE_URL: http://localhost:3000` cùng `environment.NEXT_PUBLIC_SITE_URL`. Chưa chạy Docker image build đầy đủ. |
| **Acceptance** | Build image với `--build-arg NEXT_PUBLIC_SITE_URL=https://kallio.yourdomain.com` → metadata trang chủ ra URL production, không phải `localhost` |

---

### Nhóm B — Noindex các trang không cần index

> **Mục tiêu nhóm:** Đảm bảo các trang auth, private, admin không bị Google index. Có thể làm song song nhóm A.

---

#### TASK-B1: Noindex `/sign-in` và `/sign-up`

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Google không index trang auth |
| **File cần sửa** | [`src/app/(main)/sign-in/page.tsx`](../src/app/(main)/sign-in/page.tsx), [`src/app/(main)/sign-up/page.tsx`](../src/app/(main)/sign-up/page.tsx) |
| **Điều kiện kỹ thuật** | Cả 2 file là **server component** → `export const metadata` trực tiếp được, không cần refactor |
| **Việc** | Export `metadata` với `title` + `robots: { index: false, follow: false }` |
| **Phụ thuộc** | Nên có sau A1 (để dùng title template) |
| **Ưu tiên** | Medium |
| **Độ khó** | Dễ (~10 phút cả 2 file) |
| **Trạng thái** | Done — hoàn tất ngày 2026-05-28 |
| **Đã làm** | Export `metadata` trực tiếp trong `sign-in/page.tsx` và `sign-up/page.tsx`; title lần lượt là `Sign In`, `Sign Up`; robots `index: false`, `follow: false`. |
| **Kiểm tra** | `npm run build` pass. Build artifact có `<title>Sign In \| Kallio</title>`, `<title>Sign Up \| Kallio</title>` và `<meta name="robots" content="noindex, nofollow">`. `npm run lint` chưa pass do lỗi cũ không liên quan ở `use-waiting-room-status.ts:206`. |
| **Acceptance** | View source mỗi trang có `<meta name="robots" content="noindex, nofollow">` + `<title>Sign In \| Kallio</title>` |

---

#### TASK-B2: Noindex `/admin`

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Google không index trang admin |
| **File cần sửa** | [`src/app/admin/layout.tsx`](../src/app/admin/layout.tsx) (đặt ở layout để áp cho mọi subroute admin sau này) |
| **Điều kiện kỹ thuật** | Server component → export `metadata` trực tiếp |
| **Việc** | Thêm `export const metadata` với robots noindex + title "Admin" |
| **Phụ thuộc** | Sau A1 |
| **Ưu tiên** | Medium |
| **Độ khó** | Dễ (~5 phút) |
| **Trạng thái** | Done — hoàn tất ngày 2026-05-28 |
| **Đã làm** | Export `metadata` trong `src/app/admin/layout.tsx` với title `Admin` và robots `index: false`, `follow: false`, áp cho admin layout và các subroute bên dưới. |
| **Kiểm tra** | `npm run build` pass. Build artifact của `/admin` có `<title>Admin \| Kallio</title>` và `<meta name="robots" content="noindex, nofollow">`. `npm run lint` chưa pass do lỗi cũ không liên quan ở `use-waiting-room-status.ts:206`. |
| **Acceptance** | View source `/admin` có meta robots noindex |

---

#### TASK-B3: Tạo `not-found.tsx`

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Trang 404 trả đúng HTTP status, noindex, có CTA quay về trang chủ |
| **File cần tạo** | `src/app/not-found.tsx` |
| **Yêu cầu** | Server component; export `metadata` với robots noindex; UI có heading 404, mô tả ngắn, nút về `/` |
| **Phụ thuộc** | Sau A1 |
| **Ưu tiên** | Medium |
| **Độ khó** | Dễ (~30 phút bao gồm UI) |
| **Trạng thái** | Done — hoàn tất ngày 2026-05-28 |
| **Đã làm** | Tạo `src/app/not-found.tsx`; server component export `metadata` với title `Page Not Found` và robots noindex/nofollow; UI dùng `Homeheader`, bố cục centered giống `MeetingStatusView`, ảnh `/images/frog-520.webp`, mô tả ngắn và nút `Go to homepage`. |
| **Kiểm tra** | `npm run build` pass. Test production local với `npm run start -- -p 3010`: `/route-khong-ton-tai/extra` trả HTTP 404, HTML có `<title>Page Not Found \| Kallio</title>`, robots `noindex, nofollow`, và `/images/frog-520.webp`. Lưu ý `/route-khong-ton-tai` một segment hiện khớp route động `[meetingCode]` nên không vào 404. |
| **Acceptance** | `curl -I <siteUrl>/route-khong-ton-tai/extra` trả HTTP 404; view source có meta noindex. Lưu ý route một segment như `/route-khong-ton-tai` hiện được xử lý bởi `[meetingCode]`, không phải app-level 404. |

---

### Nhóm C — Refactor client → server wrapper

> **Mục tiêu nhóm:** Cho phép các trang có metadata SEO mà vẫn giữ logic client. Cần cẩn thận với hydration. Phải sau nhóm A (cần root layout chuẩn).

---

#### TASK-C1: Refactor `(main)/page.tsx` thành server component

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Xóa `"use client"` khỏi trang chủ để export metadata tĩnh được render trong HTML |
| **File cần sửa** | [`src/app/(main)/page.tsx`](../src/app/(main)/page.tsx) |
| **File cần tạo** | `src/components/home/home-page-client.tsx` |
| **Việc** | Move 11 dòng client logic (`useAuthSession` + ternary `<AuthenticatedHome />` / `<GuestHome />`) sang `HomePageClient`. `page.tsx` thành server component, render `<HomePageClient />`, export `metadata` cho trang chủ |
| **Rủi ro** | Có thể flicker guest → authenticated lần đầu render (hydration). Hiện tại đã có hành vi này nên không tệ hơn, nhưng cần xác nhận khi test |
| **Phụ thuộc** | Sau A1 |
| **Ưu tiên** | High |
| **Độ khó** | Trung bình (~1 giờ) |
| **Trạng thái** | Done — hoàn tất ngày 2026-05-28 |
| **Đã làm** | Tạo `src/components/home/home-page-client.tsx` chứa `useAuthSession` và logic chọn `<AuthenticatedHome />` / `<GuestHome />`; xóa `"use client"` khỏi `src/app/(main)/page.tsx`; page server render `<HomePageClient />`; export metadata trang chủ với title absolute `Kallio` và canonical `/`. |
| **Kiểm tra** | `npm run build` pass. HTML build của `/` có `<title>Kallio</title>`, canonical và `og:title`. `npm run lint` pass. Logic client trang chủ giữ nguyên vị trí trong `HomePageClient`, nên hành vi guest/authenticated không đổi về mặt code path. |
| **Acceptance** | `curl -s <siteUrl>/ \| grep og:title` ra giá trị; UI hoạt động như cũ (guest và authenticated user đều render đúng) |

---

#### TASK-C2: Noindex `/profile` và `/schedule` qua nested layout

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Áp dụng `robots: noindex` cho 2 trang private mà **không phải refactor** logic client |
| **File cần tạo** | `src/app/(main)/profile/layout.tsx`, `src/app/(main)/schedule/layout.tsx` |
| **Cách làm** | Mỗi layout là server component, chỉ chứa `export const metadata` với robots noindex + title, và render `{children}` |
| **Lý do chọn nested layout thay vì refactor page** | 2 trang này nội dung không có giá trị SEO; không cần `generateMetadata` động → layout đủ. Tiết kiệm ~1 giờ refactor mỗi page |
| **Phụ thuộc** | Sau A1 |
| **Ưu tiên** | Medium |
| **Độ khó** | Dễ (~15 phút cả 2) |
| **Trạng thái** | Done — hoàn tất ngày 2026-05-28 |
| **Đã làm** | Tạo `src/app/(main)/profile/layout.tsx` với title `Profile` + robots noindex/nofollow; tạo `src/app/(main)/schedule/layout.tsx` với title `Schedule Meeting` + robots noindex/nofollow. Cả hai layout chỉ render `{children}` nên giữ nguyên logic client trong page hiện tại. |
| **Kiểm tra** | `npm run build` pass. Build artifact của `/profile` có `<title>Profile \| Kallio</title>` + `<meta name="robots" content="noindex, nofollow">`; `/schedule` có `<title>Schedule Meeting \| Kallio</title>` + robots noindex/nofollow. `npm run lint` pass. |
| **Acceptance** | View source `/profile` và `/schedule` có meta robots noindex |

---

#### TASK-C3: Refactor `(main)/[meetingCode]/page.tsx` + `generateMetadata`

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Cho phép preview đẹp khi share link meeting (Zalo/Discord/Slack hiển thị tên cuộc họp) |
| **File cần sửa** | [`src/app/(main)/[meetingCode]/page.tsx`](../src/app/(main)/[meetingCode]/page.tsx) |
| **File cần tạo** | `src/components/meeting/meeting-page-client.tsx` |
| **Việc** | Move toàn bộ logic hiện tại (`useParams`, `useVerifyMeeting`, `useMeetingPageState`, render Lobby/Room/StatusView) sang `MeetingPageClient`. Server component giữ shell + `generateMetadata({ params })` |
| **`generateMetadata` logic** | Gọi endpoint thực tế `POST ${BACKEND_INTERNAL_URL hoặc NEXT_PUBLIC_BACKEND_URL}/meetings/verify?meetingCode={code}` lấy `title`, fallback `Join Meeting on Kallio` nếu lỗi. Wrap try/catch + timeout 2s + `next: { revalidate: 0 }`. Set `robots: noindex`, OG và Twitter metadata |
| **Cần xác nhận với backend** | Done — BE đã xác nhận endpoint verify không cần auth token |
| **Rủi ro** | API chậm/lỗi → TTFB tăng. Cần `try/catch` + timeout ngắn (~2s) |
| **Phụ thuộc** | Sau A1 |
| **Ưu tiên** | High (theo plan gốc, social sharing là mục tiêu chính cùng với landing) |
| **Độ khó** | Trung bình–khó (~2-3 giờ) |
| **Trạng thái** | Done — hoàn tất ngày 2026-05-28 |
| **Đã làm** | Move toàn bộ logic client cũ từ route page sang `src/components/meeting/meeting-page-client.tsx`; `src/app/(main)/[meetingCode]/page.tsx` trở thành server component, resolve params, render `<MeetingPageClient />`, và export `generateMetadata`. Metadata fetch dùng endpoint verify public, không gửi auth token, timeout 2s, fallback tĩnh, robots noindex/nofollow, canonical theo meeting code, OG/Twitter image absolute từ `NEXT_PUBLIC_SITE_URL`. |
| **Kiểm tra** | `npm run build` pass. `npm run lint` pass. Test production local `/seo-test-code`: HTML có `<title>Join Meeting on Kallio</title>`, description fallback, `<meta name="robots" content="noindex, nofollow">`, OG/Twitter title và OG URL. Khi backend trả title thật, metadata sẽ dùng title đó. |
| **Acceptance** | Paste link meeting vào Discord → preview hiện tên cuộc họp (nếu API public) hoặc fallback "Join Meeting on Kallio"; view source có meta noindex |

---

### Nhóm D — Phụ trợ

---

#### TASK-D1: Chuẩn hóa OG image về 1200×630

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Preview chuẩn kích thước, không bị crop kỳ lạ trên Facebook/Zalo/Twitter |
| **File cần thay** | [`public/og-image.png`](../public/og-image.png) |
| **Hiện trạng** | Done — ảnh hiện là 1200×630, PNG RGB, khoảng 652KB |
| **Hai lựa chọn** | (a) Designer làm lại đúng 1200×630 với logo + tagline; (b) Tự resize bằng ImageMagick `convert -resize 1200x630^ -gravity center -extent 1200x630` (chấp nhận có thể bị crop) |
| **Phụ thuộc** | Không block các task khác (đã có ảnh tạm) |
| **Ưu tiên** | Medium (chất lượng visual) |
| **Độ khó** | Designer task hoặc 15 phút nếu tự xử lý |
| **Trạng thái** | Done — hoàn tất ngày 2026-05-28 |
| **Đã làm** | Resize bằng ImageMagick về 1200×630; thêm helper metadata dùng URL tuyệt đối, `secureUrl`, `type: image/png`, `width`, `height`, `alt`; root layout và meeting metadata đều dùng helper này. OG image URL có version query `?v=20260528` để crawler lấy ảnh mới sau deploy. |
| **Kiểm tra** | `file public/og-image.png` trả `1200 x 630`; `npm run build` pass; HTML build có `og:image`, `og:image:secure_url`, `og:image:type`, `og:image:width`, `og:image:height`, `og:image:alt`, `twitter:image`. `npm run lint` pass. |
| **Acceptance** | Facebook Sharing Debugger hiện ảnh full, không crop logo/text |

---

#### TASK-D2: JSON-LD schema cho trang chủ

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Google hiểu Kallio là gì (rich results: WebSite + Organization + SoftwareApplication) |
| **File cần tạo** | `src/lib/seo/jsonld.ts`, `src/components/seo/JsonLd.tsx` |
| **File cần sửa** | `src/app/(main)/page.tsx` (render `<JsonLd>` cùng `<HomePageClient />`) |
| **Phụ thuộc** | **Sau TASK-C1** (cần page.tsx là server component) |
| **Ưu tiên** | Medium |
| **Độ khó** | Trung bình (~1-2 giờ) |
| **Trạng thái** | Done — hoàn tất ngày 2026-05-28 |
| **Đã làm** | Tạo builders `buildWebSiteSchema`, `buildOrganizationSchema`, `buildSoftwareApplicationSchema` trong `src/lib/seo/jsonld.ts`; tạo component server `JsonLd` để render `<script type="application/ld+json">` an toàn bằng `JSON.stringify(...).replace(/</g, "\\u003c")`; render 3 schema trong `src/app/(main)/page.tsx` trước `<HomePageClient />`. |
| **Kiểm tra** | `npm run build` pass. HTML build của `/` có 3 script JSON-LD với `@type`: `WebSite`, `Organization`, `SoftwareApplication`. `npm run lint` pass. |
| **Acceptance** | Google Rich Results Test pass cho `/`; view source có `<script type="application/ld+json">` |

---

#### TASK-D3: Helper canonical URL (optional)

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Helper tái sử dụng cho canonical/absolute URL trong metadata các trang tương lai |
| **File cần tạo** | `src/lib/seo/site.ts` |
| **Phụ thuộc** | Không |
| **Ưu tiên** | **Low** (hiện chỉ 1 trang public → giá trị thấp, có thể skip hoặc làm khi cần) |
| **Độ khó** | Dễ (~10 phút) |
| **Trạng thái** | Done — hoàn tất ngày 2026-05-28 |
| **Đã làm** | Tạo `src/lib/seo/site.ts` với `getSiteUrl`, `getAbsoluteUrl`, constants site/OG image và `getOpenGraphImage()`; tái sử dụng trong root layout, meeting metadata và JSON-LD. |
| **Acceptance** | Hàm `getAbsoluteUrl(path)` trả URL tuyệt đối đúng |

---

## 3. Phần bị block

Các task sau **không thể triển khai ngay** vì phụ thuộc bên ngoài. Liệt kê để theo dõi.

| Task | Lý do block | Điều kiện mở khóa |
|------|------------|-------------------|
| Google Analytics 4 | Cần GA4 Measurement ID từ user/team | User cung cấp ID |
| Google Search Console | Cần deploy production + verify domain ownership | Sau khi deploy production và có quyền DNS/meta tag verify |

---

## 4. Thứ tự triển khai đề xuất

| Sprint | Thời lượng | Tasks | Kết quả |
|--------|-----------|-------|---------|
| **Sprint 1** | ~2-3h | A1 → A2 → A3 → A4 → B1 → B2 → B3 → C2 | Trang chủ có metadata cơ bản; sitemap + robots OK; sign-in/sign-up/admin/profile/schedule đều noindex; 404 page có |
| **Sprint 2** | ~2-3h | C1 → D2 | Trang chủ là server component, metadata đầy đủ, JSON-LD pass Rich Results |
| **Sprint 3** | ~3h | C3 | Meeting page có OG preview hiển thị tên cuộc họp khi share |
| **Parallel / sau** | — | GA, GSC | Hoàn thiện analytics + index monitoring |

**Tổng effort thực tế** (không tính design + GA + GSC): **~6-8 giờ dev**.

---

## Phụ lục — Mapping với plan gốc

| Task plan gốc | Task tài liệu này | Khác biệt |
|---------------|-------------------|----------|
| TASK-001 (env var) | **Bỏ** | Đã có sẵn, thay bằng A4 (Docker config) |
| TASK-002 (root layout) | A1 | Giữ nguyên |
| TASK-003 (refactor page.tsx) | C1 | Đường dẫn thực: `(main)/page.tsx` |
| TASK-004 (sitemap) | A2 | Giữ nguyên |
| TASK-005 (robots) | A3 | Thêm `/admin` |
| TASK-006 (OG image) | D1 | Đã chuẩn hóa ảnh hiện có về 1200×630 |
| TASK-007 (meeting metadata) | C3 | Đường dẫn `(main)/[meetingCode]`; cần verify endpoint |
| TASK-008 (noindex auth) | B1 | Giữ nguyên |
| TASK-009 (noindex private) | C2 | **Đổi cách làm:** dùng nested layout thay vì refactor page → tiết kiệm thời gian |
| TASK-010 (JSON-LD) | D2 | Giữ nguyên, phải sau C1 |
| TASK-011 (404) | B3 | Giữ nguyên |
| TASK-012 (GA) | **Block** | Cần ID |
| TASK-013 (GSC) | **Block** | Sau deploy |
| **Mới** | B2 | Noindex `/admin` (plan gốc thiếu) |
| **Mới** | A4 | Cập nhật Dockerfile cho `NEXT_PUBLIC_SITE_URL` |
