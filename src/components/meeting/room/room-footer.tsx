"use client";

import { Check, ChevronUp, Copy, Hand, MessageSquare, Mic, MicOff, Monitor, Phone, Users, Video, VideoOff, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { SidebarPanel } from "./types";

type RoomFooterProps = {
  meetingCode: string;
  participantsCount: number;
  unreadChatCount: number;
  activePanel: SidebarPanel;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  microphoneDevices: MediaDeviceInfo[];
  cameraDevices: MediaDeviceInfo[];
  activeMicrophoneId: string;
  activeCameraId: string;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleHandRaise: () => void;
  onPresentOtherContent: () => void;
  onSelectMicrophone: (deviceId: string) => void;
  onSelectCamera: (deviceId: string) => void;
  onRefreshDevices: () => void;
  onTogglePanel: (panel: Exclude<SidebarPanel, null>) => void;
  onLeave: () => void;
};

type FooterMenuKey = "microphone" | "camera" | "screen" | null;

type SplitControlButtonProps = {
  label: string;
  icon: LucideIcon;
  mainAriaLabel: string;
  menuAriaLabel: string;
  isActive?: boolean;
  isDestructive?: boolean;
  isMenuOpen?: boolean;
  onMainClick: () => void;
  onMenuClick: () => void;
};

type FooterMenuPanelProps = {
  title: string;
  widthClassName?: string;
  children: ReactNode;
};

function formatTime(now: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
}

function getDeviceLabel(device: MediaDeviceInfo, fallbackLabel: string, index: number) {
  return device.label || `${fallbackLabel} ${index + 1}`;
}

function FooterMenuPanel({
  title,
  widthClassName = "w-72",
  children,
}: FooterMenuPanelProps) {
  return (
    <div
      className={cn(
        "absolute bottom-full left-1/2 z-30 mb-3 -translate-x-1/2 rounded-[28px] border border-border/80 bg-card/95 p-3 text-card-foreground shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl",
        widthClassName,
      )}
    >
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SplitControlButton({
  label,
  icon: Icon,
  mainAriaLabel,
  menuAriaLabel,
  isActive = false,
  isDestructive = false,
  isMenuOpen = false,
  onMainClick,
  onMenuClick,
}: SplitControlButtonProps) {
  const toneClassName = isActive
    ? "bg-primary text-primary-foreground"
    : isDestructive
      ? "bg-destructive text-destructive-foreground"
      : "bg-secondary text-secondary-foreground";

  const hoverToneClassName = isActive
    ? "hover:bg-primary/90"
    : isDestructive
      ? "hover:bg-destructive/90"
      : "hover:bg-secondary/85";

  return (
    <div className="relative">
      <div className="flex items-center rounded-full bg-background/75 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <button
          type="button"
          aria-label={mainAriaLabel}
          title={label}
          onClick={onMainClick}
          className={cn(
            "flex size-11 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            toneClassName,
            hoverToneClassName,
          )}
        >
          <Icon className="h-5 w-5" />
        </button>

        <button
          type="button"
          aria-label={menuAriaLabel}
          aria-expanded={isMenuOpen}
          onClick={onMenuClick}
          className={cn(
            "flex h-11 w-8 items-center justify-center rounded-full text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            isMenuOpen ? "bg-muted text-foreground" : "hover:bg-muted hover:text-foreground",
          )}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function RoomFooter({
  meetingCode,
  participantsCount,
  unreadChatCount,
  activePanel,
  isMicEnabled,
  isCameraEnabled,
  isScreenSharing,
  isHandRaised,
  microphoneDevices,
  cameraDevices,
  activeMicrophoneId,
  activeCameraId,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleHandRaise,
  onPresentOtherContent,
  onSelectMicrophone,
  onSelectCamera,
  onRefreshDevices,
  onTogglePanel,
  onLeave,
}: RoomFooterProps) {
  const footerRef = useRef<HTMLElement | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);
  const [openMenu, setOpenMenu] = useState<FooterMenuKey>(null);
  const [now, setNow] = useState(() => new Date());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (footerRef.current?.contains(event.target as Node)) {
        return;
      }

      setOpenMenu(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenu]);

  const handleToggleMenu = (menu: Exclude<FooterMenuKey, null>) => {
    setOpenMenu((currentMenu) => {
      const nextMenu = currentMenu === menu ? null : menu;

      if (nextMenu === "microphone" || nextMenu === "camera") {
        onRefreshDevices();
      }

      return nextMenu;
    });
  };

  const handleCopyMeetingLink = async () => {
    if (typeof window === "undefined" || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${meetingCode}`);
      setCopied(true);

      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }

      copyTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <footer ref={footerRef} className="relative z-30 px-3 pb-4 pt-2 sm:px-4 lg:px-6 lg:pb-6">
      <div className="mx-auto flex max-w-420 flex-col gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div className="order-2 flex items-center justify-center gap-3 text-sm text-muted-foreground lg:order-1 lg:justify-start">
          <span className="font-semibold text-foreground">{formatTime(now)}</span>
          <span className="text-border">|</span>
          <div className="flex items-center gap-2">
            <span className="tracking-wide">{meetingCode}</span>
            <button
              type="button"
              aria-label="Copy meeting link"
              onClick={handleCopyMeetingLink}
              className="flex size-7 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        <div className="order-1 flex justify-center lg:order-2">
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-full border border-border/80 bg-card/95 px-3 py-2 text-foreground shadow-[0_18px_50px_rgba(2,6,23,0.32)] backdrop-blur-xl">
            <div className="relative">
              <SplitControlButton
                label={isMicEnabled ? "Mute microphone" : "Unmute microphone"}
                icon={isMicEnabled ? Mic : MicOff}
                mainAriaLabel={isMicEnabled ? "Mute microphone" : "Unmute microphone"}
                menuAriaLabel="Open microphone device menu"
                isDestructive={!isMicEnabled}
                isMenuOpen={openMenu === "microphone"}
                onMainClick={() => {
                  setOpenMenu(null);
                  onToggleMic();
                }}
                onMenuClick={() => handleToggleMenu("microphone")}
              />
              {openMenu === "microphone" ? (
                <FooterMenuPanel title="Microphone">
                  {microphoneDevices.length > 0 ? (
                    microphoneDevices.map((device, index) => (
                      <button
                        key={device.deviceId || `${device.kind}-${index}`}
                        type="button"
                        onClick={() => {
                          onSelectMicrophone(device.deviceId);
                          setOpenMenu(null);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm transition hover:bg-muted",
                          activeMicrophoneId === device.deviceId && "bg-muted",
                        )}
                      >
                        <span className="truncate">
                          {getDeviceLabel(device, "Microphone", index)}
                        </span>
                        {activeMicrophoneId === device.deviceId ? (
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <div className="rounded-2xl px-3 py-4 text-sm text-muted-foreground">
                      No microphone devices found.
                    </div>
                  )}
                </FooterMenuPanel>
              ) : null}
            </div>

            <div className="relative">
              <SplitControlButton
                label={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
                icon={isCameraEnabled ? Video : VideoOff}
                mainAriaLabel={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
                menuAriaLabel="Open camera device menu"
                isDestructive={!isCameraEnabled}
                isMenuOpen={openMenu === "camera"}
                onMainClick={() => {
                  setOpenMenu(null);
                  onToggleCamera();
                }}
                onMenuClick={() => handleToggleMenu("camera")}
              />
              {openMenu === "camera" ? (
                <FooterMenuPanel title="Camera">
                  {cameraDevices.length > 0 ? (
                    cameraDevices.map((device, index) => (
                      <button
                        key={device.deviceId || `${device.kind}-${index}`}
                        type="button"
                        onClick={() => {
                          onSelectCamera(device.deviceId);
                          setOpenMenu(null);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm transition hover:bg-muted",
                          activeCameraId === device.deviceId && "bg-muted",
                        )}
                      >
                        <span className="truncate">
                          {getDeviceLabel(device, "Camera", index)}
                        </span>
                        {activeCameraId === device.deviceId ? (
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <div className="rounded-2xl px-3 py-4 text-sm text-muted-foreground">
                      No camera devices found.
                    </div>
                  )}
                </FooterMenuPanel>
              ) : null}
            </div>

            <div className="relative">
              <SplitControlButton
                label={isScreenSharing ? "Presentation controls" : "Present now"}
                icon={Monitor}
                mainAriaLabel={isScreenSharing ? "Open presentation controls" : "Present now"}
                menuAriaLabel="Open presentation menu"
                isActive={isScreenSharing}
                isMenuOpen={openMenu === "screen"}
                onMainClick={() => handleToggleMenu("screen")}
                onMenuClick={() => handleToggleMenu("screen")}
              />
              {openMenu === "screen" ? (
                <FooterMenuPanel title="Present" widthClassName="w-80">
                  <button
                    type="button"
                    onClick={() => {
                      if (isScreenSharing) {
                        onPresentOtherContent();
                      } else {
                        onToggleScreenShare();
                      }
                      setOpenMenu(null);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm transition hover:bg-muted"
                  >
                    <span>{isScreenSharing ? "Present other content" : "Present now"}</span>
                    <Monitor className="h-4 w-4 shrink-0 text-primary" />
                  </button>

                  {isScreenSharing ? (
                    <button
                      type="button"
                      onClick={() => {
                        onToggleScreenShare();
                        setOpenMenu(null);
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm text-destructive transition hover:bg-destructive/10"
                    >
                      <span>Stop presenting</span>
                      <Monitor className="h-4 w-4 shrink-0" />
                    </button>
                  ) : null}
                </FooterMenuPanel>
              ) : null}
            </div>

            <button
              type="button"
              aria-label={isHandRaised ? "Lower hand" : "Raise hand"}
              title={isHandRaised ? "Lower hand" : "Raise hand"}
              onClick={onToggleHandRaise}
              className={cn(
                "flex size-13 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                isHandRaised
                  ? "bg-amber-300 text-slate-950 hover:bg-amber-200"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/85",
              )}
            >
              <Hand className="h-5 w-5" />
            </button>

            <button
              type="button"
              aria-label="Leave meeting"
              onClick={onLeave}
              className="ml-1 flex h-13 items-center justify-center rounded-full bg-destructive px-5 text-destructive-foreground transition hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <Phone className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="order-3 flex items-center justify-center gap-2 lg:justify-end">
          <button
            type="button"
            aria-label="Open participants"
            onClick={() => onTogglePanel("participants")}
            className={cn(
              "relative flex size-11 items-center justify-center rounded-full border border-border/80 bg-card/95 text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              activePanel === "participants" && "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            <Users className="h-5 w-5" />
            <span
              className={cn(
                "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold",
                activePanel === "participants"
                  ? "bg-background text-foreground"
                  : "bg-primary text-primary-foreground",
              )}
            >
              {participantsCount}
            </span>
          </button>

          <button
            type="button"
            aria-label="Open chat"
            onClick={() => onTogglePanel("chat")}
            className={cn(
              "relative flex size-11 items-center justify-center rounded-full border border-border/80 bg-card/95 text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              activePanel === "chat" && "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            <MessageSquare className="h-5 w-5" />
            {unreadChatCount > 0 ? (
              <span
                className={cn(
                  "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold",
                  activePanel === "chat"
                    ? "bg-background text-foreground"
                    : "bg-destructive text-destructive-foreground",
                )}
              >
                {unreadChatCount > 99 ? "99+" : unreadChatCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </footer>
  );
}
