# Tài Liệu Phân Tích & Thiết Kế Frontend: Quản Lý Cài Đặt Phòng (Host Settings)

Tài liệu này mô tả chi tiết phương án xử lý trên Frontend cho các tính năng: **Tắt mic toàn bộ & chặn mở mic** và **Kiểm soát quyền chia sẻ màn hình**, dựa trên đặc tả API và WebSocket từ Backend.

---

## 1. Tính Khả Thi Của Yêu Cầu

**Đánh giá: Rất khả thi và an toàn.**
- **Bảo mật & Đồng bộ:** Backend và LiveKit Server đã đảm nhận phần "Hard-Mute" (server-side mute) và chặn quyền. Frontend chỉ cần tập trung vào việc hiển thị UI (vô hiệu hóa các nút, đổi trạng thái) và tương tác với các API/WebSocket để phản hồi thay đổi.
- **Realtime:** Với sự kết hợp giữa LiveKit Metadata (Broadcast tự động cho toàn phòng) và STOMP WebSocket (Gửi event cá nhân hóa), Frontend có đầy đủ phương tiện để đảm bảo UI đồng bộ tức thời ngay khi Host thay đổi cài đặt hoặc duyệt/từ chối yêu cầu.

---

## 2. Giao Diện (UI/UX) Cần Bổ Sung

Theo yêu cầu, cần bổ sung các thành phần giao diện sau:

1. **Nút Settings (Cài đặt phòng):** 
   - Vị trí: Ở góc màn hình phòng họp (thường nằm ở thanh công cụ dưới cùng hoặc góc trên bên phải).
   - Quyền hiển thị: Chỉ hiển thị nếu người dùng hiện tại là **Host**.
   - Hành động: Khi ấn sẽ mở ra một Menu (hoặc Modal/Drawer) Cài đặt.

2. **Menu Cài Đặt Phòng (Host Settings Menu):**
   - Chứa 2 toggle switch:
     - [x] Cho phép người tham gia tự mở mic (`allowParticipantUnmute`).
     - [x] Cho phép người tham gia tự chia sẻ màn hình (`allowParticipantShareScreen`).

3. **Giao diện xin phép Chia sẻ màn hình (Participant):**
   - Khi `allowParticipantShareScreen` là `false`, nếu người dùng ấn vào nút "Chia sẻ màn hình", thay vì mở cửa sổ chọn màn hình ngay, hệ thống sẽ hiện một **Dialog**: "Host đã khóa chức năng chia sẻ. Bạn có muốn gửi yêu cầu xin chia sẻ màn hình không?".
   - Trạng thái chờ: Nút Share chuyển sang dạng `Đang chờ duyệt...` (disabled).

4. **Giao diện duyệt yêu cầu (Host):**
   - Khi có Participant xin share, Host sẽ nhận được thông báo dạng **Toast Notification** hoặc hiển thị trong một **Danh sách yêu cầu**.
   - Có 2 nút trên Toast/Danh sách: `Cho Phép` (Approve) và `Từ Chối` (Reject).

5. **Nút "Force Stop Share" (Host):**
   - Trên thumbnail của người đang share màn hình, Host có tùy chọn "Dừng chia sẻ của người này".

---

## 3. Kiến Trúc Tách File Xử Lý (Frontend File Structure)

Để code dễ bảo trì và tái sử dụng, nên tách luồng xử lý thành các file riêng biệt ứng với từng giai đoạn và chức năng. Cấu trúc thư mục đề xuất:

```text
gg-meet-fe/
├── src/
│   ├── components/
│   │   ├── meeting/
│   │   │   ├── HostSettingsButton.tsx     # Nút cài đặt ở góc màn hình
│   │   │   ├── HostSettingsMenu.tsx       # Menu bật/tắt quyền mở mic, share screen
│   │   │   ├── ScreenShareRequestModal.tsx# Dialog để Participant gửi yêu cầu
│   │   │   └── HostApprovalToasts.tsx     # Toast thông báo cho Host để duyệt
│   ├── hooks/
│   │   ├── meeting/
│   │   │   ├── useRoomSettings.ts         # Quản lý state của setting phòng (sync với LiveKit Metadata)
│   │   │   ├── useScreenShareRequests.ts  # Quản lý luồng gửi/nhận/duyệt request qua WebSocket
│   │   │   └── useMediaControl.ts         # Hook bọc LiveKit để chặn nút bật Mic/Share
│   ├── services/
│   │   └── api/
│   │       └── roomSettingsApi.ts         # Các hàm gọi API (PATCH settings, POST requests...)
```

---

## 4. Phân Tích Luồng Xử Lý Chi Tiết

### Giai đoạn 1: Khởi tạo và Quản lý trạng thái (State Management)

**File xử lý chính: `hooks/useRoomSettings.ts`**

- Trạng thái cài đặt phòng (VD: `allowParticipantUnmute`, `allowParticipantShareScreen`) không nên lưu hoàn toàn bằng React State nội bộ, mà nên **đồng bộ với LiveKit Room Metadata**.
- **Khi Join phòng:** Đọc Room Metadata từ LiveKit để khởi tạo trạng thái các nút bấm (VD: nếu `allowParticipantUnmute` = `false`, disable ngay nút bật Mic).
- **Khi Host đổi setting:** 
  - Gọi API `PATCH /api/meetings/{meetingCode}/settings`.
  - Không cần set state thủ công. Đợi event `RoomMetadataChanged` từ LiveKit trả về (hoặc event `ROOM_SETTINGS_CHANGED` từ STOMP) để tự động cập nhật UI cho toàn bộ phòng.

