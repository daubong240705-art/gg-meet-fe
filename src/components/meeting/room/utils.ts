export function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}

export function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((part) => part[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "G"
  );
}

const PARTICIPANT_ACCENT_CLASSES = [
  "from-sky-500/25 via-sky-500/10 to-background",
  "from-amber-500/25 via-orange-500/10 to-background",
  "from-emerald-500/25 via-emerald-500/10 to-background",
  "from-fuchsia-500/25 via-rose-500/10 to-background",
  "from-cyan-500/25 via-blue-500/10 to-background",
  "from-lime-500/25 via-emerald-500/10 to-background",
];

export function getParticipantAccentClassName(seed: string) {
  const normalizedSeed = seed.trim();

  if (!normalizedSeed) {
    return PARTICIPANT_ACCENT_CLASSES[0];
  }

  let hash = 0;

  for (let index = 0; index < normalizedSeed.length; index += 1) {
    hash = (hash << 5) - hash + normalizedSeed.charCodeAt(index);
    hash |= 0;
  }

  return PARTICIPANT_ACCENT_CLASSES[Math.abs(hash) % PARTICIPANT_ACCENT_CLASSES.length];
}
