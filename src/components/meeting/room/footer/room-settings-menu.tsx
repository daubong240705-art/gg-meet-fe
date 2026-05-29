"use client";

import { Mic, MonitorUp } from "lucide-react";

import type { RoomSettings, UpdateRoomSettingsRequest } from "@/shared/services/meeting/types";

import { FloatingMenuPanel } from "../shared/floating-menu-panel";

type RoomSettingsMenuProps = {
  settings: RoomSettings;
  updatingFields: Partial<Record<keyof RoomSettings, boolean>>;
  onUpdateSettings: (patch: UpdateRoomSettingsRequest) => void;
  onClose: () => void;
};

export function RoomSettingsMenu({
  settings,
  updatingFields,
  onUpdateSettings,
}: RoomSettingsMenuProps) {
  return (
    <FloatingMenuPanel title="Room settings" widthClassName="w-72">
      <SettingsRow
        icon={<Mic className="h-4 w-4" />}
        label="Allow participants to unmute"
        checked={settings.allowParticipantUnmute}
        disabled={Boolean(updatingFields.allowParticipantUnmute)}
        onChange={(checked) => onUpdateSettings({ allowParticipantUnmute: checked })}
      />
      <SettingsRow
        icon={<MonitorUp className="h-4 w-4" />}
        label="Allow participants to present"
        checked={settings.allowParticipantShareScreen}
        disabled={Boolean(updatingFields.allowParticipantShareScreen)}
        onChange={(checked) => onUpdateSettings({ allowParticipantShareScreen: checked })}
      />
    </FloatingMenuPanel>
  );
}

type SettingsRowProps = {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
};

function SettingsRow({ icon, label, checked, disabled, onChange }: SettingsRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-left font-medium">{label}</span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
          checked ? "bg-primary" : "bg-secondary"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
