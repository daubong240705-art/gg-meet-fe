"use client";

import { Card } from "../ui/card";

export default function AuthenticatedHomeHero({
  greeting,
  firstName,
  todayLabel,
}: {
  greeting: string;
  firstName: string;
  todayLabel: string;
}) {
  return (
    <section className="mb-10 overflow-hidden rounded-[2rem] border border-border/70 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.14),transparent_22%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.92))] p-8 text-white shadow-[0_28px_80px_rgba(15,23,42,0.32)] lg:p-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
        <div>
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.22em] text-sky-100/80">
            Workspace home
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            {greeting}, {firstName}.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200 sm:text-lg">
            {todayLabel}. Launch a room, jump back into a meeting, or share a code with your team from one place.
          </p>
        </div>

        {/* <Card className="border-white/10 bg-white/10 p-5 text-white shadow-none backdrop-blur">
          <p className="text-sm font-medium text-slate-200">Today at a glance</p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-2xl font-semibold">3</p>
              <p className="mt-1 text-xs text-slate-200">Meetings today</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-2xl font-semibold">18</p>
              <p className="mt-1 text-xs text-slate-200">People invited</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-2xl font-semibold">2h</p>
              <p className="mt-1 text-xs text-slate-200">Planned time</p>
            </div>
          </div>
        </Card> */}
      </div>
    </section>
  );
}
