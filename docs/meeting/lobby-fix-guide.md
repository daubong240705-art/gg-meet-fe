# Hướng giải quyết các vấn đề trong Lobby

## Tổng quan

Tài liệu này mô tả cách khắc phục từng vấn đề tiềm ẩn được ghi nhận trong `lobby.md`. Mỗi mục bao gồm nguyên nhân gốc rễ, hướng xử lý cụ thể, và đoạn code minh hoạ.

---

## Vấn đề 1 — Race condition giữa STOMP ADMITTED và polling

### Nguyên nhân gốc rễ

Có hai đường phát hiện ADMITTED chạy song song:
- **STOMP** (socket): nhận event `ADMITTED` → gọi `requestApprovedJoin()` → API call thứ 2 → `completeApprovedJoin()`
- **Polling** (interval 5s): `syncPendingJoinStatus()` → `getJoinRequestStatus` → nếu `ACCEPT` → `completeApprovedJoin()` trực tiếp

`hasCompletedPendingJoinRef` chặn `onJoin()` chạy hai lần, nhưng không ngăn `requestApprovedJoin()` của STOMP gọi thêm một `joinMeeting()` khi polling đã hoàn tất trước.

### Hướng khắc phục

**A. Check `hasCompletedPendingJoinRef` trong interval callback** — ngừng poll ngay khi join đã hoàn thành:

```typescript
// use-lobby-waiting-socket.ts (trong setInterval callback)
const intervalId = window.setInterval(() => {
  // Dừng poll nếu đã join xong
  if (hasCompletedPendingJoinRef.current) {
    window.clearInterval(intervalId);
    return;
  }
  // ... rest of logic
}, 5000);
```

**B. Check `hasCompletedPendingJoinRef` trong `requestApprovedJoin`** — bỏ qua API call nếu poll đã xong trước:

```typescript
// use-lobby-join-flow.ts
const requestApprovedJoin = useCallback(async (nextPendingJoinState: LobbyPendingJoinState) => {
  // Bail out nếu polling đã complete trước đó
  if (hasCompletedPendingJoinRef.current) return;

  const response = await meetingApi.joinMeeting(...);
  // ...
}, [..., hasCompletedPendingJoinRef]);
```

**C. Check `hasCompletedPendingJoinRef` trong `syncPendingJoinStatus`** — đối xứng với B:

```typescript
// Đầu hàm syncPendingJoinStatus, trước khi gọi API
if (hasCompletedPendingJoinRef.current) return;
```

Việc check ở cả ba điểm đảm bảo đường nào về đích trước, đường kia thoát sớm mà không làm thêm side effect.

---

## Vấn đề 2 — `joinMeeting()` lần 2 thất bại sau ADMITTED

### Nguyên nhân gốc rễ

Khi STOMP nhận `ADMITTED`, `requestApprovedJoin()` gọi lại `meetingApi.joinMeeting()`. Nếu request này fail (network transient, server timeout), người dùng nhận `setWaitingSocketError(errorMessage)` nhưng không có cơ chế thử lại — họ bị kẹt ở màn hình chờ dù đã được duyệt.

### Hướng khắc phục

**Thêm retry với backoff trong `requestApprovedJoin`:**

```typescript
const requestApprovedJoin = useCallback(async (nextPendingJoinState: LobbyPendingJoinState) => {
  const MAX_RETRIES = 2;
  const RETRY_DELAY_MS = 1500;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (hasCompletedPendingJoinRef.current) return;

    try {
      const response = await meetingApi.joinMeeting(
        meetingCode,
        getGuestJoinRequest(nextPendingJoinState),
      );
      const verifiedResponse = assertApiSuccess(response);
      const { participantStatus, resolvedMeetingCode, joinPayload } =
        buildResolvedJoinPayload(verifiedResponse.data, nextPendingJoinState);

      if (!joinPayload.livekitToken) {
        // Issue 3 — handled separately below
        throw new Error("Server did not return a LiveKit token.");
      }

      persistLobbySession(resolvedMeetingCode, joinPayload, participantStatus);
      return joinPayload;
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}, [/* deps */]);
```

