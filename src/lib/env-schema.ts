import { z } from "zod";

export const appEnvironmentValues = [
  "local",
  "preview",
  "staging",
  "production",
] as const;

export const serverEnvironmentShape = {
  APP_ENV: z.enum(appEnvironmentValues),
};

export const clientEnvironmentShape = {
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
};

export const environmentSchema = z.object({
  ...serverEnvironmentShape,
  ...clientEnvironmentShape,
});
