import { createEnv } from "@t3-oss/env-nextjs";
import { clientEnvironmentShape, serverEnvironmentShape } from "./env-schema";

export const env = createEnv({
  server: serverEnvironmentShape,
  client: clientEnvironmentShape,
  runtimeEnv: {
    APP_ENV: process.env.APP_ENV,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
  emptyStringAsUndefined: true,
});
