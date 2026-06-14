"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppWindow, Monitor, RefreshCw, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DEFAULT_SCREEN_SHARE_QUALITY,
  SCREEN_SHARE_FPS_OPTIONS,
  SCREEN_SHARE_RESOLUTIONS,
  type ScreenShareFps,
  type ScreenShareQuality,
  type ScreenShareResolution,
} from "@/lib/meeting/screen-share-options";
import { cn } from "@/lib/utils";

type SourceTab = DesktopScreenShareSource["type"];
type RequiredScreenShareQuality = Required<ScreenShareQuality>;

export type ScreenSharePickerResult = {
  sourceId: string | null;
  quality: RequiredScreenShareQuality;
};

type ScreenSharePickerDialogProps = {
  open?: boolean;
  canUse1440p?: boolean;
  onConfirm?: (result: ScreenSharePickerResult) => void;
  onCancel?: () => void;
};

const SOURCE_TABS: Array<{ value: SourceTab; label: string; icon: LucideIcon }> = [
  { value: "screen", label: "Entire screen", icon: Monitor },
  { value: "window", label: "Window", icon: AppWindow },
];

const STORAGE_KEY = "kallio:screen-share-quality";

function isScreenShareResolution(value: unknown): value is ScreenShareResolution {
  return SCREEN_SHARE_RESOLUTIONS.includes(value as ScreenShareResolution);
}

function isScreenShareFps(value: unknown): value is ScreenShareFps {
  return SCREEN_SHARE_FPS_OPTIONS.includes(value as ScreenShareFps);
}

function readStoredQuality(canUse1440p: boolean): RequiredScreenShareQuality {
  if (typeof window === "undefined") {
    return DEFAULT_SCREEN_SHARE_QUALITY;
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as
      | Partial<ScreenShareQuality>
      | null;
    const storedResolution = isScreenShareResolution(parsed?.resolution)
      ? parsed.resolution
      : DEFAULT_SCREEN_SHARE_QUALITY.resolution;
    const resolution = storedResolution === 1440 && !canUse1440p
      ? DEFAULT_SCREEN_SHARE_QUALITY.resolution
      : storedResolution;
    const fps = isScreenShareFps(parsed?.fps)
      ? parsed.fps
      : DEFAULT_SCREEN_SHARE_QUALITY.fps;

    return {
      resolution,
      fps,
      contentHint: DEFAULT_SCREEN_SHARE_QUALITY.contentHint,
    };
  } catch {
    return DEFAULT_SCREEN_SHARE_QUALITY;
  }
}

function persistQuality(quality: RequiredScreenShareQuality) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(quality));
  } catch {
    // Non-critical preference only.
  }
}

