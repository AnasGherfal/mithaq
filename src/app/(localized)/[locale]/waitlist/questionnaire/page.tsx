import { redirect } from "next/navigation";
import { WaitlistQuestionnaire } from "@/features/waitlist/questionnaire";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type QuestionnairePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function WaitlistQuestionnairePage({ params }: QuestionnairePageProps) {
  const { locale } = await params;
  const safeLocale = locale === "en" ? "en" : "ar";
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect(`/${safeLocale}/waitlist`);
  }

  return <WaitlistQuestionnaire />;
}
