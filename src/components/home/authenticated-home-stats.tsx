"use client";

import { TrendingUp } from "lucide-react";

import { quickStats } from "./authenticated-home.data";
import { Card } from "../ui/card";

export default function AuthenticatedHomeStats() {
  return (
    <section className="mb-10 grid gap-6 md:grid-cols-3">
      {quickStats.map((stat) => {
        const Icon = stat.icon;

        return (
          <Card key={stat.label} className="rounded-[1.75rem] border-border/70 p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              {stat.trend === "up" ? <TrendingUp className="h-5 w-5 text-emerald-500" /> : null}
            </div>
            <p className="text-3xl font-semibold tracking-tight">{stat.value}</p>
            <p className="mt-2 text-sm font-medium text-foreground">{stat.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.change}</p>
          </Card>
        );
      })}
    </section>
  );
}
