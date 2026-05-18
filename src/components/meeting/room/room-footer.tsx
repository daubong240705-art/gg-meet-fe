"use client";

import { useEffect, useRef, useState } from "react";

import { RoomFooterControls } from "./room-footer-controls";
import { RoomFooterMeetingInfo } from "./room-footer-meeting-info";
import { RoomFooterPanelButtons } from "./room-footer-panel-buttons";
import type { FooterMenuKey } from "./room-footer-types";
import { RoomLeaveDialog } from "./room-leave-dialog";
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
  isHandRaiseCoolingDown?: boolean;
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
  isCompactControlsOpen: boolean;
  onToggleCompactControls: () => void;
  onLeave: () => void;
  isHost?: boolean;
  isEndingMeeting?: boolean;
  onEndMeeting?: () => void;
};

export default function RoomFooter({
  meetingCode,
  participantsCount,
  unreadChatCount,
  activePanel,
  isMicEnabled,
  isCameraEnabled,
  isScreenSharing,
  isHandRaised,
  isHandRaiseCoolingDown = false,
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
  isCompactControlsOpen,
  onToggleCompactControls,
  onLeave,
  isHost = false,
  isEndingMeeting = false,
  onEndMeeting,
}: RoomFooterProps) {
  const footerRef = useRef<HTMLElement | null>(null);
  const [openMenu, setOpenMenu] = useState<FooterMenuKey>(null);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);

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

  return (
    <footer ref={footerRef} className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-3 pt-3 sm:px-4 lg:px-6 lg:pb-4">
      <div className="mx-auto flex max-w-420 flex-col gap-2 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <RoomFooterMeetingInfo meetingCode={meetingCode} />

        <RoomFooterControls
          isCompactControlsOpen={isCompactControlsOpen}
          openMenu={openMenu}
          isMicEnabled={isMicEnabled}
          isCameraEnabled={isCameraEnabled}
          isScreenSharing={isScreenSharing}
          isHandRaised={isHandRaised}
          isHandRaiseCoolingDown={isHandRaiseCoolingDown}
          microphoneDevices={microphoneDevices}
          cameraDevices={cameraDevices}
          activeMicrophoneId={activeMicrophoneId}
          activeCameraId={activeCameraId}
          isHost={isHost}
          onToggleMenu={handleToggleMenu}
          onCloseMenu={() => setOpenMenu(null)}
          onToggleMic={onToggleMic}
          onToggleCamera={onToggleCamera}
          onToggleScreenShare={onToggleScreenShare}
          onToggleHandRaise={onToggleHandRaise}
          onPresentOtherContent={onPresentOtherContent}
          onSelectMicrophone={onSelectMicrophone}
          onSelectCamera={onSelectCamera}
          onLeave={onLeave}
          onOpenLeaveDialog={() => setIsLeaveDialogOpen(true)}
        />

        <RoomFooterPanelButtons
          participantsCount={participantsCount}
          unreadChatCount={unreadChatCount}
          activePanel={activePanel}
          isCompactControlsOpen={isCompactControlsOpen}
          onToggleCompactControls={() => {
            setOpenMenu(null);
            onToggleCompactControls();
          }}
          onTogglePanel={(panel) => {
            setOpenMenu(null);
            onTogglePanel(panel);
          }}
        />
      </div>

      <RoomLeaveDialog
        open={isHost && isLeaveDialogOpen}
        isEndingMeeting={isEndingMeeting}
        onClose={() => setIsLeaveDialogOpen(false)}
        onLeave={onLeave}
        onEndMeeting={onEndMeeting}
      />
    </footer>
  );
}
