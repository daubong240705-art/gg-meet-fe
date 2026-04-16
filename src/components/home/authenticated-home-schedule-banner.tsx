"use client";

import { ArrowRight, Calendar } from "lucide-react";

import { Button } from "../ui/button";
import { Card } from "../ui/card";

export default function AuthenticatedHomeScheduleBanner() {
  return (
    <section className="mb-8">
      <Card className="rounded-[1.75rem] border-sky-200/60 bg-[linear-gradient(135deg,rgba(240,249,255,0.95),rgba(238,242,255,0.95))] p-6 shadow-sm transition hover:shadow-md dark:border-sky-900/40 dark:bg-[linear-gradient(135deg,rgba(12,74,110,0.22),rgba(49,46,129,0.2))]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Calendar className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Schedule a meeting</h2>
              <p className="text-sm text-muted-foreground">
                {/* Keep the visual from Figma here for now, then wire it to your real scheduling flow later. */}
              </p>
            </div>
          </div>
          <Button variant="outline" className="w-full md:w-auto">
            Explore
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </section>
  );
}
