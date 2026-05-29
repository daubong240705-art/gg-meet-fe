"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import { FloatingMenuPanel } from "../shared/floating-menu-panel";

type RoomFooterDeviceMenuProps = {
  title: string;
  devices: MediaDeviceInfo[];
  activeDeviceId: string;
  fallbackLabel: string;
  onSelect: (deviceId: string) => void;
};

function getDeviceLabel(device: MediaDeviceInfo, fallbackLabel: string, index: number) {
  return device.label || `${fallbackLabel} ${index + 1}`;
}

export function RoomFooterDeviceMenu({
  title,
  devices,
  activeDeviceId,
  fallbackLabel,
  onSelect,
}: RoomFooterDeviceMenuProps) {
  return (
    <FloatingMenuPanel title={title}>
      {devices.length > 0 ? (
        devices.map((device, index) => (
          <button
            key={device.deviceId || `${device.kind}-${index}`}
            type="button"
            onClick={() => onSelect(device.deviceId)}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm transition motion-safe:duration-150 motion-safe:ease-out hover:bg-muted",
              activeDeviceId === device.deviceId && "bg-muted",
            )}
          >
            <span className="truncate">
              {getDeviceLabel(device, fallbackLabel, index)}
            </span>
            {activeDeviceId === device.deviceId ? (
              <Check className="h-4 w-4 shrink-0 text-primary" />
            ) : null}
          </button>
        ))
      ) : (
        <div className="rounded-2xl px-3 py-4 text-sm text-muted-foreground">
          No {fallbackLabel.toLowerCase()} devices found.
        </div>
      )}
    </FloatingMenuPanel>
  );
}
