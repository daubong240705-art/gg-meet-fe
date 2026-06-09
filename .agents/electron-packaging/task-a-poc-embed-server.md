# Task A — PoC: nhúng Next standalone server vào Electron

> Giai đoạn 1 · Sửa `src`: **không** (chỉ thêm `electron/`) · Rủi ro: Thấp
> Kết quả: app desktop chạy được, giữ nguyên 100% tính năng web (SSR, generateMetadata, proxy route, auth cookie). Mục đích: xác nhận khả thi nhanh.

## Ý tưởng

`output: "standalone"` đã bật sẵn → `next build` sinh `.next/standalone/server.js`. Electron **main** spawn server này trên `127.0.0.1:<port-rảnh>`, `BrowserWindow` load `http://127.0.0.1:port`. Renderer chạy y như trình duyệt → cookie/refresh/LiveKit/STOMP hoạt động không đổi.

## File tạo/sửa

| File | Hành động |
|------|-----------|
| `electron/main.ts` | tạo — spawn server + tạo window + media wiring |
| `electron/preload.ts` | tạo — contextBridge tối thiểu |
| `electron/tsconfig.json` | tạo — compile main/preload (CommonJS) |
| `package.json` | + scripts đóng gói, + devDeps electron toolchain |
| `electron-builder.yml` | tạo — cấu hình đóng gói + extraResources |
| `.gitignore` | + `dist-electron/`, `release/` |

> **Không** chạm `src/`.

## Các bước

### 1. Cài toolchain (devDependencies)

```bash
npm i -D electron electron-builder concurrently wait-on cross-env tsx
```

### 2. Chuẩn bị output standalone

`next build` tạo `.next/standalone/` (gồm `server.js` + `node_modules` rút gọn) nhưng **không** tự copy `.next/static` và `public`. Cần copy vào trước khi đóng gói:

```
.next/standalone/.next/static   ←  copy từ .next/static
.next/standalone/public         ←  copy từ public
```

Thêm script (dùng `cpy`/`cp` tuỳ OS) — ví dụ npm script:

```jsonc
// package.json > scripts
"build:standalone": "next build && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public",
"electron:build": "tsc -p electron/tsconfig.json",
"desktop:dev": "cross-env NODE_ENV=development concurrently \"next dev\" \"wait-on http://localhost:3000 && tsx electron/main.ts\"",
"desktop:pack": "npm run build:standalone && npm run electron:build && electron-builder"
```

### 3. `electron/main.ts`

```ts
import { app, BrowserWindow, session, desktopCapturer } from "electron";
import { fork } from "node:child_process";
import path from "node:path";
import net from "node:net";

const isDev = process.env.NODE_ENV === "development";

async function getFreePort(): Promise<number> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
  });
}

let serverProcess: ReturnType<typeof fork> | null = null;

async function startNextServer(): Promise<string> {
  if (isDev) return "http://localhost:3000"; // dùng `next dev`

  const port = await getFreePort();
  // server.js nằm trong resources sau khi đóng gói (xem electron-builder.yml)
  const serverEntry = path.join(process.resourcesPath, "standalone", "server.js");

  serverProcess = fork(serverEntry, [], {
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      // Runtime config backend — KHÔNG bake lúc build:
      NEXT_PUBLIC_BACKEND_URL: process.env.KALLIO_BACKEND_URL ?? "https://api.example.com/api",
    },
    stdio: "inherit",
  });

  // chờ cổng sẵn sàng
  await waitForPort(port);
  return `http://127.0.0.1:${port}`;
}

function waitForPort(port: number, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const sock = net.connect(port, "127.0.0.1");
      sock.once("connect", () => { sock.destroy(); resolve(); });
      sock.once("error", () => {
        sock.destroy();
        if (Date.now() - start > timeoutMs) reject(new Error("Next server timeout"));
        else setTimeout(tryConnect, 200);
      });
    };
    tryConnect();
  });
}

