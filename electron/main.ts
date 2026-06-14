import {
  app,
  BrowserWindow,
  clipboard,
  desktopCapturer,
  ipcMain,
  Menu,
  net,
  protocol,
  safeStorage,
  screen,
  session,
} from "electron";
import type { DesktopCapturerSource } from "electron";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEV_SERVER_URL = process.env.ELECTRON_DEV_SERVER_URL ?? "http://localhost:3000";
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// Stable origin for the static bundle. A custom scheme (instead of a random
// 127.0.0.1 port) keeps localStorage/auth state intact across launches.
const APP_PROTOCOL_SCHEME = "app";
const APP_PROTOCOL_ORIGIN = `${APP_PROTOCOL_SCHEME}://local`;

// Must run before app.whenReady(), otherwise the scheme is not treated as a
// standard, secure origin (breaking fetch, localStorage and secure contexts).
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_PROTOCOL_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;
let miniWindow: BrowserWindow | null = null;
let pendingDisplayMediaRequest: ((sourceId: string | null) => void) | null = null;
let preferredDisplayMediaSourceId: string | null = null;
let isMeetingActive = false;
let allowMainWindowClose = false;

function isLinuxWayland() {
  return process.platform === "linux"
    && (process.env.XDG_SESSION_TYPE === "wayland" || Boolean(process.env.WAYLAND_DISPLAY));
}

if (isLinuxWayland()) {
  app.commandLine.appendSwitch("enable-features", "WebRTCPipeWireCapturer");
}

type DesktopMeetingState = {
  title: string;
  participantCount: number;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenSharing: boolean;
};

type DesktopMeetingControl = "toggle-mic" | "toggle-camera" | "leave";

const DEFAULT_MEETING_STATE: DesktopMeetingState = {
  title: "Meeting",
  participantCount: 1,
  isMicEnabled: false,
  isCameraEnabled: false,
  isScreenSharing: false,
};

let meetingState = DEFAULT_MEETING_STATE;

type DesktopRuntimeConfig = {
  backendUrl?: string;
  websocketUrl?: string;
  meetingSocketUrl?: string;
};

const DEFAULT_RUNTIME_CONFIG: DesktopRuntimeConfig = {
  backendUrl: process.env.KALLIO_BACKEND_URL ?? "",
  websocketUrl: process.env.KALLIO_LIVEKIT_WS_URL ?? "",
  meetingSocketUrl: process.env.KALLIO_MEETING_SOCKET_URL ?? "",
};

function cancelPendingDisplayMediaRequest() {
  const resolvePendingRequest = pendingDisplayMediaRequest;

  if (!resolvePendingRequest) {
    return;
  }

  pendingDisplayMediaRequest = null;
  resolvePendingRequest(null);
}

function loadRuntimeConfig(): DesktopRuntimeConfig {
  const configPath = path.join(app.getPath("userData"), "config.json");

  try {
    if (!existsSync(configPath)) {
      // First run: write a template so the backend can be changed without rebuilding.
      mkdirSync(path.dirname(configPath), { recursive: true });
      writeFileSync(configPath, `${JSON.stringify(DEFAULT_RUNTIME_CONFIG, null, 2)}\n`);
      return DEFAULT_RUNTIME_CONFIG;
    }

    const parsed = JSON.parse(readFileSync(configPath, "utf8")) as DesktopRuntimeConfig;
    return { ...DEFAULT_RUNTIME_CONFIG, ...parsed };
  } catch (error) {
    console.error("Unable to read runtime config, falling back to defaults.", error);
    return DEFAULT_RUNTIME_CONFIG;
  }
}

// The refresh token lives outside the browser cookie jar: encrypted with the
// OS keychain (safeStorage) in userData, handed to the renderer over IPC only.
const getRefreshTokenPath = () => path.join(app.getPath("userData"), "refresh-token.bin");

function registerAuthIpc() {
  ipcMain.handle("auth:getRefresh", () => {
    try {
      const tokenPath = getRefreshTokenPath();

      if (!existsSync(tokenPath) || !safeStorage.isEncryptionAvailable()) {
        return null;
      }

      return safeStorage.decryptString(readFileSync(tokenPath));
    } catch {
      // Corrupt file or a token encrypted on another machine: treat as signed out.
      return null;
    }
  });

  ipcMain.handle("auth:setRefresh", (_event, token: unknown) => {
    const tokenPath = getRefreshTokenPath();

    if (typeof token !== "string" || token.length === 0) {
      rmSync(tokenPath, { force: true });
      return;
    }

    if (!safeStorage.isEncryptionAvailable()) {
      // Never persist the token unencrypted; the session simply will not
      // survive an app restart on systems without a keychain.
      return;
    }

    writeFileSync(tokenPath, safeStorage.encryptString(token));
  });
}

