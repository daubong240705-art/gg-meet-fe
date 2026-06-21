import Link from "next/link";

import { Button } from "@/components/ui/button";

export type MarketingSection = {
  title: string;
  description?: string;
  items?: Array<{
    title: string;
    description: string;
    href?: string;
  }>;
};

type MarketingPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  sections: MarketingSection[];
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
};

export function MarketingPage({
  eyebrow,
  title,
  description,
  sections,
  primaryAction = { label: "Start a meeting", href: "/sign-in" },
  secondaryAction = { label: "Visit Help Center", href: "/help" },
}: MarketingPageProps) {
  return (
    <div>
      <section className="border-b border-border/70 bg-gradient-to-b from-primary/10 to-background">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center md:py-28">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            {eyebrow}
          </p>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">{title}</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-muted-foreground md:text-xl">
            {description}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href={primaryAction.href}>{primaryAction.label}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-20 px-6 py-20">
        {sections.map((section) => (
          <section key={section.title}>
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold md:text-4xl">{section.title}</h2>
              {section.description ? (
                <p className="mt-4 text-lg leading-8 text-muted-foreground">
                  {section.description}
                </p>
              ) : null}
            </div>

            {section.items?.length ? (
              <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {section.items.map((item) => {
                  const content = (
                    <>
                      <h3 className="text-xl font-semibold">{item.title}</h3>
                      <p className="mt-3 leading-7 text-muted-foreground">
                        {item.description}
                      </p>
                      {item.href ? (
                        <span className="mt-5 inline-block text-sm font-semibold text-primary">
                          Learn more →
                        </span>
                      ) : null}
                    </>
                  );

                  return item.href ? (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/60"
                    >
                      {content}
                    </Link>
                  ) : (
                    <article
                      key={item.title}
                      className="rounded-2xl border border-border bg-card p-6"
                    >
                      {content}
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
