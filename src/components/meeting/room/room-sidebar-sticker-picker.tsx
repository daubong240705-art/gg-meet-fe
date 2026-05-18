"use client";

import Image from "next/image";

import { STICKER_OPTIONS } from "./chat-stickers";

type RoomSidebarStickerPickerProps = {
  onSelect: (stickerKey: string) => void;
};

export function RoomSidebarStickerPicker({ onSelect }: RoomSidebarStickerPickerProps) {
  return (
    <div className="absolute bottom-full left-0 z-20 mb-3 w-56 rounded-3xl border border-border/80 bg-card/95 p-3 shadow-[0_20px_60px_rgba(2,6,23,0.42)] backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-reduce:animate-none">
      <div className="mb-2 px-1 text-xs font-semibold text-muted-foreground">
        Stickers
      </div>
      <div className="grid grid-cols-4 gap-2">
        {STICKER_OPTIONS.map((sticker) => (
          <button
            key={sticker.key}
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background/45 transition hover:border-primary/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            onClick={() => onSelect(sticker.key)}
          >
            <Image
              src={sticker.url}
              alt={sticker.key}
              width={40}
              height={40}
              className="h-9 w-9 object-contain"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
