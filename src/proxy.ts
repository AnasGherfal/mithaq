import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const handleInternationalization = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  // Milestone 3 integration point:
  // Refresh the Supabase session here, then preserve both Supabase and
  // next-intl response cookies when composing the two concerns.
  return handleInternationalization(request);
}

export const config = {
  matcher: "/((?!api|serwist|~offline|_next|_vercel|.*\\..*).*)",
};
