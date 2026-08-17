"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { waitlistCopy } from "./copy";
import { recordReferralMilestone } from "./referral-actions";

const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/);

export function VerifyOtp() {
  const locale = useLocale() === "en" ? "en" : "ar";
  const copy = waitlistCopy[locale].verify;
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const phone = sessionStorage.getItem("mithaq.waitlist.phone");
    const parsed = otpSchema.safeParse(code);
    if (!phone || !parsed.success) {
      setError(copy.error);
      if (!phone) {
        router.replace(`/${locale}/waitlist`);
      }
      return;
    }

    setIsSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: parsed.data,
      type: "sms",
    });

    if (verifyError) {
      setError(copy.error);
      setIsSubmitting(false);
      return;
    }

    await recordReferralMilestone("phone_verified");
    router.replace(`/${locale}/waitlist/questionnaire`);
    router.refresh();
  }

  return (
    <main className="relative isolate overflow-hidden px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="premium-orb -start-32 top-16" aria-hidden="true" />
      <div
        className="premium-orb end-[-10rem] top-[-8rem] opacity-50"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-xl">
        <div className="mb-6 flex justify-center">
          <div className="grid size-14 place-items-center rounded-2xl border border-primary/15 bg-card text-primary shadow-[0_16px_36px_rgba(15,77,63,0.10)]">
            <LockKeyhole className="size-6" aria-hidden="true" />
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs font-bold tracking-[0.16em] text-primary uppercase">
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.025em] text-balance sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-base leading-8 text-muted-foreground sm:text-lg">
            {copy.body}
          </p>
        </div>

        <form
          className="premium-panel mt-9 space-y-6 rounded-[2rem] p-6 sm:p-8"
          onSubmit={handleSubmit}
        >
          <div className="space-y-3">
            <Label htmlFor="otp" className="text-sm font-semibold">
              {copy.code}
            </Label>
            <Input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="h-16 text-center text-2xl font-semibold tracking-[0.5em] tabular-nums sm:text-3xl"
              required
            />
            <div className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <ShieldCheck
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span>
                {locale === "ar"
                  ? "استخدم الرمز المكوّن من 6 أرقام المرسل إلى هاتفك. لن نعرض رقمك لأي مستخدم آخر."
                  : "Use the 6-digit code sent to your phone. Your number is never shown to other members."}
              </span>
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-2xl border border-destructive/15 bg-destructive/8 px-4 py-3 text-sm font-semibold text-destructive"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting || code.length !== 6}
          >
            {isSubmitting ? copy.verifying : copy.submit}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => router.push(`/${locale}/waitlist`)}
          >
            <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
            {copy.back}
          </Button>
        </form>
      </div>
    </main>
  );
}