function wireMediaPermissions() {
  // Camera/mic
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    cb(permission === "media");
  });
  // Screen share: cấp nguồn cho getDisplayMedia (LiveKit screen share)
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer.getSources({ types: ["screen", "window"] }).then((sources) => {
      callback({ video: sources[0] }); // PoC: lấy màn hình đầu. Thực tế: hiện picker.
    });
  });
}

async function createWindow() {
  const url = await startNextServer();
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  await win.loadURL(url);
}

app.whenReady().then(() => {
  wireMediaPermissions();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  serverProcess?.kill();
  if (process.platform !== "darwin") app.quit();
});
app.on("before-quit", () => serverProcess?.kill());
```

### 4. `electron/preload.ts`

```ts
import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("desktop", {
  isElectron: true,
});
```

> PoC chỉ cần lộ `isElectron`. Renderer có thể đọc `window.desktop?.isElectron` nếu muốn phân nhánh (hữu ích cho Chiến lược B sau này).

### 5. `electron/tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "module": "CommonJS",
    "target": "ES2022",
    "outDir": "../dist-electron",
    "rootDir": ".",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["**/*.ts"]
}
```

(`main` field của package.json trỏ tới `dist-electron/main.js`.)

### 6. `electron-builder.yml`

```yaml
appId: gg.kallio.meet
productName: Kallio Meet
directories:
  output: release
files:
  - dist-electron/**/*
extraResources:
  # Đưa standalone server + static + public vào resources
  - from: .next/standalone
    to: standalone
mac: { target: dmg }
win: { target: nsis }
linux: { target: AppImage }
```

> Lưu ý: bước `build:standalone` đã copy `.next/static` và `public` **vào trong** `.next/standalone/`, nên chỉ cần đưa nguyên `.next/standalone` vào `extraResources`. `server.js` sẽ ở `process.resourcesPath/standalone/server.js`.

## Media / screen share (bắt buộc)

- **Camera/mic**: `setPermissionRequestHandler` (đã có ở bước 3).
- **Screen share**: `setDisplayMediaRequestHandler` + `desktopCapturer`. PoC lấy source đầu; bản thật nên hiện picker (BrowserWindow nhỏ liệt kê `getSources()`), vì LiveKit gọi `navigator.mediaDevices.getDisplayMedia()` → Electron cần handler này, nếu không share-screen **fail im lặng**.

## Definition of Done

- [ ] `npm run desktop:dev` mở cửa sổ, load app, đăng nhập được.
- [ ] Tạo/join phòng → **video + mic** chạy; **screen share** chạy (xác nhận handler hoạt động).
- [ ] `npm run desktop:pack` ra installer; bản đóng gói chạy độc lập (server.js spawn từ resources).
- [ ] `npm run build` (web) vẫn xanh — không phá web.

## Rủi ro & lưu ý

- **`NEXT_PUBLIC_*` bake lúc build**: trong A, backend URL vẫn bị bake khi `next build`. Inject lại qua `env` lúc `fork` (như bước 3) **chỉ hiệu lực với code server-side**; biến `NEXT_PUBLIC_*` đã nhúng vào bundle client thì không đổi được lúc chạy. ⇒ Nếu cần đổi backend lúc chạy thật sự, làm runtime config ở [task-b1](task-b1-config-and-transport.md). PoC thì build cho 1 backend là đủ.
- **Kích thước app**: ship Node + Next server ⇒ nặng. Chấp nhận cho PoC.
- **Vòng đời server**: nhớ `serverProcess.kill()` ở `before-quit`/`window-all-closed` để không rò tiến trình.
- **Antivirus/code signing**: bản phân phối thật cần ký (ngoài phạm vi PoC).

## Rollback

Xoá `electron/`, `electron-builder.yml`, revert `package.json` scripts/devDeps. `src` không đụng tới nên web không ảnh hưởng.
