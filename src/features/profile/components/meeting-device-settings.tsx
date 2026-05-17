"use client";

import { Check, ChevronDown, Mic, Video } from "lucide-react";

import type {
  MeetingDevicePreferenceKey,
  MeetingDevicePreferences,
} from "@/lib/meeting/device-preferences";
import { cn } from "@/lib/utils";

import { getDeviceLabel } from "../hooks";
import type { DeviceMenuKey } from "../types";

type MeetingDeviceSettingsProps = {
  devicePreferences: MeetingDevicePreferences;
  cameraDevices: MediaDeviceInfo[];
  microphoneDevices: MediaDeviceInfo[];
  activeDeviceMenuKey: DeviceMenuKey;
  onActiveDeviceMenuChange: (menuKey: DeviceMenuKey) => void;
  onPreferenceChange: <K extends MeetingDevicePreferenceKey>(
    key: K,
    value: MeetingDevicePreferences[K],
  ) => void;
  onDeviceSelect: (
    key: "defaultCameraDeviceId" | "defaultMicrophoneDeviceId",
    deviceId: string,
  ) => void;
};

const DEVICE_TOGGLE_SETTINGS = [
  {
    key: "cameraEnabledOnJoin",
    label: "Camera on when joining",
  },
  {
    key: "microphoneEnabledOnJoin",
    label: "Microphone on when joining",
  },
  {
    key: "rememberLastUsedDevices",
    label: "Remember last used devices",
  },
] as const;

export function MeetingDeviceSettings({
  devicePreferences,
  cameraDevices,
  microphoneDevices,
  activeDeviceMenuKey,
  onActiveDeviceMenuChange,
  onPreferenceChange,
  onDeviceSelect,
}: MeetingDeviceSettingsProps) {
  const deviceSelectorSettings = [
    {
      menuKey: "microphone" as const,
      preferenceKey: "defaultMicrophoneDeviceId" as const,
      label: "Default microphone",
      icon: <Mic className="h-4 w-4 text-primary" />,
      devices: microphoneDevices,
      selectedDeviceId: devicePreferences.defaultMicrophoneDeviceId,
      fallbackPrefix: "Microphone",
    },
    {
      menuKey: "camera" as const,
      preferenceKey: "defaultCameraDeviceId" as const,
      label: "Default camera",
      icon: <Video className="h-4 w-4 text-primary" />,
      devices: cameraDevices,
      selectedDeviceId: devicePreferences.defaultCameraDeviceId,
      fallbackPrefix: "Camera",
    },
  ];

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center gap-2">
        <Video className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold">Meeting defaults</h3>
      </div>

      <div className="grid gap-4">
        {DEVICE_TOGGLE_SETTINGS.map((setting) => {
          const checked = devicePreferences[setting.key];

          return (
            <div
              key={setting.key}
              className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/45 p-4"
            >
              <p className="text-sm font-medium">{setting.label}</p>
              <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => {
                  onPreferenceChange(setting.key, !checked);
                }}
                className={cn(
                  "relative h-7 w-12 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  checked
                    ? "border-primary bg-primary"
                    : "border-border bg-muted",
                )}
              >
                <span
                  className={cn(
                    "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition",
                    checked ? "left-6" : "left-1",
                  )}
                />
              </button>
            </div>
          );
        })}

        {deviceSelectorSettings.map((setting) => {
          const isDeviceMenuOpen = activeDeviceMenuKey === setting.menuKey;
          const selectedDeviceLabel = getDeviceLabel(
            setting.devices,
            setting.selectedDeviceId,
            setting.fallbackPrefix,
          );

          return (
            <div
              key={setting.menuKey}
              className="grid gap-3 rounded-2xl border border-border/70 bg-background/45 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,18rem)] sm:items-center"
            >
              <div className="flex min-w-0 items-center gap-2">
                {setting.icon}
                <p className="text-sm font-medium">{setting.label}</p>
              </div>

              <div
                className="relative"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    onActiveDeviceMenuChange(null);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    onActiveDeviceMenuChange(null);
                  }
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onActiveDeviceMenuChange(isDeviceMenuOpen ? null : setting.menuKey);
                  }}
                  className={cn(
                    "flex h-12 w-full items-center justify-between gap-3 rounded-xl border bg-background/70 px-4 text-left text-sm shadow-xs outline-none transition",
                    "border-border/80 hover:border-primary/45 hover:bg-background focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    isDeviceMenuOpen && "border-primary/60 bg-background",
                  )}
                  aria-label={setting.label}
                >
                  <span className="min-w-0 truncate font-medium">
                    {selectedDeviceLabel}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      isDeviceMenuOpen && "rotate-180",
                    )}
                  />
                </button>

                {isDeviceMenuOpen ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-72 overflow-y-auto rounded-xl border border-border/80 bg-popover p-1.5 text-popover-foreground shadow-[0_18px_48px_rgba(2,6,23,0.38)]">
                    {[
                      { deviceId: "", label: "System default" },
                      ...setting.devices.map((device, index) => ({
                        deviceId: device.deviceId,
                        label: device.label || `${setting.fallbackPrefix} ${index + 1}`,
                      })),
                    ].map((deviceOption) => {
                      const isSelected = setting.selectedDeviceId === deviceOption.deviceId;

                      return (
                        <button
                          key={deviceOption.deviceId || "system-default"}
                          type="button"
                          onClick={() => {
                            onDeviceSelect(setting.preferenceKey, deviceOption.deviceId);
                          }}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition",
                            isSelected
                              ? "bg-primary/15 text-foreground"
                              : "hover:bg-muted/70",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/45",
                            )}
                          >
                            {isSelected ? <Check className="h-3 w-3" /> : null}
                          </span>
                          <span className="min-w-0 truncate font-medium">
                            {deviceOption.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
