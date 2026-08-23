import { supabase } from "@/lib/supabase";

export async function hideRecognizedIntroductionMember(introductionId: string) {
  const { error } = await supabase.rpc("hide_recognized_introduction_member", {
    p_introduction_id: introductionId,
  });
  if (error) throw error;
}
