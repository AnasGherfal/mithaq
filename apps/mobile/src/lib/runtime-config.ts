type MobileSupabaseConfigInput = {
  url: string | undefined;
  publishableKey: string | undefined;
  allowInsecureLocal: boolean;
};

function parseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isLoopbackHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized === "::1" || normalized === "[::1]" || normalized.startsWith("127.");
}

export function validateMobileSupabaseConfig(input: MobileSupabaseConfigInput) {
  const url = input.url?.trim();
  const publishableKey = input.publishableKey?.trim();

  if (!url || !publishableKey) {
    throw new Error("Missing mobile Supabase public configuration");
  }

  const parsedUrl = parseUrl(url);
  if (!parsedUrl) {
    throw new Error("Invalid mobile Supabase URL");
  }

  if (publishableKey.startsWith("sb_secret_")) {
    throw new Error("Secret Supabase keys are forbidden in the mobile client");
  }

  if (!input.allowInsecureLocal) {
    if (parsedUrl.protocol !== "https:") {
      throw new Error("Mobile Supabase URL must use HTTPS outside development");
    }

    if (isLoopbackHost(parsedUrl.hostname)) {
      throw new Error("Mobile Supabase URL cannot use a loopback host outside development");
    }
  }

  return { url, publishableKey } as const;
}
