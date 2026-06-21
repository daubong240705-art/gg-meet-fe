# Chia sẻ màn hình (Screen Share)

## Tổng quan

**Hook:** `src/features/meeting/room/hooks/use-room-screen-share.ts`

Screen share có 2 luồng:
1. **Host hoặc participant được phép:** Share trực tiếp không cần xin phép.
2. **Participant chưa được phép:** Gửi request lên server, chờ host duyệt qua STOMP.

---

## Điều kiện được share

```
canUseScreenShare = isHost || canShareScreen (từ room settings) || hasShareApproval (host đã duyệt request)
```

---

## Luồng cho participant (cần xin phép)

```
handleScreenShare()
  │
  ├─ isScreenSharing → dừng share: setScreenShareEnabled(false) + reset approval
  │
  ├─ canUseScreenShare → share ngay: startLiveKitScreenShare()
  │
  └─ Không có quyền:
       ├─ isWaitingForShareApproval → không làm gì (đang chờ)
       └─ Chưa request → setIsShareRequestDialogOpen(true)
                              │
                              ▼
                        User confirm → handleSendShareRequest()
                              │
                              ├─ meetingApi.requestScreenShare(meetingCode, meetingToken)
                              ├─ setIsWaitingForShareApproval(true)
                              └─ Đóng dialog
```

---

## Luồng duyệt/từ chối (Host nhận qua STOMP)

```
SCREEN_SHARE_REQUESTED event
  └─ Host nhận notification, thấy dialog duyệt

Host approve → meetingApi.approveScreenShare(meetingCode, requesterId, meetingToken)
  └─ Backend gửi STOMP SCREEN_SHARE_APPROVED → participant nhận

Host reject → meetingApi.rejectScreenShare(meetingCode, requesterId, meetingToken)
  └─ Backend gửi STOMP SCREEN_SHARE_REJECTED → participant nhận
```

---

## Nhận STOMP events trong room (useRoomSocketEvents)

| Event | Action |
|-------|--------|
| `SCREEN_SHARE_REQUESTED` | Gọi `onScreenShareRequested(message)` — host xử lý |
| `SCREEN_SHARE_APPROVED` | Gọi `handleShareApproved()` — participant bắt đầu share |
| `SCREEN_SHARE_REJECTED` | Gọi `handleShareRejected()` — toast thông báo |
| `SCREEN_SHARE_STOPPED` | Gọi `handleShareStopped()` — host dừng share |

---

## handleShareApproved()

```
handleShareApproved()
  ├─ hasShareApprovalRef.current = true
  ├─ setHasShareApproval(true)
  ├─ setIsWaitingForShareApproval(false)
  └─ Nếu room available + LiveKit enabled → startLiveKitScreenShare()
     Nếu không → toast "You can now start sharing your screen"
```

---

## Host dừng share người khác

```
forceStopScreenShare:
  meetingApi.forceStopScreenShare(meetingCode, targetId, meetingToken)
  → Backend gửi STOMP SCREEN_SHARE_STOPPED về participant target
  → handleShareStopped(): reset approval state + toast
```

Nếu permission bị thu hồi (`canUseScreenShare` chuyển `false`) trong khi đang share:

```
useEffect [canUseScreenShare]:
  Nếu đang share + không còn quyền:
    room.localParticipant.setScreenShareEnabled(false)
```

---

## handlePresentOtherContent()

Cho phép thay thế nội dung đang share bằng nội dung mới (stop rồi start lại):
- Có quyền: `setScreenShareEnabled(false)` → `setScreenShareEnabled(true)`
- Không có quyền: mở dialog request như bình thường
