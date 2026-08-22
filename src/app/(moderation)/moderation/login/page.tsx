import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ModerationLogin } from "./moderation-login";

export default async function ModerationLoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: access } = await supabase.rpc("get_my_moderation_access");
    if (Array.isArray(access) && access.length > 0) redirect("/moderation");
  }

  return <ModerationLogin />;
}
