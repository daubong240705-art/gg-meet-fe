const roleClasses: Record<string, string> = {
  Admin: "border-red-500/20 bg-red-500/10 text-red-500",
  Moderator: "border-blue-500/20 bg-blue-500/10 text-blue-500",
  User: "border-border bg-muted text-muted-foreground",
};

export function AdminRoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${roleClasses[role] ?? roleClasses.User}`}
    >
      {role}
    </span>
  );
}
