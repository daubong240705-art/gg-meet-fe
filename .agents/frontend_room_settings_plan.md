# Plan Triển Khai Frontend: Room Settings

---

## 1. Phạm Vi Và Nguyên Tắc

### Phạm vi FE

Frontend chỉ chịu trách nhiệm:
- Render UI theo role Host/Participant.
- Gọi API thay đổi settings hoặc gửi/duyệt/từ chối request.
- Đồng bộ UI từ LiveKit room metadata và STOMP event.
- Chặn thao tác UI ở client để UX rõ ràng.
- Hiển thị toast/dialog khi quyền bị khóa, request được duyệt/từ chối, hoặc share bị dừng.

### Không xử lý ở FE

Frontend không tự quyết định quyền thật sự:
- Backend/LiveKit server là nguồn quyền cuối cùng.
- FE không tự tin tưởng state local sau khi gọi API thành công.
- Sau khi Host update settings, FE đợi metadata/socket event để cập nhật toàn phòng.

---

## 2. Dependency Cần Chốt Với Backend

Trước khi code, cần xác nhận chính xác các contract sau:

### API settings

```http
PATCH /api/meetings/{meetingCode}/settings
```

Body dự kiến:

```json
{
  "allowParticipantUnmute": true,
  "allowParticipantShareScreen": false
}
```

Cần xác nhận:
- Có cần `Meeting-Token` header không.
- Response trả `null`, settings mới, hay meeting data.
- Field trong LiveKit room metadata có đúng tên `allowParticipantUnmute` và `allowParticipantShareScreen` không.

### API screen share request

```http
POST /api/meetings/{meetingCode}/screen-share-requests
POST /api/meetings/{meetingCode}/screen-share-requests/{requesterId}/approve
POST /api/meetings/{meetingCode}/screen-share-requests/{requesterId}/reject
POST /api/meetings/{meetingCode}/screen-share/{targetId}/stop
```

Cần xác nhận:
- `requesterId` là `meetingParticipantId` number hay LiveKit identity string.
- Có request id riêng không.
- Có cho phép nhiều request pending cùng lúc không.
- Event reject/approve gửi vào participant topic hay meeting topic.

### STOMP event

Các action FE nên support:

```text
ROOM_SETTINGS_CHANGED
SCREEN_SHARE_REQUESTED
SCREEN_SHARE_APPROVED
SCREEN_SHARE_REJECTED
SCREEN_SHARE_STOPPED
```

Payload tối thiểu cần parse:

```ts
type MeetingSocketMessage = {
  meetingCode?: string | null;
  targetParticipantId?: number | null;
  targetName?: string | null;
  requesterId?: number | null;
  requesterName?: string | null;
  action?: string | null;
  allowParticipantUnmute?: boolean | null;
  allowParticipantShareScreen?: boolean | null;
};
```

---

## 3. File Cần Thêm/Sửa

### Service/types

- Sửa `src/shared/services/meeting/types.ts`
  - Thêm `RoomSettings`, `UpdateRoomSettingsRequest`.
  - Thêm response types cho request/approve/reject/force stop.

- Sửa `src/shared/services/meeting/client.ts`
  - Thêm `meetingApi.updateRoomSettings`.
  - Thêm `meetingApi.requestScreenShare`.
  - Thêm `meetingApi.approveScreenShare`.
  - Thêm `meetingApi.rejectScreenShare`.
  - Thêm `meetingApi.forceStopScreenShare`.

### Socket

- Sửa `src/lib/meeting/meeting-websocket.ts`
  - Mở rộng `MeetingSocketAction`.
  - Parse thêm field screen share/settings nếu backend gửi kèm.

- Sửa `src/features/meeting/room/hooks/use-room-socket-events.ts`
  - Route event settings/screen-share về callback mới.

### Hooks

- Thêm `src/features/meeting/room/hooks/use-room-settings.ts`
  - Đọc LiveKit `room.metadata`.
  - Lắng nghe `RoomEvent.RoomMetadataChanged`.
  - Expose `settings`, `isLoading`, `isUpdating`, `updateSettings`.

- Sửa `src/features/meeting/room/hooks/use-room-media-controls.ts`
  - Nhận `canUnmuteMicrophone`.
  - Nếu participant đang muted và `canUnmuteMicrophone=false`, không cho bật mic.
  - Tooltip/disabled state truyền xuống toolbar.

