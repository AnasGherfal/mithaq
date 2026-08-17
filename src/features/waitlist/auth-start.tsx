"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Check, LockKeyhole, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { waitlistCopy } from "./copy";
import { recordReferralMilestone } from "./referral-actions";

const phoneSchema = z.string().trim().regex(/^\+[1-9]\d{7,14}$/);

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
    if (!parsedPhone.success || !ageConfirmed || !intentConfirmed) { setError(copy.error); return; }
    setIsSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: parsedPhone.data, options: { data: { preferred_locale: locale }, shouldCreateUser: true } });
    if (otpError) { setError(copy.error); setIsSubmitting(false); return; }
    await recordReferralMilestone("started");
    sessionStorage.setItem("mithaq.waitlist.phone", parsedPhone.data);
    sessionStorage.setItem("mithaq.waitlist.age18", "true");
    sessionStorage.setItem("mithaq.waitlist.intent", "true");
    router.push(`/${locale}/waitlist/verify`);
  }

  const ready = ageConfirmed && intentConfirmed && phoneSchema.safeParse(phone).success;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <div className="grid items-start gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16">
        <div className="lg:sticky lg:top-28">
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1 className="mt-5 max-w-xl text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-[3.5rem] lg:leading-[1.12]">{copy.title}</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">{copy.body}</p>
          <div className="mt-8 grid gap-3 text-sm text-muted-foreground">
            {[locale === "ar" ? "بياناتك لا تظهر في دليل عام" : "Your details are never placed in a public directory", locale === "ar" ? "لا نطلب صورة في هذه المرحلة" : "No photo is required at this stage", locale === "ar" ? "يمكنك العودة وتعديل إجاباتك" : "You can return and edit your answers"].map((item) => (
              <div key={item} className="flex items-center gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/8 text-primary"><Check className="size-4" aria-hidden="true" /></span><span>{item}</span></div>
            ))}
          </div>
        </div>

        <form className="premium-surface premium-inset rounded-[2rem] p-5 sm:p-8 lg:p-10" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-6">
            <div><p className="text-sm font-semibold text-primary">{locale === "ar" ? "تسجيل خاص" : "Private registration"}</p><p className="mt-1 text-sm text-muted-foreground">{locale === "ar" ? "حوالي 3 دقائق بعد تأكيد الهاتف" : "About 3 minutes after phone confirmation"}</p></div>
            <div className="grid size-12 place-items-center rounded-2xl bg-primary/7 text-primary"><LockKeyhole className="size-5" aria-hidden="true" /></div>
          </div>

          <fieldset className="mt-6 space-y-3">
            <legend className="mb-3 text-sm font-semibold">{locale === "ar" ? "قبل أن نبدأ" : "Before we begin"}</legend>
            {[[ageConfirmed, setAgeConfirmed, copy.age], [intentConfirmed, setIntentConfirmed, copy.intent]] .map(([checked, setter, label]) => (
              <label key={String(label)} className={`premium-interactive flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border p-4 ${checked ? "border-primary/35 bg-primary/5" : "border-border bg-card/50"}`}>
                <input type="checkbox" checked={Boolean(checked)} onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)} className="sr-only" />
                <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border ${checked ? "border-primary bg-primary text-white" : "border-input bg-background"}`}>{checked ? <Check className="size-4" aria-hidden="true" /> : null}</span>
                <span className="leading-7 font-medium">{String(label)}</span>
              </label>
            ))}
          </fieldset>

          <div className="mt-7 space-y-2.5">
            <Label htmlFor="phone" className="font-semibold">{copy.phone}</Label>
            <div className="relative">
              <Smartphone className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+218 91 000 0000" className="h-14 ps-12 text-base" required />
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{copy.phoneHelp}</p>
          </div>

          {error ? <p role="alert" className="mt-5 rounded-2xl border border-destructive/15 bg-destructive/7 px-4 py-3 text-sm font-medium text-destructive">{error}</p> : null}

          <Button type="submit" size="lg" className="mt-7 w-full" disabled={isSubmitting || !ready}>{isSubmitting ? copy.sending : copy.submit}</Button>

          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-primary/[0.045] p-4 text-sm leading-6 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><p>{copy.identityNote}</p>
          </div>
        </form>
      </div>
    </main>
  );
}
