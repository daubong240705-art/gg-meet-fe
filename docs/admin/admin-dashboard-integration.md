# Task FE: Hoàn thiện trang Admin – kết nối dữ liệu thật

> Trạng thái: **CHƯA IMPLEMENT** – tài liệu mô tả những gì còn thiếu ở FE và việc cần bổ sung.
> Phạm vi đợt này: **chỉ phần đọc/hiển thị danh sách** (overview + users + meetings).
> Các API action (tạo/sửa/xóa user, kick/end meeting...) **chưa xử lý trong đợt này**.

---

## 1. Hiện trạng

Trang admin nằm ở:
- Route: [src/app/admin/page.tsx](../../src/app/admin/page.tsx), [src/app/admin/layout.tsx](../../src/app/admin/layout.tsx)
- UI chính: [src/components/admin/admin-dashboard.tsx](../../src/components/admin/admin-dashboard.tsx)
- Phụ trợ: `admin-stat-card.tsx`, `admin-status-badge.tsx`, `admin-role-badge.tsx`

**Vấn đề cốt lõi:** toàn bộ dashboard đang dùng **mock data hardcoded** (`stats`, `users`, `meetings` là mảng tĩnh trong `admin-dashboard.tsx`). Search chỉ lọc client-side trên mock. **Chưa có lớp gọi API, chưa có hook, chưa có phân trang, chưa có loading/error/empty state, chưa bảo vệ route theo role.**

## 2. Backend đã sẵn sàng (3 endpoint đọc)

Tất cả đều yêu cầu JWT role `ADMIN`, prefix `/api/admin`. Bao bọc trong `IBackendRes<T>` (field `data`, `message`, `statusCode`).

### 2.1. `GET /api/admin/dashboard/overview`
Trả `AdminDashboardOverviewResponseDTO`:
```jsonc
{
  "data": {
    "totalUsers":         { "value": 2543, "changePercent": 12.5, "change": "+12.5%", "trend": "up" },
    "activeMeetings":     { "value": 128,  "changePercent": 23.1, "change": "+23.1%", "trend": "up" },
    "totalMeetingsToday": { "value": 847,  "changePercent": -5.2, "change": "-5.2%", "trend": "down" }
  }
}
```
> `value: number`, `change: string` (đã format sẵn), `trend: "up" | "down"`.

### 2.2. `GET /api/admin/users`
Query: `page` (0), `size` (10), `search`, `role` (`USER|ADMIN`), `status` (`ACTIVE|INACTIVE`). Trả `PagedResponse<AdminUserResponseDTO>`:
```jsonc
{
  "data": {
    "content": [
      { "id": 1, "email": "a@x.com", "fullName": "Nguyen Van A",
        "role": "USER", "status": "ACTIVE", "avatar": "https://...",
        "meetingCount": 12, "createdAt": "2026-01-15T10:00:00" }
    ],
    "page": 0, "size": 10, "totalElements": 50, "totalPages": 5, "last": false
  }
}
```
> `role`: `"USER" | "ADMIN"`. `status`: `"ACTIVE" | "INACTIVE"`. `avatar`: **URL** (có thể null).
> `meetingCount`: số cuộc họp user là host.

### 2.3. `GET /api/admin/meetings`
Query: `page` (0), `size` (10), `search` (title/code/host name/email), `status` (`SCHEDULED|ACTIVE|ENDED`), `from`, `to` (ISO-8601). Trả `PagedResponse<AdminMeetingResponseDTO>`:
```jsonc
{
  "data": {
    "content": [
      { "id": 12, "meetingCode": "abc-defg-hij", "title": "Daily standup",
        "status": "ACTIVE", "isScheduled": true,
        "hostId": 3, "hostName": "Nguyen Van A", "hostEmail": "host@x.com",
        "participantCount": 5, "startTime": "2026-05-29T09:00:00", "endTime": null, "createdAt": "2026-05-28T15:30:00" }
    ],
    "page": 0, "size": 10, "totalElements": 120, "totalPages": 12, "last": false
  }
}
```
> `status`: chỉ có `"SCHEDULED" | "ACTIVE" | "ENDED"` (KHÔNG có "cancelled").

---

## 3. Mismatch giữa mock FE và DTO backend (phải reconcile)

### 3.1. Users

