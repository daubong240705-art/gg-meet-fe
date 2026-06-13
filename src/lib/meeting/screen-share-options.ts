import {
  VideoPreset,
  type ScreenShareCaptureOptions,
  type TrackPublishOptions,
} from "livekit-client";

export type ScreenShareResolution = 480 | 720 | 1080 | 1440;
export type ScreenShareFps = 15 | 30 | 60;
export type ScreenShareContentHint = "detail" | "text" | "motion";

export type ScreenShareQuality = {
  resolution: ScreenShareResolution;
  fps: ScreenShareFps;
  contentHint?: ScreenShareContentHint;
};

type ScreenShareDimensions = {
  width: number;
  height: number;
};

export const SCREEN_SHARE_RESOLUTIONS: ScreenShareResolution[] = [480, 720, 1080, 1440];
export const SCREEN_SHARE_FPS_OPTIONS: ScreenShareFps[] = [15, 30, 60];

export const DEFAULT_SCREEN_SHARE_QUALITY = {
  resolution: 1080,
  fps: 30,
  contentHint: "detail",
} satisfies Required<ScreenShareQuality>;

export const SCREEN_SHARE_DIMENSIONS = {
  480: { width: 854, height: 480 },
  720: { width: 1280, height: 720 },
  1080: { width: 1920, height: 1080 },
  1440: { width: 2560, height: 1440 },
} satisfies Record<ScreenShareResolution, ScreenShareDimensions>;

const SCREEN_SHARE_BITRATES: Record<ScreenShareResolution, Record<ScreenShareFps, number>> = {
  480: {
    15: 800_000,
    30: 1_200_000,
    60: 1_800_000,
  },
  720: {
    15: 1_500_000,
    30: 2_500_000,
    60: 3_800_000,
  },
  1080: {
    15: 2_500_000,
    30: 4_000_000,
    60: 6_000_000,
  },
  1440: {
    15: 4_000_000,
    30: 6_000_000,
    60: 9_000_000,
  },
};

function getScreenShareMaxBitrate(
  resolution: ScreenShareResolution,
  fps: ScreenShareFps,
  contentHint: ScreenShareContentHint,
) {
  const baseBitrate = SCREEN_SHARE_BITRATES[resolution][fps];

  return contentHint === "motion"
    ? Math.round(baseBitrate * 1.5)
    : baseBitrate;
}

function createScreenSharePreset(
  resolution: ScreenShareResolution,
  fps: ScreenShareFps,
  contentHint: ScreenShareContentHint,
) {
  const dimensions = SCREEN_SHARE_DIMENSIONS[resolution];

  return new VideoPreset(
    dimensions.width,
    dimensions.height,
    getScreenShareMaxBitrate(resolution, fps, contentHint),
    fps,
    "medium",
  );
}

function buildScreenShareSimulcastLayers({
  resolution,
  fps,
  contentHint,
}: Required<ScreenShareQuality>) {
  if (resolution >= 1080) {
    return [createScreenSharePreset(720, Math.min(fps, 30) as ScreenShareFps, contentHint)];
  }

  return [];
}

export function buildScreenShareOptions(quality: ScreenShareQuality = DEFAULT_SCREEN_SHARE_QUALITY) {
  const normalizedQuality: Required<ScreenShareQuality> = {
    resolution: quality.resolution,
    fps: quality.fps,
    contentHint: quality.contentHint ?? DEFAULT_SCREEN_SHARE_QUALITY.contentHint,
  };
  const dimensions = SCREEN_SHARE_DIMENSIONS[normalizedQuality.resolution];
  const primaryPreset = createScreenSharePreset(
    normalizedQuality.resolution,
    normalizedQuality.fps,
    normalizedQuality.contentHint,
  );

  const capture = {
    audio: false,
    contentHint: normalizedQuality.contentHint,
    resolution: {
      ...dimensions,
      frameRate: normalizedQuality.fps,
    },
  } satisfies ScreenShareCaptureOptions;

  const publish = {
    screenShareEncoding: primaryPreset.encoding,
    screenShareSimulcastLayers: buildScreenShareSimulcastLayers(normalizedQuality),
  } satisfies TrackPublishOptions;

  return { capture, publish };
}

const DEFAULT_SCREEN_SHARE_OPTIONS = buildScreenShareOptions(DEFAULT_SCREEN_SHARE_QUALITY);

export const MEETING_SCREEN_SHARE_CAPTURE_OPTIONS = DEFAULT_SCREEN_SHARE_OPTIONS.capture;
export const MEETING_SCREEN_SHARE_PUBLISH_OPTIONS = DEFAULT_SCREEN_SHARE_OPTIONS.publish;