- Sửa `src/features/meeting/room/hooks/use-room-screen-share.ts`
  - Nhận `canShareScreen`, `isHost`, `meetingCode`, `meetingToken`, `localMeetingParticipantId`.
  - Nếu participant không được share, mở request dialog thay vì gọi LiveKit.
  - Quản lý state pending approval.
  - Khi được approve, gọi `room.localParticipant.setScreenShareEnabled(true)`.

- Thêm `src/features/meeting/room/hooks/use-screen-share-requests.ts`
  - Host nhận request qua socket.
  - Participant nhận approve/reject/stop qua socket.
  - Expose danh sách pending requests và actions approve/reject.

### Components

- Thêm `src/components/meeting/room/room-settings-menu.tsx`
  - Menu settings cho Host.
  - Hai switch: mic unmute và screen share.
  - Disable switch khi đang update.

- Thêm `src/components/meeting/room/screen-share-request-dialog.tsx`
  - Dialog cho participant gửi request share screen.

- Thêm `src/components/meeting/room/screen-share-request-toasts.tsx` hoặc xử lý toast trong hook
  - Host nhận request với hai action Approve/Reject.

- Sửa `src/components/meeting/room/room-footer-controls.tsx`
  - Thêm nút settings chỉ Host thấy.
  - Disable nút unmute khi Host khóa quyền tự mở mic.
  - Truyền state pending vào nút share/present.

- Sửa `src/components/meeting/room/room-footer.tsx`
  - Quản lý `openMenu === "settings"` nếu dùng floating menu.
  - Truyền props settings xuống controls.

- Sửa `src/components/meeting/room/room-stage.tsx`
  - Truyền callback force stop share vào khu vực screen-share chính.

- Sửa `src/components/meeting/room/participant-card.tsx`
  - Nếu participant đang share và user hiện tại là Host, hiển thị action `Stop presenting`.

- Sửa `src/components/meeting/room/room.tsx`
  - Compose toàn bộ hook mới.
  - Truyền settings vào media/screen/footer/stage.
  - Truyền callbacks socket events vào `useRoomSocketEvents`.

---

## 4. Kế Hoạch Triển Khai Theo Phase

### Phase 1: Chuẩn hóa types và API client

Mục tiêu: FE có đủ hàm gọi backend, chưa cần UI.

Các bước:
1. Thêm type:
   - `RoomSettings`
   - `UpdateRoomSettingsRequest`
   - `ScreenShareRequestData`
2. Thêm API methods trong `meetingApi`:
   - `updateRoomSettings(meetingCode, settings, meetingToken)`
   - `requestScreenShare(meetingCode, meetingToken)`
   - `approveScreenShare(meetingCode, requesterId, meetingToken)`
   - `rejectScreenShare(meetingCode, requesterId, meetingToken)`
   - `forceStopScreenShare(meetingCode, targetId, meetingToken)`
3. Dùng `encodeURIComponent(meetingCode)` giống các API hiện có.
4. Gửi `Meeting-Token` header giống `muteParticipantTrack`.
5. Auth dùng cùng pattern hiện tại: đọc access token nếu có, `redirectOnAuthFail: false`.

Acceptance criteria:
- TypeScript compile.
- Các method thống nhất style với `meetingApi.muteParticipantTrack`.
- Không làm đổi behavior join/waiting room hiện tại.

---

### Phase 2: Đồng bộ room settings từ LiveKit metadata

Mục tiêu: toàn bộ UI đọc cùng một nguồn settings.

Các bước:
1. Tạo parser metadata:
   - Input: `room.metadata` string.
   - Output default:
     ```ts
     {
       allowParticipantUnmute: true,
       allowParticipantShareScreen: true
     }
     ```
2. Thêm hook `useRoomSettings`.
3. Trong hook:
   - Khi room connect, đọc metadata hiện tại.
   - Lắng nghe `RoomEvent.RoomMetadataChanged`.
   - Parse phòng trường hợp metadata invalid JSON.
   - Expose `updateRoomSettingsPatch`.
