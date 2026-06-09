"use client";

import { Hand, Mic, MicOff, Monitor, Phone, Settings, Video, VideoOff } from "lucide-react";
import type { ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { RoomSettings, UpdateRoomSettingsRequest } from "@/shared/services/meeting/types";

import { RoomFooterDeviceMenu } from "./room-footer-device-menu";
import { RoomFooterScreenMenu } from "./room-footer-screen-menu";
import type { FooterMenuKey } from "./room-footer-types";
import { RoomSettingsMenu } from "./room-settings-menu";
import { SplitControlButton } from "./split-control-button";

type RoomFooterControlsProps = {
  isCompactControlsOpen: boolean;
  openMenu: FooterMenuKey;
  isMicEnabled: boolean;
  localMicLevel: number;
  canUnmuteMicrophone: boolean;
  isCameraEnabled: boolean;
  isScreenSharing: boolean;
  isWaitingForShareApproval: boolean;
  isHandRaised: boolean;
  isHandRaiseCoolingDown: boolean;
  microphoneDevices: MediaDeviceInfo[];
  cameraDevices: MediaDeviceInfo[];
  activeMicrophoneId: string;
  activeCameraId: string;
  isHost: boolean;
  roomSettings: RoomSettings;
  updatingRoomSettingsFields: Partial<Record<keyof RoomSettings, boolean>>;
  onToggleMenu: (menu: Exclude<FooterMenuKey, null>) => void;
  onCloseMenu: () => void;
  onUpdateRoomSettings: (patch: UpdateRoomSettingsRequest) => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleHandRaise: () => void;
  onPresentOtherContent: () => void;
  onSelectMicrophone: (deviceId: string) => void;
  onSelectCamera: (deviceId: string) => void;
  onOpenLeaveDialog: () => void;
};

function ControlTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function RoomFooterControls({
  isCompactControlsOpen,
  openMenu,
  isMicEnabled,
  localMicLevel,
  canUnmuteMicrophone,
  isCameraEnabled,
  isScreenSharing,
  isWaitingForShareApproval,
  isHandRaised,
  isHandRaiseCoolingDown,
  microphoneDevices,
  cameraDevices,
  activeMicrophoneId,
  activeCameraId,
  isHost,
  roomSettings,
  updatingRoomSettingsFields,
  onToggleMenu,
  onCloseMenu,
  onUpdateRoomSettings,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleHandRaise,
  onPresentOtherContent,
  onSelectMicrophone,
  onSelectCamera,
  onOpenLeaveDialog,
}: RoomFooterControlsProps) {
  const handControlLabel = isHandRaiseCoolingDown
    ? "Hand control is cooling down"
    : isHandRaised ? "Lower hand" : "Raise hand";

  return (
    <div className="pointer-events-auto order-1 flex justify-center lg:order-2">
      <div
        className={cn(
          "flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-border/80 bg-card/95 px-2 py-1.5 text-foreground shadow-[0_12px_36px_rgba(2,6,23,0.28)] backdrop-blur-xl motion-safe:transition-[transform,opacity,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none",
          !isCompactControlsOpen && "hidden lg:flex",
        )}
      >
        <div className="relative">
          <SplitControlButton
            label={
              !isMicEnabled && !canUnmuteMicrophone
                ? "Microphone locked by host"
                : isMicEnabled ? "Mute microphone (M)" : "Unmute microphone (M)"
            }
            icon={isMicEnabled ? Mic : MicOff}
            mainAriaLabel={isMicEnabled ? "Mute microphone" : "Unmute microphone"}
            menuAriaLabel="Open microphone device menu"
            isDestructive={!isMicEnabled}
            isMenuOpen={openMenu === "microphone"}
            isMainDisabled={!isMicEnabled && !canUnmuteMicrophone}
            level={localMicLevel}
            showLevel={isMicEnabled}
            onMainClick={() => {
              onCloseMenu();
              onToggleMic();
            }}
            onMenuClick={() => onToggleMenu("microphone")}
          />
          {openMenu === "microphone" ? (
            <RoomFooterDeviceMenu
              title="Microphone"
              devices={microphoneDevices}
              activeDeviceId={activeMicrophoneId}
              fallbackLabel="Microphone"
              onSelect={(deviceId) => {
                onSelectMicrophone(deviceId);
                onCloseMenu();
              }}
            />
          ) : null}
        </div>

        <div className="relative">
          <SplitControlButton
            label={isCameraEnabled ? "Turn camera off (E)" : "Turn camera on (E)"}
            icon={isCameraEnabled ? Video : VideoOff}
            mainAriaLabel={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
            menuAriaLabel="Open camera device menu"
            isDestructive={!isCameraEnabled}
            isMenuOpen={openMenu === "camera"}
            onMainClick={() => {
              onCloseMenu();
              onToggleCamera();
            }}
            onMenuClick={() => onToggleMenu("camera")}
          />
          {openMenu === "camera" ? (
            <RoomFooterDeviceMenu
              title="Camera"
              devices={cameraDevices}
              activeDeviceId={activeCameraId}
              fallbackLabel="Camera"
              onSelect={(deviceId) => {
                onSelectCamera(deviceId);
                onCloseMenu();
              }}
            />
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
            onMainClick={() => onToggleMenu("screen")}
            onMenuClick={() => onToggleMenu("screen")}
          />
          {openMenu === "screen" ? (
            <RoomFooterScreenMenu
              isScreenSharing={isScreenSharing}
              isWaitingForApproval={isWaitingForShareApproval}
              onToggleScreenShare={onToggleScreenShare}
              onPresentOtherContent={onPresentOtherContent}
              onClose={onCloseMenu}
            />
          ) : null}
        </div>

        <ControlTooltip label={`${handControlLabel} (H)`}>
          <button
            type="button"
            aria-label={isHandRaised ? "Lower hand" : "Raise hand"}
            onClick={onToggleHandRaise}
            disabled={isHandRaiseCoolingDown}
            className={cn(
              "flex size-11 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-70 motion-safe:duration-200 motion-safe:ease-out hover:-translate-y-0.5 disabled:hover:translate-y-0 motion-reduce:transform-none",
              isHandRaised
                ? "bg-amber-300 text-slate-950 hover:bg-amber-200"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/85",
            )}
          >
            <Hand className="h-5 w-5" />
          </button>
        </ControlTooltip>

        {isHost ? (
          <div className="relative">
            <ControlTooltip label="Room settings">
              <button
                type="button"
                aria-label="Room settings"
                onClick={() => onToggleMenu("settings")}
                className={cn(
                  "flex size-11 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-safe:duration-200 motion-safe:ease-out hover:-translate-y-0.5 motion-reduce:transform-none",
                  openMenu === "settings"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/85",
                )}
              >
                <Settings className="h-5 w-5" />
              </button>
            </ControlTooltip>
            {openMenu === "settings" ? (
              <RoomSettingsMenu
                settings={roomSettings}
                updatingFields={updatingRoomSettingsFields}
                onUpdateSettings={onUpdateRoomSettings}
                onClose={onCloseMenu}
              />
            ) : null}
          </div>
        ) : null}

        <ControlTooltip label="Leave meeting (D)">
          <button
            type="button"
            aria-label="Leave meeting"
            onClick={() => {
              onCloseMenu();
              onOpenLeaveDialog();
            }}
            className="ml-1 flex h-11 items-center justify-center rounded-full bg-destructive px-4 text-destructive-foreground transition motion-safe:duration-200 motion-safe:ease-out hover:-translate-y-0.5 hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 motion-reduce:transform-none"
          >
            <Phone className="h-5 w-5" />
          </button>
        </ControlTooltip>
      </div>
    </div>
  );
}
