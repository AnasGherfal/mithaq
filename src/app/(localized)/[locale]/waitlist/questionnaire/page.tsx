import { ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { loadMyWaitlistQuestionnaire } from "@/features/waitlist/load-questionnaire";
import { WaitlistQuestionnaire } from "@/features/waitlist/questionnaire";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type QuestionnairePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function WaitlistQuestionnairePage({
  params,
}: QuestionnairePageProps) {
  const { locale } = await params;
  const safeLocale = locale === "en" ? "en" : "ar";
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) {
    redirect(`/${safeLocale}/waitlist`);
  }

  const initialValue = await loadMyWaitlistQuestionnaire(userId);
  const reassurance =
    safeLocale === "ar"
      ? {
          private: "مساحة خاصة",
          privateBody: "إجاباتك ليست ملفاً عاماً ولا يمكن للأعضاء تصفحها.",
          guided: "تجربة موجهة",
          guidedBody:
            "ثلاث خطوات قصيرة تركز فقط على ما نحتاجه لتقييم التوافق مستقبلاً.",
        }
      : {
          private: "Private by design",
          privateBody:
            "Your answers are not a public profile and cannot be browsed by other members.",
          guided: "Guided, not exhaustive",
          guidedBody:
            "Three focused steps collect only what we need to assess future compatibility.",
        };

  return (
    <div className="premium-questionnaire relative isolate overflow-hidden">
      <div className="premium-orb -start-40 top-24" aria-hidden="true" />
      <div
        className="premium-orb end-[-12rem] top-[28rem] opacity-45"
        aria-hidden="true"
      />

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 pt-10 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10 lg:px-8 lg:pt-14">
        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-4">
            <div className="premium-panel rounded-[1.75rem] p-5">
              <div className="grid size-11 place-items-center rounded-2xl bg-primary/8 text-primary">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 font-bold">{reassurance.private}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {reassurance.privateBody}
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-gold/20 bg-gold/[0.045] p-5">
              <div className="grid size-10 place-items-center rounded-xl bg-gold/10 text-gold">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 font-bold">{reassurance.guided}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {reassurance.guidedBody}
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <WaitlistQuestionnaire initialValue={initialValue} />
        </div>
      </div>
    </div>
  );
}
