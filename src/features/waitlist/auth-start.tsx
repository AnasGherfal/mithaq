"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { waitlistCopy } from "./copy";
import { recordReferralMilestone } from "./referral-actions";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/);

export function WaitlistAuthStart() {
  const locale = useLocale() === "en" ? "en" : "ar";
  const copy = waitlistCopy[locale].start;
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [intentConfirmed, setIntentConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedPhone = phoneSchema.safeParse(phone);
    if (!parsedPhone.success || !ageConfirmed || !intentConfirmed) {
      setError(copy.error);
      return;
    }

    setIsSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: parsedPhone.data,
      options: {
        data: { preferred_locale: locale },
        shouldCreateUser: true,
      },
    });

    if (otpError) {
      setError(copy.error);
      setIsSubmitting(false);
      return;
    }

    await recordReferralMilestone("started");
    sessionStorage.setItem("mithaq.waitlist.phone", parsedPhone.data);
    sessionStorage.setItem("mithaq.waitlist.age18", "true");
    sessionStorage.setItem("mithaq.waitlist.intent", "true");
    router.push(`/${locale}/waitlist/verify`);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-primary">{copy.eyebrow}</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          {copy.title}
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{copy.body}</p>
      </div>

      <form
        className="mt-10 space-y-6 rounded-3xl border border-primary/15 bg-card p-6 sm:p-8"
        onSubmit={handleSubmit}
      >
        <fieldset className="space-y-4">
          <legend className="sr-only">Eligibility</legend>
          <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border border-border p-4">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(event) => setAgeConfirmed(event.target.checked)}
              className="mt-1 size-5 accent-primary"
            />
            <span className="font-medium leading-7">{copy.age}</span>
          </label>
          <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border border-border p-4">
            <input
              type="checkbox"
              checked={intentConfirmed}
              onChange={(event) => setIntentConfirmed(event.target.checked)}
              className="mt-1 size-5 accent-primary"
            />
            <span className="font-medium leading-7">{copy.intent}</span>
          </label>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="phone">{copy.phone}</Label>
          <div className="relative">
            <Smartphone
              className="pointer-events-none absolute top-1/2 start-3 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+21891…"
              className="ps-11"
              required
            />
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {copy.phoneHelp}
          </p>
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
          disabled={isSubmitting}
        >
          {isSubmitting ? copy.sending : copy.submit}
        </Button>

        <div className="flex items-start gap-3 rounded-2xl bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
          <ShieldCheck
            className="mt-0.5 size-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <p>{copy.identityNote}</p>
        </div>
      </form>
    </main>
  );
}
