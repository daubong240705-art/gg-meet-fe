import { Loader2 } from "lucide-react";

/**
 * Full-screen loader shown over the home page while client-only auth state is
 * resolving. It only becomes visible when the pre-paint script in the root
 * layout has set `data-auth-pending` (i.e. a returning logged-in visitor); see
 * the `.home-auth-overlay` rules in globals.css. `z-index` sits above the
 * sticky header so the whole guest layout is covered.
 */
export default function HomeAuthLoadingOverlay() {
  return (
    <div aria-hidden="true" className="home-auth-overlay">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading your workspace…</p>
    </div>
  );
}
