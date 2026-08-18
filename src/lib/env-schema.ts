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

function isLoopbackUrl(value: string) {
  const hostname = new URL(value).hostname.toLowerCase();
  return (
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname.startsWith("127.")
  );
}

export const environmentSchema = z
  .object({
    ...serverEnvironmentShape,
    ...clientEnvironmentShape,
  })
  .superRefine((environment, context) => {
    if (environment.APP_ENV === "local") return;

    for (const [key, value] of [
      ["NEXT_PUBLIC_SITE_URL", environment.NEXT_PUBLIC_SITE_URL],
      ["NEXT_PUBLIC_SUPABASE_URL", environment.NEXT_PUBLIC_SUPABASE_URL],
    ] as const) {
      const url = new URL(value);

      if (url.protocol !== "https:") {
        context.addIssue({
          code: "custom",
          path: [key],
          message: `${key} must use HTTPS outside local development`,
        });
      }

      if (isLoopbackUrl(value)) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: `${key} cannot use a loopback host outside local development`,
        });
      }
    }
  });