| Field UI hiện tại | Field BE | Ghi chú / việc cần làm |
|-------------------|----------|------------------------|
| `name` | `fullName` | Đổi tên field |
| `avatar` (chữ cái viết tắt "JD") | `avatar` (**URL**) | BE trả URL. Render `<img>`; nếu null → fallback initials sinh từ `fullName` |
| `email` | `email` | OK |
| `role`: `"Admin"/"User"/"Moderator"` | `role`: `"ADMIN"/"USER"` | **Không có Moderator**. Cần map enum→nhãn (xem 3.4) |
| `status`: `"active"/"inactive"/"blocked"` | `status`: `"ACTIVE"/"INACTIVE"` | **Không có blocked**. Cần normalize (xem 3.4) |
| `joinDate`: `"Jan 15, 2026"` | `createdAt` (ISO) | Format ngày ở FE |
| `meetings`: số cuộc họp của user | `meetingCount` | ✅ **Chốt: BE bổ sung field `meetingCount`** (xem mục Backend cần bổ sung) |

> ✅ Đã chốt: **bỏ vai trò "Moderator"** (UI chỉ còn Admin/User) và **bỏ trạng thái "blocked"** (user chỉ còn active/inactive).

### 3.2. Meetings

| Field UI hiện tại | Field BE | Ghi chú |
|-------------------|----------|---------|
| `title` | `title` | OK |
| `host` | `hostName` (+ `hostEmail`) | Đổi tên; có thể hiện email phụ |
| `code` | `meetingCode` | Đổi tên |
| `status`: `"ongoing"/"scheduled"/"completed"` | `status`: `"ACTIVE"/"SCHEDULED"/"ENDED"` | Map: ACTIVE→ongoing, SCHEDULED→scheduled, ENDED→completed. ✅ **Chốt: bỏ "cancelled"** |
| `participants` | `participantCount` | Đổi tên |
| `startTime`: `"9:00 AM"` | `startTime` (ISO, **có thể null**) | Format giờ; null khi không phải scheduled → hiển thị "—" |

### 3.3. Stat cards (`AdminStatCard`)
- Hiện `value: string`, `change: string`, `trend`, `icon`, `tone` hardcoded.
- Map từ overview: `totalUsers`→card "Total Users", `activeMeetings`→"Active Meetings", `totalMeetingsToday`→"Total Meetings Today".
- `value` BE là `number` → format `toLocaleString()` ("2,543"). `change`/`trend` dùng trực tiếp từ BE. `icon`/`tone` giữ gán cứng theo từng card ở container.

### 3.4. Badge cần nhận enum của BE
- `admin-status-badge.tsx`: key hiện là chữ thường (`active`, `ongoing`...). BE trả CHỮ HOA. → Thêm bước normalize (lowercase + map `ACTIVE`(meeting)→`ongoing`, `ENDED`→`completed`, `SCHEDULED`→`scheduled`; user `ACTIVE`→`active`, `INACTIVE`→`inactive`) **hoặc** mở rộng `statusConfig` để nhận cả key BE. ✅ Có thể **xóa entry `blocked` và `cancelled`** khỏi `statusConfig` (không còn dùng).
- `admin-role-badge.tsx`: key hiện `Admin/Moderator/User`. BE trả `ADMIN/USER`. → Map `ADMIN`→"Admin", `USER`→"User". ✅ **Xóa entry `Moderator`**.
- ⚠️ User status và Meeting status **trùng giá trị "ACTIVE"** nhưng ý nghĩa khác (user active vs meeting đang diễn ra). Khi normalize phải tách theo ngữ cảnh (truyền thêm `kind: "user" | "meeting"` hoặc map riêng ở mỗi bảng trước khi đưa vào badge).

---

## 3bis. Backend cần bổ sung (phát sinh từ quyết định #1 và #6)

Hai quyết định dưới đây vượt quá DTO/endpoint user hiện có → **phải sửa backend trước khi FE dùng được**.

### B1. Thêm `meetingCount` vào danh sách user (quyết định #1)
- [x] `domain/response/AdminUserResponseDTO.java`: thêm field `Long meetingCount`.
- [x] `AdminUserService.getUsers`: đếm số cuộc họp của mỗi user trong trang theo cách gom (giống `AdminMeetingService.getAcceptedParticipantCounts` – query 1 lần theo danh sách userId, tránh N+1).
  - Định nghĩa đã dùng: số cuộc họp user **làm host**.
