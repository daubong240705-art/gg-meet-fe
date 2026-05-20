# Lên lịch cuộc họp (Schedule Meeting)

## Tổng quan

**Hook:** `src/hooks/meeting/useScheduleMeetingForm.ts`  
**Page:** `src/app/(main)/schedule/page.tsx`

Cho phép người dùng đã đăng nhập tạo cuộc họp có lịch cụ thể và mời participants qua email.

---

## Form fields

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `title` | string | Tên cuộc họp |
| `date` | string | Ngày họp (YYYY-MM-DD) |
| `time` | string | Giờ họp (HH:MM) |
| `description` | string | Mô tả cuộc họp |
| `emailList` | string[] | Danh sách email participants |
| `participantEmail` | string | Email đang nhập (chưa add) |

Validation dùng Zod schema (`scheduleMeetingSchema` tại `src/lib/meeting/schedule.ts`).

---

## Quản lý danh sách email

### Host email tự động thêm vào
```
useEffect [hostEmail]:
  Nếu hostEmail không có trong emailList → tự động thêm
  → Không thể xóa hostEmail (removeParticipant guard)
```

### Thêm participant
```
handleAddParticipant()
  ├─ Trim participantEmail
  ├─ Validate email format (form.trigger)
  ├─ mergeParticipantEmails() → dedup + normalize
  ├─ Nếu đã có → setError "already added"
  └─ Nếu OK → thêm vào emailList, reset participantEmail
```

### Xóa participant
```
removeParticipant(email)
  ├─ Không cho xóa hostEmail
  └─ filter emailList, getMergedEmailList()
```

---

## Submit

```
onSubmit(values)
  ├─ Merge participantEmail vào emailList (nếu còn text chưa add)
  ├─ buildScheduleMeetingPayload(values):
  │    → Combine date + time thành ISO datetime
  │    → { title, isScheduled: true, meetingDate, meetingTime, description, emailList }
  │
  ├─ meetingApi.scheduleMeeting(payload)
  │    ├─ Thành công:
  │    │    ├─ toast.success("Meeting scheduled")
  │    │    ├─ invalidate UPCOMING_MEETINGS_QUERY
  │    │    ├─ reset form (giữ hostEmail)
  │    │    └─ router.replace("/")
  │    └─ Thất bại:
  │         ├─ Map server field errors về form fields
  │         └─ toast.error() với description
  │
```

### Field error mapping (server → form)

Backend có thể trả về field errors. Các field được map:

| Backend field | Form field |
|---------------|------------|
| `title` | `title` |
| `meetingDate`, `date` | `date` |
| `meetingTime`, `time` | `time` |
| `description` | `description` |
| `emailList`, `participantEmail`, `participants` | `participantEmail` hoặc `emailList` |

Lỗi không map được → hiển thị trên `root` error.

---

## Các vấn đề tiềm ẩn

### 1. Merge participantEmail khi submit
- **Vấn đề:** Nếu người dùng nhập email vào `participantEmail` nhưng không click "Add", khi submit vẫn tự động thêm vào list.
- **Hậu quả:** Behavior có thể gây nhầm lẫn — người dùng có thể không biết email đó đã được thêm.

### 2. Timezone không được xử lý
- **Vấn đề:** `buildScheduleMeetingPayload()` combine date + time thành string mà không xử lý timezone của client.
- **Hậu quả:** Nếu server lưu UTC, người dùng ở timezone khác sẽ thấy giờ họp bị lệch. Cần kiểm tra backend có normalize timezone không.

### 3. Email dedup case-insensitive nhưng lưu original case
- **Vấn đề:** `mergeParticipantEmails()` dedup theo lowercase comparison nhưng lưu giá trị gốc.
- **Hậu quả:** Nếu user nhập `Test@example.com` và `test@example.com`, chỉ một trong hai được giữ lại — email nào tùy vào thứ tự. Không có thông báo.

### 4. Không validate số lượng participants tối đa
- **Vấn đề:** Không có giới hạn `emailList.length` ở phía client.
- **Hậu quả:** User có thể thêm hàng trăm email → server phải validate và từ chối. Lỗi sẽ hiện nhưng UX kém.
