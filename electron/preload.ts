import { contextBridge, ipcRenderer } from "electron";

function readConfigArg() {
  const configArg = process.argv.find((arg) => arg.startsWith("--kallio-config="));

  if (!configArg) {
    return {};
  }

  try {
    return JSON.parse(decodeURIComponent(configArg.slice("--kallio-config=".length)));
  } catch {
    return {};
  }
}

contextBridge.exposeInMainWorld("desktop", {
  isElectron: true,
  config: readConfigArg(),
  auth: {
    getRefreshToken: (): Promise<string | null> => ipcRenderer.invoke("auth:getRefresh"),
    setRefreshToken: (token: string | null): Promise<void> =>
      ipcRenderer.invoke("auth:setRefresh", token),
  },
  clipboard: {
    writeText: (text: string): Promise<boolean> => ipcRenderer.invoke("clipboard:writeText", text),
  },
  meeting: {
    setActive: (active: boolean): Promise<void> =>
      ipcRenderer.invoke("meeting:set-active", active),
    updateState: (state: {
      title: string;
      participantCount: number;
      isMicEnabled: boolean;
      isCameraEnabled: boolean;
      isScreenSharing: boolean;
    }): Promise<void> => ipcRenderer.invoke("meeting:update-state", state),
    getState: () => ipcRenderer.invoke("meeting:get-state"),
    onStateChange: (callback: (state: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, state: unknown) => {
        callback(state);
      };

      ipcRenderer.on("meeting:state-changed", listener);
      return () => ipcRenderer.off("meeting:state-changed", listener);
    },
    onCloseRequest: (callback: () => void) => {
      const listener = () => callback();

      ipcRenderer.on("meeting:close-request", listener);
      return () => ipcRenderer.off("meeting:close-request", listener);
    },
    onControl: (callback: (control: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, control: string) => {
        callback(control);
      };

      ipcRenderer.on("meeting:control", listener);
      return () => ipcRenderer.off("meeting:control", listener);
    },
    sendControl: (control: string) => {
      ipcRenderer.send("meeting:send-control", control);
    },
    restoreMainWindow: () => {
      ipcRenderer.send("meeting:restore-main-window");
    },
    confirmClose: () => {
      ipcRenderer.send("meeting:confirm-close");
    },
  },
  screen: {
    getSources: () => ipcRenderer.invoke("screen:getSources"),
    setPreferredSource: (sourceId: string | null): Promise<void> =>
      ipcRenderer.invoke("screen:setPreferredSource", sourceId),
    onPickRequest: (callback: () => void) => {
      const listener = () => {
        callback();
      };

      ipcRenderer.on("screen:pick-request", listener);

      return () => {
        ipcRenderer.off("screen:pick-request", listener);
      };
    },
    pickResponse: (sourceId: string | null) => {
      ipcRenderer.send("screen:pick-response", sourceId);
    },
  },
});
