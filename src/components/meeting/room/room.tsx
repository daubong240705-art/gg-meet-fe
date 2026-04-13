"use client";

import { startTransition, useState } from "react";

import { REMOTE_PARTICIPANTS } from "./constants";
import RoomFooter from "./room-footer";
import RoomHeader from "./room-header";
import RoomSidebar from "./room-sidebar";
import RoomStage from "./room-stage";
import type { MeetingRoomProps, Participant, SidebarPanel, ViewMode } from "./types";

export default function MeetingRoom({
  meetingCode,
  userName,
  isMicOn,
  isCameraOn,
  onLeave,
}: MeetingRoomProps) {
  const displayName = userName.trim() || "Guest";
  const [isMicEnabled, setIsMicEnabled] = useState(isMicOn);
  const [isCameraEnabled, setIsCameraEnabled] = useState(isCameraOn);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activePanel, setActivePanel] = useState<SidebarPanel>(null);
  const [screenShareOwner, setScreenShareOwner] = useState<string | null>(null);

  const participants: Participant[] = [
    {
      id: "self",
      name: displayName,
      isHost: true,
      isMuted: !isMicEnabled,
      isCameraOff: !isCameraEnabled,
      isSpeaking: isMicEnabled,
      accentClassName: "from-primary/30 via-primary/10 to-background",
      status: screenShareOwner === displayName ? "Presenting" : "You",
    },
    ...REMOTE_PARTICIPANTS,
  ];

  const handleViewModeChange = (nextViewMode: ViewMode) => {
    startTransition(() => {
      setViewMode(nextViewMode);
    });
  };

  const togglePanel = (panel: Exclude<SidebarPanel, null>) => {
    startTransition(() => {
      setActivePanel((currentPanel) =>
        currentPanel === panel ? null : panel
      );
    });
  };

  const handlePanelChange = (panel: SidebarPanel) => {
    startTransition(() => {
      setActivePanel(panel);
    });
  };

  const handleScreenShare = () => {
    setScreenShareOwner((currentOwner) =>
      currentOwner ? null : displayName
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.35))]">
        <RoomHeader
          meetingCode={meetingCode}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />

        <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row lg:p-6">
          <div className="min-h-0 flex-1">
            <RoomStage
              participants={participants}
              viewMode={viewMode}
              screenShareOwner={screenShareOwner}
              displayName={displayName}
              onToggleScreenShare={handleScreenShare}
            />
          </div>

          <RoomSidebar
            activePanel={activePanel}
            participants={participants}
            onPanelChange={handlePanelChange}
          />
        </div>

        <RoomFooter
          displayName={displayName}
          participantsCount={participants.length}
          activePanel={activePanel}
          isMicEnabled={isMicEnabled}
          isCameraEnabled={isCameraEnabled}
          isScreenSharing={screenShareOwner !== null}
          onToggleMic={() => setIsMicEnabled((currentValue) => !currentValue)}
          onToggleCamera={() => setIsCameraEnabled((currentValue) => !currentValue)}
          onToggleScreenShare={handleScreenShare}
          onTogglePanel={togglePanel}
          onLeave={onLeave}
        />
      </div>
    </div>
  );
}
