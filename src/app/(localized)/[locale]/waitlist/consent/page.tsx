import { FileCheck2, LockKeyhole, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { finalizeWaitlist } from "@/features/waitlist/completion-actions";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function WaitlistConsentPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const { error } = await searchParams;
  const lang = locale === "en" ? "en" : "ar";
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect(`/${lang}/waitlist`);
  }

  const copy =
    lang === "ar"
      ? {
          eyebrow: "الخطوة الأخيرة",
          title: "موافقتك واضحة ومحددة",
          body: "نحفظ نسخة وتاريخ كل موافقة حتى يبقى سجل الخصوصية مفهوماً وقابلاً للمراجعة. التحقق الحالي يثبت ملكية رقم الهاتف فقط، وليس الهوية.",
          required:
            "أوافق على شروط الاستخدام وسياسة الخصوصية ومعالجة بيانات قائمة الانتظار، وأؤكد أن عمري 18 سنة أو أكثر.",
          communications:
            "أرغب في تلقي تحديثات ميثاق المتعلقة بقائمة الانتظار والإطلاق.",
          submit: "تأكيد والانضمام إلى القائمة",
          error: "تعذر إكمال التسجيل. راجع الموافقات وحاول مرة أخرى.",
          privacyTitle: "سجل خصوصية واضح",
          privacyBody:
            "الموافقة على التحديثات اختيارية ويمكن إيقافها لاحقاً دون التأثير على تسجيلك.",
          terms: "شروط الاستخدام",
          privacy: "سياسة الخصوصية",
        }
      : {
          eyebrow: "Final step",
          title: "Your consent stays explicit and reviewable",
          body: "We store the version and time of each consent event so your privacy record remains understandable and auditable. Current verification proves control of a phone number only, not identity.",
          required:
            "I agree to the Terms, Privacy Policy and waitlist data processing, and confirm I am 18 or older.",
          communications: "I would like Mithaq waitlist and launch updates.",
          submit: "Confirm and join the waitlist",
          error:
            "We could not complete registration. Review the consent choices and try again.",
          privacyTitle: "A clear privacy record",
          privacyBody:
            "Product updates are optional and can be turned off later without affecting your registration.",
          terms: "Terms of use",
          privacy: "Privacy policy",
        };

  return (
    <main className="relative isolate overflow-hidden px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="premium-orb -start-36 top-24" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-2xl">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary/15 bg-card text-primary shadow-[0_16px_36px_rgba(15,77,63,0.10)]">
            <FileCheck2 className="size-6" aria-hidden="true" />
          </div>
          <p className="mt-6 text-xs font-bold tracking-[0.16em] text-primary uppercase">
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.025em] text-balance sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
            {copy.body}
          </p>
        </div>

        {error ? (
          <p className="mt-6 rounded-2xl border border-destructive/15 bg-destructive/8 px-4 py-3 text-sm font-semibold text-destructive">
            {copy.error}
          </p>
        ) : null}

        <form
          action={finalizeWaitlist}
          className="premium-panel mt-8 space-y-5 rounded-[2rem] p-6 sm:p-8"
        >
          <input type="hidden" name="locale" value={lang} />

          <label className="group flex cursor-pointer gap-4 rounded-2xl border border-border/80 bg-background/55 p-4 transition hover:border-primary/25 hover:bg-primary/[0.035] has-[:checked]:border-primary/35 has-[:checked]:bg-primary/[0.055]">
            <input
              className="mt-1 size-5 shrink-0 accent-primary"
              type="checkbox"
              name="requiredConsent"
              required
            />
            <span className="leading-7 font-medium">{copy.required}</span>
          </label>

          <label className="group flex cursor-pointer gap-4 rounded-2xl border border-border/70 p-4 text-muted-foreground transition hover:border-primary/20 hover:bg-primary/[0.025] has-[:checked]:border-primary/25 has-[:checked]:bg-primary/[0.04]">
            <input
              className="mt-1 size-5 shrink-0 accent-primary"
              type="checkbox"
              name="communications"
            />
            <span className="leading-7">{copy.communications}</span>
          </label>

          <div className="flex items-start gap-3 rounded-2xl bg-primary/[0.045] p-4">
            <ShieldCheck
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold">{copy.privacyTitle}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {copy.privacyBody}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <LockKeyhole className="size-4 text-primary" aria-hidden="true" />
            <Link
              className="font-medium underline underline-offset-4"
              href="/terms"
            >
              {copy.terms}
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              className="font-medium underline underline-offset-4"
              href="/privacy"
            >
              {copy.privacy}
            </Link>
          </div>

          <Button className="w-full" size="lg" type="submit">
            {copy.submit}
          </Button>
        </form>
      </div>
    </main>
  );
}
