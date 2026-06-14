import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Video,
  type LucideIcon,
} from "lucide-react";

type StatusTone = "default" | "muted" | "outline";
type AdminStatusKind = "user" | "meeting";

const statusConfig: Record<string, { label: string; tone: StatusTone; icon: LucideIcon }> = {
  active: { label: "Active", tone: "default", icon: CheckCircle2 },
  inactive: { label: "Inactive", tone: "muted", icon: AlertCircle },
  banned: { label: "Banned", tone: "outline", icon: AlertCircle },
  ongoing: { label: "Ongoing", tone: "default", icon: Video },
  scheduled: { label: "Scheduled", tone: "muted", icon: Clock },
  completed: { label: "Completed", tone: "outline", icon: CheckCircle2 },
};

const toneClasses: Record<StatusTone, string> = {
  default: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
  muted: "border-border bg-muted text-muted-foreground",
  outline: "border-border bg-background text-foreground",
};

const normalizeStatus = (status: string, kind: AdminStatusKind) => {
  const normalizedStatus = status.trim().toUpperCase();

  if (kind === "meeting") {
    if (normalizedStatus === "ACTIVE") return "ongoing";
    if (normalizedStatus === "SCHEDULED") return "scheduled";
    if (normalizedStatus === "ENDED") return "completed";
  }

  if (normalizedStatus === "ACTIVE") return "active";
  if (normalizedStatus === "INACTIVE") return "inactive";
  if (normalizedStatus === "BANNED") return "banned";

  return status.trim().toLowerCase();
};

export function AdminStatusBadge({ status, kind }: { status: string; kind: AdminStatusKind }) {
  const config = statusConfig[normalizeStatus(status, kind)] ?? statusConfig.active;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${toneClasses[config.tone]}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