4. Khi Host toggle:
   - Optimistic loading cho switch đang đổi.
   - Gọi API.
   - Không commit settings local như nguồn chính.
   - Chỉ clear loading khi API trả về hoặc metadata event tới.

Acceptance criteria:
- Participant mới join nhận đúng settings ban đầu.
- Host đổi setting thì Host và Participant đều update theo metadata.
- Metadata invalid không crash UI, default về allow.

---

### Phase 3: UI Host Settings

Mục tiêu: Host có menu cài đặt phòng ở footer.

Các bước:
1. Mở rộng `FooterMenuKey` thêm `"settings"`.
2. Thêm icon settings bằng `Settings` từ `lucide-react`.
3. Chỉ render nút settings khi `isHost=true`.
4. Tạo `RoomSettingsMenu` dùng `FloatingMenuPanel`.
5. Trong menu có 2 switch/checkbox:
   - `Allow participants to unmute`
   - `Allow participants to present`
6. Khi toggle:
   - Gọi `updateRoomSettings({ allowParticipantUnmute: nextValue })`.
   - Gọi `updateRoomSettings({ allowParticipantShareScreen: nextValue })`.
7. Disable control khi đang update field tương ứng.
8. Đóng menu khi click outside/Escape theo pattern footer hiện có.

Acceptance criteria:
- Participant không thấy nút settings.
- Host thấy nút settings và toggle được.
- UI không nhảy layout trên desktop/mobile.
- Error API hiển thị toast và switch trở về state metadata hiện tại.

---

### Phase 4: Chặn participant tự mở mic

Mục tiêu: khi Host khóa unmute, participant không bật mic lại từ toolbar.

Các bước:
1. Trong `MeetingRoomContent`, tính:
   ```ts
   const canUnmuteMicrophone =
     canManageWaitingRoom || roomSettings.allowParticipantUnmute || isMicEnabled;
   ```
   Ý nghĩa:
   - Host luôn được control mic.
   - Participant đang bật mic vẫn được mute chính mình.
   - Participant đang muted không được unmute nếu setting khóa.
2. Sửa `useRoomMediaControls` hoặc wrapper handler:
   - Nếu `!isMicEnabled && !canUnmuteMicrophone`, show toast và return.
3. Sửa `SplitControlButton` nếu cần support `disabled` và `title`.
4. Truyền disabled/tooltip xuống `RoomFooterControls`.
5. Khi backend hard-mute participant sau khi Host khóa, LiveKit `TrackMuted` sẽ sync `isMicEnabled=false`.

Acceptance criteria:
- Participant đang muted thấy nút mic disabled khi `allowParticipantUnmute=false`.
- Participant vẫn mute được mic của chính mình nếu đang bật.
- Host không bị disable.
- Khi setting bật lại, participant bật mic được bình thường.

---

### Phase 5: Luồng participant xin quyền share screen

Mục tiêu: participant không được share trực tiếp khi Host khóa, nhưng gửi được request.

Các bước:
1. Thêm `ScreenShareRequestDialog`.
2. Trong `useRoomScreenShare`, trước khi gọi LiveKit:
   - Nếu là Host: cho share.
   - Nếu `allowParticipantShareScreen=true`: cho share.
   - Nếu đang share: cho stop share.
   - Nếu bị khóa và chưa pending: mở dialog.
   - Nếu đang pending: show toast hoặc disable action.
3. Khi participant confirm:
   - Gọi `meetingApi.requestScreenShare`.
   - Set `isWaitingForShareApproval=true`.
   - Toast: request sent.
4. Trong footer screen menu:
   - Nếu pending, label `Waiting for approval`.
   - Disable `Present now`.
5. Khi nhận `SCREEN_SHARE_APPROVED`:
   - Clear pending.
   - Gọi `setScreenShareEnabled(true)`.
6. Khi nhận `SCREEN_SHARE_REJECTED`:
   - Clear pending.
   - Toast rejected.

Acceptance criteria:
- Participant không thấy browser picker khi share bị khóa.
- Request chỉ gửi một lần khi đang pending.
- Approve tự mở picker/share flow.
- Reject trả UI về bình thường.

---

### Phase 6: Host nhận và xử lý request share screen

Mục tiêu: Host duyệt/từ chối request realtime.

