import { ArrowRight, ShieldCheck, Smartphone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export default async function WaitlistPreviewPage() {
  const t = await getTranslations("WaitlistPreview");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold text-primary">{t("eyebrow")}</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          {t("body")}
        </p>
      </div>

      <Card className="mt-10 border-primary/15 bg-primary/5">
        <CardContent className="flex gap-4 p-6 sm:p-7">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Smartphone aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{t("note")}</p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
              18+ · OTP · Privacy-first
            </div>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" className="mt-8" asChild>
        <Link href="/">
          {t("back")}
          <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
        </Link>
      </Button>
    </main>
  );
}
