# Toast Notification Audit - Kallio Frontend

> Ngay lap: 2026-05-20  
> Pham vi: cac toast hien tai trong `src/`, tap trung vao luong meeting cua host va participant.  
> Muc tieu: xac dinh toast nao can giu, toast nao nen bo/gop de tranh nhieu thong bao lap lai hoac khong can thiet.

---

## 1. Nguyen tac de xuat

### 1.1 Nen giu toast khi

- Hanh dong bat dong bo that bai va user can biet ly do de thu lai.
- Co su kien realtime tu nguoi khac hoac server anh huong truc tiep den user.
- User dang cho ket qua o mot trang khac trang thao tac ban dau.
- Toast co action huu ich, vi du join ngay hoac approve request.

### 1.2 Nen bo hoac giam toast khi

- UI da the hien trang thai ro rang bang loading, disabled, error text, dialog hoac navigation.
- Toast chi xac nhan mot thao tac thanh cong nho, khong co gia tri tiep theo.
- Toast lap voi mot toast khac cung su kien.
- Toast xuat hien ngay truoc khi route thay doi, user gan nhu khong doc duoc.

### 1.3 Nhom quyet dinh

| Quyet dinh | Y nghia |
|---|---|
| **Giu** | Toast can thiet, nen tiep tuc hien thi. |
| **Bo** | Nen remove toast va dua thong tin vao UI neu can. |
| **Gop/dieu chinh** | Van can feedback, nhung nen doi noi dung, doi trigger, hoac chi giu mot trong cac toast trung nhau. |

---

## 2. Tong quan nhanh

| Nhom | So luong toast | Danh gia |
|---|---:|---|
| Common/auth/profile/schedule/home | 17 | Da so chap nhan duoc, mot so success co the bo neu muon UI gon hon. |
| Participant lobby/waiting room | 13 | Can giu cac su kien delayed/bi tu choi, nen giam toast "request sent/already sent" neu UI da co trang thai waiting. |
| Participant trong room | 13 | Can giu cac su kien bi host tac dong; nen giam toast lap cho screen share request. |
| Host trong room | 11 | Can giu failure va request can hanh dong; dang co toast request screen share bi trung. |

---

## 3. Toast common, auth, profile, schedule, home

| Toast | File | Doi tuong | Quyet dinh | Ly do |
|---|---|---|---|---|
| `Please review your input` | `src/hooks/shared/mutation.utils.ts:61` | Common | **Gop/dieu chinh** | Form da gan field error. Toast chi nen giu khi field error nam ngoai viewport; neu form error hien ro thi co the bo. |
| `Something went wrong` | `src/hooks/shared/mutation.utils.ts:75` | Common | **Giu** | Fallback loi API khong map duoc field, can thong bao chung. |
| `Welcome back` | `src/hooks/auth/useLoginForm.ts:135` | Common | **Bo** | Dang nhap thanh cong se redirect ve home, toast co gia tri thap va de bi mat khi route doi. |
| `Account created` | `src/hooks/auth/useLoginForm.ts:180` | Common | **Giu hoac bo** | Co gia tri xac nhan sau signup, nhung neu redirect nhanh thi co the bo de giam nhieu toast. |
| `Verification code sent` | `src/hooks/auth/useLoginForm.ts:200` | Common | **Giu** | User can biet email da duoc gui de tiep tuc nhap code. |
| `Signed out locally` | `src/hooks/auth/useLoginForm.ts:229` | Common | **Giu** | Logout API fail nhung local session da clear, day la tinh huong can thong bao. |
| `Profile updated` | `src/hooks/auth/useProfile.ts:88` | Common | **Giu** | Save profile can feedback thanh cong. |
| `Unable to update profile` | `src/hooks/auth/useProfile.ts:93` | Common | **Giu** | Loi save can hien thi ngay. |
| `Meeting link copied` | `src/components/home/authenticated-meeting-code-button.tsx:14` | Host/Common | **Giu** | Copy clipboard can feedback thanh cong. |
| `Unable to copy link` | `src/components/home/authenticated-meeting-code-button.tsx:19` | Host/Common | **Giu** | Clipboard co the bi chan, user can biet de copy tay. |
| `Meeting not found` / `Unable to verify meeting` | `src/components/main/main.hero-section.tsx:44` | Participant/Common | **Giu** | Join bang code that bai can feedback ro. |
| `Enter a meeting code` | `src/components/main/main.hero-section.tsx:54` | Participant/Common | **Bo hoac gop vao field error** | Loi validation don gian nen hien inline o input, khong can toast. |
| `Meeting "... " is starting now` | `src/hooks/meeting/use-upcoming-meeting-notifications.ts:100` | Host/Participant | **Giu** | Reminder co action `Join now`, dung use case cua toast. |
| `Please review your input` | `src/hooks/meeting/useScheduleMeetingForm.ts:90` | Host | **Gop/dieu chinh** | Field errors da nam trong form; toast chi nen la summary neu form dai. |
| `Unable to schedule meeting` | `src/hooks/meeting/useScheduleMeetingForm.ts:100` | Host | **Giu** | Loi API khong map field can thong bao chung. |
| `Meeting scheduled` | `src/hooks/meeting/useScheduleMeetingForm.ts:150` | Host | **Giu hoac bo** | Sau success co redirect ve home. Neu home co danh sach upcoming refresh ro rang thi co the bo. |
| `Unable to start meeting` | `src/components/dashboard/quick-action.tsx:43,72` | Host | **Giu** | Loi create instant meeting can feedback. |
| `Meeting not found` / `Unable to verify meeting` | `src/components/dashboard/quick-action.tsx:98` | Participant/Common | **Giu** | Loi verify code can feedback. |
| `Enter a meeting code` | `src/components/dashboard/quick-action.tsx:108` | Participant/Common | **Bo hoac gop vao field error** | Validation input don gian, nen hien inline. |

