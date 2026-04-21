"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

const LAYOUT_MOTION_DURATION_MS = 220;
const LAYOUT_MOTION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const LAYOUT_ITEM_SELECTOR = "[data-layout-id]";

type ActiveLayoutAnimation = {
  frameId: number | null;
  timeoutId: number | null;
};

function shouldReduceMotion() {
  return (
    typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function resetLayoutAnimationStyles(element: HTMLElement) {
  element.style.transition = "";
  element.style.transform = "";
  element.style.opacity = "";
  element.style.transformOrigin = "";
}

export function useLayoutFlip<TElement extends HTMLElement>(
  containerRef: RefObject<TElement | null>,
  options: { enabled?: boolean } = {},
) {
  const isEnabled = options.enabled ?? true;
  const previousRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const activeAnimationsRef = useRef<Map<string, ActiveLayoutAnimation>>(new Map());

  const cancelActiveAnimation = (layoutId: string) => {
    const activeAnimation = activeAnimationsRef.current.get(layoutId);

    if (!activeAnimation) {
      return;
    }

    if (activeAnimation.frameId !== null) {
      window.cancelAnimationFrame(activeAnimation.frameId);
    }

    if (activeAnimation.timeoutId !== null) {
      window.clearTimeout(activeAnimation.timeoutId);
    }

    activeAnimationsRef.current.delete(layoutId);
  };

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (!container) {
      previousRectsRef.current = new Map();
      return;
    }

    const elements = Array.from(
      container.querySelectorAll<HTMLElement>(LAYOUT_ITEM_SELECTOR),
    );

    if (!isEnabled) {
      activeAnimationsRef.current.forEach((_, layoutId) => {
        cancelActiveAnimation(layoutId);
      });
      activeAnimationsRef.current.clear();
      elements.forEach(resetLayoutAnimationStyles);
      previousRectsRef.current = new Map();
      return;
    }

    const nextRects = new Map<string, DOMRect>();
    const previousRects = previousRectsRef.current;
    const canAnimate = !shouldReduceMotion();

    elements.forEach((element) => {
      const layoutId = element.dataset.layoutId;

      if (!layoutId) {
        return;
      }

      const activeAnimation = activeAnimationsRef.current.get(layoutId);
      const currentVisualRect = activeAnimation ? element.getBoundingClientRect() : null;

      if (activeAnimation) {
        cancelActiveAnimation(layoutId);
        resetLayoutAnimationStyles(element);
      }

      const nextRect = element.getBoundingClientRect();
      nextRects.set(layoutId, nextRect);

      const previousRect = currentVisualRect ?? previousRects.get(layoutId);

      if (!canAnimate || !previousRect) {
        return;
      }

      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;
      const scaleX = previousRect.width && nextRect.width ? previousRect.width / nextRect.width : 1;
      const scaleY = previousRect.height && nextRect.height ? previousRect.height / nextRect.height : 1;
      const didMove = Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5;
      const didResize = Math.abs(scaleX - 1) > 0.01 || Math.abs(scaleY - 1) > 0.01;

      if (!didMove && !didResize) {
        return;
      }

      element.style.transformOrigin = "top left";
      element.style.transition = "none";
      element.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`;
      element.style.opacity = "0.98";

      const nextAnimation: ActiveLayoutAnimation = {
        frameId: null,
        timeoutId: null,
      };

      nextAnimation.frameId = window.requestAnimationFrame(() => {
        if (activeAnimationsRef.current.get(layoutId) !== nextAnimation) {
          return;
        }

        nextAnimation.frameId = null;
        element.style.transition = [
          `transform ${LAYOUT_MOTION_DURATION_MS}ms ${LAYOUT_MOTION_EASING}`,
          `opacity ${LAYOUT_MOTION_DURATION_MS}ms ${LAYOUT_MOTION_EASING}`,
        ].join(", ");
        element.style.transform = "";
        element.style.opacity = "";

        nextAnimation.timeoutId = window.setTimeout(() => {
          if (activeAnimationsRef.current.get(layoutId) !== nextAnimation) {
            return;
          }

          resetLayoutAnimationStyles(element);
          activeAnimationsRef.current.delete(layoutId);
        }, LAYOUT_MOTION_DURATION_MS + 80);
      });

      activeAnimationsRef.current.set(layoutId, nextAnimation);
    });

    previousRectsRef.current = nextRects;
  });

  useLayoutEffect(() => () => {
    activeAnimationsRef.current.forEach((_, layoutId) => {
      cancelActiveAnimation(layoutId);
    });
    activeAnimationsRef.current.clear();
  }, []);
}
