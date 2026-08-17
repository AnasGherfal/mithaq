import { CheckCircle2, Copy, ShieldCheck, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ locale: string }> };

export default async function WaitlistSuccessPage({ params }: PageProps) {
  const { locale } = await params;
  const lang = locale === "en" ? "en" : "ar";
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (!userId) redirect(`/${lang}/waitlist`);

  const [{ data: application }, { data: referral }] = await Promise.all([
    supabase
      .from("waitlist_applications")
      .select("status")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("referral_codes")
      .select("code")
      .eq("owner_user_id", userId)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  if (application?.status !== "submitted")
    redirect(`/${lang}/waitlist/questionnaire`);

  const copy =
    lang === "ar"
      ? {
          eyebrow: "تم التسجيل بنجاح",
          title: "مكانك محفوظ على قائمة انتظار ميثاق",
          body: "رقم هاتفك مؤكد والاستبيان مكتمل. هذا لا يعني أن هويتك موثقة ولا يضمن تعارفاً. المرحلة الحالية مخصصة لتقييم جاهزية الشبكة بعناية قبل إطلاق التعارف الخاص.",
          secure: "تم حفظ تسجيلك بشكل خاص",
          private: "إجاباتك ليست ملفاً عاماً",
          referral: "دعوة خاصة",
          referralNote:
            "يمكنك مشاركة الرابط مع شخص جاد. لن نعرض لك هوية من يسجّل من خلاله.",
          status: "عرض حالة التسجيل",
          next: "ما التالي؟",
          nextBody:
            "سنستخدم هذه المرحلة لقياس الطلب والثقة والتوازن بين الشرائح قبل الانتقال إلى التعارف الخاص.",
        }
      : {
          eyebrow: "Registration complete",
          title: "Your place on the Mithaq waitlist is secured",
          body: "Your phone is verified and the questionnaire is complete. This does not mean your identity is verified and it does not guarantee an introduction. This stage is for carefully assessing network readiness before private introductions launch.",
          secure: "Your registration is stored privately",
          private: "Your answers are not a public profile",
          referral: "Private invitation",
          referralNote:
            "Share this with someone serious. You will never see the identity of people who register through it.",
          status: "View registration status",
          next: "What happens next?",
          nextBody:
            "We use this stage to measure serious demand, trust and cohort balance before moving into private introductions.",
        };

  const referralPath = referral?.code ? `/${lang}/r/${referral.code}` : null;

  return (
    <main className="relative isolate overflow-hidden px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="premium-orb -start-36 top-10" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-3xl">
        <div className="mx-auto grid size-16 place-items-center rounded-full border border-primary/15 bg-primary text-primary-foreground shadow-[0_20px_50px_rgba(15,77,63,0.24)]">
          <CheckCircle2 className="size-8" aria-hidden="true" />
        </div>

        <div className="mx-auto mt-6 max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.16em] text-primary uppercase">
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.03em] text-balance sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
            {copy.body}
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="premium-panel flex items-center gap-3 rounded-2xl p-4">
            <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm font-semibold">{copy.secure}</p>
          </div>
          <div className="premium-panel flex items-center gap-3 rounded-2xl p-4">
            <UsersRound className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm font-semibold">{copy.private}</p>
          </div>
        </div>

        {referralPath ? (
          <section className="premium-panel mt-6 rounded-[2rem] p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/8 text-primary">
                <Copy className="size-5" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-bold">{copy.referral}</h2>
            </div>
            <code
              className="mt-4 block overflow-x-auto rounded-2xl border border-border/70 bg-background/75 p-4 text-sm shadow-inner"
              dir="ltr"
            >
              {referralPath}
            </code>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {copy.referralNote}
            </p>
          </section>
        ) : null}

        <section className="mt-6 rounded-[2rem] border border-primary/10 bg-primary/[0.045] p-6 sm:p-8">
          <h2 className="text-lg font-bold">{copy.next}</h2>
          <p className="mt-2 leading-7 text-muted-foreground">{copy.nextBody}</p>
        </section>

        <div className="mt-8 flex justify-center">
          <Button size="lg" asChild>
            <Link href="/waitlist/status">{copy.status}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
