import type { AudioCaptureOptions } from "livekit-client";

/**
 * Basic browser/WebRTC audio processing applied to every microphone capture
 * (LiveKit room publish + lobby device preview).
 *
 * The goal is light, distortion-free noise reduction — let the browser's native
 * DSP handle fan noise, ambient hum, and speaker echo without heavy AI filtering:
 * - `echoCancellation`  cancels audio looping back from speakers (AEC)
 * - `noiseSuppression`  removes steady background noise (fan/AC/room hum)
 * - `autoGainControl`   normalizes mic level so quiet/loud speakers stay even
 * - `channelCount: 1`   mono capture — voice is mono, halves the bitrate and
 *                       avoids odd stereo artifacts
 */
export const MEETING_AUDIO_CAPTURE_DEFAULTS: AudioCaptureOptions = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
};
