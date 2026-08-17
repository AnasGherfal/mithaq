import { redirect } from "next/navigation";
import { finalizeWaitlist } from "@/features/waitlist/completion-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string }> };

export default async function WaitlistConsentPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { error } = await searchParams;
  const lang = locale === "en" ? "en" : "ar";
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect(`/${lang}/waitlist`);
  }

  const copy = lang === "ar"
    ? {
        eyebrow: "الخطوة الأخيرة",
        title: "راجع الموافقات قبل الانضمام",
        body: "سنحفظ نسخة وتاريخ الموافقات حتى يكون سجل الخصوصية واضحاً. التحقق الحالي يثبت ملكية رقم الهاتف فقط، وليس الهوية.",
        required: "أوافق على شروط الاستخدام وسياسة الخصوصية ومعالجة بيانات قائمة الانتظار، وأؤكد أن عمري 18 سنة أو أكثر.",
        communications: "أرغب في تلقي تحديثات ميثاق المتعلقة بقائمة الانتظار والإطلاق.",
        submit: "إكمال التسجيل",
        error: "تعذر إكمال التسجيل. راجع الموافقات وحاول مرة أخرى.",
      }
    : {
        eyebrow: "Final step",
        title: "Review consent before joining",
        body: "We keep a versioned consent history so the privacy record stays clear. Current verification proves control of a phone number only, not identity.",
        required: "I agree to the Terms, Privacy Policy and waitlist data processing, and confirm I am 18 or older.",
        communications: "I would like Mithaq waitlist and launch updates.",
        submit: "Complete registration",
        error: "We could not complete registration. Review the consent choices and try again.",
      };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold text-primary">{copy.eyebrow}</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
      <p className="mt-4 leading-8 text-muted-foreground">{copy.body}</p>

      {error ? <p className="mt-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{copy.error}</p> : null}

      <form action={finalizeWaitlist} className="mt-8 space-y-5 rounded-3xl border border-primary/15 bg-card p-6 sm:p-8">
        <input type="hidden" name="locale" value={lang} />
        <label className="flex gap-3 leading-7">
          <input className="mt-1 size-5" type="checkbox" name="requiredConsent" required />
          <span>{copy.required}</span>
        </label>
        <label className="flex gap-3 leading-7 text-muted-foreground">
          <input className="mt-1 size-5" type="checkbox" name="communications" />
          <span>{copy.communications}</span>
        </label>
        <div className="text-sm text-muted-foreground">
          <a className="underline underline-offset-4" href={`/${lang}/terms`}>Terms</a>
          <span aria-hidden="true"> · </span>
          <a className="underline underline-offset-4" href={`/${lang}/privacy`}>Privacy</a>
        </div>
        <button className="min-h-12 w-full rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90" type="submit">
          {copy.submit}
        </button>
      </form>
    </main>
  );
}
