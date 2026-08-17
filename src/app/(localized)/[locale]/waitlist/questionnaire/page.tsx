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
  return <WaitlistQuestionnaire initialValue={initialValue} />;
}
