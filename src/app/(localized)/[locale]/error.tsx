"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslations("Errors");

  return (
    <main className="mx-auto grid min-h-svh w-full max-w-xl place-items-center px-4 py-12">
      <section className="w-full rounded-2xl border border-destructive/25 bg-card p-6 text-center shadow-sm">
        <AlertTriangle
          aria-hidden="true"
          className="mx-auto size-10 text-destructive"
        />
        <h1 className="mt-4 text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-3 leading-7 text-muted-foreground">{t("body")}</p>
        <Button type="button" className="mt-6" onClick={reset}>
          {t("retry")}
        </Button>
      </section>
    </main>
  );
}