Các bước:
1. Mở rộng `MeetingSocketMessage` parse requester fields.
2. Trong `useRoomSocketEvents`, khi action `SCREEN_SHARE_REQUESTED`:
   - Nếu user là Host, đẩy request vào state.
3. Tạo hook `useScreenShareRequests`:
   - `pendingShareRequests`
   - `approveRequest(requesterId)`
   - `rejectRequest(requesterId)`
   - remove request after action
4. Hiển thị toast có action:
   - Title: `{requesterName} wants to present`
   - Action Approve
   - Action Reject
5. Nếu cần UI ổn định hơn toast, thêm section trong participants sidebar sau waiting room.
6. Khi Host approve/reject:
   - Gọi API tương ứng.
   - Disable action của request đang xử lý.
   - Remove request khi API success hoặc socket confirms.

Acceptance criteria:
- Host nhận request realtime.
- Approve/reject gọi đúng API.
- Double-click không gửi duplicate API.
- Request biến mất sau khi xử lý.

---

### Phase 7: Force stop screen share

Mục tiêu: Host có thể dừng share screen của participant.

Các bước:
1. Trong `RoomStage`, khi có `screenShareParticipant`:
   - Nếu Host và người share không phải local Host, hiển thị nút `Stop presenting`.
2. Hoặc thêm action trong `ParticipantCard` nếu participant đang share.
3. Khi click:
   - Gọi `meetingApi.forceStopScreenShare(meetingCode, targetParticipantId, meetingToken)`.
   - Disable nút trong lúc request.
4. Khi participant bị dừng nhận `SCREEN_SHARE_STOPPED`:
   - Toast: `Host stopped your presentation.`
   - LiveKit server-side mute/unpublish sẽ làm UI tự mất track.
5. Nếu Host tự đang share, dùng flow stop local hiện có, không gọi force stop.

Acceptance criteria:
- Host thấy action stop với participant đang share.
- Participant không thấy action này.
- Người bị stop nhận toast.
- UI stage quay về grid hoặc chuyển sang screen share khác nếu còn người khác đang share.

---

### Phase 8: Tích hợp socket events

Mục tiêu: socket hiện tại xử lý thêm room settings/screen share mà không phá waiting room/kick.

Các bước:
1. Giữ nguyên connect lifecycle trong `useRoomSocketEvents`.
2. Thêm callbacks optional:
   - `onRoomSettingsChanged`
   - `onScreenShareRequested`
   - `onScreenShareApproved`
   - `onScreenShareRejected`
   - `onScreenShareStopped`
3. Trong `onMeetingMessage`:
   - `ROOM_SETTINGS_CHANGED`: có thể trigger metadata resync hoặc toast.
   - `SCREEN_SHARE_REQUESTED`: Host xử lý.
   - `SCREEN_SHARE_STOPPED`: toàn phòng có thể toast nhẹ nếu target là local.
4. Trong `onParticipantMessage`:
   - `SCREEN_SHARE_APPROVED`: target participant xử lý.
   - `SCREEN_SHARE_REJECTED`: target participant xử lý.
   - `SCREEN_SHARE_STOPPED`: target participant xử lý.
5. Không return sớm sai thứ tự làm mất event kick/end meeting hiện có.

Acceptance criteria:
- Waiting room events vẫn hoạt động.
- Kick/ban/end meeting vẫn hoạt động.
- Screen share events route đúng participant/host.

---

## 5. Chi Tiết State Đề Xuất

### Room settings state

```ts
type RoomSettings = {
  allowParticipantUnmute: boolean;
  allowParticipantShareScreen: boolean;
};

type RoomSettingsUpdateState = {
  allowParticipantUnmute: boolean;
  allowParticipantShareScreen: boolean;
};
```

Default:

```ts
const DEFAULT_ROOM_SETTINGS = {
  allowParticipantUnmute: true,
  allowParticipantShareScreen: true,
};
```

### Screen share request state

```ts
type ScreenShareRequest = {
  requesterId: number;
  requesterName: string;
  requestedAt: number;
};

type ScreenShareApprovalState = {
  isWaitingForShareApproval: boolean;
  isRequestingShareApproval: boolean;
  processingRequesterId: number | null;
};
```

---

## 6. Luồng End-to-End

### Host khóa tự mở mic

