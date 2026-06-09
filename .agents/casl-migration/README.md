# CASL migration — bộ task chi tiết

> Nguồn: [`../fe-casl-authorization-analysis-2026-06-09.md`](../fe-casl-authorization-analysis-2026-06-09.md)
> Phạm vi: `gg-meet-fe` · Mục tiêu: gom logic phân quyền rải rác + prop-drilling về một lớp ability (CASL) tập trung, **không đổi hành vi người dùng**.

Bộ doc này chia lộ trình trong bản phân tích thành **5 task độc lập, làm tuần tự**. Mỗi file là một đơn vị công việc có thể giao cho một người/PR riêng.

## Danh sách task

| # | Task | File | Phụ thuộc | Quy mô | Rủi ro |
|---|------|------|-----------|--------|--------|
| 0 | Hạ tầng ability (packages, types, factory, provider) | [task-0-infrastructure.md](task-0-infrastructure.md) | — | M | Thấp |
| 1 | Admin guard → `AppAbility` | [task-1-admin-guard.md](task-1-admin-guard.md) | 0 | S | Thấp |
| 2 | Per-participant media → `RoomAbility` (gỡ prop-drilling) | [task-2-participant-media.md](task-2-participant-media.md) | 0 | L | Trung bình |
| 3 | Self-actions & footer (unmute/share/end/settings) | [task-3-self-actions-footer.md](task-3-self-actions-footer.md) | 0, (nên sau 2) | M | Trung bình |
| 4 | Dọn dẹp + (tuỳ chọn) test | [task-4-cleanup-and-tests.md](task-4-cleanup-and-tests.md) | 1, 2, 3 | S | Thấp |

Sơ đồ phụ thuộc:

```
        ┌── task-1 (admin) ──┐
task-0 ─┼── task-2 (cards) ──┼── task-4 (cleanup + tests)
        └── task-3 (footer) ─┘
```

Task 1, 2, 3 đều chỉ phụ thuộc Task 0 và **không đụng vào nhau** → có thể làm song song sau khi Task 0 merge. Task 4 là bước cuối, gom dọn.

## Quy ước chung (áp dụng cho mọi task)

- **Vị trí code ability:** `src/lib/auth/ability/` (factory + types thuần, không phụ thuộc React). **Provider React:** `src/features/meeting/providers/` (mirror `meeting-socket-provider.tsx` đã có).
- **Nguồn boolean gốc không đổi:** [`use-room-identity.ts`](../../src/features/meeting/room/hooks/use-room-identity.ts) vẫn là nơi giải mã token và suy ra `canManageWaitingRoom` / `localUserCanUseHostMediaControls`. CASL **tiêu thụ** các boolean này, không thay thế chúng. Tách bạch "tôi là ai" (identity) ↔ "tôi được làm gì" (ability).
- **Không đổi hành vi:** mỗi task là refactor thuần. Sau mỗi task, mọi nút/menu phải hiện/ẩn **y hệt** trước đó.
- **CASL ở FE chỉ là UX.** Backend (`ParticipantPermissionService`, `RoomMuteService`, `TargetedMuteService`, meeting JWT) mới thực thi thật. Khi thêm luật mới sau này, phải sửa **cả** factory FE **và** BE.

## Definition of Done (mọi task)

- [ ] `npm run build` xanh (repo **không có test runner** — đây là cổng kiểm tra type/biên dịch chính).
- [ ] `npm run lint` xanh.
- [ ] Không còn `import`/prop "mồ côi" (TypeScript sẽ báo nếu xoá prop mà còn nơi truyền).
- [ ] Kiểm thử thủ công đúng kịch bản nêu trong từng task (host vs participant).
- [ ] Diff chỉ là refactor — không thêm/bớt khả năng cho người dùng.

## Cách kiểm thử thủ công nhanh (không có test tự động)

Mở 2 tab/2 trình duyệt vào cùng `meetingCode`:
1. **Host** (người tạo phòng): thấy waiting-room controls, menu settings, nút "End for everyone", và trên card người khác có menu mute/stop-share.
2. **Participant**: KHÔNG thấy các thứ trên; nút mic/share bật-tắt theo `allowParticipantUnmute` / `allowParticipantShareScreen` mà host gạt trong settings.
3. Host gạt tắt "allow unmute" → participant đang mở mic bị chặn unmute (nút mic disabled). Gạt lại → mở được. (Kiểm tra reactivity của ability theo `roomSettings`.)

## Lưu ý rủi ro xuyên suốt

- **Reactivity theo `roomSettings`**: ability phải rebuild khi 2 cờ settings đổi runtime — xem Task 0 §Provider và Task 3.
- **`React.memo` ở [`participant-card.tsx`](../../src/components/meeting/room/stage/participant-card.tsx)**: card này memo hoá; khi chuyển từ prop sang context, xem lại hàm so sánh memo (Task 2 §5).
- **Hai dialog Radix** (shortcuts, share-request) không liên quan task này — đừng đụng.
