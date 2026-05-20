# SEO Implementation Plan — Kallio Frontend

> **Phiên bản:** 1.0 | **Ngày:** 2026-05-19 | **Dự án:** Kallio (gg-meet-fe)  
> **Stack:** Next.js 16.2.1 · React 19 · TypeScript 5 · App Router  
> **Tác giả:** Phân tích tự động từ source code thực tế

---

## Mục lục

1. [Mục tiêu SEO](#1-mục-tiêu-seo)
2. [Phân tích hiện trạng](#2-phân-tích-hiện-trạng)
3. [Kiến trúc SEO đề xuất](#3-kiến-trúc-seo-đề-xuất)
4. [Kế hoạch triển khai](#4-kế-hoạch-triển-khai)
5. [Danh sách task](#5-danh-sách-task)
6. [Cấu trúc file đề xuất](#6-cấu-trúc-file-đề-xuất)
7. [Ví dụ code](#7-ví-dụ-code)
8. [Checklist nghiệm thu](#8-checklist-nghiệm-thu)
9. [Rủi ro và lưu ý](#9-rủi-ro-và-lưu-ý)
10. [Kết luận](#10-kết-luận)

---

## 1. Mục tiêu SEO

### 1.1 SEO dùng để làm gì trong dự án này

Kallio là ứng dụng video meeting, **không phải content site**. Người dùng không tìm kiếm từng cuộc họp cụ thể trên Google. Tuy nhiên SEO vẫn có giá trị thiết thực ở hai lớp:

| Lớp | Mục tiêu | Ví dụ |
|-----|---------|-------|
| **Brand SEO** | Khi người dùng tìm "kallio video meeting" hoặc "kallio meet" thì trang chủ xuất hiện đúng và đẹp | Landing page `/` |
| **Social SEO** | Khi host chia sẻ link cuộc họp qua Zalo/Discord/Slack thì preview card hiển thị đúng tiêu đề, mô tả, ảnh | `/[meetingCode]` |

### 1.2 Trang nào nên Google index

| Route | Loại | Nên index? | Lý do |
|-------|------|-----------|-------|
| `/` | Public, Landing page | **Có** | Trang marketing chính của sản phẩm |
| `/sign-in` | Auth | **Không** | Không có giá trị SEO, tránh trùng lặp |
| `/sign-up` | Auth | **Không** | Tương tự sign-in |
| `/[meetingCode]` | Dynamic, semi-public | **Không** | Nội dung thay đổi theo thời gian, không phù hợp index; nhưng cần **social preview** đẹp |
| `/profile` | Private (yêu cầu đăng nhập) | **Không** | Nội dung cá nhân |
| `/schedule` | Private (yêu cầu đăng nhập) | **Không** | Yêu cầu đăng nhập |
| `/api/*` | API proxy | **Không** | Không phải trang HTML |

**Kết luận:** Chỉ duy nhất trang `/` cần được Google index đầy đủ. Các trang còn lại cần `noindex` hoặc không cần quan tâm (vì có auth redirect).

### 1.3 Lợi ích kỳ vọng

- **Trang chủ:** Xuất hiện trên Google khi tìm "kallio meet", "video meeting app", v.v.
- **Social sharing:** Khi paste link `/abc-xyz-123` vào Zalo/Discord/Facebook, preview hiển thị "Kallio – Join [Meeting Title]" thay vì URL trần.
- **Brand trust:** Favicon đúng, title đúng trên tab trình duyệt.
- **Performance:** Trang chủ load nhanh hơn (SSR + metadata tĩnh).

---

## 2. Phân tích hiện trạng

### 2.1 Cấu trúc router hiện tại

```
src/app/
├── layout.tsx                          ← Root layout (metadata cơ bản)
├── page.tsx                            ← Trang chủ ("use client" - VẤN ĐỀ SEO)
├── globals.css
├── favicon.ico                         ← Có favicon
├── sign-in/
│   └── page.tsx                        ← Server component (OK)
├── sign-up/
│   └── page.tsx                        ← Chưa kiểm tra
├── profile/
│   └── page.tsx                        ← Protected route
├── schedule/
│   └── page.tsx                        ← Protected route
├── [meetingCode]/
│   └── page.tsx                        ← "use client", dynamic route
└── api/
    └── proxy/meetings/[meetingCode]/
        └── cancel-join/route.ts        ← API route (không cần SEO)
```

**Không có:**
- `sitemap.ts`
- `robots.ts`
- `not-found.tsx`
- `error.tsx`
- `opengraph-image.*`
- `manifest.json`

### 2.2 Trạng thái metadata hiện tại

**Root layout** (`src/app/layout.tsx`):
```typescript
export const metadata: Metadata = {
  title: "Kallio",
  description: "Professional video meetings made simple",
};
```

**Thiếu hoàn toàn:**
- `metadataBase` — URL gốc (bắt buộc để canonical và OG URL đúng)
- `openGraph` — Facebook/Zalo preview không có ảnh, description
- `twitter` — Twitter/X card
- `robots` — Không có chỉ thị index/noindex toàn cục
- `icons` — Chỉ có favicon.ico tự động, chưa config đầy đủ
- `alternates.canonical` — Không có canonical URL

**Các trang con:** Không có bất kỳ `metadata` hoặc `generateMetadata` nào.

### 2.3 Vấn đề nghiêm trọng: "use client" trên page.tsx

**File:** `src/app/page.tsx` dòng 1:
```typescript
"use client"; // ← CHẶN metadata generation
```

Trong Next.js App Router, **không thể** export `metadata` hoặc `generateMetadata` từ một Client Component. Hiện tại trang chủ không có metadata SEO nào cả vì lý do này.

**Nguyên nhân:** `page.tsx` dùng `useAuthSession()` — một hook client-side. Cần tách logic này ra component con.

### 2.4 Kiểm tra sitemap, robots, canonical

| Artifact | Tồn tại? | Vị trí cần tạo |
|---------|---------|--------------|
| `sitemap.xml` | **Không** | `src/app/sitemap.ts` |
| `robots.txt` | **Không** | `src/app/robots.ts` |
| Canonical URL | **Không** | `metadata.alternates.canonical` |
| OG image | **Không** | `public/og-default.png` + `src/app/opengraph-image.tsx` |

### 2.5 Kiểm tra ảnh và performance

- **`public/images/`:** Có 4 ảnh (bye1.png, frog.png, tom.png, waitting.png) — không phải ảnh content, không cần alt SEO
- **`public/avatars/`:** Avatar người dùng — không cần SEO
- **Trang chủ (`GuestHome`):** Không có `<img>` hay `<Image>` — hero section chỉ có text và icon từ lucide-react
- **next/image:** Chưa dùng cho bất kỳ ảnh nào trên landing page
- **LCP:** Hero section là text H1 — thường tốt cho LCP

### 2.6 Kiểm tra heading structure

**Trang chủ (`main.hero-section.tsx`):**
```html
<h1>Connect, collaborate, anywhere you are</h1>
```

**Features section (`main.features-section.tsx`):**
```html
<h2>Everything you need for great meetings</h2>
<h3>HD Video & Audio</h3>
<h3>Team Collaboration</h3>
<!-- ... 4 h3 nữa -->
```

**Nhận xét:** Cấu trúc heading H1 → H2 → H3 đúng chuẩn. Tuy nhiên không có từ khóa target trong H1.

### 2.7 URL structure

- `/` — Tốt
- `/[meetingCode]` — Code như `abc-xyz-123` — không SEO-friendly nhưng chấp nhận được vì không cần index
- `/sign-in`, `/sign-up`, `/profile`, `/schedule` — Tốt, ngắn gọn

### 2.8 Tổng kết gap phân tích

| Hạng mục | Trạng thái | Mức độ nghiêm trọng |
|---------|-----------|-------------------|
| Root metadata (title + desc) | Có, cơ bản | Thấp |
| `metadataBase` | **Thiếu** | Cao |
| OpenGraph tags | **Thiếu** | Cao |
| Twitter Card | **Thiếu** | Trung bình |
| `sitemap.ts` | **Thiếu** | Cao |
| `robots.ts` | **Thiếu** | Trung bình |
| Page-level metadata | **Thiếu** | Cao |
| `"use client"` trên page.tsx | **Vấn đề** | Cao |
| OG default image | **Thiếu** | Cao |
| JSON-LD schema | **Thiếu** | Trung bình |
| Canonical URL | **Thiếu** | Trung bình |
| `not-found.tsx` | **Thiếu** | Thấp |
| Analytics | **Thiếu** | Thấp |

---

## 3. Kiến trúc SEO đề xuất

### 3.1 Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────┐
│  src/app/layout.tsx  (Root metadata — mặc định)     │
│  - metadataBase                                     │
│  - title template: "%s | Kallio"                    │
│  - description mặc định                             │
│  - OG image mặc định                                │
│  - robots: index, follow (mặc định cho public)      │
└────────────────────┬────────────────────────────────┘
                     │ Override theo từng page
          ┌──────────┼──────────────────┐
          ▼          ▼                  ▼
   /  (index)   /[meetingCode]    /sign-in, /sign-up
   Static       generateMetadata  noindex
   metadata     noindex           Static metadata
```

### 3.2 Phân tầng metadata

**Tầng 1 — Root layout** (`src/app/layout.tsx`):
Định nghĩa giá trị mặc định cho toàn bộ app. Mọi page không override sẽ kế thừa.

**Tầng 2 — Static page metadata**:
Dùng `export const metadata: Metadata = {...}` trong `page.tsx` khi nội dung tĩnh.
Áp dụng cho: `/`, `/sign-in`, `/sign-up`.

**Tầng 3 — Dynamic metadata**:
Dùng `export async function generateMetadata({params})` khi cần fetch data.
Áp dụng cho: `/[meetingCode]` (nếu muốn fetch tên cuộc họp).

### 3.3 Title template

```typescript
// Root layout
title: {
  default: "Kallio",
  template: "%s | Kallio",
}
```

Kết quả:
- Trang chủ: `"Kallio"` (dùng `default`)
- Trang sign-in: `"Đăng nhập | Kallio"`
- Meeting: `"[Meeting Title] | Kallio"`

### 3.4 Cấu hình noindex theo trang

| Trang | Cấu hình |
|-------|---------|
| `/sign-in` | `robots: { index: false, follow: false }` |
| `/sign-up` | `robots: { index: false, follow: false }` |
| `/profile` | `robots: { index: false, follow: false }` |
| `/schedule` | `robots: { index: false, follow: false }` |
| `/[meetingCode]` | `robots: { index: false, follow: false }` |
| `/` | Mặc định (index: true) |

### 3.5 Yêu cầu về biến môi trường

Cần thêm một biến môi trường mới:

```env
# .env.local (dev)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Production
NEXT_PUBLIC_SITE_URL=https://kallio.yourdomain.com
```

Biến này bắt buộc để:
- `metadataBase` — resolve URL tuyệt đối cho OG image, canonical
- `sitemap.ts` — tạo URL đầy đủ
- `robots.ts` — link sitemap

---

## 4. Kế hoạch triển khai

### 4.1 Refactor page.tsx để hỗ trợ metadata

**Vấn đề gốc rễ:** `src/app/page.tsx` có `"use client"` vì dùng `useAuthSession()`.

**Giải pháp:** Tách client logic ra component con, để `page.tsx` là Server Component.

```
Trước:                        Sau:
page.tsx (client)             page.tsx (server) → metadata OK
  └─ useAuthSession()           └─ HomePageClient.tsx (client)
  └─ <AuthenticatedHome />            └─ useAuthSession()
  └─ <GuestHome />                    └─ <AuthenticatedHome />
                                      └─ <GuestHome />
```

**File cần tạo mới:**
- `src/components/home/home-page-client.tsx`

**File cần sửa:**
- `src/app/page.tsx` — xóa `"use client"`, thêm metadata, render `<HomePageClient />`

### 4.2 Sitemap

**Approach:** Dùng `src/app/sitemap.ts` (Next.js built-in).

**Routes tĩnh cần đưa vào sitemap:**
- `/` — priority: 1.0, changeFrequency: "weekly"

**Routes không đưa vào:**
- `/sign-in`, `/sign-up` — noindex
- `/profile`, `/schedule` — private
- `/[meetingCode]` — dynamic, noindex
- `/api/*` — API route

**Vì dự án không có content pages (blog, articles, events)**, sitemap sẽ rất nhỏ. Chỉ cần sitemap tĩnh, không cần dynamic sitemap.

### 4.3 Robots.txt

**Approach:** Dùng `src/app/robots.ts`.

**Chính sách:**
- Cho phép Googlebot index `/` 
- Chặn các route private và auth
- Khai báo sitemap URL

### 4.4 Open Graph và Social Sharing

**Cần tạo:**
1. `public/og-default.png` — OG image mặc định (1200×630px)
2. Cấu hình `openGraph` trong root layout
3. Cấu hình `twitter` card trong root layout
4. Override OG riêng cho meeting page (tên cuộc họp)

**Nội dung gợi ý cho `og-default.png`:**
- Background tối (dark theme)
- Logo Kallio lớn ở trung tâm
- Tagline: "Professional video meetings made simple"
- Kích thước: 1200×630px (chuẩn Facebook/OG)

### 4.5 Open Graph cho Meeting Page (`/[meetingCode]`)

Meeting page là **noindex** nhưng vẫn cần OG preview khi chia sẻ link.

**Approach:** Dùng `generateMetadata` để fetch tên cuộc họp từ API.

```
/abc-xyz-123 chia sẻ lên Zalo
→ Preview: "Join 'Team Weekly Standup' on Kallio"
→ Description: "You've been invited to a video meeting. Click to join."
→ Image: og-default.png
```

**Xử lý lỗi khi API fail:** Dùng metadata fallback tĩnh.

### 4.6 JSON-LD Structured Data

**Schema phù hợp cho Kallio:**

| Trang | Schema | Lý do |
|-------|--------|-------|
| `/` | `WebSite` | Brand, name, sitelinks searchbox |
| `/` | `Organization` | Thông tin công ty/sản phẩm |
| `/` | `SoftwareApplication` | Mô tả app meeting |

**Không nên dùng:**
- `Article` — Không có bài viết
- `Event` — Meeting không phải event public
- `Product` — Không bán sản phẩm vật lý
- `BreadcrumbList` — Trang chủ không có breadcrumb

### 4.7 Technical SEO

| Hạng mục | Hiện trạng | Hành động |
|---------|-----------|---------|
| H1 trang chủ | "Connect, collaborate, anywhere you are" | Tốt, giữ nguyên |
| H2 trang chủ | "Everything you need for great meetings" | Tốt |
| Alt text ảnh | Không có ảnh nào trên landing | Không cần làm |
| next/image | Chưa dùng | Áp dụng nếu thêm ảnh content |
| Mobile responsive | Tailwind CSS — Tốt | Kiểm tra Lighthouse |
| 404 page | Chưa có `not-found.tsx` | Tạo mới |
| Canonical URL | Chưa có | Thêm vào metadata |
| i18n | Không có | Không cần làm |
| Lazy loading | Không có ảnh nặng | Không cần làm ngay |

---

## 5. Danh sách task

### PHASE 1 — Nền tảng (Cao - Làm trước)

---

#### TASK-001: Thêm `NEXT_PUBLIC_SITE_URL` vào environment

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Cung cấp canonical domain để metadata, sitemap, OG URL đúng |
| **File cần chỉnh** | `.env.local`, `.env.production`, `docker-compose.yml` (env vars), `.env.example` |
| **Ưu tiên** | **High** |
| **Độ khó** | Dễ (5 phút) |
| **Kết quả** | Biến `NEXT_PUBLIC_SITE_URL` available ở client và server |
| **Checklist** | `process.env.NEXT_PUBLIC_SITE_URL` trả về đúng URL trong build log |

---

#### TASK-002: Nâng cấp root layout metadata

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Metadata mặc định đầy đủ: title template, OG, Twitter, metadataBase |
| **File cần chỉnh** | `src/app/layout.tsx` |
| **Ưu tiên** | **High** |
| **Độ khó** | Dễ (30 phút) |
| **Kết quả** | Mọi trang kế thừa title template "%s \| Kallio", OG image mặc định |
| **Checklist** | View Source trang chủ có `<meta property="og:image">`, `<meta name="twitter:card">`, `<link rel="canonical">` |

---

#### TASK-003: Refactor `src/app/page.tsx` thành Server Component

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Xóa `"use client"` khỏi page.tsx để có thể export metadata |
| **File cần chỉnh** | `src/app/page.tsx` (sửa), tạo mới `src/components/home/home-page-client.tsx` |
| **Ưu tiên** | **High** |
| **Độ khó** | Trung bình (1-2 giờ) |
| **Kết quả** | `page.tsx` là Server Component, metadata tĩnh được render trong HTML |
| **Checklist** | `curl -s https://kallio.yourdomain.com/ \| grep "og:title"` trả về giá trị |

---

#### TASK-004: Tạo `src/app/sitemap.ts`

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Google crawler biết trang nào cần crawl |
| **File cần chỉnh** | Tạo mới `src/app/sitemap.ts` |
| **Ưu tiên** | **High** |
| **Độ khó** | Dễ (20 phút) |
| **Kết quả** | `GET /sitemap.xml` trả về XML hợp lệ với URL trang chủ |
| **Checklist** | Mở `https://kallio.yourdomain.com/sitemap.xml` trong browser, XML hợp lệ |

---

#### TASK-005: Tạo `src/app/robots.ts`

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Hướng dẫn crawler trang nào index, trang nào không |
| **File cần chỉnh** | Tạo mới `src/app/robots.ts` |
| **Ưu tiên** | **High** |
| **Độ khó** | Dễ (15 phút) |
| **Kết quả** | `GET /robots.txt` trả về đúng chỉ thị, link sitemap |
| **Checklist** | Mở `/robots.txt`, kiểm tra `Disallow:` đúng, có `Sitemap:` URL |

---

### PHASE 2 — Social Sharing (Cao)

---

#### TASK-006: Tạo OG default image

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Preview đẹp khi chia sẻ link trang chủ lên social |
| **File cần chỉnh** | Tạo `public/og-default.png` (1200×630px) |
| **Ưu tiên** | **High** |
| **Độ khó** | Trung bình (thiết kế ảnh — designer task) |
| **Kết quả** | Ảnh 1200×630px với logo Kallio, tagline, dark background |
| **Checklist** | Facebook Sharing Debugger hiển thị ảnh đúng |

---

#### TASK-007: Metadata cho meeting page (`/[meetingCode]`)

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Khi chia sẻ link meeting, preview hiển thị tên cuộc họp |
| **File cần chỉnh** | `src/app/[meetingCode]/page.tsx` — thêm `generateMetadata` |
| **Ưu tiên** | **High** |
| **Độ khó** | Trung bình (2-3 giờ — cần refactor từ client sang server wrapper) |
| **Kết quả** | OG title "Join [Meeting Name] on Kallio", noindex |
| **Checklist** | Paste link meeting vào Discord → preview đúng tên cuộc họp |

---

### PHASE 3 — Noindex và Auth Pages (Trung bình)

---

#### TASK-008: Thêm noindex cho `/sign-in` và `/sign-up`

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Google không index trang auth |
| **File cần chỉnh** | `src/app/sign-in/page.tsx`, `src/app/sign-up/page.tsx` |
| **Ưu tiên** | **Medium** |
| **Độ khó** | Dễ (10 phút) |
| **Kết quả** | `<meta name="robots" content="noindex, nofollow">` trong HTML |
| **Checklist** | View Source trang sign-in có meta robots noindex |

---

#### TASK-009: Thêm noindex cho `/profile` và `/schedule`

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Google không index trang private |
| **File cần chỉnh** | `src/app/profile/page.tsx`, `src/app/schedule/page.tsx` |
| **Ưu tiên** | **Medium** |
| **Độ khó** | Dễ (10 phút) |
| **Kết quả** | Meta robots noindex trên cả hai trang |
| **Checklist** | View Source, Google Search Console không báo indexed |

---

### PHASE 4 — Structured Data (Trung bình)

---

#### TASK-010: Tạo JSON-LD schema cho trang chủ

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Google hiểu Kallio là gì (WebSite + Organization + SoftwareApplication) |
| **File cần chỉnh** | Tạo `src/lib/seo/jsonld.ts`, tạo `src/components/seo/JsonLd.tsx`, sửa `src/app/page.tsx` |
| **Ưu tiên** | **Medium** |
| **Độ khó** | Trung bình (2 giờ) |
| **Kết quả** | `<script type="application/ld+json">` trong HTML trang chủ |
| **Checklist** | Google Rich Results Test pass cho trang chủ |

---

### PHASE 5 — UX và Technical (Thấp)

---

#### TASK-011: Tạo `src/app/not-found.tsx`

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Trang 404 đúng HTTP status, không index |
| **File cần chỉnh** | Tạo mới `src/app/not-found.tsx` |
| **Ưu tiên** | **Medium** |
| **Độ khó** | Dễ (30 phút) |
| **Kết quả** | URL không tồn tại → HTTP 404 + trang thân thiện người dùng |
| **Checklist** | `curl -I https://kallio.yourdomain.com/invalid` trả về 404 |

---

#### TASK-012: Tích hợp Google Analytics

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Đo traffic, behavior, conversion |
| **File cần chỉnh** | `src/app/layout.tsx`, thêm `<Script>` với GA4 |
| **Ưu tiên** | **Low** |
| **Độ khó** | Dễ (30 phút) |
| **Kết quả** | Google Analytics 4 track pageviews |
| **Checklist** | GA4 Real Time hiển thị session khi mở trang |

---

#### TASK-013: Submit Google Search Console

| Trường | Chi tiết |
|--------|---------|
| **Mục tiêu** | Google biết domain tồn tại, monitor index status |
| **File cần chỉnh** | Xác minh domain trong GSC, submit sitemap URL |
| **Ưu tiên** | **Low** (sau khi deploy production) |
| **Độ khó** | Dễ |
| **Kết quả** | GSC hiển thị sitemap status "Success" |
| **Checklist** | Sitemap không có lỗi, Coverage report không có excluded pages quan trọng |

---

## 6. Cấu trúc file đề xuất

```
src/
├── app/
│   ├── layout.tsx                     ← Sửa: nâng cấp metadata
│   ├── page.tsx                       ← Sửa: bỏ "use client", thêm metadata
│   ├── sitemap.ts                     ← Tạo mới
│   ├── robots.ts                      ← Tạo mới
│   ├── not-found.tsx                  ← Tạo mới
│   ├── sign-in/
│   │   └── page.tsx                   ← Sửa: thêm metadata + noindex
│   ├── sign-up/
│   │   └── page.tsx                   ← Sửa: thêm metadata + noindex
│   ├── profile/
│   │   └── page.tsx                   ← Sửa: thêm noindex
│   ├── schedule/
│   │   └── page.tsx                   ← Sửa: thêm noindex
│   └── [meetingCode]/
│       └── page.tsx                   ← Sửa: thêm generateMetadata + noindex
├── components/
│   ├── home/
│   │   ├── home-page-client.tsx       ← Tạo mới (tách từ page.tsx)
│   │   ├── guest-home.tsx             ← Giữ nguyên
│   │   └── authenticated-home.tsx     ← Giữ nguyên
│   └── seo/
│       └── JsonLd.tsx                 ← Tạo mới
├── lib/
│   └── seo/
│       ├── metadata.ts                ← Tạo mới (metadata helpers)
│       └── jsonld.ts                  ← Tạo mới (JSON-LD builders)
public/
└── og-default.png                     ← Tạo mới (1200×630px)
```

---

## 7. Ví dụ code

### 7.1 Root Layout — Metadata đầy đủ

**File:** `src/app/layout.tsx`

```typescript
import "./globals.css";

import { AppProvider } from "@/components/layout/app-provider";
import { SiteShell } from "@/components/layout/site-shell";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kallio.yourdomain.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Kallio",
    template: "%s | Kallio",
  },
  description:
    "Professional video meetings made simple. Connect, collaborate, and meet anywhere with HD video, screen sharing, and end-to-end encryption.",
  keywords: ["video meeting", "video call", "online meeting", "kallio", "team collaboration"],
  authors: [{ name: "Kallio Team" }],
  creator: "Kallio",
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: siteUrl,
    siteName: "Kallio",
    title: "Kallio – Professional Video Meetings",
    description:
      "Connect, collaborate, anywhere you are. Professional video meetings for students, companies, and remote teams.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Kallio – Professional Video Meetings",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kallio – Professional Video Meetings",
    description: "Professional video meetings made simple.",
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <AppProvider>
          <SiteShell>{children}</SiteShell>
        </AppProvider>
      </body>
    </html>
  );
}
```

---

### 7.2 Trang chủ — Refactor thành Server Component

**File mới:** `src/components/home/home-page-client.tsx`

```typescript
"use client";

import AuthenticatedHome from "@/components/home/authenticated-home";
import GuestHome from "@/components/home/guest-home";
import { useAuthSession } from "@/lib/auth/auth-session";

export default function HomePageClient() {
  const { isAuthenticated } = useAuthSession();
  return isAuthenticated ? <AuthenticatedHome /> : <GuestHome />;
}
```

**File sửa:** `src/app/page.tsx`

```typescript
// Không có "use client" — đây là Server Component
import type { Metadata } from "next";
import HomePageClient from "@/components/home/home-page-client";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kallio.yourdomain.com";

export const metadata: Metadata = {
  title: "Kallio – Professional Video Meetings",
  description:
    "Connect, collaborate, anywhere you are. Professional video meetings for students, companies, and remote teams. Simple, secure, and seamless.",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "Kallio – Professional Video Meetings",
    description:
      "Connect, collaborate, anywhere you are. Professional video meetings for students, companies, and remote teams.",
    url: siteUrl,
    type: "website",
  },
};

export default function HomePage() {
  return <HomePageClient />;
}
```

---

### 7.3 Meeting Page — generateMetadata + noindex

**File sửa:** `src/app/[meetingCode]/page.tsx`

> **Lưu ý quan trọng:** Page này hiện là `"use client"` toàn bộ. Để có `generateMetadata`, cần tách component ra như mẫu dưới.

```typescript
// src/app/[meetingCode]/page.tsx — Server Component wrapper
import type { Metadata } from "next";
import MeetingPageClient from "@/components/meeting/meeting-page-client";

type Props = {
  params: Promise<{ meetingCode: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { meetingCode } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kallio.yourdomain.com";

  // Thử fetch tên cuộc họp từ API nội bộ
  let meetingTitle: string | null = null;
  try {
    const backendUrl = process.env.BACKEND_INTERNAL_URL ?? `${siteUrl}/api`;
    const res = await fetch(`${backendUrl}/meetings/${meetingCode}/verify`, {
      next: { revalidate: 0 }, // Không cache — meeting có thể thay đổi
    });
    if (res.ok) {
      const data = await res.json();
      meetingTitle = data?.data?.title?.trim() ?? null;
    }
  } catch {
    // Không block render nếu API lỗi
  }

  const title = meetingTitle
    ? `Join "${meetingTitle}" on Kallio`
    : "Join Meeting on Kallio";

  return {
    title,
    description:
      "You've been invited to a video meeting on Kallio. Click to join instantly — no download required.",
    // Meeting page KHÔNG index — chỉ cần social preview
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title,
      description: "You've been invited to a video meeting on Kallio.",
      url: `${siteUrl}/${meetingCode}`,
      images: [
        {
          url: "/og-default.png",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: "Join this Kallio video meeting.",
    },
  };
}

export default function MeetingPage({ params }: { params: Promise<{ meetingCode: string }> }) {
  // Toàn bộ logic client-side chuyển vào MeetingPageClient
  return <MeetingPageClient />;
}
```

**File mới:** `src/components/meeting/meeting-page-client.tsx`

```typescript
"use client";

// Toàn bộ nội dung hiện tại của src/app/[meetingCode]/page.tsx
// chuyển vào đây, bao gồm useParams, useVerifyMeeting, v.v.
```

---

### 7.4 Noindex cho auth pages

**File:** `src/app/sign-in/page.tsx`

```typescript
import type { Metadata } from "next";
import AuthFormPage from "@/components/auth/auth-form-page";

export const metadata: Metadata = {
  title: "Sign In",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return <AuthFormPage mode="sign-in" />;
}
```

**File:** `src/app/sign-up/page.tsx`

```typescript
import type { Metadata } from "next";
import AuthFormPage from "@/components/auth/auth-form-page";

export const metadata: Metadata = {
  title: "Sign Up",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return <AuthFormPage mode="sign-up" />;
}
```

**Áp dụng tương tự** cho `profile/page.tsx` và `schedule/page.tsx`.

---

### 7.5 Sitemap

**File:** `src/app/sitemap.ts`

```typescript
import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kallio.yourdomain.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
  ];
}
```

> **Lưu ý:** Dự án hiện chỉ có 1 trang public cần index. Nếu sau này thêm blog, FAQ, pricing page thì bổ sung vào đây.

---

### 7.6 Robots.txt

**File:** `src/app/robots.ts`

```typescript
import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kallio.yourdomain.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/sign-in",
          "/sign-up",
          "/profile",
          "/schedule",
          "/api/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
```

> **Ghi chú:** Route `/[meetingCode]` không cần Disallow vì đã có `noindex` trong metadata — Google sẽ crawl nhưng không index. Nếu muốn chặn crawl hoàn toàn (tiết kiệm crawl budget), thêm rule riêng.

---

### 7.7 JSON-LD Schema

**File:** `src/lib/seo/jsonld.ts`

```typescript
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kallio.yourdomain.com";

export function buildWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Kallio",
    url: siteUrl,
    description: "Professional video meetings made simple",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Kallio",
    url: siteUrl,
    logo: `${siteUrl}/favicon.ico`,
    description: "Professional video meetings for students, companies, and remote teams.",
    sameAs: [],
  };
}

export function buildSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Kallio",
    applicationCategory: "CommunicationApplication",
    operatingSystem: "Web",
    description:
      "Professional video meetings made simple. HD video, screen sharing, end-to-end encryption.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    url: siteUrl,
  };
}
```

**File:** `src/components/seo/JsonLd.tsx`

```typescript
type JsonLdProps = {
  schema: Record<string, unknown> | Record<string, unknown>[];
};

export default function JsonLd({ schema }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

**Sử dụng trong trang chủ** (`src/app/page.tsx`):

```typescript
import JsonLd from "@/components/seo/JsonLd";
import {
  buildWebSiteSchema,
  buildOrganizationSchema,
  buildSoftwareApplicationSchema,
} from "@/lib/seo/jsonld";

export default function HomePage() {
  return (
    <>
      <JsonLd schema={buildWebSiteSchema()} />
      <JsonLd schema={buildOrganizationSchema()} />
      <JsonLd schema={buildSoftwareApplicationSchema()} />
      <HomePageClient />
    </>
  );
}
```

---

### 7.8 404 Page

**File:** `src/app/not-found.tsx`

```typescript
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Button asChild>
        <Link href="/">Go to Homepage</Link>
      </Button>
    </div>
  );
}
```

---

### 7.9 Canonical URL helper

**File:** `src/lib/seo/metadata.ts`

```typescript
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kallio.yourdomain.com";

export function getCanonicalUrl(path = ""): string {
  return `${siteUrl}${path}`;
}

export function getAbsoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${siteUrl}${path}`;
}
```

---

## 8. Checklist nghiệm thu

### 8.1 Kiểm tra kỹ thuật cơ bản

- [ ] **View Source trang chủ** có `<title>`, `<meta name="description">`, `<meta property="og:title">`, `<meta property="og:image">`, `<meta name="twitter:card">`
- [ ] **View Source trang sign-in** có `<meta name="robots" content="noindex, nofollow">`
- [ ] **View Source trang meeting** có `<meta name="robots" content="noindex, nofollow">`
- [ ] `https://yourdomain.com/sitemap.xml` trả về XML hợp lệ
- [ ] `https://yourdomain.com/robots.txt` có `Sitemap:` URL và `Disallow:` đúng
- [ ] `<html lang="en">` trong root layout
- [ ] Favicon xuất hiện trên tab trình duyệt
- [ ] `<link rel="canonical">` xuất hiện trong `<head>`

### 8.2 Kiểm tra Social Preview

- [ ] **Facebook Sharing Debugger** (`developers.facebook.com/tools/debug/`): nhập URL trang chủ → preview đúng title, description, ảnh 1200×630
- [ ] **Twitter Card Validator** (`cards-dev.twitter.com/validator`): hiển thị `summary_large_image`
- [ ] Paste link trang chủ vào Zalo → preview đúng
- [ ] Paste link meeting vào Discord → hiển thị tên cuộc họp (nếu API public)

### 8.3 Kiểm tra Structured Data

- [ ] **Google Rich Results Test** (`search.google.com/test/rich-results`): nhập URL trang chủ → không có lỗi schema
- [ ] `SoftwareApplication` schema hợp lệ
- [ ] `Organization` schema hợp lệ

### 8.4 Kiểm tra Performance

- [ ] **Lighthouse SEO score ≥ 90** trên trang chủ (Chrome DevTools → Lighthouse → SEO)
- [ ] **Lighthouse Performance** trang chủ: LCP < 2.5s
- [ ] Mobile responsive: Lighthouse Mobile score OK

### 8.5 Sau khi deploy production

- [ ] Submit URL vào **Google Search Console** và xác minh domain
- [ ] Submit `sitemap.xml` trong Google Search Console
- [ ] Coverage report không có lỗi "Excluded by noindex" cho `/`
- [ ] Request Indexing cho trang chủ
- [ ] Google Analytics 4 track được session đầu tiên

---

## 9. Rủi ro và lưu ý

### 9.1 Rủi ro khi refactor page.tsx

**Rủi ro:** Tách `page.tsx` thành server component có thể gây lỗi hydration nếu `HomePageClient` render khác nhau giữa server và client.

**Nguyên nhân:** `useAuthSession()` đọc từ `localStorage` — không có trên server. Client render lần đầu có thể flicker (guest → authenticated).

**Giải giải pháp:** Đảm bảo `HomePageClient` có loading state. Server luôn render trạng thái "chưa xác thực" (guest view), client sau khi hydrate sẽ switch sang authenticated nếu có token. UX này là chấp nhận được vì đây là behavior hiện tại.

### 9.2 Meeting page — API call trong generateMetadata

**Rủi ro:** `generateMetadata` gọi API backend để lấy tên cuộc họp. Nếu API chậm hoặc lỗi, sẽ ảnh hưởng đến TTFB của trang meeting.

**Giải pháp:** Wrap trong `try/catch` (đã có trong ví dụ), đặt timeout ngắn, dùng metadata fallback tĩnh khi lỗi.

**Rủi ro bổ sung:** Meeting có thể yêu cầu auth token để verify. Nếu backend `/meetings/:code/verify` trả về 401, cần xử lý gracefully.

### 9.3 Biến môi trường trong build Docker

Biến `NEXT_PUBLIC_SITE_URL` là biến **bake in at build time** (vì có prefix `NEXT_PUBLIC_`). Phải truyền đúng URL production khi build Docker image:

```dockerfile
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
```

Hoặc trong `docker-compose.yml`:

```yaml
build:
  args:
    - NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
```

**Không thể** thay đổi `NEXT_PUBLIC_SITE_URL` sau khi build mà không rebuild image.

### 9.4 Duplicate content

Trang chủ render khác nhau tùy trạng thái đăng nhập. Google sẽ thấy guest view (do crawl như anonymous user). Đây là OK vì guest view là marketing content và authenticated view là dashboard — không có duplicate.

### 9.5 Crawl budget cho `/[meetingCode]`

Nếu có hàng nghìn meetings, Google có thể crawl tất cả URL `/abc-xyz`, tốn crawl budget dù đã noindex. Nếu cần thiết, thêm rule vào `robots.ts`:

```typescript
disallow: [
  "/sign-in", "/sign-up", "/profile", "/schedule", "/api/",
  // Thêm nếu muốn chặn crawl meeting hoàn toàn:
  // "/*-*-*", // cần test regex
],
```

### 9.6 Không có content SEO

Kallio là **tool app**, không phải **content site**. SEO tự nhiên sẽ bị giới hạn vì:
- Không có blog, bài viết, case study
- Không có từ khóa long-tail
- Cạnh tranh với Zoom, Google Meet là rất khó

**Đề xuất dài hạn:** Nếu muốn tăng organic traffic thực sự, cân nhắc thêm trang `/features`, `/pricing`, `/use-cases` (hoặc blog) sau này.

---

## 10. Kết luận

### Tóm tắt gap và ưu tiên

| Thứ tự | Task | Impact | Effort |
|--------|------|--------|--------|
| 1 | TASK-001: Thêm `NEXT_PUBLIC_SITE_URL` | Nền tảng cho mọi task khác | 5 phút |
| 2 | TASK-002: Nâng cấp root layout metadata | OG/Twitter toàn app | 30 phút |
| 3 | TASK-003: Refactor page.tsx | Metadata trang chủ | 1-2 giờ |
| 4 | TASK-006: Tạo OG default image | Social preview | Designer task |
| 5 | TASK-004: Sitemap | Google crawl | 20 phút |
| 6 | TASK-005: Robots.txt | Crawler guidance | 15 phút |
| 7 | TASK-007: Meeting page metadata | Social sharing | 2-3 giờ |
| 8 | TASK-008/009: Noindex auth/private pages | Tránh index sai | 20 phút |
| 9 | TASK-010: JSON-LD | Rich results | 2 giờ |
| 10 | TASK-011: 404 page | UX + technical SEO | 30 phút |

### Thời gian ước tính

- **Phase 1 (Nền tảng):** 4-6 giờ dev
- **Phase 2 (Social Sharing):** 3-4 giờ dev + designer (OG image)
- **Phase 3 (Noindex):** 30 phút
- **Phase 4 (JSON-LD):** 2 giờ
- **Phase 5 (Technical):** 1 giờ + GSC setup

**Tổng:** ~12-15 giờ dev (chưa tính design OG image)

### Kỳ vọng kết quả sau triển khai

| Metric | Trước | Sau |
|--------|-------|-----|
| Lighthouse SEO score | ~40-50 (client component, no meta) | ≥ 90 |
| Social preview khi share link | Chỉ hiện URL | Title + Description + Ảnh |
| Google index trang chủ | Không chắc (thiếu metadata) | Đúng, đầy đủ |
| Crawl budget | Không kiểm soát | Có robots.txt + noindex |
| Analytics | Không có | GA4 track đầy đủ |