- [x] Bổ sung repository count tương ứng (projection theo `hostId`).

### B2. Thêm filter `role` + `status` cho `GET /api/admin/users` (quyết định #6)
- [x] `AdminUserController.getUsers`: thêm `@RequestParam(required=false) String role`, `@RequestParam(required=false) String status`.
- [x] `AdminUserService.getUsers(page, size, search, role, status)`: parse `role`→ (USER/ADMIN), `status`→ enabled true/false; sai định dạng → `BusinessException(ErrorCode.INVALID_STATUS)` / error code phù hợp.
- [x] `UserRepository`: query hỗ trợ điều kiện optional (null = bỏ qua) cho `role` và `enabled`, kết hợp `search` + `isDeletedFalse` sẵn có.

> Sau khi B1/B2 xong, cập nhật lại ví dụ response & query param của `GET /api/admin/users` trong [agent/apis/AdminUserCRUD.md](../../../gg-meet-be/agent/apis/AdminUserCRUD.md).

---

## 4. Những gì còn thiếu ở FE & cần bổ sung

### 4.1. Lớp service (theo convention `src/shared/services/`)
- [x] Tạo `src/shared/services/admin/types.ts`: định nghĩa `AdminOverview`, `AdminMetric`, `AdminUser`, `AdminMeeting`, và `AdminPaged<T>` (khớp `PagedResponse`: `content/page/size/totalElements/totalPages/last`).
- [x] Tạo `src/shared/services/admin/client.ts` với `adminApi`:
  - `getOverview()` → `sendRequest<IBackendRes<AdminOverview>>({ url: ${API_URL}/admin/dashboard/overview, auth: true, useCredentials: true })`
  - `getUsers({ page, size, search })` → `.../admin/users` + `queryParams`
  - `getMeetings({ page, size, search, status, from, to })` → `.../admin/meetings` + `queryParams`
  - Dùng `getBackendBaseUrl()` và `sendRequest` y như [meeting/client.ts](../../src/shared/services/meeting/client.ts). Luôn `auth: true`.
- [x] (Tùy chọn) barrel `src/shared/services/admin.service.ts` re-export.

### 4.2. React-query hooks (provider đã có ở `app-provider.tsx`)
- [x] Tạo `src/features/admin/hooks/` (theo CLAUDE.md ưu tiên `src/features/`):
  - `useAdminOverview()` – `useQuery(['admin','overview'])`.
  - `useAdminUsers({ page, search })` – `useQuery(['admin','users', page, search])`, `keepPreviousData`.
  - `useAdminMeetings({ page, search, status, from, to })` – tương tự.
  - Tất cả `select` ra `data.data` và xử lý lỗi (statusCode != 200 → throw để query vào `error`).

### 4.3. Refactor `admin-dashboard.tsx`
- [x] Bỏ toàn bộ mảng mock `stats`, `users`, `meetings`.
- [x] Stat cards: lấy từ `useAdminOverview()`; map 3 metric → card (format `value`, dùng `change`/`trend` BE).
- [x] Bảng Users/Meetings: lấy từ hook tương ứng; map field theo bảng mục 3.
- [x] **Search server-side**: debounce input (~300–400ms) rồi truyền `search` xuống hook (reset `page=0` khi search đổi). Bỏ filter client-side `useMemo` hiện tại.
- [x] Tách `UsersTable`/`MeetingsTable` nhận data + trạng thái (loading/error) thay vì mảng tĩnh.

### 4.4. Phân trang (đang thiếu hoàn toàn)
- [x] Thêm UI phân trang dưới mỗi bảng: hiển thị `page+1 / totalPages`, nút Prev/Next (disable khi ở biên / `last`), dùng `totalElements` để show tổng.
- [x] State `page` riêng cho tab users và tab meetings (reset khi đổi search/filter).

### 4.5. Filter & Export (nút hiện chưa hoạt động)
- [x] Nút **Filter**:
  - Tab Meetings → chọn `status` (SCHEDULED/ACTIVE/ENDED) + khoảng `from`/`to` (date range) → truyền xuống `getMeetings`.
  - Tab Users → ✅ **Chốt: thêm filter** theo `role` (USER/ADMIN) và `status` (ACTIVE/INACTIVE) → truyền xuống `getUsers`. **Cần BE bổ sung 2 param này** (xem mục Backend cần bổ sung).
