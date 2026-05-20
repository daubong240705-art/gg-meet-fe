Bạn là senior full-stack engineer. Hãy rà soát kỹ chức năng **Room settings** trong dự án web họp Kallio, đặc biệt 2 setting:

1. Allow participants to unmute
2. Allow participants to present / share screen

Hiện đang có bug:
- Khi host tắt chức năng **share màn hình tự do**, setting còn lại như **allow unmute** cũng có thể bị thay đổi theo hoặc bị ảnh hưởng ngoài ý muốn.
- Nhiều khi host tắt **Allow participants to unmute**, sau đó bật lại, nhưng participant vẫn không thể tự mở mic lại được.
- Cần phân tích luồng state từ UI → FE state/store/hooks → WebSocket/STOMP/LiveKit → Backend DB/API, tìm nguyên nhân và đề xuất hướng sửa bền vững.

Yêu cầu chính:
- Chưa cần sửa code ngay.
- Hãy tạo một tài liệu phân tích chi tiết trong thư mục `docs/`, ví dụ:
  `docs/room-settings-audit-and-fix-plan.md`
- Tài liệu viết bằng tiếng Việt, rõ ràng, có heading, bảng phân tích và checklist triển khai.

Phạm vi cần kiểm tra ở frontend:
- Component UI hiển thị popup Room settings.
- State quản lý room settings.
- Hook xử lý bật/tắt mic, camera, share screen.
- Logic kiểm tra quyền như:
  - `canUnmuteMicrophone`
  - `canShareScreen`
  - `isHost`
  - `isLiveKitEnabled`
  - `isMicEnabled`
  - `isScreenShareEnabled`
- Các chỗ gọi API hoặc gửi WebSocket message khi host thay đổi setting.
- Các chỗ nhận event room setting update từ backend/socket.
- Các `useEffect`, `useCallback`, `useMemo` có dependency dễ gây stale state hoặc update nhầm setting.
- Kiểm tra có đang dùng chung object state rồi merge sai không, ví dụ update `allowScreenShare` nhưng làm mất hoặc overwrite `allowUnmute`.

Phạm vi cần kiểm tra ở backend nếu có:
- Entity/DTO/API liên quan đến room settings.
- API update setting phòng.
- WebSocket/STOMP event broadcast setting thay đổi.
- Cách backend lưu từng field setting.
- Có đang update toàn bộ settings object thay vì patch từng field không.
- Có thiếu field khi FE gửi request khiến backend set default sai không.
- Có cần tách rõ event:
  - `ROOM_ALLOW_UNMUTE_CHANGED`
  - `ROOM_ALLOW_PRESENT_CHANGED`
  - thay vì một event chung dễ overwrite nhầm.

Những vấn đề cần phân tích kỹ:

## 1. Bug setting này ảnh hưởng setting kia
Hãy tìm nguyên nhân có thể gồm:
- FE dùng chung state object nhưng update không merge đủ field.
- API update gửi thiếu field, backend hiểu field thiếu là `false`.
- Reducer/store xử lý event bị overwrite toàn bộ settings.
- Optimistic update ở FE làm local state lệch so với backend.
- Event socket trả về payload không đầy đủ.
- Naming field không đồng nhất giữa FE và BE, ví dụ `allowPresent`, `allowScreenShare`, `allowParticipantsToPresent`.

Cần chỉ rõ:
- File nào cần kiểm tra.
- Đoạn logic nào có rủi ro.
- Cách sửa đề xuất.

## 2. Bug bật lại allow unmute nhưng user vẫn không mở mic được
Hãy phân tích theo nhiều lớp:

### Lớp room policy
- `allowParticipantsToUnmute = false` nghĩa là user không được tự unmute.
- Khi bật lại `true`, user phải được phép tự bấm mở mic.

### Lớp LiveKit/local track
- Khi bị host mute hoặc policy cấm unmute, track local audio có đang bị disable/unpublish không?
- Khi bật policy lại, FE có cập nhật lại quyền `canUnmuteMicrophone` không?
- Button mic có đang bị disabled do state cũ không?
- Có cần gọi lại `setMicrophoneEnabled(true)` khi user bấm không?
- Có trường hợp LiveKit permission/token không cập nhật realtime nên cần FE tự enforce bằng local policy không?

### Lớp state/stale closure
- Kiểm tra `useCallback` dependency có thiếu `canUnmuteMicrophone` hoặc room settings không.
- Kiểm tra các hook media control có cache quyền cũ không.
- Kiểm tra event socket đã cập nhật state nhưng component dùng selector/hook khác chưa được refresh không.

## 3. Đề xuất kiến trúc xử lý đúng
Hãy đề xuất hướng chuẩn hóa:
- Backend là source of truth cho room settings.
- FE chỉ optimistic update nếu có rollback rõ ràng.
- Mỗi setting update độc lập theo dạng patch:
  ```json
  {
    "allowParticipantsToUnmute": true
  }