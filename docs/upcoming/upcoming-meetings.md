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
