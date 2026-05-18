"use client";

import { useEffect, useRef, useState } from "react";

const VIEWPORT_RESIZE_SETTLE_MS = 180;

function getIsDocumentVisible() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

export function useRoomViewportState() {
  const [isPageVisible, setIsPageVisible] = useState(() => getIsDocumentVisible());
  const [isViewportResizing, setIsViewportResizing] = useState(false);
  const viewportResizeTimeoutRef = useRef<number | null>(null);
  const isViewportResizingRef = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(getIsDocumentVisible());
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const settleViewportResize = () => {
      isViewportResizingRef.current = false;
      viewportResizeTimeoutRef.current = null;
      setIsViewportResizing(false);
    };

    const handleViewportResize = () => {
      if (!isViewportResizingRef.current) {
        isViewportResizingRef.current = true;
        setIsViewportResizing(true);
      }

      if (viewportResizeTimeoutRef.current !== null) {
        window.clearTimeout(viewportResizeTimeoutRef.current);
      }

      viewportResizeTimeoutRef.current = window.setTimeout(
        settleViewportResize,
        VIEWPORT_RESIZE_SETTLE_MS,
      );
    };

    window.addEventListener("resize", handleViewportResize);

    return () => {
      window.removeEventListener("resize", handleViewportResize);

      if (viewportResizeTimeoutRef.current !== null) {
        window.clearTimeout(viewportResizeTimeoutRef.current);
      }
    };
  }, []);

  return {
    isPageVisible,
    isViewportResizing,
  };
}