1. Host mở Settings menu.
2. Host tắt `Allow participants to unmute`.
3. FE gọi `PATCH /settings`.
4. Backend update metadata và hard-mute participant nếu cần.
5. LiveKit phát metadata/track muted event.
6. FE participant disable nút unmute.

### Host mở lại quyền tự mở mic

1. Host bật `Allow participants to unmute`.
2. FE gọi `PATCH /settings`.
3. Metadata sync về client.
4. Participant thấy nút mic enabled lại, nhưng mic vẫn đang tắt cho đến khi họ tự bật.

### Participant xin share screen

1. Host tắt `Allow participants to present`.
2. Participant click `Present now`.
3. FE mở dialog xin quyền.
4. Participant confirm.
5. FE gọi `POST /screen-share-requests`.
6. Host nhận `SCREEN_SHARE_REQUESTED`.
7. Participant thấy `Waiting for approval`.

### Host approve share screen

1. Host click Approve.
2. FE gọi approve API.
3. Participant nhận `SCREEN_SHARE_APPROVED`.
4. FE participant gọi LiveKit `setScreenShareEnabled(true)`.
5. Browser picker mở và screen share bắt đầu.

### Host reject share screen

1. Host click Reject.
2. FE gọi reject API.
3. Participant nhận `SCREEN_SHARE_REJECTED`.
4. FE clear pending state và show toast.

### Host force stop share screen

1. Participant đang share.
2. Host click `Stop presenting`.
3. FE gọi force stop API.
4. Backend ép dừng LiveKit track.
5. FE participant nhận event hoặc track unpublished, show toast và UI trở về bình thường.

---

## 7. Checklist Kiểm Thử

### Unit/type checks

- `npm run build`
- TypeScript không lỗi ở service/hook/component mới.
- Parser metadata pass các case:
  - Empty metadata.
  - Invalid JSON.
  - Missing fields.
  - Boolean fields đầy đủ.

### Manual test: Host

- Host thấy nút settings.
- Host toggle mic permission.
- Host toggle screen share permission.
- Host nhận request share screen.
- Host approve request.
- Host reject request.
- Host force stop share.

### Manual test: Participant

- Participant không thấy settings.
- Khi mic permission khóa, participant không bật mic được.
- Khi mic permission mở lại, participant bật mic được.
- Khi screen share permission khóa, participant thấy dialog request.
- Pending request disable present action.
- Approve mở share flow.
- Reject clear pending.
- Force stop hiển thị toast và dừng share.

### Regression

- Join lobby/waiting room vẫn hoạt động.
- Admit/reject waiting participant vẫn hoạt động.
- Kick/ban vẫn hoạt động.
- Leave/end meeting vẫn hoạt động.
- Chat vẫn hoạt động.
- Targeted mute hiện có vẫn hoạt động.

---

## 8. Thứ Tự Commit Đề Xuất

1. `feat(meeting): add room settings API types and client methods`
2. `feat(meeting): sync room settings from LiveKit metadata`
3. `feat(meeting): add host room settings menu`
4. `feat(meeting): enforce participant unmute setting`
5. `feat(meeting): add screen share approval request flow`
6. `feat(meeting): add host screen share request handling`
7. `feat(meeting): add force stop screen share action`
8. `test(meeting): cover room settings metadata parsing`

---

## 9. Rủi Ro Và Cách Giảm

- Metadata và STOMP event có thể đến không đồng thời.
  - Giảm rủi ro: lấy metadata làm nguồn settings chính, STOMP chỉ dùng cho notification/request cá nhân.

- Backend có thể dùng id khác với FE đang có.
  - Giảm rủi ro: chuẩn hóa `participantId` từ metadata/meeting token trước khi gọi API.

- Browser screen picker không thể mở nếu không có user gesture.
  - Giảm rủi ro: khi nhận approve, có thể hiển thị toast/button `Start presenting` thay vì auto-start nếu browser chặn.

- Disable mic ở FE không đủ bảo mật.
  - Giảm rủi ro: giữ backend/LiveKit server là quyền cuối cùng, FE chỉ cải thiện UX.

- Toast approve/reject dễ mất nếu Host không nhìn thấy.
  - Giảm rủi ro: lưu request vào state/sidebar, toast chỉ là entry nhanh.
