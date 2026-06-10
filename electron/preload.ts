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
});