### Giai đoạn 2: Xử lý Tắt Mic & Chặn tự mở Mic (`allowParticipantUnmute`)

**File xử lý chính: `hooks/useMediaControl.ts` & Component Toolbar**

1. **Sự kiện thay đổi (Participant):**
   - Khi LiveKit broadcast `RoomMetadataChanged` với `allowParticipantUnmute: false`.
   - Backend đã server-side mute track của người dùng (LiveKit sẽ tự động tắt mic trên client, track bị disable).
   - Component Toolbar lắng nghe metadata này: **Disable** nút bấm Unmute (làm xám đi) và đổi tooltip thành: *"Host đã chặn quyền tự mở mic"*.
2. **Sự kiện thay đổi sang True:**
   - Khi `allowParticipantUnmute: true` được phát xuống, **Enable** lại nút bấm Unmute. Mic vẫn đang tắt, nhưng người dùng đã có thể click để bật lại.

### Giai đoạn 3: Luồng Yêu Cầu & Duyệt Chia Sẻ Màn Hình (`allowParticipantShareScreen`)

Luồng này phức tạp hơn, có thể tách làm 2 phần (Host & Participant).

**Phần A: Phía Participant (Người tham gia)**
**File xử lý: `components/ScreenShareRequestModal.tsx` & `hooks/useScreenShareRequests.ts`**

1. Nút "Chia sẻ màn hình" kiểm tra `allowParticipantShareScreen`. Nếu `false`, khi click sẽ mở `ScreenShareRequestModal`.
2. Participant ấn "Gửi yêu cầu":
   - Gọi API `POST /api/meetings/{meetingCode}/screen-share-requests`.
   - Cập nhật state nội bộ: `isWaitingForShareApproval = true`.
3. Lắng nghe WebSocket:
   - Nếu nhận event `SCREEN_SHARE_APPROVED`: Tắt trạng thái chờ, tự động trigger hàm `LiveKitRoom.localParticipant.setScreenShareEnabled(true)`.
   - Nếu nhận event `SCREEN_SHARE_REJECTED`: Hiển thị thông báo (Toast) "Yêu cầu chia sẻ bị từ chối" và reset trạng thái chờ.

**Phần B: Phía Host (Người chủ trì)**
**File xử lý: `components/HostApprovalToasts.tsx` & `hooks/useScreenShareRequests.ts`**

1. Lắng nghe WebSocket: Nhận event `SCREEN_SHARE_REQUESTED` (chứa `requesterId`, `targetName`).
2. Hiển thị UI: Thêm yêu cầu vào danh sách hoặc hiện một Toast kéo dài.
3. Host thao tác:
   - Ấn **Approve**: Gọi API `POST /.../approve`. Đóng Toast.
   - Ấn **Reject**: Gọi API `POST /.../reject`. Đóng Toast.

### Giai đoạn 4: Ép dừng chia sẻ màn hình (Force Stop)

**File xử lý: Video/Participant Component**

- Khi một người đang share màn hình, Host nhìn thấy luồng video chia sẻ của họ.
- Trên giao diện luồng video đó của Host, hiển thị nút **Stop Share**.
- Khi Host click: Gọi API `POST /api/meetings/{meetingCode}/screen-share/{targetId}/stop`.
- Backend ép tắt luồng qua LiveKit. Đồng thời toàn phòng nhận STOMP event `SCREEN_SHARE_STOPPED`.
- Frontend của người bị tắt (Participant) sẽ tự động bị LiveKit drop track chia sẻ (do server-side mute), trả giao diện về bình thường, và hiển thị thông báo "Host đã dừng chia sẻ màn hình của bạn".

---

## 5. Tóm tắt các hàm API & Hook cần định nghĩa

```typescript
// services/api/roomSettingsApi.ts
export const updateRoomSettings = (meetingCode: string, settings: { allowParticipantUnmute?: boolean, allowParticipantShareScreen?: boolean }) => ...
export const requestScreenShare = (meetingCode: string) => ...
export const approveScreenShare = (meetingCode: string, requesterId: string) => ...
export const rejectScreenShare = (meetingCode: string, requesterId: string) => ...
export const forceStopScreenShare = (meetingCode: string, targetId: string) => ...
```

```typescript
// hooks/useRoomSettings.ts
export const useRoomSettings = () => {
    // 1. Lấy metadata từ Livekit (useRoomContext hoặc useLiveKitRoom)
    // 2. Lắng nghe sự kiện STOMP / LiveKit Metadata thay đổi
    // 3. Return trạng thái allowParticipantUnmute, allowParticipantShareScreen để UI (Toolbar) react theo.
}
```

## 6. Tổng Kết

Với kiến trúc này, FE hoàn toàn thụ động phản ứng theo các **Sự kiện thực tế** thay vì tự giữ state giả. 
- Mọi logic chặn/khóa đều do backend kiểm soát thông qua Metadata & STOMP. 
- Tính khả thi hoàn hảo, giảm thiểu lỗi desync trạng thái giữa các client trong phòng. Việc phân tách logic ra thành các hooks riêng biệt giúp các file component UI nhẹ gọn, chỉ tập trung vào việc render.