function registerClipboardIpc() {
  ipcMain.handle("clipboard:writeText", (_event, text: unknown) => {
    if (typeof text !== "string") {
      return false;
    }

    clipboard.writeText(text);
    return true;
  });
}

type SerializedDisplayMediaSource = {
  id: string;
  name: string;
  thumbnail: string;
  appIcon: string | null;
  displayId: string;
  type: "screen" | "window";
};

const HIDDEN_WINDOWS_SCREEN_SHARE_NAMES = new Set([
  "action center",
  "desktopwindowxamlsource",
  "lock screen",
  "microsoft text input application",
  "new notification",
  "notification center",
  "program manager",
  "shell experience host",
  "start",
  "task switching",
  "taskbar",
  "windows input experience",
  "windows shell experience host",
]);

function shouldHideDisplayMediaSource(source: DesktopCapturerSource) {
  if (!source.id.startsWith("window:")) {
    return false;
  }

  const normalizedName = source.name.trim().toLowerCase();

  if (!normalizedName || HIDDEN_WINDOWS_SCREEN_SHARE_NAMES.has(normalizedName)) {
    return true;
  }

  return (
    (normalizedName.includes("nvidia") && normalizedName.includes("overlay"))
    || (normalizedName.includes("windows") && normalizedName.includes("notification"))
    || normalizedName.includes("game bar overlay")
  );
}

function getMiniWindowHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Kallio meeting</title>
  <style>
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
    body {
      color: #f8fafc;
      background:
        radial-gradient(circle at top, rgba(59, 130, 246, .28), transparent 48%),
        linear-gradient(145deg, #172033, #0f172a);
      font: 13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      user-select: none;
    }
    .shell { display: flex; height: 100%; flex-direction: column; padding: 14px; }
    .drag { -webkit-app-region: drag; display: flex; min-width: 0; align-items: center; gap: 9px; }
    .logo {
      display: grid; width: 30px; height: 30px; flex: 0 0 auto; place-items: center;
      border-radius: 10px; background: #2563eb; font-weight: 700;
    }
    .copy { min-width: 0; flex: 1; }
    .title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 650; }
    .meta { margin-top: 2px; color: #94a3b8; font-size: 11px; }
    .restore {
      -webkit-app-region: no-drag; border: 0; border-radius: 9px; padding: 7px 9px;
      color: #e2e8f0; background: rgba(255,255,255,.09); cursor: pointer;
    }
    .status {
      display: flex; flex: 1; align-items: center; justify-content: center;
      color: #cbd5e1; font-size: 12px;
    }
    .controls { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .control {
      border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 9px 7px;
      color: #f8fafc; background: rgba(255,255,255,.09); cursor: pointer;
    }
    .control:hover { background: rgba(255,255,255,.15); }
    .control.off { background: rgba(220,38,38,.82); }
    .control.leave { background: rgba(220,38,38,.82); }
  </style>
</head>
<body>
  <div class="shell">
    <div class="drag">
      <div class="logo">K</div>
      <div class="copy">
        <div id="title" class="title">Meeting</div>
        <div id="meta" class="meta">1 participant</div>
      </div>
      <button id="restore" class="restore" type="button">Open</button>
    </div>
    <div id="status" class="status">Meeting is active</div>
    <div class="controls">
      <button id="mic" class="control" type="button">Mic</button>
      <button id="camera" class="control" type="button">Camera</button>
      <button id="leave" class="control leave" type="button">Leave</button>
    </div>
  </div>
  <script>
    const title = document.getElementById("title");
    const meta = document.getElementById("meta");
    const status = document.getElementById("status");
    const mic = document.getElementById("mic");
    const camera = document.getElementById("camera");

    function render(state) {
      title.textContent = state.title || "Meeting";
      meta.textContent = state.participantCount + (state.participantCount === 1 ? " participant" : " participants");
      status.textContent = state.isScreenSharing ? "You are presenting" : "Meeting is active";
      mic.classList.toggle("off", !state.isMicEnabled);
      camera.classList.toggle("off", !state.isCameraEnabled);
      mic.textContent = state.isMicEnabled ? "Mic on" : "Mic off";
      camera.textContent = state.isCameraEnabled ? "Camera on" : "Camera off";
    }

    window.desktop.meeting.getState().then(render);
    window.desktop.meeting.onStateChange(render);
    document.getElementById("restore").addEventListener("click", () => {
      window.desktop.meeting.restoreMainWindow();
    });
    mic.addEventListener("click", () => window.desktop.meeting.sendControl("toggle-mic"));
    camera.addEventListener("click", () => window.desktop.meeting.sendControl("toggle-camera"));
    document.getElementById("leave").addEventListener("click", () => {
      window.desktop.meeting.sendControl("leave");
    });
  </script>
</body>
</html>`;
}

function positionMiniWindow() {
  if (!miniWindow || miniWindow.isDestroyed()) {
    return;
  }

  const display = mainWindow && !mainWindow.isDestroyed()
    ? screen.getDisplayMatching(mainWindow.getBounds())
    : screen.getPrimaryDisplay();
  const { x, y, width, height } = display.workArea;
  const [miniWidth, miniHeight] = miniWindow.getSize();

  miniWindow.setPosition(
    x + width - miniWidth - 18,
    y + height - miniHeight - 18,
  );
}

async function createMiniWindow() {
  if (miniWindow && !miniWindow.isDestroyed()) {
    return miniWindow;
  }

  miniWindow = new BrowserWindow({
    alwaysOnTop: true,
    autoHideMenuBar: true,
    closable: false,
    frame: false,
    height: 190,
    maximizable: false,
    minimizable: false,
    resizable: false,
    show: false,
    skipTaskbar: true,
    width: 360,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      sandbox: false,
    },
  });
  miniWindow.setAlwaysOnTop(true, "floating");
  miniWindow.on("closed", () => {
    miniWindow = null;
  });

  await miniWindow.loadURL(
    `data:text/html;charset=UTF-8,${encodeURIComponent(getMiniWindowHtml())}`,
  );
  positionMiniWindow();
  return miniWindow;
}

function hideMiniWindow() {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.hide();
  }
}

function destroyMiniWindow() {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.destroy();
  }

  miniWindow = null;
}

function restoreMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  hideMiniWindow();

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function showMiniWindow() {
  if (!isMeetingActive) {
    return;
  }

  void createMiniWindow().then((window) => {
    if (!isMeetingActive || !mainWindow?.isMinimized()) {
      return;
    }

    positionMiniWindow();
    window.webContents.send("meeting:state-changed", meetingState);
    window.showInactive();
  });
}

function normalizeMeetingState(value: unknown): DesktopMeetingState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const state = value as Partial<DesktopMeetingState>;

  return {
    title: typeof state.title === "string" && state.title.trim()
      ? state.title.trim()
      : DEFAULT_MEETING_STATE.title,
    participantCount:
      typeof state.participantCount === "number" && Number.isFinite(state.participantCount)
        ? Math.max(1, Math.round(state.participantCount))
        : DEFAULT_MEETING_STATE.participantCount,
    isMicEnabled: state.isMicEnabled === true,
    isCameraEnabled: state.isCameraEnabled === true,
    isScreenSharing: state.isScreenSharing === true,
  };
}

function registerMeetingWindowIpc() {
  ipcMain.handle("meeting:set-active", (_event, active: unknown) => {
    isMeetingActive = active === true;

    if (!isMeetingActive) {
      meetingState = DEFAULT_MEETING_STATE;
      hideMiniWindow();
    }
  });

  ipcMain.handle("meeting:update-state", (_event, value: unknown) => {
    const nextState = normalizeMeetingState(value);

    if (!nextState) {
      return;
    }

    meetingState = nextState;
    miniWindow?.webContents.send("meeting:state-changed", meetingState);
  });

  ipcMain.handle("meeting:get-state", () => meetingState);

  ipcMain.on("meeting:send-control", (_event, control: unknown) => {
    if (control !== "toggle-mic" && control !== "toggle-camera" && control !== "leave") {
      return;
    }

    if (control === "leave") {
      restoreMainWindow();
    }

    mainWindow?.webContents.send("meeting:control", control satisfies DesktopMeetingControl);
  });

  ipcMain.on("meeting:restore-main-window", restoreMainWindow);

  ipcMain.on("meeting:confirm-close", () => {
    isMeetingActive = false;
    allowMainWindowClose = true;
    destroyMiniWindow();
    mainWindow?.close();
  });
}

function serializeDisplayMediaSource(
  source: DesktopCapturerSource,
): SerializedDisplayMediaSource {
  const [sourceType] = source.id.split(":");

  return {
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL(),
    appIcon: source.appIcon?.toDataURL() ?? null,
    displayId: source.display_id,
    type: sourceType === "screen" ? "screen" : "window",
  };
}

function getDisplayMediaSources() {
  return desktopCapturer.getSources({
    types: ["screen", "window"],
    thumbnailSize: { width: 320, height: 200 },
    fetchWindowIcons: true,
  });
}

function registerScreenShareIpc() {
  ipcMain.handle("screen:getSources", async () => {
    const sources = await getDisplayMediaSources();
    return sources
      .filter((source) => !shouldHideDisplayMediaSource(source))
      .map(serializeDisplayMediaSource);
  });

  ipcMain.handle("screen:setPreferredSource", (_event, sourceId: unknown) => {
    preferredDisplayMediaSourceId = typeof sourceId === "string" ? sourceId : null;
  });

  ipcMain.on("screen:pick-response", (_event, sourceId: unknown) => {
    const resolvePendingRequest = pendingDisplayMediaRequest;

    if (!resolvePendingRequest) {
      return;
    }

    pendingDisplayMediaRequest = null;
    resolvePendingRequest(typeof sourceId === "string" ? sourceId : null);
  });
}

function getOutDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "out");
  }

  return path.join(process.cwd(), "out");
}

function getWindowIconPath() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "icon.png")
    : path.join(process.cwd(), "electron", "assets", "icon.png");

  return existsSync(iconPath) ? iconPath : undefined;
}

function registerAppProtocol() {
  const outDir = getOutDir();

  const resolveFile = (relativePath: string) => {
    const fullPath = path.normalize(path.join(outDir, relativePath));

    // Path-traversal guard: never serve anything outside the export dir.
    if (fullPath !== outDir && !fullPath.startsWith(outDir + path.sep)) {
      return null;
    }

    return fullPath;
  };

  protocol.handle(APP_PROTOCOL_SCHEME, (request) => {
    const { pathname } = new URL(request.url);
    const decodedPathname = decodeURIComponent(pathname);

    // Match the static-export file layout: "/" → index.html, "/join" →
    // join.html (or join/index.html), assets resolve as plain files.
    const candidates =
      decodedPathname === "/" || decodedPathname === ""
        ? ["index.html"]
        : [
            decodedPathname,
            `${decodedPathname}.html`,
            path.join(decodedPathname, "index.html"),
            "404.html",
          ];

    for (const candidate of candidates) {
      const filePath = resolveFile(candidate);

      if (filePath && existsSync(filePath)) {
        return net.fetch(pathToFileURL(filePath).toString());
      }
    }

    return new Response("Not found", { status: 404 });
  });
}

function wireMediaPermissions() {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "media");
  });

  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    cancelPendingDisplayMediaRequest();

    if (!mainWindow || mainWindow.isDestroyed()) {
      callback({});
      return;
    }

    if (isLinuxWayland()) {
      preferredDisplayMediaSourceId = null;
      getDisplayMediaSources()
        .then((sources) => {
          callback(sources[0] ? { video: sources[0] } : {});
        })
        .catch((error) => {
          console.error("Unable to list Wayland display media sources.", error);
          callback({});
        });
      return;
    }

    const preferredSourceId = preferredDisplayMediaSourceId;
    preferredDisplayMediaSourceId = null;

    if (preferredSourceId) {
      getDisplayMediaSources()
        .then((sources) => {
          const selectedSource = sources.find((source) => source.id === preferredSourceId);
          callback(selectedSource ? { video: selectedSource } : {});
        })
        .catch((error) => {
          console.error("Unable to list display media sources.", error);
          callback({});
        });
      return;
    }

    pendingDisplayMediaRequest = (sourceId) => {
      if (!sourceId) {
        callback({});
        return;
      }

      getDisplayMediaSources()
        .then((sources) => {
          const selectedSource = sources.find((source) => source.id === sourceId);
          callback(selectedSource ? { video: selectedSource } : {});
        })
        .catch((error) => {
          console.error("Unable to list display media sources.", error);
          callback({});
        });
    };

    mainWindow.webContents.send("screen:pick-request");
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    height: 800,
    icon: getWindowIconPath(),
    minHeight: 640,
    minWidth: 960,
    show: false,
    width: 1280,
    webPreferences: {
      additionalArguments: [
        `--kallio-config=${encodeURIComponent(JSON.stringify(loadRuntimeConfig()))}`,
      ],
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("minimize", () => {
    showMiniWindow();
  });

  mainWindow.on("restore", () => {
    hideMiniWindow();
  });

  mainWindow.on("show", () => {
    if (!mainWindow?.isMinimized()) {
      hideMiniWindow();
    }
  });

  mainWindow.on("close", (event) => {
    if (isMeetingActive && !allowMainWindowClose) {
      event.preventDefault();
      restoreMainWindow();
      mainWindow?.webContents.send("meeting:close-request");
      return;
    }

    destroyMiniWindow();
  });

  mainWindow.on("closed", () => {
    cancelPendingDisplayMediaRequest();
    mainWindow = null;
  });

  mainWindow.setMenuBarVisibility(false);

  await mainWindow.loadURL(isDev ? DEV_SERVER_URL : `${APP_PROTOCOL_ORIGIN}/`);
}

// Two instances would race over refresh-token.bin and the runtime config.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }

      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);

    if (!isDev) {
      registerAppProtocol();
    }

    registerAuthIpc();
    registerClipboardIpc();
    registerMeetingWindowIpc();
    registerScreenShareIpc();
    wireMediaPermissions();
    await createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
