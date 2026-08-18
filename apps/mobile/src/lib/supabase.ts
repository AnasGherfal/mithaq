import "react-native-url-polyfill/auto";

import { AppState } from "react-native";
import { createClient, processLock } from "@supabase/supabase-js";
import { validateMobileSupabaseConfig } from "./runtime-config";
import { secureSessionStorage } from "./secure-store";

const supabaseConfig = validateMobileSupabaseConfig({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  allowInsecureLocal: __DEV__,
});

export const supabase = createClient(
  supabaseConfig.url,
  supabaseConfig.publishableKey,
  {
    auth: {
      storage: secureSessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  },
);

AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