Với 2 lần retry + 1.5s delay, hầu hết lỗi mạng thoáng qua sẽ được xử lý trong vòng 3 giây mà không ảnh hưởng UX.

---

## Vấn đề 3 — `livekitToken` missing sau ADMITTED

### Nguyên nhân gốc rễ

Backend có thể trả ADMITTED qua STOMP trước khi LiveKit token được generate xong, dẫn đến `livekitToken` là null/empty trong response của `joinMeeting()` hoặc `getJoinRequestStatus()`. Cả hai nơi hiện tại throw error ngay lập tức.

### Hướng khắc phục

**Thêm retry poll ngắn để chờ token sẵn sàng:**

```typescript
// Utility dùng trong cả requestApprovedJoin và syncPendingJoinStatus
async function waitForLivekitToken(
  meetingCode: string,
  pendingJoinState: LobbyPendingJoinState,
  buildPayload: typeof buildResolvedJoinPayload,
  maxAttempts = 3,
  delayMs = 1000,
): Promise<LobbyJoinPayload> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const response = await meetingApi.getJoinRequestStatus(
      meetingCode,
      pendingJoinState.meetingToken!,
    );
    const verified = assertApiSuccess(response);
    const { joinPayload } = buildPayload(verified.data, pendingJoinState);

    if (joinPayload.livekitToken) {
      return joinPayload;
    }
  }

  throw new Error("The host approved you, but the server did not provide a LiveKit token.");
}
```

Trong `requestApprovedJoin`, nếu `livekitToken` missing sau `joinMeeting()`, gọi `waitForLivekitToken()` thay vì throw ngay. Tương tự với `syncPendingJoinStatus`.

---

## Vấn đề 4 — Cancel join không đảm bảo khi crash

### Nguyên nhân gốc rễ

`pagehide`/`beforeunload` + `sendBeacon` là giới hạn của Web platform — nếu browser bị force-kill (task manager, OOM killer), events này không fire. Frontend không thể đảm bảo hơn mức hiện tại.

### Hướng khắc phục

Đây là vấn đề cần **backend giải quyết chính**, frontend chỉ có thể cải thiện ở mức best-effort.

**Backend (recommended):**
- Khi WebSocket/STOMP connection của một participant trong waiting room bị drop, sau một timeout ngắn (ví dụ 30–60s), tự động xóa participant đó khỏi danh sách chờ.
- Spring WebSocket có thể detect disconnect qua `SessionDisconnectEvent` → `WebSocketEventListener` đã lắng nghe event này, cần thêm logic cleanup.

**Frontend (hiện tại đã tốt, có thể thêm):**
- Hiện tại dùng cả STOMP cancel + beacon — đã là best effort tốt nhất có thể.
- Có thể thêm `visibilitychange` handler: nếu tab hidden > 5 phút trong khi đang chờ, gửi cancel và redirect về home. Tránh zombie session khi user bỏ tab.

```typescript
// Trong use-lobby-waiting-socket.ts
useEffect(() => {
  if (!isWaitingForApproval) return;

  let hiddenSince: number | null = null;
  const HIDDEN_TIMEOUT_MS = 5 * 60 * 1000; // 5 phút

  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      hiddenSince = Date.now();
    } else {
      hiddenSince = null;
    }
  };

  const checkInterval = window.setInterval(() => {
    if (hiddenSince && Date.now() - hiddenSince > HIDDEN_TIMEOUT_MS) {
      handlePageExit(); // reuse existing cancel logic
    }
  }, 30_000);

  document.addEventListener("visibilitychange", handleVisibilityChange);
  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.clearInterval(checkInterval);
  };
}, [isWaitingForApproval]);
```

---

## Vấn đề 5 — Polling interval 5s không dừng khi unmount nhanh

### Nguyên nhân gốc rễ

`setInterval` được cleanup đúng trong `useEffect` return, nhưng nếu một tick đã bắt đầu thực thi `syncPendingJoinStatus` (async) và component unmount trong khi đó, hàm async sẽ tiếp tục chạy cho đến khi check `isMountedRef.current` (bên trong `syncPendingJoinStatus` dòng ~180). Một API call thừa xảy ra.

