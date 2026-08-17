"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { waitlistCopy } from "./copy";
import { recordReferralMilestone } from "./referral-actions";

const otpSchema = z.string().trim().regex(/^\d{6}$/);

export function VerifyOtp() {
  const locale = useLocale() === "en" ? "en" : "ar";
  const copy = waitlistCopy[locale].verify;
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedPhone = sessionStorage.getItem("mithaq.waitlist.phone");
    if (!storedPhone) {
      router.replace(`/${locale}/waitlist`);
      return;
    }
    setPhone(storedPhone);
  }, [locale, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = otpSchema.safeParse(code);
    if (!phone || !parsed.success) {
      setError(copy.error);
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
    <main className="mx-auto w-full max-w-xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
      <p className="text-sm font-semibold text-primary">{copy.eyebrow}</p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
        {copy.title}
      </h1>
      <p className="mt-5 text-lg leading-8 text-muted-foreground">{copy.body}</p>

      <form
        className="mt-10 space-y-6 rounded-3xl border border-primary/15 bg-card p-6 sm:p-8"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <Label htmlFor="otp">{copy.code}</Label>
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
            className="text-center text-2xl tracking-[0.4em]"
            required
          />
          {phone ? (
            <p className="text-sm text-muted-foreground" dir="ltr">
              {phone}
            </p>
          ) : null}
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting || !phone}
        >
          {isSubmitting ? copy.verifying : copy.submit}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => router.push(`/${locale}/waitlist`)}
        >
          {copy.back}
        </Button>
      </form>
    </main>
  );
}