---

## 4. Participant - lobby va waiting room

| Toast | File | Truong hop | Quyet dinh | Ly do |
|---|---|---|---|---|
| `Meeting ended` | `src/features/lobby/hooks/use-lobby-join-flow.ts:116` | Host end meeting khi participant dang cho approve | **Giu** | Su kien realtime quan trong, participant bi day ra khoi flow. |
| `You were admitted` | `src/features/lobby/hooks/use-lobby-join-flow.ts:142` | Host approve request trong lobby | **Giu** | Participant dang cho bat dong bo; toast + sound hop ly truoc khi vao room. |
| `Join request declined` | `src/features/lobby/hooks/use-lobby-join-flow.ts:216` | Poll status thay request bi reject | **Giu** | Ket qua tu host, participant can biet. |
| `Unable to refresh your join request` | `src/features/lobby/hooks/use-lobby-join-flow.ts:249` | Manual/non-silent refresh loi | **Giu** | Chi hien khi khong silent; can feedback neu user bam thu lai. |
| `Unable to send join request` | `src/features/lobby/hooks/use-lobby-join-flow.ts:287` | Server khong tra meeting token | **Giu** | Loi chan flow, can thong bao. |
| `Request sent` | `src/features/lobby/hooks/use-lobby-join-flow.ts:298` | Gui request vao waiting room thanh cong | **Bo hoac giam** | UI da chuyen sang trang/trang thai waiting. Toast success nay khong can neu waiting UI da ro. |
| `Unable to join meeting` | `src/features/lobby/hooks/use-lobby-join-flow.ts:305` | Server khong tra LiveKit token | **Giu** | Loi chan join. |
| `This meeting hasn't started yet` / `Unable to join meeting` | `src/features/lobby/hooks/use-lobby-join-flow.ts:317` | Join API fail | **Giu** | Loi chinh cua luong join. |
| `Join request declined` | `src/features/lobby/hooks/use-lobby-waiting-socket.ts:331` | Socket bao rejected | **Giu** | Su kien realtime tu host. |
| `Host approved your request` | `src/features/meeting/hooks/use-waiting-room-status.ts:153` | Waiting room poll thay approved | **Giu** | Luong cu/backup polling; participant can biet sap connect. |
| `Unable to join meeting` | `src/features/meeting/hooks/use-waiting-room-status.ts:165` | Status khong con waiting va khong accept | **Giu** | Participant bi tu choi/khong duoc vao. |
| `Unable to check waiting room` | `src/features/meeting/hooks/use-waiting-room-status.ts:184` | Manual check status loi | **Giu** | Chi hien khi `silent=false`, dung cho nut check again. |

### De xuat rieng cho participant lobby

1. **Bo `Request sent`** neu waiting screen da hien ro "request is pending".
2. **Giu cac toast reject/approved/meeting ended** vi day la su kien tu host/server.
3. Dam bao `Join request declined` khong hien hai lan neu ca socket va polling cung nhan ket qua. Hien code da co mot so guard, nhung nen test lai case socket reconnect.

---

## 5. Participant - trong meeting room

