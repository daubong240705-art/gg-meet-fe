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

> **Rủi ro bảo mật:** Access token trong `localStorage` dễ bị đánh cắp qua XSS. Nếu có lỗ hổng XSS trên trang, attacker có thể lấy token. HTTP-only cookie cho refresh token giảm thiểu nhưng không loại trừ hoàn toàn rủi ro.

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
     │
     │ Nếu response status = 404 (endpoint không tồn tại)
     └─ Retry → POST /register (endpoint cũ)
```

> **Rủi ro:** Logic fallback URL (404 → retry endpoint khác) rất dễ phát sinh lỗi khó debug. Nếu `/auth/register` trả về 404 vì lý do khác (không phải endpoint missing), request sẽ bị gửi sai chỗ.

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
2. Gọi `GET /auth/refresh` với credentials (gửi refresh token cookie)
3. Lấy access token mới, persist vào localStorage
4. Retry request gốc với token mới
5. Nếu refresh thất bại: xóa token + redirect về `/sign-in`

**Deduplication:** Biến module-level `refreshPromise` đảm bảo chỉ có **một** refresh request chạy cùng lúc — các request concurrent đều chờ promise này.

---

## Các API endpoint

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/auth/login` | Đăng nhập, nhận access token + set refresh cookie |
| POST | `/auth/register` | Đăng ký tài khoản |
| POST | `/auth/send-verify-code` | Gửi mã xác thực email |
| POST | `/auth/logout` | Logout (xóa refresh cookie phía server) |
| GET | `/auth/account` | Lấy thông tin tài khoản hiện tại |
| PUT | `/auth/account` | Cập nhật fullName, avatarUrl |
| GET | `/auth/refresh` | Làm mới access token dùng refresh cookie |

---

## Các vấn đề tiềm ẩn

### 1. Không có route guard phía server
- **Vấn đề:** Không có Next.js middleware — người dùng có thể truy cập `/schedule`, `/profile` trước khi React render và kiểm tra auth.
- **Hậu quả:** API call sẽ trả về 401 và bị redirect, nhưng có thể flash nội dung trang trước khi redirect.

### 2. Access token XSS
- **Vấn đề:** Access token trong `localStorage` có thể bị đọc bởi script bất kỳ chạy trên trang.
- **Hậu quả:** Nếu có lỗ hổng XSS (third-party script, CDN inject), attacker lấy được token.

### 3. Token snapshot có thể stale
- **Vấn đề:** `readStoredAccessToken()` cache vào biến module `accessTokenSnapshot`. Nếu token bị thay đổi từ tab khác (`storage` event), snapshot sẽ được cập nhật, nhưng request đang xây dựng header sẽ dùng giá trị cũ.
- **Hậu quả:** Có thể gửi token hết hạn dẫn đến 401 không cần thiết (sẽ được auto-retry).

### 4. Signup fallback URL
- **Vấn đề:** Nếu `/auth/register` trả về 404 vì lý do nghiệp vụ (không phải missing endpoint), request sẽ fallback sang `/register` không đúng chỗ.
- **Khuyến nghị:** Backend nên trả về status code khác 404 cho lỗi nghiệp vụ.
