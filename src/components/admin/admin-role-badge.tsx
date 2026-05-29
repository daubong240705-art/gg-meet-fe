const roleClasses: Record<string, string> = {
  Admin: "border-red-500/20 bg-red-500/10 text-red-500",
  User: "border-border bg-muted text-muted-foreground",
};

export function AdminRoleBadge({ role }: { role: string }) {
  const normalizedRole = role.trim().toUpperCase() === "ADMIN" ? "Admin" : "User";

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${roleClasses[normalizedRole]}`}
    >
      {normalizedRole}
    </span>
  );
}
