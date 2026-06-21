# API Layer

## Tổng quan

Toàn bộ HTTP request đi qua hàm `sendRequest<T>()` tại `src/lib/api/wrapper.ts`. Đây là điểm duy nhất xử lý auth header, token refresh, và error normalization.

---

## sendRequest()

```typescript
sendRequest<T>(props: IRequest): Promise<T>
```

### Các tham số chính

| Tham số | Mô tả |
|---------|-------|
| `url` | URL đầy đủ của endpoint |
| `method` | HTTP method (mặc định: `GET`) |
| `body` | Request body (tự động JSON.stringify hoặc để nguyên nếu là FormData) |
| `queryParams` | Query string — được serialize bởi `query-string` |
| `auth` | `true` → đính kèm `Authorization: Bearer <token>` |
| `useCredentials` | `true` → `credentials: "include"` (gửi cookie) |
| `redirectOnAuthFail` | URL redirect khi refresh token thất bại. Mặc định `/sign-in`. Set `false` để tắt |
| `accessToken` | Override token thay vì đọc từ localStorage |
| `cookieHeader` | Cookie thủ công (chỉ server-side + `useCredentials`) |
| `nextOption` | Tùy chọn thêm vào `RequestInit` (ví dụ: `{ keepalive: true }`) |

### Luồng xử lý

```
1. Build URL với queryParams
2. Build headers:
   - content-type: application/json (trừ FormData)
   - X-Client: desktop (khi chạy trong Electron)
   - Authorization: Bearer <token> (nếu auth: true)
   - cookie: ... (nếu server-side + useCredentials + cookieHeader)
3. Guard keepalive: nếu body > 60 KB thì bỏ cờ keepalive (giới hạn 64 KB của fetch keepalive)
4. fetch(url, options)
   - Lỗi mạng (fetch throw) → return { status: 0, statusCode: 0, error: "NetworkError" }
5. Nếu OK → return JSON response (rỗng → {})
6. Nếu 401 + auth: true →
   a. getFreshToken() — dedup bằng refreshPromise singleton, gọi POST /auth/refresh
   b. Cập nhật Authorization header + persistAccessToken(token mới)
   c. Retry request
   d. Nếu retry OK → return JSON
   e. Nếu refresh fail (không có token mới) → clearStoredAccessToken() + redirect
7. Các lỗi khác → normalize thành object {status, statusCode, message, error, errors}
```

> Token refresh tự rẽ nhánh theo môi trường: bản web gửi refresh token qua HTTP-only cookie
> (`credentials: "include"`), bản desktop (Electron) gửi qua header `X-Refresh-Token` và xoay vòng
> token mới qua store mã hoá `safeStorage` — xem [auth/authentication.md](../auth/authentication.md).

---

## Error normalization

Khi request thất bại (non-2xx và không phải 401-với-auth), wrapper trả về object:

```typescript
{
  status: number,       // HTTP status hoặc từ body
  statusCode: number,
  message: string,      // Thông báo lỗi
  error: string | null,
  errors: FieldError[]  // Validation errors (nếu có)
}
```

Caller không cần try/catch — lỗi được nhúng vào response object và cần kiểm tra `assertApiSuccess()`.

---

## assertApiSuccess()

```typescript
// src/hooks/shared/mutation.utils.ts
assertApiSuccess(response) → throws IBackendRes nếu không success
```

Hàm này throw response object (không phải Error) khi status không phải 2xx. Trong React Query mutation, `onError` nhận `IBackendRes<unknown>`.

---

## Meeting API Service

`src/shared/services/meeting/client.ts` — export object `meetingApi` với các method:

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `createInstantMeeting(title)` | POST `/meetings?title=...` | Tạo meeting tức thì |
| `scheduleMeeting(data)` | POST `/meetings/schedule` | Lên lịch meeting |
| `getUpcomingMeetings({page, size})` | GET `/meetings/upcoming` | Danh sách meeting sắp tới |
| `verifyMeeting(meetingCode)` | POST `/meetings/verify?meetingCode=...` | Kiểm tra meeting tồn tại |
| `joinMeeting(meetingCode, guestRequest?)` | POST `/meetings/{code}/join` | Tham gia meeting |
| `getWaitingRoomRequests(meetingCode, meetingToken)` | GET `/meetings/{code}/waiting-room` | Lấy danh sách chờ |
| `getJoinRequestStatus(meetingCode, meetingToken)` | GET `/meetings/{code}/join-status` | Kiểm tra trạng thái join |
| `endMeeting(meetingCode)` | DELETE `/meetings?meetingCode=...` | Kết thúc meeting |
| `leaveMeeting(code, participantId, token, opts?)` | DELETE `/meetings/leave` | Rời phòng |
| `cancelJoin(meetingCode, request?, opts?)` | POST `/api/proxy/meetings/{code}/cancel-join` | Hủy yêu cầu tham gia |
| `cancelJoinWithBeacon(meetingCode, request?)` | `navigator.sendBeacon(...)` | Hủy khi đóng trang |
| `muteParticipantTrack(code, id, type, token)` | POST `/meetings/{code}/participants/{id}/mute` | Tắt mic/camera participant |
| `updateRoomSettings(code, settings, token)` | PATCH `/meetings/{code}/settings` | Cập nhật cài đặt phòng |
| `requestScreenShare(code, token)` | POST `/meetings/{code}/screen-share-requests` | Yêu cầu chia sẻ màn hình |
| `approveScreenShare(code, requesterId, token)` | POST `/meetings/{code}/screen-share-requests/{id}/approve` | Duyệt share screen |
| `rejectScreenShare(code, requesterId, token)` | POST `/meetings/{code}/screen-share-requests/{id}/reject` | Từ chối share screen |
| `forceStopScreenShare(code, targetId, token)` | POST `/meetings/{code}/screen-share/{id}/stop` | Buộc dừng share screen |

### Meeting Token

Tất cả API liên quan đến phòng họp (sau khi join) cần gửi kèm `Meeting-Token` header. Meeting token khác với user JWT — nó encode `participantId`, `meetingCode`, và `role` (HOST/PARTICIPANT).

---

## Cancel-join Proxy Route

`src/app/api/proxy/meetings/[meetingCode]/cancel-join/route.ts`

Đây là Next.js API route proxy để cho phép `navigator.sendBeacon()` hoạt động khi người dùng đóng tab:
- Beacon gửi POST đến `/api/proxy/meetings/{code}/cancel-join`
- Route này forward sang backend thực sự
- Lý do cần proxy: `sendBeacon()` không thể set custom headers như Authorization hay Cookie đúng cách với cross-origin
