# Upcoming Meetings (Cuộc họp sắp tới)

## Tổng quan

Hiển thị danh sách các cuộc họp đã lên lịch của người dùng và gửi toast notification khi cuộc họp sắp bắt đầu.

---

## useUpcomingMeetings

**File:** `src/hooks/meeting/useUpcomingMeetings.ts`

```typescript
useUpcomingMeetings({ page = 0, size = 3 })
```

- API: `meetingApi.getUpcomingMeetings({ page, size })`
- Endpoint: `GET /meetings/upcoming`
- **staleTime:** 30 giây — không refetch nếu data mới hơn 30s
- **refetchInterval:** 60 giây — tự động refresh mỗi phút (không refresh khi tab ở background)
- **placeholderData:** giữ data cũ trong khi đang load mới (không flash loading)
- **select:** chỉ extract `data.content` (array meetings)

### Invalidation

Query key `["meetings", "upcoming"]` bị invalidate khi:
- Tạo meeting mới (`createInstantMeeting`)
- Schedule meeting thành công

---

## useUpcomingMeetingNotifications

**File:** `src/hooks/meeting/use-upcoming-meeting-notifications.ts`

Chạy trong layout component, theo dõi danh sách upcoming meetings và hiển thị toast khi meeting đang bắt đầu.

### Logic

```
Mỗi khi meetings hoặc nowMs thay đổi:
  forEach meeting:
    ├─ Bỏ qua nếu đang ở trang của meeting đó
    ├─ Bỏ qua nếu đã thông báo (notifiedMeetingsRef hoặc sessionStorage marker)
    ├─ getUpcomingMeetingTiming(meeting, nowMs) → timing.state
    └─ Nếu state = "starting-now" → toast.info với action "Join now"
```

### Deduplication toast

Sử dụng 2 lớp dedup:
1. **In-memory:** `notifiedMeetingsRef` (Set) — reset khi page refresh
2. **sessionStorage:** key `gg-meet:upcoming-started:{code}:{startTime}` — persist trong tab session

Notification key = `{meetingCode}:{startTime}` — nếu meeting bị reschedule (startTime thay đổi), sẽ tạo key mới và notification mới.

### "starting-now" state

Được xác định bởi `getUpcomingMeetingTiming()` trong `src/lib/meeting/upcoming.ts`. Meeting được coi là "starting-now" trong một cửa sổ thời gian xung quanh `startTime`.

---

## Meeting timing states

| State | Ý nghĩa |
|-------|---------|
| `"upcoming"` | Chưa đến giờ |
| `"starting-soon"` | Sắp bắt đầu (thường trong 5-15 phút) |
| `"starting-now"` | Đang trong cửa sổ bắt đầu |
| `"active"` | Đang diễn ra |
| `"ended"` | Đã kết thúc |

---

## Component hiển thị

| Component | File |
|-----------|------|
| `UpcomingMeetingCard` | `src/components/home/upcoming-meeting-card.tsx` |
| `AuthenticatedHomeUpcoming` | `src/components/home/authenticated-home-upcoming.tsx` |
| `AuthenticatedHomeScheduleBanner` | `src/components/home/authenticated-home-schedule-banner.tsx` |

---

## Các vấn đề tiềm ẩn

### 1. nowMs không đồng bộ real-time
- **Vấn đề:** `nowMs` được cập nhật theo interval từ `use-current-time.ts`. Khoảng cập nhật quyết định độ trễ phát hiện "starting-now".
- **Hậu quả:** Notification có thể trễ vài giây đến vài phút tùy interval.

### 2. refetchInterval = 60 giây
- **Vấn đề:** Danh sách meetings chỉ được cập nhật mỗi 60 giây.
- **Hậu quả:** Nếu host cancel meeting, người khác mất đến 60 giây để thấy meeting biến mất.

### 3. sessionStorage notification marker không có TTL
- **Vấn đề:** `gg-meet:upcoming-started:{key}` tồn tại trong tab session mà không hết hạn.
- **Hậu quả:** Trong tab hiện tại, người dùng sẽ không nhận thông báo nếu họ dismiss toast và muốn được nhắc lại.

### 4. Không thông báo khi tab ở background
- **Vấn đề:** `refetchIntervalInBackground: false` — không fetch khi tab inactive.
- **Hậu quả:** Người dùng để tab ở background, khi quay lại có thể đã miss notification vì data cũ. Refetch xảy ra khi focus lại tab, nhưng notification dedup sẽ ngăn toast nếu meeting đã qua window "starting-now".