| Toast | File | Truong hop | Quyet dinh | Ly do |
|---|---|---|---|---|
| `Meeting ended` | `src/features/meeting/room/hooks/use-room-socket-events.ts:158` | Host end meeting cho tat ca | **Giu** | Su kien nghiem trong, user bi remove khoi room. |
| `Banned from meeting` / `Removed from meeting` | `src/features/meeting/room/hooks/use-room-socket-events.ts:204` | Local participant bi kick/ban | **Giu** | Bat buoc thong bao ly do thoat room. |
| `Unable to share screen` | `src/features/meeting/room/hooks/use-room-screen-share.ts:89,126` | Chua co LiveKit connection | **Giu** | Loi chan thao tac, user can biet ly do. |
| `Request already sent` | `src/features/meeting/room/hooks/use-room-screen-share.ts:111,132` | Participant bam share khi da pending | **Bo hoac doi thanh UI state** | Nen disable nut/doi label thanh "Waiting for approval" thay vi toast moi lan bam. |
| `Screen share request sent` | `src/features/meeting/room/hooks/use-room-screen-share.ts:157` | Gui request share thanh cong | **Giu hoac bo** | Co the giu neu khong co UI pending ro; neu button/menu da hien waiting thi bo. |
| `Failed to send screen share request` | `src/features/meeting/room/hooks/use-room-screen-share.ts:161` | API request share fail | **Giu** | Loi thao tac can feedback. |
| `Screen share approved` | `src/features/meeting/room/hooks/use-room-screen-share.ts:178` | Host approve nhung chua auto start duoc | **Giu** | Chi hien khi khong co room LiveKit de auto start; can huong user. |
| `Screen share request declined` | `src/features/meeting/room/hooks/use-room-screen-share.ts:188` | Host reject share request | **Giu** | Ket qua tu host. |
| `Presentation stopped` | `src/features/meeting/room/hooks/use-room-screen-share.ts:197` | Host force stop share cua participant | **Giu** | Su kien tu host anh huong truc tiep. |
| `Microphone muted` | `src/features/meeting/room/hooks/use-room-media-controls.ts:69` | Host mute mic local participant | **Giu** | Participant can biet thay doi khong do minh lam. |
| `Camera turned off` | `src/features/meeting/room/hooks/use-room-media-controls.ts:79` | Host tat camera local participant | **Giu** | Participant can biet thay doi khong do minh lam. |
| `Microphone locked` | `src/features/meeting/room/hooks/use-room-media-controls.ts:93` | Participant co unmute khi host khoa | **Giu** | Giai thich vi sao nut khong hoat dong. |

---

## 6. Host - trong meeting room

| Toast | File | Truong hop | Quyet dinh | Ly do |
|---|---|---|---|---|
| `${requesterName} wants to present` | `src/features/meeting/room/hooks/use-screen-share-requests.ts:48` | Host nhan screen share request | **Bo/gop** | Dang trung voi toast trong `room.tsx:445`. Toast o hook chi co action `View` rong, khong huu ich. |
| `${requesterName} wants to present` | `src/components/meeting/room/room.tsx:445` | Host nhan screen share request moi | **Giu va cai thien** | Toast co action `Approve`, huu ich hon. Nen them action reject hoac mo panel request neu co UI. |
| `Failed to approve screen share request` | `src/features/meeting/room/hooks/use-screen-share-requests.ts:65` | Approve API fail | **Giu** | Host can biet thao tac that bai. |
| `Failed to reject screen share request` | `src/features/meeting/room/hooks/use-screen-share-requests.ts:79` | Reject API fail | **Giu** | Host can biet thao tac that bai. |
| `Failed to stop screen share` | `src/components/meeting/room/room.tsx:335` | Host force stop share fail | **Giu** | Loi moderation can feedback. |
| `Unable to remove participant` | `src/features/meeting/room/hooks/use-waiting-room-actions.ts:103,119` | Kick/ban fail hoac thieu participant id | **Giu** | Hanh dong moderation fail can thong bao. |
| `Failed to update room settings` | `src/features/meeting/room/hooks/use-room-settings.ts:145` | Host update setting fail | **Giu** | Toggle setting fail can feedback. |
| `${targetName} was removed from the meeting` | `src/features/meeting/room/hooks/use-room-socket-events.ts:171` | Host/nguoi khac thay participant bi remove | **Gop/dieu chinh** | Huu ich voi host, nhung co the gay nhieu toast neu remove hang loat. Nen chi hien cho host khi action khong phai do chinh host vua lam hoac chuyen sang activity log. |
| `Unable to mute microphone/camera` | `src/features/meeting/room/hooks/use-room-targeted-mute.ts:38,75` | Host mute participant fail | **Giu** | Loi moderation can feedback. |
| `Microphone/Camera muted` | `src/features/meeting/room/hooks/use-room-targeted-mute.ts:63` | Host mute participant thanh cong | **Gop/dieu chinh** | Co gia tri xac nhan, nhung neu UI participant cap nhat ngay thi co the bo de giam toast. |
| `Meeting ended` | `src/features/meeting/room/hooks/use-room-exit-actions.ts:77` | Host end meeting thanh cong | **Giu hoac bo** | Hien ngay truoc khi thoat room. Co the bo neu route sau do da co state "ended"; giu neu can xac nhan action nguy hiem da thanh cong. |
| `Unable to end meeting` | `src/features/meeting/room/hooks/use-room-exit-actions.ts:88` | Host end meeting fail | **Giu** | Loi quan trong can feedback. |

