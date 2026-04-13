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