export function ScreenSharePickerDialog({
  open: controlledOpen,
  canUse1440p = false,
  onConfirm,
  onCancel,
}: ScreenSharePickerDialogProps = {}) {
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [sources, setSources] = useState<DesktopScreenShareSource[]>([]);
  const [activeTab, setActiveTab] = useState<SourceTab>("screen");
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [quality, setQuality] = useState<RequiredScreenShareQuality>(
    () => readStoredQuality(canUse1440p),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pendingRequestRef = useRef(false);
  const isControlled = controlledOpen !== undefined;
  const open = controlledOpen ?? fallbackOpen;
  const isLinuxWayland = Boolean(
    typeof window !== "undefined" && window.desktop?.screen?.isLinuxWayland,
  );
  const availableResolutions = useMemo(
    () => SCREEN_SHARE_RESOLUTIONS.filter((resolution) => resolution !== 1440 || canUse1440p),
    [canUse1440p],
  );

  const loadSources = useCallback(async () => {
    const desktopScreen = window.desktop?.screen;

    if (!desktopScreen) {
      return;
    }

    if (isLinuxWayland) {
      setSources([]);
      setSelectedSourceId(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextSources = await desktopScreen.getSources();
      const firstSource = nextSources.find((source) => source.type === "screen")
        ?? nextSources[0]
        ?? null;

      setSources(nextSources);
      setActiveTab(firstSource?.type ?? "screen");
      setSelectedSourceId(firstSource?.id ?? null);

      if (nextSources.length === 0) {
        setErrorMessage("No screens or windows are available to share.");
      }
    } catch {
      setSources([]);
      setSelectedSourceId(null);
      setErrorMessage("Unable to load screens and windows.");
      toast.error("Unable to load screen share options", {
        description: "Check screen recording permissions, then try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLinuxWayland]);

  const closePicker = useCallback(() => {
    if (isControlled) {
      onCancel?.();
    } else {
      const desktopScreen = window.desktop?.screen;

      if (pendingRequestRef.current && desktopScreen) {
        desktopScreen.pickResponse(null);
      }

      pendingRequestRef.current = false;
      setFallbackOpen(false);
    }
  }, [isControlled, onCancel]);

  const handleConfirm = useCallback(() => {
    const selectedSource = sources.find((source) => source.id === selectedSourceId);

    if (!isLinuxWayland && !selectedSource) {
      return;
    }

    const permittedQuality = quality.resolution === 1440 && !canUse1440p
      ? { ...quality, resolution: DEFAULT_SCREEN_SHARE_QUALITY.resolution }
      : quality;

    persistQuality(permittedQuality);

    if (isControlled) {
      onConfirm?.({
        sourceId: isLinuxWayland ? null : selectedSource?.id ?? null,
        quality: permittedQuality,
      });
      return;
    }

    const desktopScreen = window.desktop?.screen;

    if (pendingRequestRef.current && desktopScreen) {
      desktopScreen.pickResponse(isLinuxWayland ? null : selectedSource?.id ?? null);
    }

    pendingRequestRef.current = false;
    setFallbackOpen(false);
  }, [
    canUse1440p,
    isControlled,
    isLinuxWayland,
    onConfirm,
    quality,
    selectedSourceId,
    sources,
  ]);

  const handleTabChange = useCallback((tab: SourceTab) => {
    setActiveTab(tab);
    setSelectedSourceId(sources.find((source) => source.type === tab)?.id ?? null);
  }, [sources]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadSources();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadSources, open]);

  useEffect(() => {
    const desktopScreen = window.desktop?.screen;

    if (!desktopScreen || isControlled) {
      return;
    }

    const unsubscribe = desktopScreen.onPickRequest(() => {
      pendingRequestRef.current = true;
      setFallbackOpen(true);
    });

    return () => {
      unsubscribe();

      if (pendingRequestRef.current) {
        desktopScreen.pickResponse(null);
        pendingRequestRef.current = false;
      }
    };
  }, [isControlled]);

  const sourceCounts = useMemo(
    () => ({
      screen: sources.filter((source) => source.type === "screen").length,
      window: sources.filter((source) => source.type === "window").length,
    }),
    [sources],
  );
  const visibleSources = useMemo(
    () => sources.filter((source) => source.type === activeTab),
    [activeTab, sources],
  );
  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId) ?? null,
    [selectedSourceId, sources],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          closePicker();
        }
      }}
    >
      <DialogContent
        className={cn(
          "max-h-[min(820px,calc(100vh-2rem))] overflow-hidden",
          isLinuxWayland ? "sm:max-w-md" : "sm:max-w-4xl",
        )}
      >
        <DialogHeader>
          <DialogTitle>
            {isLinuxWayland ? "Choose share quality" : "Choose what to share"}
          </DialogTitle>
          <DialogDescription>
            {isLinuxWayland
              ? "Choose the maximum share quality."
              : "Select a screen or application window and choose the maximum share quality."}
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "grid gap-3",
            !isLinuxWayland && "lg:grid-cols-[minmax(0,1fr)_15rem]",
          )}
        >
          {!isLinuxWayland ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex rounded-lg border border-border bg-muted/40 p-1">
                {SOURCE_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.value;

                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => handleTabChange(tab.value)}
                      className={cn(
                        "inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium transition",
                        isActive
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {sourceCounts[tab.value]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={() => void loadSources()}
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          ) : null}

          <div className="rounded-lg border border-border bg-muted/25 p-3">
            <p className="text-sm font-medium">Share quality</p>
            <div className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Resolution</p>
                <div className={cn(
                  "grid gap-1",
                  availableResolutions.length === 4 ? "grid-cols-2" : "grid-cols-3",
                )}>
                  {availableResolutions.map((resolution) => (
                    <button
                      key={resolution}
                      type="button"
                      onClick={() => setQuality((current) => ({ ...current, resolution }))}
                      className={cn(
                        "h-8 rounded-md border px-2 text-sm font-medium transition",
                        quality.resolution === resolution
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-muted",
                      )}
                    >
                      {resolution}p
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">FPS</p>
                <div className="grid grid-cols-3 gap-1">
                  {SCREEN_SHARE_FPS_OPTIONS.map((fps) => (
                    <button
                      key={fps}
                      type="button"
                      onClick={() => setQuality((current) => ({ ...current, fps }))}
                      className={cn(
                        "h-8 rounded-md border px-2 text-sm font-medium transition",
                        quality.fps === fps
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-muted",
                      )}
                    >
                      {fps}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {!isLinuxWayland ? (
          <div className="min-h-72 overflow-y-auto rounded-lg border border-border bg-background/60 p-3">
            {isLoading ? (
              <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
                Loading screens and windows...
              </div>
            ) : errorMessage ? (
              <div className="flex min-h-64 items-center justify-center px-6 text-center text-sm text-muted-foreground">
                {errorMessage}
              </div>
            ) : visibleSources.length === 0 ? (
              <div className="flex min-h-64 items-center justify-center px-6 text-center text-sm text-muted-foreground">
                No {activeTab === "screen" ? "screens" : "windows"} found.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visibleSources.map((source) => {
                  const isSelected = selectedSourceId === source.id;

                  return (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() => setSelectedSourceId(source.id)}
                      className={cn(
                        "overflow-hidden rounded-lg border bg-card text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isSelected
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border hover:border-primary/60",
                      )}
                    >
                      <div className="aspect-video bg-muted">
                        <img
                          src={source.thumbnail}
                          alt=""
                          className="h-full w-full object-cover"
                          draggable={false}
                        />
                      </div>
                      <div className="flex min-h-12 items-center gap-2 px-3 py-2">
                        {source.appIcon ? (
                          <img
                            src={source.appIcon}
                            alt=""
                            className="h-5 w-5 shrink-0"
                            draggable={false}
                          />
                        ) : activeTab === "screen" ? (
                          <Monitor className="h-5 w-5 shrink-0 text-muted-foreground" />
                        ) : (
                          <AppWindow className="h-5 w-5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="min-w-0 truncate text-sm font-medium">
                          {source.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter className="items-center justify-between sm:justify-between">
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            {isLinuxWayland
              ? `Share at ${quality.resolution}p/${quality.fps}fps`
              : selectedSource
              ? `Selected: ${selectedSource.name} at ${quality.resolution}p/${quality.fps}fps`
              : "Select a source to continue."}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closePicker}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={(!isLinuxWayland && !selectedSource) || isLoading}
              onClick={handleConfirm}
            >
              Share
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
