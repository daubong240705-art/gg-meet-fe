# Tài Liệu Phân Tích & Thiết Kế Frontend: Tắt Mic / Camera Từng Người Dùng (Targeted Mute)

Tài liệu này mô tả phương án xử lý trên Frontend cho tính năng **Host tắt Mic hoặc Camera của một người dùng cụ thể** trong phòng họp, dựa trên đặc tả API của Backend.

---

## 1. Tính Khả Thi Của Yêu Cầu

**Đánh giá: Rất đơn giản và khả thi.**
- Hệ thống tận dụng tối đa cơ chế của **LiveKit**. Backend xử lý tắt "cứng" (server-side mute), sau đó LiveKit tự động phát sự kiện (`TrackMuted`) cho toàn bộ client trong phòng.
- Frontend không cần phải kết nối thêm WebSocket (STOMP) để xử lý riêng luồng này, chỉ cần sử dụng API REST để gửi yêu cầu và dùng các Hook có sẵn của LiveKit để cập nhật giao diện tự động.

---

## 2. Giao Diện (UI/UX) Cần Bổ Sung

Tính năng này dành riêng cho **Host**, cần thêm các nút thao tác trên giao diện:

1. **Trên danh sách người tham gia (Participant List):**
   - Bên cạnh tên của mỗi người tham gia, có các biểu tượng (icon) trạng thái Mic và Camera.
   - **Với Host:** Khi di chuột (hover) vào biểu tượng Mic hoặc Camera đang ở trạng thái "Bật" của một người dùng bất kỳ, icon sẽ chuyển thành dạng có dấu gạch chéo hoặc hiện tooltip "Tắt Mic" / "Tắt Camera".
   - Host có thể **click trực tiếp vào các icon này** ngay trên danh sách để tắt Mic/Cam của người đó một cách nhanh chóng, hoặc thông qua menu tùy chọn (dấu 3 chấm) bên cạnh tên người dùng.
   - *Lưu ý: Không thể "Bật" hộ người dùng vì lý do bảo mật.*

2. **Trên khung video (Participant Tile / Video Grid):**
   - Khi Host rê chuột (hover) vào khung video của một người tham gia, có thể hiển thị nhanh icon (nút) tắt Mic hoặc tắt Camera trên góc của khung hình đó.

3. **Phản hồi giao diện (Participant nhận):**
   - Khi bị Host tắt Mic/Cam, nút bấm bật/tắt trên thanh công cụ của Participant tự động chuyển sang trạng thái "Tắt".
   - (Tùy chọn) Hiện thêm thông báo Toast cho người bị tắt: *"Host đã tắt Micro của bạn"* hoặc *"Host đã tắt Camera của bạn"*.

---

## 3. Phân Tích Luồng Xử Lý

### Giai đoạn 1: Host Gửi Yêu Cầu Tắt

- Khi Host nhấn nút "Tắt Mic" hoặc "Tắt Camera" của `Participant A`.
- Frontend gọi API `POST /api/meetings/{meetingCode}/participants/{targetId}/mute` với `body`:
  ```json
  {
      "trackType": "AUDIO" // Hoặc "VIDEO"
  }
  ```
- Nếu gọi thành công (200 OK), API trả về. Lúc này chưa cần set state thủ công.

### Giai đoạn 2: Tự Động Cập Nhật Trạng Thái Giao Diện

- Sau khi API chạy thành công, Server LiveKit sẽ ngắt Track tương ứng và tự động phát event **`TrackMuted`** tới tất cả Client.
- Các component sử dụng LiveKit hooks (như `@livekit/components-react`) sẽ nhận được state mới:
  - Component `AudioTrack` hoặc biểu tượng Mic trên `ParticipantTile` sẽ tự động chuyển sang trạng thái "Muted".
  - Component `VideoTrack` sẽ tắt hình và hiển thị avatar mặc định.
- **Phía người bị tắt:** Nút bấm bật/tắt ở thanh điều khiển (Toolbar) cũng sẽ tự động chuyển thành tắt nhờ cơ chế đồng bộ của LiveKit.

### Giai đoạn 3: Hiện Thông Báo (Optional)

Để tăng trải nghiệm người dùng, có thể cấu hình Frontend (người bị tắt) hiển thị một thông báo dạng Toast khi event `TrackMuted` xảy ra nếu không phải do chính người dùng đó thao tác.
- Lắng nghe event `TrackMuted` trên `localParticipant`.
- Kiểm tra nguồn gốc tắt (nếu do Remote thao tác hoặc Server ép tắt).
- Bật Toast: "Micro của bạn đã bị Host tắt".

---

## 4. Tóm Tắt Code Cần Viết

### Gọi API
Bổ sung hàm gọi API vào file service hiện tại (VD: `roomSettingsApi.ts` hoặc `participantApi.ts`):

```typescript
// services/api/participantApi.ts
export const muteParticipantTrack = async (
    meetingCode: string, 
    targetId: string, 
    trackType: "AUDIO" | "VIDEO"
) => {
    return await api.post(`/api/meetings/${meetingCode}/participants/${targetId}/mute`, { trackType });
};
```

### Xử lý giao diện cho Host (Participant List)

```tsx
// components/meeting/ParticipantMenuItem.tsx
import { muteParticipantTrack } from '@/services/api/participantApi';

const handleMuteAudio = async () => {
    try {
        await muteParticipantTrack(meetingCode, participantId, 'AUDIO');
        // Không cần làm gì thêm, LiveKit sẽ tự động tắt UI
    } catch (error) {
        toast.error("Không thể tắt mic người dùng này.");
    }
}

// Render nút (chỉ cho Host)
{isHost && isAudioEnabled && (
    <Button onClick={handleMuteAudio}>Tắt Mic</Button>
)}
```

---

## 5. Tổng Kết

Đây là một tính năng dễ triển khai do LiveKit đã bao bọc hoàn toàn phần logic đồng bộ phức tạp. Công việc chính của Frontend chỉ là:
1. Thêm nút "Tắt" trên UI của Host.
2. Gọi API.
3. (Tùy chọn) Hiện Toast báo cho người bị tắt. Mọi trạng thái đồng bộ về hiển thị Mic/Cam đều được tự động xử lý.
