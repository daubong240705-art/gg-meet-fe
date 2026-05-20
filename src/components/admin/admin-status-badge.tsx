import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Video,
  XCircle,
  type LucideIcon,
} from "lucide-react";

type StatusTone = "default" | "muted" | "danger" | "outline";

const statusConfig: Record<string, { tone: StatusTone; icon: LucideIcon }> = {
  active: { tone: "default", icon: CheckCircle2 },
  inactive: { tone: "muted", icon: AlertCircle },
  blocked: { tone: "danger", icon: XCircle },
  ongoing: { tone: "default", icon: Video },
  scheduled: { tone: "muted", icon: Clock },
  completed: { tone: "outline", icon: CheckCircle2 },
  cancelled: { tone: "danger", icon: XCircle },
};

const toneClasses: Record<StatusTone, string> = {
  default: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
  muted: "border-border bg-muted text-muted-foreground",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
  outline: "border-border bg-background text-foreground",
};

export function AdminStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.active;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${toneClasses[config.tone]}`}
    >
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