### De xuat rieng cho host

1. **Uu tien cao: bo toast duplicate trong `use-screen-share-requests.ts:48`** hoac bo effect trong `room.tsx:445`; nen giu version co action that su.
2. **Cac success moderation nho** nhu `Microphone muted` co the bo neu UI da cap nhat trang thai mic/camera ngay.
3. **Kick/remove participant** nen tranh toast hang loat. Neu co activity panel, dua thong tin vao panel thay vi toast cho tung participant.

---

## 7. Danh sach uu tien don dep

### P0 - nen lam truoc

| Viec | File |
|---|---|
| Loai bo toast screen share request bi trung, giu mot source duy nhat co action huu ich. | `src/features/meeting/room/hooks/use-screen-share-requests.ts:48`, `src/components/meeting/room/room.tsx:445` |
| Chuyen `Request already sent` sang disabled state/label trong UI screen share. | `src/features/meeting/room/hooks/use-room-screen-share.ts:111,132` |
| Chuyen `Enter a meeting code` sang inline validation o input. | `src/components/main/main.hero-section.tsx:54`, `src/components/dashboard/quick-action.tsx:108` |

### P1 - nen lam sau

| Viec | File |
|---|---|
| Bo `Request sent` neu waiting UI da du ro. | `src/features/lobby/hooks/use-lobby-join-flow.ts:298` |
| Xem lai cac toast success ngay truoc redirect: login, schedule, end meeting. | `src/hooks/auth/useLoginForm.ts:135`, `src/hooks/meeting/useScheduleMeetingForm.ts:150`, `src/features/meeting/room/hooks/use-room-exit-actions.ts:77` |
| Giam toast success moderation nho neu UI da sync ngay. | `src/features/meeting/room/hooks/use-room-targeted-mute.ts:63` |

### P2 - cai thien trai nghiem

| Viec | File |
|---|---|
| Them toast/action reject hoac mo panel cho screen share request cua host. | `src/components/meeting/room/room.tsx:445` |
| Chuan hoa copy toast theo tone ngan gon, cung pattern title + description. | Tat ca file co toast |
| Can nhac helper toast de dedupe theo key cho cac event socket/polling. | Lobby va room socket hooks |

---

## 8. Ket luan

Toast nen duoc giu cho cac su kien co tac dong lon khi UI chua the hien ro ket qua: rejected/admitted khi user dang cho, host mute/tat camera, screen share approved/rejected/stopped, va cac loi API chan flow. Cac toast nen giam la validation don gian, success nho, success ngay truoc redirect, terminal-state da co trang status, va cac trang thai UI da bieu dien ro.

Uu tien quan trong nhat hien tai la **xoa toast trung cho host khi co request chia se man hinh**, sau do **chuyen cac toast validation/trang thai lap lai sang UI inline**.

---

## 9. Trang thai cleanup 2026-05-20

Da xu ly trong dot cleanup dau tien:

| Noi dung | Trang thai |
|---|---|
| Bo toast `Meeting ended` khi host end room thanh cong; trang ended da hien ket qua. | Done |
| Bo toast `Meeting ended` phia participant khi nhan socket `MEETING_ENDED`; trang ended da hien ket qua. | Done |
| Bo toast local `Banned from meeting` / `Removed from meeting`; trang status theo reason da hien noi dung. | Done |
| Bo toast thong bao nguoi khac bi remove khoi room. | Done |
| Bo toast `Meeting ended` o lobby pending khi host end meeting; trang ended da hien ket qua. | Done |
| Bo toast `Request sent` trong lobby; waiting UI da hien trang thai. | Done |
| Bo toast duplicate `wants to present` tu hook screen share request. | Done |
| Bo toast `wants to present` trong `room.tsx`; host da co panel Allow/Deny co dinh. | Done |
| Bo toast `Request already sent` va `Screen share request sent`; footer/menu da hien `Waiting for approval`. | Done |
| Bo toast success `Microphone/Camera muted` khi host mute participant; UI participant list se cap nhat state. | Done |

Toast terminal-state con giu lai chu yeu la cac loi thao tac that bai, reject/admit khi user dang cho, va cac thay doi do host tac dong truc tiep trong room nhu mic/camera local bi tat.
