import type { LucideIcon } from "lucide-react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export type PublicInfoSection = {
  title: string;
  body: string;
  icon?: LucideIcon;
};

type PublicInfoPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: PublicInfoSection[];
  ctaTitle: string;
  ctaBody: string;
  ctaLabel: string;
  ctaHref?: string;
};

export function PublicInfoPage({
  eyebrow,
  title,
  intro,
  sections,
  ctaTitle,
  ctaBody,
  ctaLabel,
  ctaHref = "/waitlist",
}: PublicInfoPageProps) {
  return (
    <main>
      <section className="border-b border-border/70 bg-[radial-gradient(circle_at_top,_rgba(15,77,63,0.08),_transparent_45%)]">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <p className="text-sm font-semibold text-primary">{eyebrow}</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">
            {intro}
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-2 lg:px-8 lg:py-16">
        {sections.map(({ title: sectionTitle, body, icon: Icon }) => (
          <Card
            key={sectionTitle}
            className="h-full border-primary/10 bg-card/95"
          >
            <CardContent className="p-6 sm:p-7">
              <div className="mb-5 grid size-11 place-items-center rounded-xl bg-primary/8 text-primary">
                {Icon ? (
                  <Icon aria-hidden="true" />
                ) : (
                  <ShieldCheck aria-hidden="true" />
                )}
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                {sectionTitle}
              </h2>
              <p className="mt-3 leading-8 text-muted-foreground">{body}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-primary/15 bg-primary px-6 py-8 text-primary-foreground sm:px-8 sm:py-10">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold sm:text-3xl">{ctaTitle}</h2>
            <p className="mt-3 leading-8 text-primary-foreground/80">
              {ctaBody}
            </p>
            <Button
              className="mt-6 bg-background text-foreground hover:bg-background/90"
              asChild
            >
              <Link href={ctaHref}>
                {ctaLabel}
                <ArrowRight aria-hidden="true" className="rtl:rotate-180" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
