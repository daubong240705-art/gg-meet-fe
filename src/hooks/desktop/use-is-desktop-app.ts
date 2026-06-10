"use client";

import { useSyncExternalStore } from "react";

const subscribeToDesktopRuntime = () => () => {};
const getDesktopRuntimeSnapshot = () =>
  typeof window !== "undefined" && window.desktop?.isElectron === true;
const getServerDesktopRuntimeSnapshot = () => false;

export function useIsDesktopApp() {
  return useSyncExternalStore(
    subscribeToDesktopRuntime,
    getDesktopRuntimeSnapshot,
    getServerDesktopRuntimeSnapshot,
  );
}
