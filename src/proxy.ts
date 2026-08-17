import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { refreshSupabaseSession } from "./lib/supabase/proxy";

const handleInternationalization = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const authResponse = await refreshSupabaseSession(request);
  const intlResponse = handleInternationalization(request);

  for (const cookie of authResponse.cookies.getAll()) {
    intlResponse.cookies.set(cookie);
  }

  for (const header of ["cache-control", "expires", "pragma"] as const) {
    const value = authResponse.headers.get(header);
    if (value) {
      intlResponse.headers.set(header, value);
    }
  }

  return intlResponse;
}

export const config = {
  matcher: "/((?!api|serwist|~offline|_next|_vercel|.*\\..*).*)",
};
