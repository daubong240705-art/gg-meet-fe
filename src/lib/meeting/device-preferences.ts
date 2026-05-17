export type MeetingDevicePreferences = {
  cameraEnabledOnJoin: boolean;
  microphoneEnabledOnJoin: boolean;
  defaultCameraDeviceId: string;
  defaultMicrophoneDeviceId: string;
  rememberLastUsedDevices: boolean;
};

export type MeetingDevicePreferenceKey = keyof MeetingDevicePreferences;

const MEETING_DEVICE_PREFERENCES_STORAGE_KEY = "gg-meet:meeting-device-preferences:v1";
const MEETING_DEVICE_PREFERENCES_CHANGE_EVENT = "gg-meet:meeting-device-preferences-change";

const DEFAULT_MEETING_DEVICE_PREFERENCES: MeetingDevicePreferences = {
  cameraEnabledOnJoin: true,
  microphoneEnabledOnJoin: false,
  defaultCameraDeviceId: "",
  defaultMicrophoneDeviceId: "",
  rememberLastUsedDevices: true,
};

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeMeetingDevicePreferences(value: unknown): MeetingDevicePreferences {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_MEETING_DEVICE_PREFERENCES };
  }

  const preferences = value as Partial<Record<MeetingDevicePreferenceKey, unknown>>;

  return {
    cameraEnabledOnJoin: normalizeBoolean(
      preferences.cameraEnabledOnJoin,
      DEFAULT_MEETING_DEVICE_PREFERENCES.cameraEnabledOnJoin,
    ),
    microphoneEnabledOnJoin: normalizeBoolean(
      preferences.microphoneEnabledOnJoin,
      DEFAULT_MEETING_DEVICE_PREFERENCES.microphoneEnabledOnJoin,
    ),
    defaultCameraDeviceId: normalizeString(preferences.defaultCameraDeviceId),
    defaultMicrophoneDeviceId: normalizeString(preferences.defaultMicrophoneDeviceId),
    rememberLastUsedDevices: normalizeBoolean(
      preferences.rememberLastUsedDevices,
      DEFAULT_MEETING_DEVICE_PREFERENCES.rememberLastUsedDevices,
    ),
  };
}

export function getDefaultMeetingDevicePreferences(): MeetingDevicePreferences {
  return { ...DEFAULT_MEETING_DEVICE_PREFERENCES };
}

export function getMeetingDevicePreferences(): MeetingDevicePreferences {
  if (typeof window === "undefined") {
    return getDefaultMeetingDevicePreferences();
  }

  try {
    return normalizeMeetingDevicePreferences(
      JSON.parse(window.localStorage.getItem(MEETING_DEVICE_PREFERENCES_STORAGE_KEY) ?? "null"),
    );
  } catch {
    return getDefaultMeetingDevicePreferences();
  }
}

export function setMeetingDevicePreferences(preferences: MeetingDevicePreferences) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedPreferences = normalizeMeetingDevicePreferences(preferences);
  window.localStorage.setItem(
    MEETING_DEVICE_PREFERENCES_STORAGE_KEY,
    JSON.stringify(normalizedPreferences),
  );
  window.dispatchEvent(new CustomEvent(MEETING_DEVICE_PREFERENCES_CHANGE_EVENT));
}

export function setMeetingDevicePreference<K extends MeetingDevicePreferenceKey>(
  key: K,
  value: MeetingDevicePreferences[K],
) {
  setMeetingDevicePreferences({
    ...getMeetingDevicePreferences(),
    [key]: value,
  });
}

export function rememberMeetingCameraDevice(deviceId: string) {
  const preferences = getMeetingDevicePreferences();

  if (!preferences.rememberLastUsedDevices) {
    return;
  }

  setMeetingDevicePreferences({
    ...preferences,
    defaultCameraDeviceId: deviceId,
  });
}

export function rememberMeetingMicrophoneDevice(deviceId: string) {
  const preferences = getMeetingDevicePreferences();

  if (!preferences.rememberLastUsedDevices) {
    return;
  }

  setMeetingDevicePreferences({
    ...preferences,
    defaultMicrophoneDeviceId: deviceId,
  });
}

export function addMeetingDevicePreferencesChangeListener(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(MEETING_DEVICE_PREFERENCES_CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(MEETING_DEVICE_PREFERENCES_CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
