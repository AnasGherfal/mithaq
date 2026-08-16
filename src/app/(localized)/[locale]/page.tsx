import {
  ArrowRight,
  CameraOff,
  Globe2,
  LockKeyhole,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export default async function HomePage() {
  const t = await getTranslations("Home");

  const principles = [
    { icon: LockKeyhole, title: t("privateTitle"), body: t("privateBody") },
    { icon: CameraOff, title: t("photoTitle"), body: t("photoBody") },
    {
      icon: ShieldCheck,
      title: t("verifiedTitle"),
      body: t("verifiedBody"),
    },
    { icon: UsersRound, title: t("familyTitle"), body: t("familyBody") },
  ];

  return (
    <main>
      <section className="relative overflow-hidden border-b border-border/70">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(169,131,66,0.12),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(15,77,63,0.10),transparent_35%)]"
        />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-28">
          <div>
            <p className="text-sm font-semibold text-primary">
              {t("eyebrow")}
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl xl:text-7xl">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">
              {t("intro")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" asChild>
                <Link href="/waitlist">
                  {t("primaryCta")}
                  <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/how-it-works">{t("secondaryCta")}</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {t("stageNote")}
            </p>
          </div>

          <div className="threshold-pattern relative min-h-[26rem] overflow-hidden rounded-[2rem] border border-primary/15 bg-card/90 p-8 shadow-sm">
            <div className="absolute inset-x-10 top-10 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
            <div className="flex h-full min-h-[22rem] items-end justify-center">
              <div className="relative h-80 w-56 rounded-t-[7rem] border border-primary/30 bg-background/95 p-5 shadow-[inset_0_0_0_10px_rgba(15,77,63,0.035)]">
                <div className="h-full rounded-t-[6rem] border-2 border-primary/60 bg-card">
                  <div className="mx-auto mt-12 h-40 w-px bg-gold/60" />
                  <div className="mx-auto size-3 -translate-y-24 rounded-full border border-primary/30 bg-gold" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("trustTitle")}
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            {t("trustIntro")}
          </p>
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {principles.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="h-full border-primary/10">
              <CardContent className="p-6">
                <div className="grid size-11 place-items-center rounded-xl bg-primary/8 text-primary">
                  <Icon aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-[auto_1fr] md:items-start lg:px-8 lg:py-18">
          <div className="grid size-14 place-items-center rounded-2xl bg-white/10">
            <ShieldCheck aria-hidden="true" />
          </div>
          <div className="max-w-4xl">
            <p className="text-sm font-semibold text-primary-foreground/70">
              {t("differenceEyebrow")}
            </p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
              {t("differenceTitle")}
            </h2>
            <p className="mt-4 text-lg leading-8 text-primary-foreground/80">
              {t("differenceBody")}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-16 sm:px-6 md:grid-cols-2 lg:px-8 lg:py-20">
        <Card className="border-gold/25 bg-card">
          <CardContent className="p-7 sm:p-8">
            <UsersRound className="size-7 text-gold" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-bold">{t("womenTitle")}</h2>
            <p className="mt-4 leading-8 text-muted-foreground">
              {t("womenBody")}
            </p>
            <Button variant="link" className="mt-3 px-0" asChild>
              <Link href="/for-women">{t("womenCta")}</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-primary/15 bg-card">
          <CardContent className="p-7 sm:p-8">
            <Globe2 className="size-7 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-bold">
              {t("diasporaTitle")}
            </h2>
            <p className="mt-4 leading-8 text-muted-foreground">
              {t("diasporaBody")}
            </p>
            <Button variant="link" className="mt-3 px-0" asChild>
              <Link href="/libya-diaspora">{t("diasporaCta")}</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-primary/15 bg-primary/5 p-7 sm:p-10">
          <h2 className="max-w-3xl text-3xl font-bold">{t("finalTitle")}</h2>
          <p className="mt-4 max-w-3xl leading-8 text-muted-foreground">
            {t("finalBody")}
          </p>
          <Button className="mt-6" asChild>
            <Link href="/waitlist">{t("finalCta")}</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
