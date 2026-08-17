import { redirect } from "next/navigation";
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
          eyebrow: "تم التسجيل",
          title: "أنت الآن على قائمة انتظار ميثاق",
          body: "رقم هاتفك مؤكد والاستبيان مكتمل. هذا لا يعني أن هويتك موثقة ولا يضمن تعارفاً. سنستخدم بيانات المرحلة الأولى لتقييم جاهزية الشبكة قبل إطلاق التعارف الخاص.",
          referral: "رابط الدعوة الخاص بك",
          referralNote:
            "يمكنك مشاركة الرابط، لكنك لن ترى هوية الأشخاص الذين يسجلون من خلاله.",
          status: "عرض حالة التسجيل",
        }
      : {
          eyebrow: "Registration complete",
          title: "You are now on the Mithaq waitlist",
          body: "Your phone is verified and the questionnaire is complete. This does not mean your identity is verified and it does not guarantee an introduction. Stage A data helps us assess network readiness before private introductions launch.",
          referral: "Your private referral link",
          referralNote:
            "You can share this link, but you will not see the identities of people who register through it.",
          status: "View registration status",
        };

  const referralPath = referral?.code ? `/${lang}/r/${referral.code}` : null;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold text-primary">{copy.eyebrow}</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        {copy.title}
      </h1>
      <p className="mt-5 leading-8 text-muted-foreground">{copy.body}</p>

      {referralPath ? (
        <section className="mt-8 rounded-3xl border border-primary/15 bg-primary/5 p-6">
          <h2 className="font-semibold">{copy.referral}</h2>
          <code
            className="mt-3 block overflow-x-auto rounded-xl bg-background p-4 text-sm"
            dir="ltr"
          >
            {referralPath}
          </code>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {copy.referralNote}
          </p>
        </section>
      ) : null}

      <a
        className="mt-8 inline-flex min-h-12 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
        href={`/${lang}/waitlist/status`}
      >
        {copy.status}
      </a>
    </main>
  );
}
