import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type AdminStatCardProps = {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: LucideIcon;
  tone: "blue" | "green" | "violet";
};

const toneClasses: Record<AdminStatCardProps["tone"], string> = {
  blue: "bg-blue-500/10 text-blue-500",
  green: "bg-emerald-500/10 text-emerald-500",
  violet: "bg-violet-500/10 text-violet-500",
};

export function AdminStatCard({
  label,
  value,
  change,
  trend,
  icon: Icon,
  tone,
}: AdminStatCardProps) {
  const trendClass = trend === "up" ? "text-emerald-500" : "text-destructive";

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <span className={`text-sm font-medium ${trendClass}`}>{change}</span>
        </div>
        <div className="mt-5">
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
