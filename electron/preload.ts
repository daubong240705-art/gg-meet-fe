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
