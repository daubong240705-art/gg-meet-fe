import { MEETING_STICKERS } from "@/lib/meeting/assets";

export const STICKERS = MEETING_STICKERS;

export type StickerKey = keyof typeof STICKERS;

export const STICKER_OPTIONS = Object.entries(STICKERS).map(([key, url]) => ({
  key,
  url,
})) as Array<{
  key: StickerKey;
  url: (typeof STICKERS)[StickerKey];
}>;

export function isStickerKey(value: string): value is StickerKey {
  return value in STICKERS;
}

export function getStickerUrl(stickerKey: string) {
  if (!isStickerKey(stickerKey)) {
    return null;
  }

  return STICKERS[stickerKey];
}
