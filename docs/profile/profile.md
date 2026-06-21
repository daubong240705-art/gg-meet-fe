# Hồ sơ người dùng & Cài đặt thiết bị

## Tổng quan

**Page:** `src/app/(main)/profile/page.tsx`  
**Feature:** `src/features/profile/`

Cho phép người dùng chỉnh sửa thông tin cá nhân và lưu preferences cho thiết bị audio/video và âm thanh thông báo.

---

## Thông tin cá nhân (Profile)

### Hooks

| Hook | File |
|------|------|
| `useProfile` | `src/hooks/auth/useProfile.ts` — query account + mutation update |
| `useProfileDraft` | `src/features/profile/hooks/use-profile-draft.ts` — quản lý draft trước khi save |

### Luồng chỉnh sửa

```
user nhập fullName / chọn avatar
  │
  ▼
useProfileDraft.updateDraft({ fullName?, avatarUrl? })
  └─ So sánh với profile gốc → hasProfileChanged
       ├─ false: nút Save disabled
       └─ true: nút Save enabled

user nhấn Save:
  authApi.updateAccount({ fullName, avatarUrl })
    ├─ Thành công: update AuthUser trong localStorage, resetDraft()
    └─ Thất bại: toast.error()
```

### Draft mechanism

`useProfileDraft` không dùng form library. Thay vào đó:
- `snapshot` = `${id}:${fullName}:${avatarUrl}` của profile hiện tại.
- Draft được xem là "valid cho profile hiện tại" khi snapshot khớp.
- Nếu profile được cập nhật từ server, draft cũ bị vô hiệu hóa.

### Avatar

Người dùng có thể chọn:
1. Avatar có sẵn (system avatars từ `src/lib/user/system-avatars.ts`)
2. Upload URL tùy chỉnh

---

## Cài đặt thiết bị (Device Preferences)

**Hook:** `src/features/profile/hooks/use-meeting-device-preferences.ts`  
**Storage:** `src/lib/meeting/device-preferences.ts`

### Preferences được lưu

| Key | Default | Mô tả |
|-----|---------|-------|
| `cameraEnabledOnJoin` | `true` | Camera bật khi vào lobby |
| `microphoneEnabledOnJoin` | `false` | Mic bật khi vào lobby |
| `defaultCameraDeviceId` | `""` | Camera mặc định |
| `defaultMicrophoneDeviceId` | `""` | Mic mặc định |
| `rememberLastUsedDevices` | `true` | Ghi nhớ thiết bị lần cuối dùng |

### Lưu trữ

- **Key localStorage:** `gg-meet:meeting-device-preferences:v1`
- **Event:** `gg-meet:meeting-device-preferences-change` + `storage` (sync cross-tab)

### rememberLastUsedDevices

Khi `rememberLastUsedDevices = true`:
- `rememberMeetingCameraDevice(deviceId)` — gọi khi user chọn camera trong lobby
- `rememberMeetingMicrophoneDevice(deviceId)` — gọi khi user chọn mic

---

## Cài đặt âm thanh thông báo (Audio Preferences)

**Hook:** `src/features/profile/hooks/use-meeting-audio-preferences.ts`  
**Storage:** `src/lib/meeting/audio-preferences.ts`

### Preferences được lưu

| Key | Mô tả |
|-----|-------|
| `admittedSound` | Âm thanh khi được host duyệt vào phòng |
| `joinRequestSound` | Âm thanh khi có người xin vào (host) |

Người dùng có thể preview âm thanh trước khi lưu.
