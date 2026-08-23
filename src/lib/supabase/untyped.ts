import type { SupabaseClient } from "@supabase/supabase-js";

export function asUntypedSupabase(client: unknown) {
  return client as SupabaseClient<any>;
}
