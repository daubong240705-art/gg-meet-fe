"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";

import type { SidebarPanel } from "@/components/meeting/room/types";

const SIDEBAR_LAYOUT_TRANSITION_MS = 240;

export function useRoomSidebarState() {
  const activePanelRef = useRef<SidebarPanel>(null);
  const sidebarCloseTimeoutRef = useRef<number | null>(null);
  const sidebarLayoutTimeoutRef = useRef<number | null>(null);
  const [activePanel, setActivePanel] = useState<SidebarPanel>(null);
  const [renderedPanel, setRenderedPanel] = useState<SidebarPanel>(null);
  const [isSidebarLayoutTransitioning, setIsSidebarLayoutTransitioning] = useState(false);

  useEffect(() => {
    activePanelRef.current = activePanel;
  }, [activePanel]);

  useEffect(() => () => {
    if (sidebarCloseTimeoutRef.current !== null) {
      window.clearTimeout(sidebarCloseTimeoutRef.current);
    }

    if (sidebarLayoutTimeoutRef.current !== null) {
      window.clearTimeout(sidebarLayoutTimeoutRef.current);
    }
  }, []);

  const syncRenderedPanel = useCallback((nextPanel: SidebarPanel) => {
    if (sidebarCloseTimeoutRef.current !== null) {
      window.clearTimeout(sidebarCloseTimeoutRef.current);
      sidebarCloseTimeoutRef.current = null;
    }

    if (nextPanel) {
      setRenderedPanel(nextPanel);
      return;
    }

    sidebarCloseTimeoutRef.current = window.setTimeout(() => {
      setRenderedPanel(null);
      sidebarCloseTimeoutRef.current = null;
    }, SIDEBAR_LAYOUT_TRANSITION_MS);
  }, []);

  const beginSidebarLayoutTransition = useCallback(() => {
    if (sidebarLayoutTimeoutRef.current !== null) {
      window.clearTimeout(sidebarLayoutTimeoutRef.current);
    }

    setIsSidebarLayoutTransitioning(true);
    sidebarLayoutTimeoutRef.current = window.setTimeout(() => {
      setIsSidebarLayoutTransitioning(false);
      sidebarLayoutTimeoutRef.current = null;
    }, SIDEBAR_LAYOUT_TRANSITION_MS + 80);
  }, []);

  const togglePanel = useCallback((panel: Exclude<SidebarPanel, null>) => {
    const nextPanel = activePanel === panel ? null : panel;

    beginSidebarLayoutTransition();
    activePanelRef.current = nextPanel;
    syncRenderedPanel(nextPanel);
    startTransition(() => {
      setActivePanel(nextPanel);
    });
  }, [activePanel, beginSidebarLayoutTransition, syncRenderedPanel]);

  const handlePanelChange = useCallback((panel: SidebarPanel) => {
    if (panel !== activePanel) {
      beginSidebarLayoutTransition();
    }

    activePanelRef.current = panel;
    syncRenderedPanel(panel);
    startTransition(() => {
      setActivePanel(panel);
    });
  }, [activePanel, beginSidebarLayoutTransition, syncRenderedPanel]);

  const sidebarPanel = activePanel ?? renderedPanel;

  return {
    activePanel,
    renderedPanel,
    sidebarPanel,
    isSidebarOpen: Boolean(activePanel),
    isSidebarRendered: Boolean(sidebarPanel),
    activePanelRef,
    isSidebarLayoutTransitioning,
    togglePanel,
    handlePanelChange,
  };
}
