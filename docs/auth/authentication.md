# Xác thực người dùng (Authentication)

## Tổng quan

Authentication hoàn toàn là **client-side** — không có Next.js middleware bảo vệ route. Bảo vệ route dựa vào redirect từ phía client.

---

## Các thành phần chính

| File | Vai trò |
|------|---------|
| `src/shared/services/auth.service.ts` | API calls: login, signup, logout, getAccount, updateAccount |
| `src/lib/auth/auth-token.ts` | Lưu/đọc/xóa access token trong `localStorage` |
| `src/lib/auth/auth-session.ts` | Quản lý AuthUser trong `localStorage` + reactive hook `useAuthSession()` |
| `src/hooks/auth/useLoginForm.ts` | Form hook cho sign-in và sign-up |
| `src/hooks/auth/useProfile.ts` | Query + mutation cho profile |

---

## Lưu trữ token

| Loại token | Nơi lưu | Ghi chú |
|-----------|---------|---------|
| Access token | `localStorage` (key: `auth-access-token`) | Đọc bởi `readStoredAccessToken()` |
| Refresh token | HTTP-only cookie | Được set bởi backend, không đọc được từ JS |
| AuthUser object | `localStorage` (key: `auth-user`) | Chứa id, email, fullName, avatarUrl, role |

---

## Luồng đăng nhập

```
User submit form → authApi.login(data)
     │
     ▼
Response thành công
     │
     ├─ persistAccessToken(accessToken) → lưu vào localStorage
     │
     └─ normalizeAuthUser(user) hoặc extractAuthUserFromToken(token)
          │
          └─ persistAuthUser(user) → lưu vào localStorage + dispatch event
```

### Lấy user từ JWT khi response không có user object

`extractAuthUserFromToken(token)` decode payload JWT (base64url) để lấy `sub` (email), `roles`, và `user` claim nếu có. Đây là fallback khi backend không trả về user object trong response.

---

## Luồng đăng ký (signup)

```
authApi.signup(data) → POST /auth/register
```

`data` là `SignupPayload` (`SignupForm` bỏ `confirmPassword`). Trước khi đăng ký, form có thể gọi
`authApi.sendVerifyCode(email)` → `POST /auth/send-verify-code` để gửi mã xác thực email.

---

## Reactive auth state

`useAuthSession()` dùng `useSyncExternalStore` để phát hiện thay đổi session trên toàn bộ React tree và giữa các tab trình duyệt.

```typescript
// Đăng ký lắng nghe 2 loại event:
window.addEventListener("storage", handleChange);         // Tab khác thay đổi localStorage
window.addEventListener("auth-user-changed", handleChange); // Tab hiện tại thay đổi
```

Điều này đảm bảo khi logout ở một tab, các tab khác cũng phản ứng ngay.

---

## Token refresh

Token refresh được xử lý tự động trong `sendRequest()` tại `src/lib/api/wrapper.ts`:

1. Request gặp `401`
2. Gọi `POST /auth/refresh`
   - **Web:** `credentials: "include"` — gửi refresh token qua HTTP-only cookie
   - **Desktop (Electron):** gửi header `X-Refresh-Token` + `X-Client: desktop`, `credentials: "omit"`
3. Lấy access token mới (`accessToken`/`access_token`), persist vào localStorage
4. Retry request gốc với token mới
5. Nếu refresh thất bại: xóa token + redirect về `/sign-in`

**Deduplication:** Biến module-level `refreshPromise` đảm bảo chỉ có **một** refresh request chạy cùng lúc — các request concurrent đều chờ promise này.

### Desktop refresh token

Bản web giữ refresh token trong HTTP-only cookie. Bản desktop không dùng cookie jar mà lưu refresh
token trong store mã hoá bằng `safeStorage` (`src/lib/auth/refresh-store.ts`):
- Login trả thêm `refresh_token` cho client desktop (nhận diện qua header `X-Client: desktop`).
- Mỗi lần refresh, backend xoay vòng (rotate) token mới và FE lưu lại token mới.

---

## Các API endpoint

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/auth/login` | Đăng nhập, nhận access token + set refresh cookie |
| POST | `/auth/register` | Đăng ký tài khoản |
| POST | `/auth/send-verify-code` | Gửi mã xác thực email |
| POST | `/auth/logout` | Logout (xóa refresh cookie phía server) |
| GET | `/auth/account` | Lấy thông tin tài khoản hiện tại |
| PUT | `/auth/account` | Cập nhật `fullName` + `avatar` (gửi field `avatar`, null nếu trống) |
| POST | `/auth/refresh` | Làm mới access token (cookie ở web, `X-Refresh-Token` ở desktop) |
