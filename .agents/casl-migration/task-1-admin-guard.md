# Task 1 — Admin guard → `AppAbility`

> Phụ thuộc: Task 0 · Quy mô: S · Rủi ro: Thấp
> Kết quả: thay các kiểm tra `user?.role === "ADMIN"` rải rác trong admin-dashboard bằng một `AppAbility` duy nhất. "Bài tập khởi động" — phạm vi nhỏ, một file.

## Mục tiêu

Gom 4 chỗ check role admin về một nguồn ability, làm mẫu cách dùng `defineAppAbility` ở tầng app. Hành vi (redirect, render, enable query) giữ nguyên.

## Hiện trạng (file [`admin-dashboard.tsx`](../../src/components/admin/admin-dashboard.tsx))

`user?.role === "ADMIN"` xuất hiện ở **4 chỗ**:

1. `useEffect` redirect về `/` nếu không phải admin — [~L152](../../src/components/admin/admin-dashboard.tsx#L152).
2. `const canLoadAdminData = hasMounted && isAuthenticated && user?.role === "ADMIN"` — [~L157](../../src/components/admin/admin-dashboard.tsx#L157).
3. Nhánh render sớm `if (user?.role !== "ADMIN") return <AdminAccessState ... "Forbidden" />` — [~L222](../../src/components/admin/admin-dashboard.tsx#L222).
4. (Gián tiếp) `canLoadAdminData` được truyền làm `enabled` cho 3 query admin.

## Các bước

### 1. Tạo ability từ role hiện tại

Trong `AdminDashboard`, sau khi có `user` từ `useAuthSession()`:

```tsx
import { useMemo } from "react";
import { defineAppAbility } from "@/lib/auth/ability";

// ...
const { user, isAuthenticated } = useAuthSession();
const ability = useMemo(() => defineAppAbility(user?.role ?? null), [user?.role]);
const canAccessAdmin = ability.can("read", "AdminPanel");
```

> `can("manage","all")` của ADMIN khiến `can("read","AdminPanel")` = true; USER/null = false. Tương đương `role === "ADMIN"` cũ.

### 2. Thay 4 điểm

| Cũ | Mới |
|----|-----|
| `if (user?.role !== "ADMIN")` (trong `useEffect`) | `if (!canAccessAdmin)` |
| `... && user?.role === "ADMIN"` (canLoadAdminData) | `... && canAccessAdmin` |
| `if (user?.role !== "ADMIN") return <AdminAccessState .../>` | `if (!canAccessAdmin) return <AdminAccessState .../>` |

`canLoadAdminData` vẫn giữ tên/chức năng, chỉ đổi vế role:

```tsx
const canLoadAdminData = hasMounted && isAuthenticated && canAccessAdmin;
```

> Lưu ý thứ tự hooks: `useMemo` cho ability phải đặt cùng nhóm với các hook khác ở đầu component (trước mọi `return` sớm), để không vi phạm rules-of-hooks.

### 3. (Tuỳ chọn) dùng `<Can>` cho phần render

Không bắt buộc cho admin (chỉ 1 guard). Có thể bỏ qua `@casl/react` ở tầng app và chỉ dùng `ability.can(...)` như trên cho gọn.

## Definition of Done

- [ ] `npm run build` + `npm run lint` xanh.
- [ ] Không còn chuỗi `=== "ADMIN"` / `!== "ADMIN"` nào trong `admin-dashboard.tsx`.
- [ ] Kiểm thử thủ công:
  - Đăng nhập tài khoản **ADMIN** → vào `/admin` thấy dashboard, query chạy.
  - Tài khoản **USER** → bị redirect `/`, và nếu giữ trên trang thì thấy "Forbidden".
  - Chưa đăng nhập → redirect `/sign-in` (nhánh này không đổi).

## Rủi ro & lưu ý

- **`canLoadAdminData` còn `hasMounted` & `isAuthenticated`** — đừng gộp nhầm hết vào ability; ability chỉ thay vế role.
- Nhánh `!isAuthenticated → /sign-in` **không** thuộc ability, giữ nguyên.
- Tài khoản đổi role giữa các tab: `useAuthSession` đã reactive qua `useSyncExternalStore`, `useMemo([user?.role])` sẽ rebuild ability đúng.

## Rollback

Revert một file `admin-dashboard.tsx`. Hạ tầng Task 0 không bị ảnh hưởng.
