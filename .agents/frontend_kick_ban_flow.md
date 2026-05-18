# Tài Liệu Kỹ Thuật: Luồng Kick & Ban Người Dùng (Frontend)

## 1. Tổng Quan Luồng Xử Lý
Tính năng này cho phép người chủ trì (Host) đuổi một thành viên ra khỏi phòng họp. Tính năng hỗ trợ 2 chế độ:
- **Soft Kick:** Mời người dùng ra khỏi phòng, nhưng họ vẫn có quyền xin tham gia lại vào lần sau.
- **Kick & Ban (Block):** Đuổi người dùng ra khỏi phòng và cấm họ vĩnh viễn không được tham gia lại phòng họp này.

Quá trình này dựa trên giao tiếp thời gian thực qua **WebSocket / STOMP**.

---

## 2. Thông Số API / WebSocket (Host Gửi Yêu Cầu)
Khi Host quyết định kích một người dùng, Frontend sẽ thực hiện gửi một message qua giao thức WebSocket đang kết nối.

- **Giao thức:** STOMP / WebSocket
- **Endpoint (Destination):** `/api/meeting/kickout`
- **Cấu trúc Payload (JSON):**
```json
{
  "meetingCode": "string",         // Mã phòng họp hiện tại (VD: "abc-defg-hij")
  "targetParticipantId": "string", // ID của người dùng bị chọn để kick
  "isBan": boolean                 // true: Kick & Ban (Cấm vào lại) | false: Soft Kick (Chỉ đuổi)
}
```

---

## 3. Lắng Nghe Sự Kiện Nhận Về (Tất Cả Client)
Sau khi Host gửi yêu cầu thành công, Backend sẽ broadcast một sự kiện thông báo cho toàn bộ người dùng đang có mặt trong phòng. Client cần lắng nghe để cập nhật giao diện ngay lập tức.

- **Topic lắng nghe:** `/topic/meeting/{meetingCode}/notifications`
- **Event Name/Type:** `USER_KICKED` *(Hoặc theo định nghĩa Enum của BE)*
- **Dữ liệu nhận về (Event Payload):** Sẽ chứa thuộc tính `participantId` của người vừa bị kích.

---

## 4. Phân Luồng Xử Lý Giao Diện (FE Logic)

### 4.1. Đối với Host (Người thao tác)
- **Điều kiện hiển thị:** Chỉ render Option "Đuổi khỏi phòng" nếu `myRole === 'HOST'`.
- **Trải nghiệm người dùng (UX):**
  1. Khi click vào Option "Đuổi khỏi phòng" (ở danh sách thành viên hoặc trên ô camera).
  2. Hiển thị **Confirmation Modal** xác nhận: *"Bạn có chắc chắn muốn đuổi người này ra khỏi phòng không?"*
  3. Trong Modal, cung cấp Checkbox: `[ ] Cấm người này tham gia lại phòng họp`.
     - Nếu tick Checkbox -> payload gửi đi `isBan: true`.
     - Nếu không tick -> payload gửi đi `isBan: false`.
  4. Thực hiện hàm gửi message lên Destination `/api/meeting/kickout`.

### 4.2. Đối với Người Bị Kick (Kicked User)
- **Điều kiện kiểm tra:** Khi nhận event từ WebSocket, `if (event.participantId === myParticipantId)`
- **Hành động bắt buộc:**
  1. **Hiển thị thông báo (Alert/Modal):** Hiển thị ngay thông báo: *"Bạn đã bị Host mời ra khỏi phòng họp."*
  2. **Ngắt kết nối LiveKit (Core):** Lập tức ngắt kết nối phòng học để tắt camera/audio.
     ```javascript
     if (room) {
       room.disconnect();
     }
     ```
  3. **Điều hướng (Redirect):** Đẩy người dùng về trang chủ (`/`) hoặc một màn hình báo trạng thái (`/meeting/kicked`).

### 4.3. Đối với Những Người Dùng Còn Lại (Bao gồm cả Host)
- **Điều kiện kiểm tra:** Khi nhận event, `if (event.participantId !== myParticipantId)`
- **Hành động cập nhật UI:**
  1. **Cập nhật State Participant:** Xoá user bị kick khỏi State chứa danh sách người tham gia (dẫn đến việc xoá Video Tile trên Grid Layout).
  2. *(Lưu ý: FE cũng có thể tận dụng thêm event `ParticipantDisconnected` tự động bắn ra từ LiveKit Server để kết hợp dọn dẹp giao diện).*
  3. **Thông báo (Toast):** Hiển thị Toast Message nhỏ gọn ở góc màn hình: *"\{Tên người dùng\} đã bị mời ra khỏi phòng."*
