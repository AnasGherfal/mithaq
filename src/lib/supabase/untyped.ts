import type { SupabaseClient } from "@supabase/supabase-js";

export function asUntypedSupabase(client: unknown) {
  // This adapter is intentionally isolated to RPCs that predate generated
  // application types. Keep the escape at this boundary instead of spreading
  // unsafe casts through member/admin screens.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return client as SupabaseClient<any>;
}
