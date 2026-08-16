import { ArrowRight, HelpCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function FaqPage() {
  const t = await getTranslations("Faq");
  const items = [1, 2, 3, 4, 5, 6] as const;

  return (
    <main>
      <section className="border-b border-border/70 bg-[radial-gradient(circle_at_top,_rgba(15,77,63,0.08),_transparent_45%)]">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <p className="text-sm font-semibold text-primary">{t("eyebrow")}</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">{t("title")}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">{t("intro")}</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="space-y-3">
          {items.map((item) => (
            <details key={item} className="group rounded-2xl border border-border bg-card px-5 py-1 open:border-primary/20">
              <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                <HelpCircle aria-hidden="true" className="size-5 shrink-0 text-primary" />
                <span>{t(`q${item}`)}</span>
                <span aria-hidden="true" className="ms-auto text-xl text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="pb-5 ps-8 leading-8 text-muted-foreground">{t(`a${item}`)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-primary p-7 text-primary-foreground sm:p-9">
          <h2 className="text-2xl font-bold">{t("ctaTitle")}</h2>
          <p className="mt-3 max-w-2xl leading-8 text-primary-foreground/80">{t("ctaBody")}</p>
          <Button className="mt-6 bg-background text-foreground hover:bg-background/90" asChild>
            <Link href="/privacy-safety">{t("ctaLabel")}<ArrowRight className="rtl:rotate-180" aria-hidden="true" /></Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
