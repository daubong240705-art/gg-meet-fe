"use client";

import { type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

export type LobbyDeviceMenuKey = "selector-camera" | "selector-mic";

type LobbyDeviceSelectorProps = {
  menuKey: LobbyDeviceMenuKey;
  label: string;
  fallbackPrefix: string;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  isOpen: boolean;
  icon: ReactNode;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (deviceId: string) => void;
};

export function LobbyDeviceSelector({
  menuKey,
  label,
  fallbackPrefix,
  devices,
  selectedDeviceId,
  isOpen,
  icon,
  onToggle,
  onClose,
  onSelect,
}: LobbyDeviceSelectorProps) {
  const selectedDeviceLabel =
    devices.find((device) => device.deviceId === selectedDeviceId)?.label || label;

  return (
    <div className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-14 w-full items-center justify-between gap-3 rounded-3xl border border-border/70 bg-background/90 px-4 text-sm text-foreground shadow-sm transition hover:bg-muted/60"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
            {icon}
          </span>
          <span className="truncate">{selectedDeviceLabel}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {isOpen ? (
        devices.length === 0 ? (
          <div className="absolute left-0 top-[calc(100%+0.75rem)] z-20 w-full rounded-3xl border border-border/70 bg-card/95 p-4 text-sm text-muted-foreground shadow-[0_18px_44px_rgba(15,23,42,0.16)] backdrop-blur">
            No devices found.
          </div>
        ) : (
          <div className="absolute left-0 top-[calc(100%+0.75rem)] z-20 max-h-72 w-full overflow-y-auto rounded-3xl border border-border/70 bg-card/95 p-2 shadow-[0_18px_44px_rgba(15,23,42,0.16)] backdrop-blur">
            {devices.map((device) => (
              <button
                key={`${menuKey}-${device.deviceId}`}
                type="button"
                onClick={() => {
                  onSelect(device.deviceId);
                  onClose();
                }}
                className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-muted/80"
              >
                <span className="truncate text-sm font-medium">
                  {device.label || `${fallbackPrefix} ${device.deviceId.slice(0, 5)}`}
                </span>
                {selectedDeviceId === device.deviceId ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                ) : null}
              </button>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
