"use client";

import dynamic from "next/dynamic";

// The admin dashboard is client-only (auth-gated, hydration-dependent) and pulls
// in the heavy tables/charts. Defer it and skip SSR — it renders its own
// "Checking access" state until hydrated, so no extra loading fallback is needed.
const AdminDashboard = dynamic(
  () => import("@/components/admin/admin-dashboard").then((mod) => mod.AdminDashboard),
  { ssr: false },
);

export default function AdminPage() {
  return <AdminDashboard />;
}
