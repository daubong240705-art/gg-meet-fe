import {
  ScreenSharePresets,
  type ScreenShareCaptureOptions,
  type TrackPublishOptions,
} from "livekit-client";

const SCREEN_SHARE_QUALITY = ScreenSharePresets.h1080fps30;

export const MEETING_SCREEN_SHARE_CAPTURE_OPTIONS = {
  audio: false,
  contentHint: "detail",
  resolution: SCREEN_SHARE_QUALITY.resolution,
} satisfies ScreenShareCaptureOptions;

export const MEETING_SCREEN_SHARE_PUBLISH_OPTIONS = {
  screenShareEncoding: SCREEN_SHARE_QUALITY.encoding,
  screenShareSimulcastLayers: [
    // ScreenSharePresets.h360fps15,
    // ScreenSharePresets.h720fps15,
  ],
} satisfies TrackPublishOptions;
