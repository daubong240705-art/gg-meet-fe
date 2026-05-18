"use client";

import { BellRing, Check, ChevronDown, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  MEETING_AUDIO_EVENTS,
  MEETING_AUDIO_SOUND_OPTIONS,
  type MeetingAudioKey,
  type MeetingAudioPreferences,
  type MeetingAudioSoundId,
} from "@/lib/meeting/lobby-audio";
import { cn } from "@/lib/utils";

type MeetingAudioSettingsProps = {
  audioPreferences: MeetingAudioPreferences;
  activeAudioMenuKey: MeetingAudioKey | null;
  onActiveAudioMenuChange: (audioKey: MeetingAudioKey | null) => void;
  onPreferenceChange: (audioKey: MeetingAudioKey, soundId: MeetingAudioSoundId) => void;
  onPreview: (audioKey: MeetingAudioKey, soundId: MeetingAudioSoundId) => void;
};

export function MeetingAudioSettings({
  audioPreferences,
  activeAudioMenuKey,
  onActiveAudioMenuChange,
  onPreferenceChange,
  onPreview,
}: MeetingAudioSettingsProps) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <BellRing className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold">Meeting sounds</h3>
      </div>

      <div className="space-y-4">
        {MEETING_AUDIO_EVENTS.map((audioEvent) => {
          const selectedSoundId = audioPreferences[audioEvent.key];
          const selectedSoundOption =
            MEETING_AUDIO_SOUND_OPTIONS.find((option) => option.id === selectedSoundId)
            ?? MEETING_AUDIO_SOUND_OPTIONS[0];
          const isAudioMenuOpen = activeAudioMenuKey === audioEvent.key;

          return (
            <div
              key={audioEvent.key}
              className="grid gap-3 rounded-2xl border border-border/70 bg-background/45 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,18rem)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{audioEvent.label}</p>
              </div>

              <div
                className="relative"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    onActiveAudioMenuChange(null);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    onActiveAudioMenuChange(null);
                  }
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onActiveAudioMenuChange(isAudioMenuOpen ? null : audioEvent.key);
                  }}
                  className={cn(
                    "flex h-12 w-full items-center justify-between gap-3 rounded-xl border bg-background/70 px-4 text-left text-sm shadow-xs outline-none transition",
                    "border-border/80 hover:border-primary/45 hover:bg-background focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    isAudioMenuOpen && "border-primary/60 bg-background",
                  )}
                  aria-label={`${audioEvent.label} sound`}
                >
                  <span className="min-w-0 truncate font-medium">
                    {selectedSoundOption.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      isAudioMenuOpen && "rotate-180",
                    )}
                  />
                </button>

                {isAudioMenuOpen ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-72 overflow-y-auto rounded-xl border border-border/80 bg-popover p-1.5 text-popover-foreground shadow-[0_18px_48px_rgba(2,6,23,0.38)]">
                    {MEETING_AUDIO_SOUND_OPTIONS.map((soundOption) => {
                      const isSelected = selectedSoundId === soundOption.id;

                      return (
                        <button
                          key={soundOption.id}
                          type="button"
                          onClick={() => {
                            onPreferenceChange(audioEvent.key, soundOption.id);
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
                          <span className="min-w-0">
                            <span className="block font-medium">
                              {soundOption.label}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-11 sm:w-11 sm:px-0"
                onClick={() => onPreview(audioEvent.key, selectedSoundId)}
                disabled={selectedSoundId === "none"}
                aria-label={`Preview ${audioEvent.label} sound`}
              >
                <Play className="h-4 w-4" />
                <span className="sm:hidden">Preview</span>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
