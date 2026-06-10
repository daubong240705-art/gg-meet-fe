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
  session,
} from "electron";
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
    desktopCapturer
      .getSources({
        fetchWindowIcons: true,
        thumbnailSize: { height: 0, width: 0 },
        types: ["screen", "window"],
      })
      .then((sources) => {
        let settled = false;

        const finish = (source?: (typeof sources)[number]) => {
          if (settled) {
            return;
          }

          settled = true;
          callback(source ? { video: source } : {});
        };

        const createSourceItems = (sourceType: "screen" | "window") =>
          sources
            .filter((source) => source.id.startsWith(`${sourceType}:`))
            .map((source) => ({
              click: () => finish(source),
              label: source.name.replaceAll("&", "&&"),
            }));

        const screenItems = createSourceItems("screen");
        const windowItems = createSourceItems("window");
        const menu = Menu.buildFromTemplate([
          {
            enabled: false,
            label: "Chon noi dung muon chia se",
          },
          { type: "separator" },
          ...(screenItems.length > 0
            ? [
                {
                  label: "Man hinh",
                  submenu: screenItems,
                },
              ]
            : []),
          ...(windowItems.length > 0
            ? [
                {
                  label: "Cua so / ung dung",
                  submenu: windowItems,
                },
              ]
            : []),
        ]);

        if (screenItems.length === 0 && windowItems.length === 0) {
          finish();
          return;
        }

        menu.popup({
          callback: () => finish(),
          window: mainWindow ?? undefined,
        });
      })
      .catch((error) => {
        console.error("Unable to list display media sources.", error);
        callback({});
      });
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

  mainWindow.on("closed", () => {
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
