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
  microphoneDevices: MediaDeviceInfo[];
  cameraDevices: MediaDeviceInfo[];
  activeMicrophoneId: string;
  activeCameraId: string;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
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
        "absolute bottom-full left-1/2 z-30 mb-3 -translate-x-1/2 rounded-[28px] border border-white/10 bg-[#202124]/96 p-3 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl",
        widthClassName,
      )}
    >
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
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
    ? "bg-[#8ab4f8] text-slate-950"
    : isDestructive
      ? "bg-[#ea4335] text-white"
      : "bg-[#3c4043] text-white";

  const hoverToneClassName = isActive
    ? "hover:bg-[#a8c7fa]"
    : isDestructive
      ? "hover:bg-[#ef6c62]"
      : "hover:bg-[#4a4d52]";

  return (
    <div className="relative">
      <div className="flex items-center rounded-full bg-[#2b2c2f] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <button
          type="button"
          aria-label={mainAriaLabel}
          title={label}
          onClick={onMainClick}
          className={cn(
            "flex size-11 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ab4f8]",
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
            "flex h-11 w-8 items-center justify-center rounded-full text-white/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ab4f8]",
            isMenuOpen ? "bg-white/14 text-white" : "hover:bg-white/10 hover:text-white",
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
  microphoneDevices,
  cameraDevices,
  activeMicrophoneId,
  activeCameraId,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
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
    <footer ref={footerRef} className="px-3 pb-4 pt-2 sm:px-4 lg:px-6 lg:pb-6">
      <div className="mx-auto flex max-w-420 flex-col gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div className="order-2 flex items-center justify-center gap-3 text-sm text-white/65 lg:order-1 lg:justify-start">
          <span className="font-semibold text-white">{formatTime(now)}</span>
          <span className="text-white/25">|</span>
          <div className="flex items-center gap-2">
            <span className="tracking-wide">{meetingCode}</span>
            <button
              type="button"
              aria-label="Copy meeting link"
              onClick={handleCopyMeetingLink}
              className="flex size-7 items-center justify-center rounded-full bg-white/8 text-white/80 transition hover:bg-white/12 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ab4f8]"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-300" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        <div className="order-1 flex justify-center lg:order-2">
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/8 bg-[#202124]/92 px-3 py-2 text-white shadow-[0_18px_50px_rgba(0,0,0,0.32)] backdrop-blur-xl">
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
                          "flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm transition hover:bg-white/8",
                          activeMicrophoneId === device.deviceId && "bg-white/8",
                        )}
                      >
                        <span className="truncate">
                          {getDeviceLabel(device, "Microphone", index)}
                        </span>
                        {activeMicrophoneId === device.deviceId ? (
                          <Check className="h-4 w-4 shrink-0 text-[#8ab4f8]" />
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <div className="rounded-2xl px-3 py-4 text-sm text-white/60">
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
                          "flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm transition hover:bg-white/8",
                          activeCameraId === device.deviceId && "bg-white/8",
                        )}
                      >
                        <span className="truncate">
                          {getDeviceLabel(device, "Camera", index)}
                        </span>
                        {activeCameraId === device.deviceId ? (
                          <Check className="h-4 w-4 shrink-0 text-[#8ab4f8]" />
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <div className="rounded-2xl px-3 py-4 text-sm text-white/60">
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
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm transition hover:bg-white/8"
                  >
                    <span>{isScreenSharing ? "Present other content" : "Present now"}</span>
                    <Monitor className="h-4 w-4 shrink-0 text-[#8ab4f8]" />
                  </button>

                  {isScreenSharing ? (
                    <button
                      type="button"
                      onClick={() => {
                        onToggleScreenShare();
                        setOpenMenu(null);
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm text-[#f28b82] transition hover:bg-[#ea4335]/12"
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
              aria-label="Raise hand"
              className="flex size-13 items-center justify-center rounded-full bg-[#3c4043] text-white transition hover:bg-[#4a4d52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ab4f8]"
            >
              <Hand className="h-5 w-5" />
            </button>

            <button
              type="button"
              aria-label="Leave meeting"
              onClick={onLeave}
              className="ml-1 flex h-13 items-center justify-center rounded-full bg-[#ea4335] px-5 text-white transition hover:bg-[#ef6c62] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
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
              "relative flex size-11 items-center justify-center rounded-full border border-white/10 bg-[#202124]/92 text-white transition hover:bg-[#2b2c2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ab4f8]",
              activePanel === "participants" && "bg-[#8ab4f8] text-slate-950 hover:bg-[#a8c7fa]",
            )}
          >
            <Users className="h-5 w-5" />
            <span
              className={cn(
                "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold",
                activePanel === "participants"
                  ? "bg-slate-950 text-white"
                  : "bg-[#8ab4f8] text-slate-950",
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
              "relative flex size-11 items-center justify-center rounded-full border border-white/10 bg-[#202124]/92 text-white transition hover:bg-[#2b2c2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ab4f8]",
              activePanel === "chat" && "bg-[#8ab4f8] text-slate-950 hover:bg-[#a8c7fa]",
            )}
          >
            <MessageSquare className="h-5 w-5" />
            {unreadChatCount > 0 ? (
              <span
                className={cn(
                  "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold",
                  activePanel === "chat"
                    ? "bg-slate-950 text-white"
                    : "bg-[#ea4335] text-white",
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