### Hướng khắc phục

Đây là vấn đề nhẹ — `isMountedRef` đã guard state updates. Tuy nhiên có thể cải thiện thêm bằng cách kết hợp fix từ Vấn đề 1 (check `hasCompletedPendingJoinRef`):

```typescript
const intervalId = window.setInterval(() => {
  const activePendingJoinState = pendingJoinStateRef.current;

  if (
    !activePendingJoinState
    || !activePendingJoinState.meetingToken
    || !isMeetingParticipantAwaitingApproval(activePendingJoinState.participantStatus)
    || hasCompletedPendingJoinRef.current   // ← thêm dòng này
  ) {
    return;
  }

  void syncPendingJoinStatus(activePendingJoinState, true);
}, 5000);
```

Ngoài ra, `syncPendingJoinStatus` nên check `hasCompletedPendingJoinRef` ngay đầu hàm (đã đề cập ở Vấn đề 1) để bất kỳ in-flight call nào cũng thoát sớm nếu join đã hoàn tất.

---

## Vấn đề 6 — Thiết bị không enumerate được (label trống)

### Nguyên nhân gốc rễ

`enumerateDevices()` chỉ trả về `label` có giá trị sau khi user đã grant permission cho camera/mic. Khi cả `isCameraOn` và `isMicOn` đều `false`, code bỏ qua `getUserMedia()` và gọi `loadDevices()` trực tiếp — kết quả là tất cả thiết bị có `label = ""`.

Đoạn code có vấn đề (`use-lobby-devices.ts`):
```typescript
if (!isCameraOn && !isMicOn) {
  stopStream();
  await loadDevices();  // ← labels sẽ trống nếu chưa có permission
  return;
}
```

### Hướng khắc phục

**Phương án 1 — Request permission tối thiểu trước khi enumerate (recommended):**

```typescript
if (!isCameraOn && !isMicOn) {
  stopStream();
  // Xin permission audio tối thiểu để unlock device labels
  try {
    const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    tempStream.getTracks().forEach((track) => track.stop());
  } catch {
    // User từ chối — enumerate vẫn chạy nhưng labels sẽ trống
  }
  await loadDevices();
  return;
}
```

Audio permission ít intrusive hơn video và đủ để browser unlock labels cho tất cả devices (`enumerateDevices` trả labels sau khi bất kỳ permission nào được grant).

**Phương án 2 — Fallback label trong UI:**

Nếu không muốn thay đổi flow permission, hiển thị fallback label trong selector:

```tsx
// lobby-device-selector.tsx
const displayLabel = device.label || `Camera ${index + 1}`;
```

Đây là phương án an toàn hơn khi không muốn trigger permission prompt tự động.

**Phương án 3 — Hiển thị banner "Grant permissions":**

Khi `videoDevices` có item nhưng `label === ""`, hiển thị inline notice trong selector:

```tsx
{videoDevices.some(d => !d.label) && (
  <p className="text-sm text-muted-foreground">
    Enable camera or microphone to see device names.
  </p>
)}
```

**Khuyến nghị:** Dùng Phương án 1 cho flow khi cả hai tắt + Phương án 2 là fallback safety net.

---

## Tóm tắt độ ưu tiên

| Vấn đề | Độ nghiêm trọng | Effort | Ưu tiên |
|--------|----------------|--------|---------|
| 2 — joinMeeting lần 2 thất bại | Cao (user bị kẹt) | Thấp (retry) | **P1** |
| 3 — livekitToken missing | Cao (user bị kẹt) | Thấp (retry poll) | **P1** |
| 1 — Race condition | Trung bình (API call thừa) | Thấp (guard check) | **P2** |
| 6 — Device label trống | Trung bình (UX kém) | Thấp | **P2** |
| 4 — Cancel join khi crash | Thấp (backend fix) | Cao (backend) | **P3** |
| 5 — Interval tick thừa | Thấp (không crash) | Rất thấp | **P3** |