- [x] Nút **Export**: ✅ **Chốt: tạm ẩn** (BE chưa có endpoint export). Để lại nút dạng `hidden`/comment để sau bật.

### 4.6. Loading / Error / Empty states (đang thiếu)
- [x] Skeleton cho stat cards và rows khi `isLoading`.
- [x] Empty state khi `content.length === 0` ("Không có dữ liệu").
- [x] Error state + nút retry khi query lỗi (401 đã được wrapper tự refresh/redirect).

### 4.7. Bảo vệ route theo role (quan trọng – đang thiếu)
- [x] `/admin` hiện **không chặn** ở FE — user thường vẫn mở được trang (BE trả 403 nên data rỗng, nhưng UX xấu).
- [x] Dùng `useAuthSession()` ([src/lib/auth/auth-session.ts](../../src/lib/auth/auth-session.ts)) kiểm tra role `ADMIN`; nếu không phải → redirect `/` hoặc hiện "403 Forbidden". (Lưu ý CLAUDE.md FE: auth client-side, không có middleware.)
- [x] Cần xác nhận role lấy từ đâu trong session/JWT (kiểm tra `useAuthSession`/`useProfile`).

### 4.8. Dọn dẹp layout
- [x] [admin/layout.tsx](../../src/app/admin/layout.tsx) import `BarChart3, UsersRound, Video` nhưng **không dùng** → bỏ, hoặc dùng làm sidebar nav thật.

---

## 5. Cấu trúc file dự kiến thêm / sửa

| File | Thay đổi |
|------|----------|
| `src/shared/services/admin/types.ts` | **Mới** – types overview/user/meeting/paged |
| `src/shared/services/admin/client.ts` | **Mới** – `adminApi` (3 GET) |
| `src/features/admin/hooks/use-admin-overview.ts` | **Mới** |
| `src/features/admin/hooks/use-admin-users.ts` | **Mới** |
| `src/features/admin/hooks/use-admin-meetings.ts` | **Mới** |
| `src/features/admin/hooks/index.ts` | **Mới** – barrel |
| `src/components/admin/admin-dashboard.tsx` | Bỏ mock, nối hook, search server-side, phân trang, loading/empty |
| `src/components/admin/admin-status-badge.tsx` | Nhận/normalize enum BE (tách user vs meeting) |
| `src/components/admin/admin-role-badge.tsx` | Map `ADMIN/USER` → nhãn |
| `src/components/admin/admin-pagination.tsx` (gợi ý) | **Mới** – control phân trang dùng chung |
| `src/app/admin/layout.tsx` | Bỏ import thừa / thêm role guard |

---

## 6. Thứ tự triển khai đề xuất

**Backend trước (FE phụ thuộc):**
0a. B1 – thêm `meetingCount` vào user DTO/service.
0b. B2 – thêm filter `role`/`status` cho `/api/admin/users`.

**Frontend:**
1. Service layer (`types.ts` + `client.ts`).
2. Hooks react-query.
3. Nối Stat cards (overview) – nhỏ, kiểm chứng luồng API/auth sớm.
4. Bảng Users (map field + `meetingCount` + badge + loading/empty).
5. Bảng Meetings (map field + status mapping).
6. Search server-side (debounce) + phân trang.
7. Filter: meetings (status + from/to) và users (role + status); ẩn Export.
8. Route guard role ADMIN + dọn layout.

---

## 7. Quyết định đã chốt

1. ✅ **Thêm `meetingCount`** mỗi user → cần BE bổ sung (mục B1).
2. ✅ **Bỏ "Moderator"** khỏi UI (chỉ Admin/User).
3. ✅ **Bỏ "blocked"** (user chỉ active/inactive).
4. ✅ **Bỏ "cancelled"** (meeting chỉ ongoing/scheduled/completed).
5. ✅ **Tạm ẩn Export**.
6. ✅ **Thêm Filter** — meetings (status + from/to) và users (role + status) → users cần BE bổ sung (mục B2).
7. ✅ **Search chuyển hẳn server-side** — bỏ filter client-side hiện tại.
