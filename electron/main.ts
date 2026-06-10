import { app, BrowserWindow, desktopCapturer, session } from "electron";
import { fork, type ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";

const DEV_SERVER_URL = process.env.ELECTRON_DEV_SERVER_URL ?? "http://localhost:3000";
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let isAppQuitting = false;

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Unable to allocate a local port.")));
        return;
      }

      server.close(() => resolve(address.port));
    });
  });
}

function waitForPort(port: number, timeoutMs = 30000): Promise<void> {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const connect = () => {
      const socket = net.connect(port, "127.0.0.1");

      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();

        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for Next server on port ${port}.`));
          return;
        }

        setTimeout(connect, 250);
      });
    };

    connect();
  });
}

function getStandaloneServerEntry() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "standalone", "server.js");
  }

  return path.join(process.cwd(), ".next", "standalone", "server.js");
}

async function startNextServer() {
  if (isDev) {
    return DEV_SERVER_URL;
  }

  const port = await getFreePort();
  const serverEntry = getStandaloneServerEntry();

  serverProcess = fork(serverEntry, [], {
    env: {
      ...process.env,
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
    },
    stdio: "inherit",
  });

  serverProcess.once("exit", (code, signal) => {
    if (!isAppQuitting) {
      console.error(`Next standalone server exited unexpectedly. code=${code} signal=${signal}`);
    }
  });

  await waitForPort(port);
  return `http://127.0.0.1:${port}`;
}

function stopNextServer() {
  if (!serverProcess || serverProcess.killed) {
    return;
  }

  serverProcess.kill();
  serverProcess = null;
}

function wireMediaPermissions() {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "media");
  });

  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer
      .getSources({ types: ["screen", "window"] })
      .then((sources) => {
        callback(sources[0] ? { video: sources[0] } : {});
      })
      .catch((error) => {
        console.error("Unable to list display media sources.", error);
        callback({});
      });
  });
}

async function createWindow() {
  const url = await startNextServer();

  mainWindow = new BrowserWindow({
    height: 800,
    minHeight: 640,
    minWidth: 960,
    show: false,
    width: 1280,
    webPreferences: {
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

  await mainWindow.loadURL(url);
}

app.whenReady().then(async () => {
  wireMediaPermissions();
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("before-quit", () => {
  isAppQuitting = true;
  stopNextServer();
});

app.on("window-all-closed", () => {
  stopNextServer();

  if (process.platform !== "darwin") {
    app.quit();
  }
});
