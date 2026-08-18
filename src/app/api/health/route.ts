import { getReleaseMetadata } from "@/lib/release-metadata";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      status: "ok",
      application: "Mithaq",
      release: getReleaseMetadata(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
